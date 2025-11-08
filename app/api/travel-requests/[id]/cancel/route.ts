import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildEmailTemplate, createInfoBox, createDetailsTable } from "@/lib/email-template";

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
    const detailsTable = createDetailsTable([
      { label: 'Event', value: travelRequest.eventName },
      { label: 'Destination', value: travelRequest.destinationCountry },
      { label: 'Travel Dates', value: `${new Date(travelRequest.travelDateFrom).toLocaleDateString()} - ${new Date(travelRequest.travelDateTo).toLocaleDateString()}` }
    ]);

    const reasonBox = reason ? createInfoBox(`<strong>Reason:</strong><br/>${reason}`, 'error') : '';

    const emailHtml = buildEmailTemplate({
      title: 'Travel Request Cancelled',
      greeting: `Dear ${travelRequest.name},`,
      content: `<p style="margin: 0 0 16px 0;">Your approved travel request to <strong>${travelRequest.destinationCountry}</strong> has been cancelled.</p><p style="margin: 0;">If you have any questions, please contact the approver.</p>`,
      additionalSections: detailsTable + reasonBox,
      buttonText: 'View Dashboard',
      buttonUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    });

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
