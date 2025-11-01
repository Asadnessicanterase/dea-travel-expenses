import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { getApproverEmail as getDepartmentApproverEmail } from "@/lib/approvers";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const { to, subject, html, departmentId } = body;

    // Determine recipient (explicit or department approver)
    const recipient = to || (await getDepartmentApproverEmail(departmentId));

    if (!recipient || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // --- Updated to match .env variables ---
    const emailUser = process.env.EMAIL_SERVER_USER;
    const emailPassword = process.env.EMAIL_SERVER_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    if (!emailUser || !emailPassword) {
      console.log("⚠️ Email credentials not configured. Email not sent:", {
        to: recipient,
        subject,
      });
      console.log(
        "📧 Email would have been sent with content:",
        html.substring(0, 200) + "..."
      );
      return NextResponse.json({
        success: true,
        message: "Email credentials not configured",
      });
    }

    // Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Send email
    try {
      await transporter.sendMail({
        from: emailFrom,
        to: recipient,
        subject,
        html,
      });

      console.log("✅ Email sent successfully to:", recipient);
      return NextResponse.json({ success: true });
    } catch (emailError: any) {
      console.error("❌ Failed to send email:", emailError.message);
      return NextResponse.json(
        { error: "Failed to send email: " + emailError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
