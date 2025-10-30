import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateVoucherNumber } from "@/lib/budget";
import { generatePaymentVoucherWithReceipts } from "@/lib/voucher-pdf";
import { downloadFile } from "@/lib/storage";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { canUserApprove } from "@/lib/approvers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- FIX: define approverUser and approverEmail ---
    const approverUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });
    const approverEmail = approverUser?.email || (session.user as any).email;

    const userId = (session.user as any).id;

    const body = await request.json();
    const { action, comment } = body; // APPROVE, DENY, or REQUEST_AMENDMENT

    if (!["APPROVE", "DENY", "REQUEST_AMENDMENT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
      include: {
        travelRequest: { include: { user: true } },
      },
    });

    if (!expenseClaim) {
      return NextResponse.json(
        { error: "Expense claim not found" },
        { status: 404 }
      );
    }

    // Check if user can approve this expense claim
    const canApprove = await canUserApprove(
      userId,
      expenseClaim.travelRequest.departmentId
    );
    if (!canApprove) {
      return NextResponse.json(
        { error: "Forbidden - You cannot approve this expense claim" },
        { status: 403 }
      );
    }

    // Calculate total
    const actualAmount =
      (expenseClaim.accommodation || 0) +
      (expenseClaim.transportation || 0) +
      (expenseClaim.otherAmount || 0);

    let voucherNumber: string | null = null;
    let voucherPdfPath: string | null = null;

    // --- APPROVAL LOGIC ---
    if (action === "APPROVE") {
      voucherNumber = await generateVoucherNumber();

      const fullExpenseClaim = await prisma.expenseClaim.findUnique({
        where: { id: params.id },
        include: {
          travelRequest: {
            include: {
              user: true,
              transportationItems: true,
            },
          },
        },
      });

      if (fullExpenseClaim) {
        const accommodationCost = fullExpenseClaim.accommodation || 0;
        const transportationCost = fullExpenseClaim.transportation || 0;
        const otherCost = fullExpenseClaim.otherAmount || 0;

        const estimatedAccommodation =
          fullExpenseClaim.travelRequest.estimatedAccommodation || 0;
        const estimatedTransportation =
          fullExpenseClaim.travelRequest.transportationItems.reduce(
            (sum: number, item: { estimatedCost: number }) =>
              sum + item.estimatedCost,
            0
          );
        const estimatedOther =
          fullExpenseClaim.travelRequest.estimatedOther || 0;
        const estimatedTotal = fullExpenseClaim.travelRequest.estimatedCosts;

        const variance = actualAmount - estimatedTotal;

        const travelDateFrom = new Date(
          fullExpenseClaim.travelRequest.travelDateFrom
        );
        const travelDateTo = new Date(
          fullExpenseClaim.travelRequest.travelDateTo
        );
        const travelDates = `${formatDateDDMMYYYY(
          travelDateFrom
        )} - ${formatDateDDMMYYYY(travelDateTo)}`;

        const approvalDate = formatDateDDMMYYYY(new Date());

        // Build voucher payload
        const voucherData = {
          voucherNumber,
          employeeName: fullExpenseClaim.travelRequest.user.name || "Unknown",
          employeeEmail: fullExpenseClaim.travelRequest.user.email || "Unknown",
          employeePosition: fullExpenseClaim.travelRequest.position,
          eventName: fullExpenseClaim.travelRequest.eventName,
          destination: `${
            fullExpenseClaim.travelRequest.destinationCity
              ? fullExpenseClaim.travelRequest.destinationCity + ", "
              : ""
          }${fullExpenseClaim.travelRequest.destinationCountry}`,
          travelDates,
          accommodationCost,
          transportationCost,
          mealsCost: 0,
          otherCost,
          otherDescription: fullExpenseClaim.otherDescription || undefined,
          totalAmount: actualAmount,
          estimatedTotal,
          variance,
          approverName: approverUser?.name || approverEmail,
          approvalDate,
          paymentDate: "Pending",
        };

        try {
          voucherPdfPath = await generatePaymentVoucherWithReceipts(
            voucherData,
            {
              accommodationReceipt:
                fullExpenseClaim.accommodationReceipt || undefined,
              transportationReceipt:
                fullExpenseClaim.transportationReceipt || undefined,
              otherReceipt: fullExpenseClaim.otherReceipt || undefined,
            }
          );
        } catch (error) {
          console.error("Error generating voucher PDF with receipts:", error);
        }
      }
    }

    const newStatus =
      action === "APPROVE"
        ? "APPROVED"
        : action === "DENY"
        ? "DENIED"
        : "AMENDMENT_REQUESTED";

    await prisma.expenseClaim.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        approverComment: comment || null,
        actualAmount: action === "APPROVE" ? actualAmount : null,
        voucherNumber: action === "APPROVE" ? voucherNumber : null,
        voucherPdfPath: action === "APPROVE" ? voucherPdfPath : null,
        voucherGeneratedAt:
          action === "APPROVE" && voucherPdfPath ? new Date() : null,
      },
    });

    if (action === "APPROVE") {
      await prisma.travelRequest.update({
        where: { id: expenseClaim.travelRequestId },
        data: { reservedAmount: null },
      });
    }

    await prisma.expenseApproval.create({
      data: {
        expenseClaimId: params.id,
        action,
        comment: comment || null,
        approverEmail,
      },
    });

    // --- EMAILS ---
    const actionText =
      action === "APPROVE"
        ? "approved for payment"
        : action === "DENY"
        ? "denied"
        : "returned for amendment";

    const statusColor =
      action === "APPROVE"
        ? "#10b981"
        : action === "DENY"
        ? "#ef4444"
        : "#f59e0b";

    const emailSubject =
      action === "APPROVE"
        ? "Expense Claim Approved for Payment"
        : action === "DENY"
        ? "Expense Claim Denied"
        : "Expense Claim Returned for Amendment";

    const emailTitle =
      action === "APPROVE"
        ? "Approved for Payment"
        : action === "DENY"
        ? "Denied"
        : "Returned for Amendment";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor};">Expense Claim ${emailTitle}</h2>
        <p>Your expense claim has been ${actionText}.</p>
        <p><strong>Description:</strong> ${expenseClaim.description}</p>
        <p><strong>Amount:</strong> €${expenseClaim.amount.toFixed(2)}</p>
        ${
          voucherNumber
            ? `<p><strong>Payment Voucher:</strong> ${voucherNumber}</p>`
            : ""
        }
        ${comment ? `<p><strong>Approver Comment:</strong> ${comment}</p>` : ""}
      </div>
    `;

    await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/send-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expenseClaim.travelRequest.user.email,
          subject: emailSubject,
          html: emailHtml,
        }),
      }
    );

    if (action === "APPROVE" && voucherPdfPath && voucherNumber) {
      try {
        const voucherDownloadUrl = await downloadFile(voucherPdfPath);
        const approverEmailSubject = `Payment Voucher Generated - ${voucherNumber}`;
        const approverEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Payment Voucher Generated</h2>
            <p>A payment voucher has been generated for an approved expense claim.</p>
            <p><strong>Voucher Number:</strong> ${voucherNumber}</p>
            <p><strong>Employee:</strong> ${
              expenseClaim.travelRequest.user.name || "Unknown"
            }</p>
            <p><strong>Event:</strong> ${
              expenseClaim.travelRequest.eventName
            }</p>
            <p><strong>Total Amount:</strong> €${actualAmount.toFixed(2)}</p>
            <a href="${voucherDownloadUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Download Voucher PDF</a>
          </div>
        `;

        await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/send-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: approverEmail,
              subject: approverEmailSubject,
              html: approverEmailHtml,
            }),
          }
        );

        console.log(`Voucher email sent to approver: ${approverEmail}`);
      } catch (error) {
        console.error("Error sending voucher email to approver:", error);
      }
    }

    return NextResponse.json({
      message: `Expense claim ${actionText} successfully`,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error approving expense claim:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
