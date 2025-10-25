

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const claimId = params.id;
    
    // Find the expense claim
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: claimId },
      include: {
        travelRequest: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!expenseClaim) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
    }

    // Verify the claim belongs to the user
    const userId = (session.user as any).id;
    if (expenseClaim.travelRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow acknowledgment for approved claims
    if (expenseClaim.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Can only acknowledge payment for approved expense claims" },
        { status: 400 }
      );
    }

    // Update expense claim status to CLOSED
    await prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        status: "CLOSED"
      }
    });

    // Also close the associated Travel Request
    await prisma.travelRequest.update({
      where: { id: expenseClaim.travelRequestId },
      data: {
        status: "CLOSED"
      }
    });

    return NextResponse.json({ 
      message: "Payment acknowledged successfully",
      success: true 
    });
  } catch (error) {
    console.error("Error acknowledging payment:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge payment" },
      { status: 500 }
    );
  }
}
