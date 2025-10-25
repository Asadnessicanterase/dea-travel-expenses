
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

    // Fetch all approved and closed expense claims for analysis
    const expenseClaims = await prisma.expenseClaim.findMany({
      where: {
        status: {
          in: ["APPROVED", "CLOSED"]
        }
      },
      include: {
        travelRequest: {
          select: {
            id: true,
            eventName: true,
            destinationCountry: true,
            destinationCity: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    // Fetch all travel requests for destination analysis
    const travelRequests = await prisma.travelRequest.findMany({
      where: {
        status: {
          in: ["APPROVED", "CLOSED"]
        }
      },
      select: {
        id: true,
        destinationCountry: true,
        destinationCity: true,
        estimatedCosts: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    // 1. EXPENSE CATEGORY BREAKDOWN
    const categoryBreakdown = {
      accommodation: 0,
      transportation: 0,
      other: 0,
      total: 0
    };

    expenseClaims.forEach(claim => {
      categoryBreakdown.accommodation += claim.accommodation || 0;
      categoryBreakdown.transportation += claim.transportation || 0;
      categoryBreakdown.other += claim.otherAmount || 0;
      categoryBreakdown.total += claim.amount || 0;
    });

    // 2. FINANCIAL REPORTS
    // Outstanding payments (approved but not yet closed)
    const outstandingPayments = await prisma.expenseClaim.findMany({
      where: {
        status: "APPROVED"
      },
      include: {
        travelRequest: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const outstandingTotal = outstandingPayments.reduce(
      (sum, claim) => sum + (claim.actualAmount || claim.amount),
      0
    );

    // Payment vouchers (closed claims with voucher numbers)
    const paymentVouchers = await prisma.expenseClaim.findMany({
      where: {
        status: "CLOSED",
        voucherNumber: {
          not: null
        }
      },
      include: {
        travelRequest: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 50 // Last 50 vouchers
    });

    // 3. DESTINATION ANALYSIS
    const destinationStats: Record<string, {
      country: string;
      city: string | null;
      tripCount: number;
      totalCost: number;
      avgCost: number;
    }> = {};

    travelRequests.forEach(req => {
      const key = `${req.destinationCountry}|${req.destinationCity || ''}`;
      
      if (!destinationStats[key]) {
        destinationStats[key] = {
          country: req.destinationCountry,
          city: req.destinationCity || null,
          tripCount: 0,
          totalCost: 0,
          avgCost: 0
        };
      }
      
      destinationStats[key].tripCount += 1;
      destinationStats[key].totalCost += req.estimatedCosts;
    });

    // Calculate averages and sort by trip count
    const destinations = Object.values(destinationStats)
      .map(dest => ({
        ...dest,
        avgCost: dest.totalCost / dest.tripCount
      }))
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 10); // Top 10 destinations

    return NextResponse.json({
      categoryBreakdown,
      financialReports: {
        outstandingPayments: outstandingPayments.map(payment => ({
          id: payment.id,
          userName: payment.travelRequest.user.name,
          userEmail: payment.travelRequest.user.email,
          eventName: payment.travelRequest.eventName,
          amount: payment.actualAmount || payment.amount,
          description: payment.description,
          date: payment.date,
          createdAt: payment.createdAt
        })),
        outstandingTotal,
        paymentVouchers: paymentVouchers.map(voucher => ({
          id: voucher.id,
          voucherNumber: voucher.voucherNumber,
          userName: voucher.travelRequest.user.name,
          userEmail: voucher.travelRequest.user.email,
          eventName: voucher.travelRequest.eventName,
          amount: voucher.actualAmount || voucher.amount,
          description: voucher.description,
          paidDate: voucher.updatedAt
        }))
      },
      destinations
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
