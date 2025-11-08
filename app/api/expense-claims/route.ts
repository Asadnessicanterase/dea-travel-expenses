
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { formatDate } from "@/lib/date-utils";
import { getApprovalFilter, getApproverEmail } from "@/lib/approvers";
import { processCategoryReceipts } from "@/lib/receipt-merger";
import { buildEmailTemplate, createDetailsTable } from "@/lib/email-template";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    let where: any = {};

    // If user is approver or admin, filter by department (via travel request)
    if (userRole === "APPROVER" || userRole === "ADMIN") {
      const approvalFilter = await getApprovalFilter(userId);
      where.travelRequest = approvalFilter;
    } else {
      // Regular users see only their own expense claims
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
            department: {
              select: {
                id: true,
                name: true
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
    const accommodationFiles = formData.getAll("accommodationReceipts") as File[];
    const transportationFiles = formData.getAll("transportationReceipts") as File[];
    const otherFiles = formData.getAll("otherReceipts") as File[];

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

    // Check if an expense claim already exists for this travel request
    const existingClaim = await prisma.expenseClaim.findFirst({
      where: {
        travelRequestId,
        status: {
          notIn: ["DENIED"] // Allow new claim if previous was denied
        }
      }
    });

    if (existingClaim) {
      return NextResponse.json(
        {
          error: "An expense claim already exists for this travel request. You can only modify it through resubmission if amendments are requested."
        },
        { status: 400 }
      );
    }

    const accommodationAmount = accommodation ? parseFloat(accommodation) : 0;
    const transportationAmount = transportation ? parseFloat(transportation) : 0;

    if (accommodationAmount > 0 && accommodationFiles.length === 0) {
      return NextResponse.json(
        { error: "Accommodation claims must include at least one uploaded receipt." },
        { status: 400 }
      );
    }

    if (transportationAmount > 0 && transportationFiles.length === 0) {
      return NextResponse.json(
        { error: "Transportation claims must include at least one uploaded receipt." },
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

    const accommodationReceiptPaths: string[] = [];
    const transportationReceiptPaths: string[] = [];
    const otherReceiptPaths: string[] = [];

    // Upload accommodation files
    for (const file of accommodationFiles) {
      validateFile(file, 'Accommodation receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      accommodationReceiptPaths.push(path);
    }

    // Upload transportation files
    for (const file of transportationFiles) {
      validateFile(file, 'Transportation receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      transportationReceiptPaths.push(path);
    }

    // Upload other files
    for (const file of otherFiles) {
      validateFile(file, 'Other receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      otherReceiptPaths.push(path);
    }

    // Create temporary expense claim to get ID for file naming
    const tempExpenseClaim = await prisma.expenseClaim.create({
      data: {
        travelRequestId,
        description,
        amount: parseFloat(amount),
        accommodation: accommodation ? parseFloat(accommodation) : null,
        transportation: transportation ? parseFloat(transportation) : null,
        otherAmount: otherAmount ? parseFloat(otherAmount) : null,
        otherDescription: otherDescription || null,
        date: new Date(date),
        accommodationReceipts: [],
        transportationReceipts: [],
        otherReceipts: [],
        status: "PENDING"
      }
    });

    // Merge receipts per category if multiple files exist
    const finalAccommodationReceipts = await processCategoryReceipts(
      accommodationReceiptPaths,
      'accommodation',
      tempExpenseClaim.id
    );
    const finalTransportationReceipts = await processCategoryReceipts(
      transportationReceiptPaths,
      'transportation',
      tempExpenseClaim.id
    );
    const finalOtherReceipts = await processCategoryReceipts(
      otherReceiptPaths,
      'other',
      tempExpenseClaim.id
    );

    // Update expense claim with merged receipt paths
    const expenseClaim = await prisma.expenseClaim.update({
      where: { id: tempExpenseClaim.id },
      data: {
        accommodationReceipts: finalAccommodationReceipts,
        transportationReceipts: finalTransportationReceipts,
        otherReceipts: finalOtherReceipts,
      }
    });

    // Send email notification to department approver (via travel request's department)
    const approverEmail = await getApproverEmail(travelRequest.departmentId);

    if (approverEmail) {
      const approvalLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals?tab=expenses`;

      const eventName = travelRequest.eventName || "Event";

      const expenseBreakdown = [
        { label: 'Submitted by', value: session.user?.name || 'Unknown' },
        { label: 'Event', value: eventName },
        { label: 'Date', value: formatDate(date) },
        { label: 'Total Amount', value: `€${parseFloat(amount).toFixed(2)}` }
      ];

      if (accommodation) {
        expenseBreakdown.push({ label: 'Accommodation', value: `€${parseFloat(accommodation).toFixed(2)}` });
      }
      if (transportation) {
        expenseBreakdown.push({ label: 'Transportation', value: `€${parseFloat(transportation).toFixed(2)}` });
      }
      if (otherAmount) {
        expenseBreakdown.push({ label: `Other (${otherDescription || 'N/A'})`, value: `€${parseFloat(otherAmount).toFixed(2)}` });
      }

      const detailsTable = createDetailsTable(expenseBreakdown);

      const contentText = description
        ? `<p style="margin: 0 0 16px 0;"><strong>Description:</strong><br/>${description}</p>`
        : '';

      const emailHtml = buildEmailTemplate({
        title: 'New Expense Claim Submitted',
        greeting: 'A new expense claim has been submitted and requires your review.',
        content: contentText,
        additionalSections: detailsTable,
        buttonText: 'Review Expense Claim',
        buttonUrl: approvalLink
      });

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const emailSubject = 'New Expense Claim - ' + eventName;
      await fetch(baseUrl + '/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: approverEmail,
          subject: emailSubject,
          html: emailHtml
        })
      });
    }

    return NextResponse.json({ expenseClaim });
  } catch (error) {
    console.error("Error creating expense claim:", error);
    return NextResponse.json(
      { error: "Failed to create expense claim" },
      { status: 500 }
    );
  }
}
