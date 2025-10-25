import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dynamically find the approver’s email
async function getApproverEmail() {
  const approver = await prisma.user.findFirst({
    where: { role: "APPROVER" },
    select: { email: true },
  });
  return approver?.email || process.env.DEFAULT_APPROVER_EMAIL;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Allow unauthenticated calls for system emails
    const body = await request.json();
    const { to, subject, html } = body;

    // If no explicit recipient is passed, fall back to the approver
    const recipient = to || (await getApproverEmail());

    if (!recipient || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

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

    // Create transporter with Gmail SMTP
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
        from: emailUser,
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
