
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // Only approvers and admins can download vouchers
    if (!user || (user.role !== "APPROVER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Only approvers and admins can download vouchers" },
        { status: 403 }
      );
    }

    // Fetch expense claim
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: params.id },
    });

    if (!expenseClaim) {
      return NextResponse.json(
        { error: "Expense claim not found" },
        { status: 404 }
      );
    }

    if (!expenseClaim.voucherPdfPath) {
      return NextResponse.json(
        { error: "Voucher not generated yet" },
        { status: 404 }
      );
    }

    // Generate signed URL for download
    const signedUrl = await downloadFile(expenseClaim.voucherPdfPath);

    return NextResponse.json({
      downloadUrl: signedUrl,
      voucherNumber: expenseClaim.voucherNumber,
    });
  } catch (error) {
    console.error("Error downloading voucher:", error);
    return NextResponse.json(
      { error: "Failed to download voucher" },
      { status: 500 }
    );
  }
}
