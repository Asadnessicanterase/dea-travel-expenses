
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create test user (john@doe.com)
  const hashedPasswordTest = await bcrypt.hash("johndoe123", 12);
  const testUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      password: hashedPasswordTest,
      name: "John Doe",
      position: "Senior Analyst",
      role: "USER",
    },
  });
  console.log("✅ Test user created:", testUser.email);

  // Create approver user (Conrad Kraft)
  const hashedPasswordApprover = await bcrypt.hash("approver123", 12);
  const approverUser = await prisma.user.upsert({
    where: { email: "conrad.kraft@digital-euro-association.de" },
    update: {},
    create: {
      email: "conrad.kraft@digital-euro-association.de",
      password: hashedPasswordApprover,
      name: "Conrad Kraft",
      position: "Managing Director",
      role: "APPROVER",
    },
  });
  console.log("✅ Approver user created:", approverUser.email);

  // Create admin user
  const hashedPasswordAdmin = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@digital-euro-association.de" },
    update: {},
    create: {
      email: "admin@digital-euro-association.de",
      password: hashedPasswordAdmin,
      name: "System Administrator",
      position: "Administrator",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", adminUser.email);

  // Create sample travel request for test user
  const sampleRequest = await prisma.travelRequest.create({
    data: {
      userId: testUser.id,
      name: "John Doe",
      position: "Senior Analyst",
      dateOfApplication: new Date("2025-01-15"),
      destinationCountry: "Germany",
      eventOrganiser: "European Central Bank",
      eventName: "Digital Euro Implementation Framework",
      travelDateFrom: new Date("2025-02-10"),
      travelDateTo: new Date("2025-02-12"),
      purpose: "Attending the Digital Euro Summit to present research findings on implementation strategies and network with key stakeholders in the European digital currency ecosystem.",
      estimatedCosts: 1250.00,
      status: "PENDING",
    },
  });
  console.log("✅ Sample travel request created:", sampleRequest.id);

  // Create an approved request with expense claims
  const approvedRequest = await prisma.travelRequest.create({
    data: {
      userId: testUser.id,
      name: "John Doe",
      position: "Senior Analyst",
      dateOfApplication: new Date("2024-12-01"),
      destinationCountry: "France",
      eventOrganiser: "Banque de France",
      eventName: "CBDC Security Protocols",
      travelDateFrom: new Date("2025-01-05"),
      travelDateTo: new Date("2025-01-07"),
      purpose: "Participating in the Central Bank Digital Currency security workshop to discuss best practices and share insights on privacy-preserving technologies.",
      estimatedCosts: 980.00,
      status: "APPROVED",
    },
  });
  console.log("✅ Approved travel request created:", approvedRequest.id);

  // Add approval record
  await prisma.approval.create({
    data: {
      travelRequestId: approvedRequest.id,
      action: "APPROVE",
      comment: "Approved for the Digital Euro Association research initiative.",
      approverEmail: approverUser.email || "conrad.kraft@digital-euro-association.de",
    },
  });
  console.log("✅ Approval record created");

  // Add expense claims to approved request
  const expenseClaim1 = await prisma.expenseClaim.create({
    data: {
      travelRequestId: approvedRequest.id,
      description: "Hotel accommodation (2 nights)",
      amount: 320.00,
      date: new Date("2025-01-05"),
    },
  });

  const expenseClaim2 = await prisma.expenseClaim.create({
    data: {
      travelRequestId: approvedRequest.id,
      description: "Flight tickets (round trip)",
      amount: 450.00,
      date: new Date("2025-01-05"),
    },
  });

  const expenseClaim3 = await prisma.expenseClaim.create({
    data: {
      travelRequestId: approvedRequest.id,
      description: "Meals and local transportation",
      amount: 180.50,
      date: new Date("2025-01-06"),
    },
  });

  console.log("✅ Expense claims created:", expenseClaim1.id, expenseClaim2.id, expenseClaim3.id);

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📝 Test accounts created:");
  console.log("   Regular User: john@doe.com / johndoe123");
  console.log("   Approver: conrad.kraft@digital-euro-association.de / approver123");
  console.log("   Admin: admin@digital-euro-association.de / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
