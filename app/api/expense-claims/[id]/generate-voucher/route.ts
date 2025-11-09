
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePaymentVoucherPDF } from "@/lib/voucher-pdf";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // Only approvers and admins can generate vouchers
    if (!user || (user.role !== "APPROVER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Only approvers and admins can generate vouchers" },
        { status: 403 }
      );
    }

    // Fetch expense claim with related data
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
      include: {
        travelRequest: {
          include: {
            user: true,
            transportationItems: true,
          },
        },
        expenseApprovals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!expenseClaim) {
      return NextResponse.json(
        { error: "Expense claim not found" },
        { status: 404 }
      );
    }

    // Only generate for CLOSED (acknowledged) claims
    if (expenseClaim.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Voucher can only be generated for acknowledged payments" },
        { status: 400 }
      );
    }

    // Check if voucher already exists
    if (expenseClaim.voucherPdfPath) {
      return NextResponse.json({
        message: "Voucher already exists",
        voucherPdfPath: expenseClaim.voucherPdfPath,
      });
    }

    // Calculate costs (meals are part of "other" in the current schema)
    const accommodationCost = expenseClaim.accommodation || 0;
    const transportationCost = expenseClaim.transportation || 0;
    const otherCost = expenseClaim.otherAmount || 0;
    const totalAmount = expenseClaim.amount;

    // Calculate estimated total from travel request
    const estimatedAccommodation = expenseClaim.travelRequest.estimatedAccommodation || 0;
    const estimatedTransportation = expenseClaim.travelRequest.transportationItems.reduce(
      (sum: number, item: { estimatedCost: number }) => sum + item.estimatedCost,
      0
    );
    const estimatedOther = expenseClaim.travelRequest.estimatedOther || 0;
    const estimatedTotal = expenseClaim.travelRequest.estimatedCosts;

    // Calculate variance
    const variance = totalAmount - estimatedTotal;

    // Get approver information
    const latestApproval = expenseClaim.expenseApprovals[0];
    const approverEmail = latestApproval?.approverEmail || "Unknown";
    const approverUser = await prisma.user.findUnique({
      where: { email: approverEmail },
    });

    // Format dates
    const travelDateFrom = new Date(expenseClaim.travelRequest.travelDateFrom);
    const travelDateTo = new Date(expenseClaim.travelRequest.travelDateTo);
    const travelDates = `${travelDateFrom.toLocaleDateString('en-GB')} - ${travelDateTo.toLocaleDateString('en-GB')}`;

    const approvalDate = latestApproval
      ? new Date(latestApproval.createdAt).toLocaleDateString('en-GB')
      : "N/A";

    const paymentDate = expenseClaim.updatedAt
      ? new Date(expenseClaim.updatedAt).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');

    // Prepare voucher data
    const voucherData = {
      voucherNumber: expenseClaim.voucherNumber || "N/A",
      employeeName: expenseClaim.travelRequest.user.name || "Unknown",
      employeeEmail: expenseClaim.travelRequest.user.email || "Unknown",
      employeePosition: expenseClaim.travelRequest.position,
      eventName: expenseClaim.travelRequest.eventName,
      destination: `${expenseClaim.travelRequest.destinationCity ? expenseClaim.travelRequest.destinationCity + ', ' : ''}${expenseClaim.travelRequest.destinationCountry}`,
      travelDates,
      accommodationCost,
      transportationCost,
      mealsCost: 0, // Currently no separate meals field
      otherCost,
      otherDescription: expenseClaim.otherDescription || undefined,
      totalAmount,
      estimatedTotal,
      variance,
      approverName: approverUser?.name || approverEmail,
      approvalDate,
      paymentDate,
    };

    // Generate PDF (async operation)
    const voucherPdfPath = await generatePaymentVoucherPDF(voucherData);

    // Update expense claim with voucher info
    await prisma.expenseClaim.update({
      where: { id: params.id },
      data: {
        voucherPdfPath,
        voucherGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Voucher generated successfully",
      voucherPdfPath,
    });
  } catch (error) {
    console.error("Error generating voucher:", error);
    return NextResponse.json(
      { error: "Failed to generate voucher. Please try again later." },
      { status: 500 }
    );
  }
}
