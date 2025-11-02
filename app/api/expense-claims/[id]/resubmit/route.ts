
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { formatDate } from "@/lib/date-utils";
import { getApproverEmail } from "@/lib/approvers";
import { processCategoryReceipts } from "@/lib/receipt-merger";

export const dynamic = "force-dynamic";

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

    const accommodationFiles = formData.getAll("accommodationReceipts") as File[];
    const transportationFiles = formData.getAll("transportationReceipts") as File[];
    const otherFiles = formData.getAll("otherReceipts") as File[];

    // Get which existing receipts to keep (sent as JSON strings of indices to keep)
    const keepAccommodationIndices = formData.get("keepAccommodationIndices");
    const keepTransportationIndices = formData.get("keepTransportationIndices");
    const keepOtherIndices = formData.get("keepOtherIndices");

    const keptAccommodationIndices = keepAccommodationIndices ? JSON.parse(keepAccommodationIndices as string) : [];
    const keptTransportationIndices = keepTransportationIndices ? JSON.parse(keepTransportationIndices as string) : [];
    const keptOtherIndices = keepOtherIndices ? JSON.parse(keepOtherIndices as string) : [];

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

    // Check if at least one receipt exists (new uploads + kept existing)
    const totalAccommodationReceipts = accommodationFiles.length + keptAccommodationIndices.length;
    const totalTransportationReceipts = transportationFiles.length + keptTransportationIndices.length;

    if (accommodationAmount > 0 && totalAccommodationReceipts === 0) {
      return NextResponse.json(
        { error: "Accommodation claims must include at least one uploaded receipt." },
        { status: 400 }
      );
    }

    if (transportationAmount > 0 && totalTransportationReceipts === 0) {
      return NextResponse.json(
        { error: "Transportation claims must include at least one uploaded receipt." },
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

    // Process accommodation receipts
    const accommodationReceiptPaths: string[] = [];

    // Keep selected existing receipts
    for (const index of keptAccommodationIndices) {
      if (index < expenseClaim.accommodationReceipts.length) {
        accommodationReceiptPaths.push(expenseClaim.accommodationReceipts[index]);
      }
    }

    // Delete receipts that are not being kept
    for (let i = 0; i < expenseClaim.accommodationReceipts.length; i++) {
      if (!keptAccommodationIndices.includes(i)) {
        try {
          await deleteFile(expenseClaim.accommodationReceipts[i]);
        } catch (error) {
          console.error(`Failed to delete accommodation receipt ${i}:`, error);
        }
      }
    }

    // Upload new accommodation files
    for (const file of accommodationFiles) {
      validateFile(file, 'Accommodation receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      accommodationReceiptPaths.push(path);
    }

    // Process transportation receipts
    const transportationReceiptPaths: string[] = [];

    // Keep selected existing receipts
    for (const index of keptTransportationIndices) {
      if (index < expenseClaim.transportationReceipts.length) {
        transportationReceiptPaths.push(expenseClaim.transportationReceipts[index]);
      }
    }

    // Delete receipts that are not being kept
    for (let i = 0; i < expenseClaim.transportationReceipts.length; i++) {
      if (!keptTransportationIndices.includes(i)) {
        try {
          await deleteFile(expenseClaim.transportationReceipts[i]);
        } catch (error) {
          console.error(`Failed to delete transportation receipt ${i}:`, error);
        }
      }
    }

    // Upload new transportation files
    for (const file of transportationFiles) {
      validateFile(file, 'Transportation receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      transportationReceiptPaths.push(path);
    }

    // Process other receipts
    const otherReceiptPaths: string[] = [];

    // Keep selected existing receipts
    for (const index of keptOtherIndices) {
      if (index < expenseClaim.otherReceipts.length) {
        otherReceiptPaths.push(expenseClaim.otherReceipts[index]);
      }
    }

    // Delete receipts that are not being kept
    for (let i = 0; i < expenseClaim.otherReceipts.length; i++) {
      if (!keptOtherIndices.includes(i)) {
        try {
          await deleteFile(expenseClaim.otherReceipts[i]);
        } catch (error) {
          console.error(`Failed to delete other receipt ${i}:`, error);
        }
      }
    }

    // Upload new other files
    for (const file of otherFiles) {
      validateFile(file, 'Other receipt');
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await uploadFile(buffer, file.name);
      otherReceiptPaths.push(path);
    }

    // Merge receipts per category if multiple files exist
    const finalAccommodationReceipts = await processCategoryReceipts(
      accommodationReceiptPaths,
      'accommodation',
      params.id
    );
    const finalTransportationReceipts = await processCategoryReceipts(
      transportationReceiptPaths,
      'transportation',
      params.id
    );
    const finalOtherReceipts = await processCategoryReceipts(
      otherReceiptPaths,
      'other',
      params.id
    );

    // Update the expense claim with merged receipt paths
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
        accommodationReceipts: finalAccommodationReceipts,
        transportationReceipts: finalTransportationReceipts,
        otherReceipts: finalOtherReceipts,
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

    // Send email to department approver (via travel request's department)
    const approverEmail = await getApproverEmail(expenseClaim.travelRequest.departmentId);

    if (approverEmail) {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: approverEmail,
          subject: `Expense Claim Resubmitted - ${eventName}`,
          html: emailHtml
        })
      });
    }

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
