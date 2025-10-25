
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const travelRequest = await prisma.travelRequest.findUnique({
      where: { id: params.id },
      include: {
        expenseClaims: true
      }
    });

    if (!travelRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check ownership
    if (travelRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only close approved requests
    if (travelRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Can only close approved requests" },
        { status: 400 }
      );
    }

    // Update to closed status
    const updatedRequest = await prisma.travelRequest.update({
      where: { id: params.id },
      data: {
        status: "CLOSED"
      }
    });

    return NextResponse.json({ travelRequest: updatedRequest });
  } catch (error) {
    console.error("Error closing travel request:", error);
    return NextResponse.json(
      { error: "Failed to close request" },
      { status: 500 }
    );
  }
}
