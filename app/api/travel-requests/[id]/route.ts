
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApproverEmail } from "@/lib/approvers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper function to format dates as dd/mm/yyyy
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const travelRequest = await prisma.travelRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            position: true
          }
        },
        expenseClaims: {
          orderBy: {
            createdAt: "desc"
          }
        },
        transportationItems: true,
        approvals: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!travelRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if user has permission to view this request
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    
    if (userRole !== "APPROVER" && travelRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ travelRequest });
  } catch (error) {
    console.error("Error fetching travel request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // First check if the request exists and belongs to the user
    const existingRequest = await prisma.travelRequest.findUnique({
      where: { id: params.id },
      include: {
        department: {
          select: { id: true }
        },
        user: {
          select: { departmentId: true }
        }
      }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existingRequest.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow updates if status is AMENDMENT_REQUESTED
    if (existingRequest.status !== "AMENDMENT_REQUESTED") {
      return NextResponse.json(
        { error: "Can only update requests with amendment requested status" },
        { status: 400 }
      );
    }

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
      estimatedOther,
      estimatedOtherDescription,
      transportationItems = [],
    } = body;

    const parseAmount = (value: unknown) => {
      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const accommodationAmount = parseAmount(estimatedAccommodation);
    const otherAmount = parseAmount(estimatedOther);
    const sanitizedTransportationItems = Array.isArray(transportationItems)
      ? transportationItems
          .map((item: any) => ({
            description: (item?.description || "").toString().trim(),
            estimatedCost: parseAmount(item?.estimatedCost),
          }))
          .filter((item) => item.description && item.estimatedCost > 0)
      : [];
    const totalTransportation = sanitizedTransportationItems.reduce(
      (sum, item) => sum + item.estimatedCost,
      0
    );
    const calculatedTotal = accommodationAmount + totalTransportation + otherAmount;
    const otherDescription =
      otherAmount > 0 ? (estimatedOtherDescription || "").toString().trim() : null;

    const updatedRequest = await prisma.travelRequest.update({
      where: { id: params.id },
      data: {
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
        estimatedCosts: calculatedTotal,
        estimatedAccommodation: accommodationAmount > 0 ? accommodationAmount : null,
        estimatedOther: otherAmount > 0 ? otherAmount : null,
        estimatedOtherDescription: otherDescription,
        status: "PENDING", // Reset to pending after amendment
        approverComment: null,
        transportationItems: {
          deleteMany: {},
          create: sanitizedTransportationItems.map((item) => ({
            description: item.description,
            estimatedCost: item.estimatedCost,
          })),
        },
      }
    });

    // Send email notification to approver about the resubmission
    const approvalLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals`;
    const destinationText = destinationCity 
      ? `${destinationCity}, ${destinationCountry}` 
      : destinationCountry;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Amended Travel Request Resubmitted</h2>
        <p><strong>Submitted by:</strong> ${name}</p>
        <p><strong>Position:</strong> ${position}</p>
        <p><strong>Destination:</strong> ${destinationText}</p>
        <p><strong>Travel Dates:</strong> ${formatDate(travelDateFrom)} - ${formatDate(travelDateTo)}</p>
        <p><strong>Estimated Costs:</strong> â‚¬${calculatedTotal}</p>
        <div style="margin-top: 20px;">
          <a href="${approvalLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Updated Request</a>
        </div>
      </div>
    `;

    const approverEmail = await getApproverEmail(
      existingRequest.departmentId || existingRequest.user?.departmentId
    );

    if (approverEmail) {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: approverEmail,
          subject: `Amended Travel Request Resubmitted: ${destinationCountry} - ${name}`,
          html: emailHtml
        })
      });
    } else {
      console.warn(
        `No approver email found for amended travel request ${existingRequest.id}; skipping notification.`
      );
    }

    return NextResponse.json({ travelRequest: updatedRequest });
  } catch (error) {
    console.error("Error updating travel request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

