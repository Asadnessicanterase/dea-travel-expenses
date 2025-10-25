
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the type parameter from the query string
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'accommodation';

    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
      include: {
        travelRequest: true
      }
    });

    if (!expenseClaim) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
    }

    // Check permission
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    
    if (userRole !== "APPROVER" && expenseClaim.travelRequest?.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the appropriate receipt path based on type
    let receiptPath: string | null = null;
    
    if (type === 'accommodation') {
      receiptPath = expenseClaim.accommodationReceipt;
    } else if (type === 'transportation') {
      receiptPath = expenseClaim.transportationReceipt;
    } else if (type === 'other') {
      receiptPath = expenseClaim.otherReceipt;
    }

    if (!receiptPath) {
      return NextResponse.json({ error: "No receipt found for this type" }, { status: 404 });
    }

    const signedUrl = await downloadFile(receiptPath);
    
    // Determine if it's a PDF based on the file path
    const lowerPath = receiptPath.toLowerCase();
    const isPdf = lowerPath.endsWith('.pdf');
    const isImage = lowerPath.endsWith('.jpg') || 
                    lowerPath.endsWith('.jpeg') || 
                    lowerPath.endsWith('.png') || 
                    lowerPath.endsWith('.webp');

    return NextResponse.json({ 
      url: signedUrl, 
      isPdf,
      isImage 
    });
  } catch (error) {
    console.error("Error downloading receipt:", error);
    return NextResponse.json(
      { error: "Failed to download receipt" },
      { status: 500 }
    );
  }
}
