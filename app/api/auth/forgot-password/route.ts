
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { buildEmailTemplate, createInfoBox } from "@/lib/email-template";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    const linkBox = createInfoBox(
      `Or copy and paste this link into your browser:<br/><span style="word-break: break-all; color: #3b82f6;">${resetUrl}</span>`,
      'info'
    );

    const expiryNotice = createInfoBox(
      '<strong>This link will expire in 1 hour.</strong><br/>If you did not request a password reset, you can safely ignore this email.',
      'warning'
    );

    const emailHtml = buildEmailTemplate({
      title: 'Password Reset Request',
      greeting: 'Hello,',
      content: '<p style="margin: 0;">We received a request to reset your password for your DEA Travel Authorization System account.</p>',
      additionalSections: linkBox + expiryNotice,
      buttonText: 'Reset Password',
      buttonUrl: resetUrl
    });

    await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "Password Reset Request - DEA Travel Expenses",
        html: emailHtml,
      }),
    });

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
