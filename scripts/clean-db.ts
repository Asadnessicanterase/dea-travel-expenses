import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database...');
    
    // Delete all travel requests (will cascade to expense claims, approvals, and expense approvals)
    const deletedTravelRequests = await prisma.travelRequest.deleteMany({});
    console.log(`✅ Deleted ${deletedTravelRequests.count} travel requests (and related data)`);
    
    // Delete any orphaned expense claims (just in case)
    const deletedExpenseClaims = await prisma.expenseClaim.deleteMany({});
    console.log(`✅ Deleted ${deletedExpenseClaims.count} expense claims`);
    
    // Delete any orphaned approvals (just in case)
    const deletedApprovals = await prisma.approval.deleteMany({});
    console.log(`✅ Deleted ${deletedApprovals.count} approvals`);
    
    // Delete any orphaned expense approvals (just in case)
    const deletedExpenseApprovals = await prisma.expenseApproval.deleteMany({});
    console.log(`✅ Deleted ${deletedExpenseApprovals.count} expense approvals`);
    
    console.log('✨ Database cleaned successfully! User data preserved.');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
