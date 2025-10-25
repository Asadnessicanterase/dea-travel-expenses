
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { formatDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const APPROVER_EMAIL = "conrad.kraft@digital-euro-association.de";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    
    // Check if user is approver (by role or email)
    const isApprover = (session.user as any).role === "APPROVER" || userEmail === APPROVER_EMAIL;

    let where: any = {};

    // If user is approver, show all expense claims; otherwise, show only their own
    if (!isApprover) {
      where.travelRequest = {
        userId: userId
      };
    }

    if (status) {
      where.status = status;
    }

    const expenseClaims = await prisma.expenseClaim.findMany({
      where,
      include: {
        travelRequest: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                position: true
              }
            },
            transportationItems: true
          }
        },
        expenseApprovals: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ expenseClaims });
  } catch (error) {
    console.error("Error fetching expense claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense claims" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const travelRequestId = formData.get("travelRequestId") as string;
    let description = formData.get("description") as string;
    const amount = formData.get("amount") as string;
    const accommodation = formData.get("accommodation") as string;
    const transportation = formData.get("transportation") as string;
    const otherAmount = formData.get("otherAmount") as string;
    const otherDescription = formData.get("otherDescription") as string;
    const date = formData.get("date") as string;
    const accommodationFile = formData.get("accommodationReceipt") as File | null;
    const transportationFile = formData.get("transportationReceipt") as File | null;
    const otherFile = formData.get("otherReceipt") as File | null;

    if (!travelRequestId || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the travel request exists and belongs to the user
    const travelRequest = await prisma.travelRequest.findUnique({
      where: { id: travelRequestId }
    });

    if (!travelRequest) {
      return NextResponse.json({ error: "Travel request not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    if (travelRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-populate description with event name + "Expenses" if empty
    if (!description || !description.trim()) {
      description = `${travelRequest.eventName} Expenses`;
    }

    // Only allow expense claims for approved requests
    if (travelRequest.status !== "APPROVED" && travelRequest.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Can only add expenses to approved requests" },
        { status: 400 }
      );
    }

    const accommodationAmount = accommodation ? parseFloat(accommodation) : 0;
    const transportationAmount = transportation ? parseFloat(transportation) : 0;

    if (accommodationAmount > 0 && !accommodationFile) {
      return NextResponse.json(
        { error: "Accommodation claims must include an uploaded receipt." },
        { status: 400 }
      );
    }

    if (transportationAmount > 0 && !transportationFile) {
      return NextResponse.json(
        { error: "Transportation claims must include an uploaded receipt." },
        { status: 400 }
      );
    }

    // Validate and upload files
    const validateFile = (file: File, fieldName: string) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`${fieldName}: Only PDF and image files (JPG, PNG, WebP) are allowed`);
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`${fieldName}: File size must be less than 10MB`);
      }
    };

    let accommodationReceiptPath: string | null = null;
    let transportationReceiptPath: string | null = null;
    let otherReceiptPath: string | null = null;

    // Upload files if provided
    if (accommodationFile) {
      validateFile(accommodationFile, 'Accommodation receipt');
      const buffer = Buffer.from(await accommodationFile.arrayBuffer());
      accommodationReceiptPath = await uploadFile(buffer, accommodationFile.name);
    }
    
    if (transportationFile) {
      validateFile(transportationFile, 'Transportation receipt');
      const buffer = Buffer.from(await transportationFile.arrayBuffer());
      transportationReceiptPath = await uploadFile(buffer, transportationFile.name);
    }
    
    if (otherFile) {
      validateFile(otherFile, 'Other receipt');
      const buffer = Buffer.from(await otherFile.arrayBuffer());
      otherReceiptPath = await uploadFile(buffer, otherFile.name);
    }

    const expenseClaim = await prisma.expenseClaim.create({
      data: {
        travelRequestId,
        description,
        amount: parseFloat(amount),
        accommodation: accommodation ? parseFloat(accommodation) : null,
        transportation: transportation ? parseFloat(transportation) : null,
        otherAmount: otherAmount ? parseFloat(otherAmount) : null,
        otherDescription: otherDescription || null,
        date: new Date(date),
        accommodationReceipt: accommodationReceiptPath,
        transportationReceipt: transportationReceiptPath,
        otherReceipt: otherReceiptPath,
        status: "PENDING"
      }
    });

    // Send email notification to approver
    const APPROVER_EMAIL = "conrad.kraft@digital-euro-association.de";
    const approvalLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals?tab=expenses`;
    
    const eventName = travelRequest.eventName || "Event";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Expense Claim Submitted</h2>
        <p><strong>Submitted by:</strong> ${session.user?.name}</p>
        <p><strong>Event:</strong> ${eventName}</p>
        ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        <p><strong>Total Amount:</strong> €${parseFloat(amount).toFixed(2)}</p>
        ${accommodation ? `<p><strong>Accommodation:</strong> €${parseFloat(accommodation).toFixed(2)}</p>` : ''}
        ${transportation ? `<p><strong>Transportation:</strong> €${parseFloat(transportation).toFixed(2)}</p>` : ''}
        ${otherAmount ? `<p><strong>Other (${otherDescription || 'N/A'}):</strong> €${parseFloat(otherAmount).toFixed(2)}</p>` : ''}
        <p><strong>Date:</strong> ${formatDate(date)}</p>
        <div style="margin-top: 20px;">
          <a href="${approvalLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Expense Claim</a>
        </div>
      </div>
    `;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const emailSubject = 'New Expense Claim - ' + eventName;
    await fetch(baseUrl + '/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: APPROVER_EMAIL,
        subject: emailSubject,
        html: emailHtml
      })
    });

    return NextResponse.json({ expenseClaim });
  } catch (error) {
    console.error("Error creating expense claim:", error);
    return NextResponse.json(
      { error: "Failed to create expense claim" },
      { status: 500 }
    );
  }
}
