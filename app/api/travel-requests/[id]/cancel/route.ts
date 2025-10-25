import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const APPROVER_EMAIL = "conrad.kraft@digital-euro-association.de";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only approvers can cancel trips
    const isApprover = (session.user as any).role === "APPROVER" || session.user.email === APPROVER_EMAIL;
    if (!isApprover) {
      return NextResponse.json({ error: "Forbidden - Only approvers can cancel trips" }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    const travelRequest = await prisma.travelRequest.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        expenseClaims: {
          where: { status: 'APPROVED' }
        }
      }
    });

    if (!travelRequest) {
      return NextResponse.json({ error: "Travel request not found" }, { status: 404 });
    }

    // Can't cancel if expense claim already approved
    if (travelRequest.expenseClaims.length > 0) {
      return NextResponse.json({ 
        error: "Cannot cancel - expense claims have already been approved for this trip" 
      }, { status: 400 });
    }

    // Cancel the trip and release the budget reservation
    const updatedRequest = await prisma.travelRequest.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: session.user.email,
        cancelledReason: reason || null,
        reservedAmount: null // Release the budget reservation
      }
    });

    // Send email notification to the employee
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Travel Request Cancelled</h2>
        <p>Dear ${travelRequest.name},</p>
        <p>Your approved travel request to <strong>${travelRequest.destinationCountry}</strong> has been cancelled.</p>
        <p><strong>Event:</strong> ${travelRequest.eventName}</p>
        <p><strong>Travel Dates:</strong> ${new Date(travelRequest.travelDateFrom).toLocaleDateString()} - ${new Date(travelRequest.travelDateTo).toLocaleDateString()}</p>
        ${reason ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 5px 0 0 0;">${reason}</p>
        </div>` : ''}
        <p>If you have any questions, please contact the approver.</p>
        <div style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
        </div>
      </div>
    `;

    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: travelRequest.user.email,
        subject: `Travel Request Cancelled: ${travelRequest.eventName}`,
        html: emailHtml
      })
    });

    return NextResponse.json({ 
      success: true,
      travelRequest: updatedRequest 
    });
  } catch (error) {
    console.error("Error cancelling travel request:", error);
    return NextResponse.json(
      { error: "Failed to cancel trip" },
      { status: 500 }
    );
  }
}
