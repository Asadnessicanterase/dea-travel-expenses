
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isApprover = user.role === "APPROVER";

    // Get travel requests summary
    let travelRequestsSummary;
    if (isApprover) {
      // Approver sees all requests
      travelRequestsSummary = await prisma.travelRequest.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      });
    } else {
      // User sees only their own requests
      travelRequestsSummary = await prisma.travelRequest.groupBy({
        by: ["status"],
        where: {
          userId: user.id,
        },
        _count: {
          id: true,
        },
      });
    }

    // Convert to easier format
    const travelRequests = {
      pending: 0,
      approved: 0,
      denied: 0,
      amendmentRequested: 0,
      closed: 0,
    };

    travelRequestsSummary.forEach((item: any) => {
      const count = item._count.id;
      switch (item.status) {
        case "PENDING":
          travelRequests.pending = count;
          break;
        case "APPROVED":
          travelRequests.approved = count;
          break;
        case "DENIED":
          travelRequests.denied = count;
          break;
        case "AMENDMENT_REQUESTED":
          travelRequests.amendmentRequested = count;
          break;
        case "CLOSED":
          travelRequests.closed = count;
          break;
      }
    });

    // Get expense claims summary (grouped by their own status, not parent request status)
    let expenseClaimsSummary;
    if (isApprover) {
      // Approver sees all expense claims
      expenseClaimsSummary = await prisma.expenseClaim.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      });
    } else {
      // User sees only their own expense claims
      expenseClaimsSummary = await prisma.expenseClaim.groupBy({
        by: ["status"],
        where: {
          travelRequest: {
            userId: user.id,
          },
        },
        _count: {
          id: true,
        },
      });
    }

    // Count expense claims by their own status
    const expenseClaims = {
      pending: 0,
      approved: 0,
      denied: 0,
      amendmentRequested: 0,
      closed: 0,
    };

    expenseClaimsSummary.forEach((item: any) => {
      const count = item._count.id;
      switch (item.status) {
        case "PENDING":
          expenseClaims.pending = count;
          break;
        case "APPROVED":
          expenseClaims.approved = count;
          break;
        case "DENIED":
          expenseClaims.denied = count;
          break;
        case "AMENDMENT_REQUESTED":
          expenseClaims.amendmentRequested = count;
          break;
        case "CLOSED":
          expenseClaims.closed = count;
          break;
      }
    });

    return NextResponse.json({
      travelRequests,
      expenseClaims,
      isApprover,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
