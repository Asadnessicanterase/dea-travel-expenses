
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the type and index parameters from the query string
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'accommodation';
    const indexParam = searchParams.get('index');
    const index = indexParam ? parseInt(indexParam, 10) : 0;

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

    // Get the appropriate receipt path based on type and index
    let receiptPath: string | null = null;
    let receipts: string[] = [];

    if (type === 'accommodation') {
      receipts = expenseClaim.accommodationReceipts;
    } else if (type === 'transportation') {
      receipts = expenseClaim.transportationReceipts;
    } else if (type === 'other') {
      receipts = expenseClaim.otherReceipts;
    }

    if (index < 0 || index >= receipts.length) {
      return NextResponse.json({ error: "Receipt not found at the specified index" }, { status: 404 });
    }

    receiptPath = receipts[index];

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
