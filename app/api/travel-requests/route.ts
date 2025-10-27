
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getApprovalFilter, getApproverEmail } from "@/lib/approvers";

export const dynamic = "force-dynamic";

// Helper function to format dates as dd/mm/yyyy
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    let where: any = {};

    // If user is approver or admin, show requests based on department filter
    if (userRole === "APPROVER" || userRole === "ADMIN") {
      const approvalFilter = await getApprovalFilter(userId);
      where = { ...where, ...approvalFilter };
    } else {
      // Regular users see only their own requests
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.travelRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            position: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        expenseClaims: true,
        transportationItems: true,
        approvals: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        submittedAt: "desc"
      }
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching travel requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      position,
      dateOfApplication,
      destinationCountry,
      destinationCity,
      eventOrganiser,
      eventName,
      travelDateFrom,
      travelDateTo,
      purpose,
      estimatedCosts,
      estimatedAccommodation,
      transportationItems,
      estimatedOther,
      estimatedOtherDescription
    } = body;

    if (!name || !position || !dateOfApplication || !destinationCountry || 
        !eventOrganiser || !eventName || !travelDateFrom || !travelDateTo || 
        !purpose || estimatedCosts === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // Get user info including department for routing
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        position: true,
        departmentId: true
      }
    });

    // Create the travel request with transportation items and department
    const travelRequest = await prisma.travelRequest.create({
      data: {
        userId,
        name,
        position,
        dateOfApplication: new Date(dateOfApplication),
        destinationCountry,
        destinationCity: destinationCity || null,
        eventOrganiser,
        eventName,
        travelDateFrom: new Date(travelDateFrom),
        travelDateTo: new Date(travelDateTo),
        purpose,
        estimatedCosts: parseFloat(estimatedCosts.toString()),
        estimatedAccommodation: estimatedAccommodation ? parseFloat(estimatedAccommodation.toString()) : null,
        estimatedOther: estimatedOther ? parseFloat(estimatedOther.toString()) : null,
        estimatedOtherDescription: estimatedOtherDescription || null,
        status: "PENDING",
        departmentId: user?.departmentId || null, // Auto-populate from user's department
        transportationItems: {
          create: (transportationItems || []).map((item: any) => ({
            description: item.description,
            estimatedCost: parseFloat(item.estimatedCost.toString())
          }))
        }
      }
    });

    // Send email notification to department approver or global approver
    const approverEmail = await getApproverEmail(user?.departmentId);

    if (approverEmail) {
      const approvalLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals`;
      const destinationText = destinationCity
        ? `${destinationCity}, ${destinationCountry}`
        : destinationCountry;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Travel Request Submitted</h2>
          <p><strong>Submitted by:</strong> ${name}</p>
          <p><strong>Position:</strong> ${user?.position || position}</p>
          <p><strong>Destination:</strong> ${destinationText}</p>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Travel Dates:</strong> ${formatDate(travelDateFrom)} - ${formatDate(travelDateTo)}</p>
          <p><strong>Estimated Costs:</strong> €${estimatedCosts}</p>
          <p><strong>Purpose:</strong> ${purpose}</p>
          <div style="margin-top: 20px;">
            <a href="${approvalLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Request</a>
          </div>
        </div>
      `;

      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: approverEmail,
          subject: `New Travel Request: ${destinationCountry} - ${name}`,
          html: emailHtml
        })
      });
    }

    return NextResponse.json({ travelRequest });
  } catch (error) {
    console.error("Error creating travel request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
