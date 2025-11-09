
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkBudgetAvailability } from "@/lib/budget";
import { canUserApprove } from "@/lib/approvers";
import { buildEmailTemplate, createInfoBox } from "@/lib/email-template";

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

    const userId = (session.user as any).id;

    const body = await request.json();
    const { action, comment } = body; // action: "APPROVE", "DENY", "REQUEST_AMENDMENT"

    if (!action || !["APPROVE", "DENY", "REQUEST_AMENDMENT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const travelRequest = await prisma.travelRequest.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        transportationItems: true
      }
    });

    if (!travelRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if user can approve this specific request (department-aware)
    const canApprove = await canUserApprove(userId, travelRequest.departmentId);
    if (!canApprove) {
      return NextResponse.json(
        { error: "Forbidden - You cannot approve this request" },
        { status: 403 }
      );
    }

    // Map action to status
    let newStatus: "APPROVED" | "DENIED" | "AMENDMENT_REQUESTED";
    if (action === "APPROVE") {
      newStatus = "APPROVED";
    } else if (action === "DENY") {
      newStatus = "DENIED";
    } else {
      newStatus = "AMENDMENT_REQUESTED";
    }

    // estimatedCosts already includes all costs (accommodation + transportation + other)
    // So we don't need to calculate anything extra
    const totalEstimatedCost = travelRequest.estimatedCosts;

    // Check budget availability if approving
    let budgetWarning = null;
    if (action === "APPROVE") {
      const year = new Date(travelRequest.travelDateFrom).getFullYear();
      const budgetCheck = await checkBudgetAvailability(year, totalEstimatedCost);
      
      if (!budgetCheck.available) {
        budgetWarning = {
          message: `Warning: This approval will exceed the available budget by €${Math.abs(budgetCheck.summary.availableBudget - totalEstimatedCost).toFixed(2)}`,
          summary: budgetCheck.summary
        };
      }
    }

    // Update the travel request
    const updatedRequest = await prisma.travelRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        approverComment: comment || null,
        // Reserve budget when approving
        reservedAmount: action === "APPROVE" ? totalEstimatedCost : null
      }
    });

    // Create approval record
    await prisma.approval.create({
      data: {
        travelRequestId: params.id,
        action,
        comment: comment || null,
        approverEmail: session.user.email || ""
      }
    });

    // Send email notification to submitter
    const actionText = action === "APPROVE" ? "Approved" : action === "DENY" ? "Denied" : "Returned for Amendment";

    let greeting = `Dear ${travelRequest.name},`;
    let content = `<p style="margin: 0;">Your travel request for <strong>${travelRequest.destinationCountry}</strong> has been <strong>${actionText.toLowerCase()}</strong>.</p>`;

    // Add action-specific content
    if (action === "AMENDMENT_REQUESTED") {
      content += `<p style="margin: 16px 0 0 0;">Please login to your account to review the comments and resubmit your request with the requested changes.</p>`;
    } else if (action === "APPROVE") {
      content += `<p style="margin: 16px 0 0 0;">You can now proceed to submit expense claims for this trip.</p>`;
    }

    // Add comment box if comment exists
    const commentBox = comment ? createInfoBox(`<strong>Comment:</strong><br/>${comment}`,
      action === "APPROVE" ? "success" : action === "DENY" ? "error" : "warning") : '';

    const emailHtml = buildEmailTemplate({
      title: `Travel Request ${actionText}`,
      greeting,
      content,
      additionalSections: commentBox,
      buttonText: 'View Dashboard',
      buttonUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    });

    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: travelRequest.user?.email || '',
        subject: `Travel Request ${actionText}: ${travelRequest.destinationCountry}`,
        html: emailHtml
      })
    });

    return NextResponse.json({ 
      travelRequest: updatedRequest,
      budgetWarning 
    });
  } catch (error) {
    console.error("Error approving travel request:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
