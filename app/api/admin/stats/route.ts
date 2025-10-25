
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get total travel requests
    const totalRequests = await prisma.travelRequest.count();

    // Get pending travel requests
    const pendingRequests = await prisma.travelRequest.count({
      where: { status: "PENDING" }
    });

    // Get total expense claims
    const totalClaims = await prisma.expenseClaim.count();

    // Get pending expense claims
    const pendingClaims = await prisma.expenseClaim.count({
      where: { status: "PENDING" }
    });

    // Get total approved amount (travel requests + expense claims)
    const approvedRequests = await prisma.travelRequest.findMany({
      where: { status: { in: ["APPROVED", "CLOSED"] } },
      select: { estimatedCosts: true }
    });

    const approvedClaims = await prisma.expenseClaim.findMany({
      where: { status: "APPROVED" },
      select: { amount: true }
    });

    const totalApproved = 
      approvedRequests.reduce((sum, req) => sum + req.estimatedCosts, 0) +
      approvedClaims.reduce((sum, claim) => sum + claim.amount, 0);

    // Get requests by status for chart
    const requestsByStatus = await prisma.travelRequest.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const formattedRequestsByStatus = requestsByStatus.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // Get monthly spending for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRequests = await prisma.travelRequest.findMany({
      where: {
        status: { in: ["APPROVED", "CLOSED"] },
        submittedAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        estimatedCosts: true,
        submittedAt: true
      }
    });

    const monthlyClaims = await prisma.expenseClaim.findMany({
      where: {
        status: "APPROVED",
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    // Group by month
    const monthlyData: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    monthlyRequests.forEach(req => {
      const month = `${monthNames[req.submittedAt.getMonth()]} ${req.submittedAt.getFullYear()}`;
      monthlyData[month] = (monthlyData[month] || 0) + req.estimatedCosts;
    });

    monthlyClaims.forEach(claim => {
      const month = `${monthNames[claim.createdAt.getMonth()]} ${claim.createdAt.getFullYear()}`;
      monthlyData[month] = (monthlyData[month] || 0) + claim.amount;
    });

    const monthlySpending = Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));

    // Get top users by spending
    const allRequests = await prisma.travelRequest.findMany({
      where: {
        status: { in: ["APPROVED", "CLOSED"] }
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    // Get closed expense claims (acknowledged payments)
    const allClaims = await prisma.expenseClaim.findMany({
      where: {
        status: "CLOSED"
      },
      include: {
        travelRequest: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Calculate trip count and actual payments per user
    const userStats: Record<string, { tripCount: number; totalPaid: number }> = {};

    // Count approved trips per user
    allRequests.forEach(req => {
      const userName = req.user.name || "Unknown";
      if (!userStats[userName]) {
        userStats[userName] = { tripCount: 0, totalPaid: 0 };
      }
      userStats[userName].tripCount += 1;
    });

    // Sum actual paid amounts (from closed/acknowledged expense claims)
    allClaims.forEach(claim => {
      const userName = claim.travelRequest.user.name || "Unknown";
      if (!userStats[userName]) {
        userStats[userName] = { tripCount: 0, totalPaid: 0 };
      }
      // Use actualAmount if available, otherwise fallback to amount
      const paidAmount = claim.actualAmount ?? claim.amount;
      userStats[userName].totalPaid += paidAmount;
    });

    const topUsers = Object.entries(userStats)
      .map(([name, stats]) => ({ 
        name, 
        totalSpent: stats.totalPaid,
        tripCount: stats.tripCount
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return NextResponse.json({
      totalUsers,
      totalRequests,
      totalClaims,
      totalApproved,
      pendingRequests,
      pendingClaims,
      requestsByStatus: formattedRequestsByStatus,
      monthlySpending,
      topUsers,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
