
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { formatDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const APPROVER_EMAIL = "conrad.kraft@digital-euro-association.de";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch the expense claim
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
      include: {
        travelRequest: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!expenseClaim) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
    }

    // Verify ownership
    if (expenseClaim.travelRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow resubmission of AMENDMENT_REQUESTED claims
    if (expenseClaim.status !== "AMENDMENT_REQUESTED") {
      return NextResponse.json(
        { error: "Only amendment requested claims can be resubmitted" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
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

    const keepAccommodationReceipt = formData.get("keepAccommodationReceipt") === "true";
    const keepTransportationReceipt = formData.get("keepTransportationReceipt") === "true";
    const keepOtherReceipt = formData.get("keepOtherReceipt") === "true";

    if (!amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Auto-populate description with event name + "Expenses" if empty
    if (!description || !description.trim()) {
      description = `${expenseClaim.travelRequest.eventName} Expenses`;
    }

    const accommodationAmount = accommodation ? parseFloat(accommodation) : 0;
    const transportationAmount = transportation ? parseFloat(transportation) : 0;

    if (
      accommodationAmount > 0 &&
      !accommodationFile &&
      !(keepAccommodationReceipt && expenseClaim.accommodationReceipt)
    ) {
      return NextResponse.json(
        { error: "Accommodation claims must include an uploaded receipt." },
        { status: 400 }
      );
    }

    if (
      transportationAmount > 0 &&
      !transportationFile &&
      !(keepTransportationReceipt && expenseClaim.transportationReceipt)
    ) {
      return NextResponse.json(
        { error: "Transportation claims must include an uploaded receipt." },
        { status: 400 }
      );
    }

    // Validate file uploads
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

    let accommodationReceiptPath = expenseClaim.accommodationReceipt;
    let transportationReceiptPath = expenseClaim.transportationReceipt;
    let otherReceiptPath = expenseClaim.otherReceipt;

    // Handle accommodation receipt
    if (accommodationFile) {
      validateFile(accommodationFile, 'Accommodation receipt');
      // Delete old receipt if exists
      if (expenseClaim.accommodationReceipt) {
        try {
          await deleteFile(expenseClaim.accommodationReceipt);
        } catch (error) {
          console.error("Failed to delete old accommodation receipt:", error);
        }
      }
      const buffer = Buffer.from(await accommodationFile.arrayBuffer());
      accommodationReceiptPath = await uploadFile(buffer, accommodationFile.name);
    } else if (!keepAccommodationReceipt) {
      // Delete the receipt if not keeping it
      if (expenseClaim.accommodationReceipt) {
        try {
          await deleteFile(expenseClaim.accommodationReceipt);
        } catch (error) {
          console.error("Failed to delete accommodation receipt:", error);
        }
      }
      accommodationReceiptPath = null;
    }

    // Handle transportation receipt
    if (transportationFile) {
      validateFile(transportationFile, 'Transportation receipt');
      // Delete old receipt if exists
      if (expenseClaim.transportationReceipt) {
        try {
          await deleteFile(expenseClaim.transportationReceipt);
        } catch (error) {
          console.error("Failed to delete old transportation receipt:", error);
        }
      }
      const buffer = Buffer.from(await transportationFile.arrayBuffer());
      transportationReceiptPath = await uploadFile(buffer, transportationFile.name);
    } else if (!keepTransportationReceipt) {
      // Delete the receipt if not keeping it
      if (expenseClaim.transportationReceipt) {
        try {
          await deleteFile(expenseClaim.transportationReceipt);
        } catch (error) {
          console.error("Failed to delete transportation receipt:", error);
        }
      }
      transportationReceiptPath = null;
    }

    // Handle other receipt
    if (otherFile) {
      validateFile(otherFile, 'Other receipt');
      // Delete old receipt if exists
      if (expenseClaim.otherReceipt) {
        try {
          await deleteFile(expenseClaim.otherReceipt);
        } catch (error) {
          console.error("Failed to delete old other receipt:", error);
        }
      }
      const buffer = Buffer.from(await otherFile.arrayBuffer());
      otherReceiptPath = await uploadFile(buffer, otherFile.name);
    } else if (!keepOtherReceipt) {
      // Delete the receipt if not keeping it
      if (expenseClaim.otherReceipt) {
        try {
          await deleteFile(expenseClaim.otherReceipt);
        } catch (error) {
          console.error("Failed to delete other receipt:", error);
        }
      }
      otherReceiptPath = null;
    }

    // Update the expense claim
    const updatedClaim = await prisma.expenseClaim.update({
      where: { id: params.id },
      data: {
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
        status: "PENDING", // Reset to pending
        approverComment: null, // Clear the previous comment
      },
    });

    // Send email notification to approver
    const approvalLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals?tab=expenses`;
    const eventName = expenseClaim.travelRequest.eventName || "Event";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Expense Claim Resubmitted</h2>
        <p><strong>Submitted by:</strong> ${session.user?.name}</p>
        <p><strong>Event:</strong> ${eventName}</p>
        <p><strong>Total Amount:</strong> €${parseFloat(amount).toFixed(2)}</p>
        ${accommodation ? `<p><strong>Accommodation:</strong> €${parseFloat(accommodation).toFixed(2)}</p>` : ''}
        ${transportation ? `<p><strong>Transportation:</strong> €${parseFloat(transportation).toFixed(2)}</p>` : ''}
        ${otherAmount ? `<p><strong>Other (${otherDescription || 'N/A'}):</strong> €${parseFloat(otherAmount).toFixed(2)}</p>` : ''}
        <p><strong>Date:</strong> ${formatDate(date)}</p>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #78350f;"><strong>Resubmission Notice:</strong></p>
          <p style="margin: 8px 0 0 0; color: #78350f;">This expense claim has been updated and resubmitted following your amendment request.</p>
        </div>
        <div style="margin-top: 20px;">
          <a href="${approvalLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Expense Claim</a>
        </div>
      </div>
    `;

    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: APPROVER_EMAIL,
        subject: `Expense Claim Resubmitted - ${eventName}`,
        html: emailHtml
      })
    });

    return NextResponse.json({ 
      message: "Expense claim resubmitted successfully",
      expenseClaim: updatedClaim 
    });
  } catch (error) {
    console.error("Error resubmitting expense claim:", error);
    return NextResponse.json(
      { error: "Failed to resubmit expense claim" },
      { status: 500 }
    );
  }
}
