import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all travel and expense data...');
  
  // Delete expense approvals first
  const deletedExpenseApprovals = await prisma.expenseApproval.deleteMany({});
  console.log(`Deleted ${deletedExpenseApprovals.count} expense approvals`);
  
  // Delete expense claims
  const deletedExpenseClaims = await prisma.expenseClaim.deleteMany({});
  console.log(`Deleted ${deletedExpenseClaims.count} expense claims`);
  
  // Delete approvals
  const deletedApprovals = await prisma.approval.deleteMany({});
  console.log(`Deleted ${deletedApprovals.count} travel request approvals`);
  
  // Delete transportation items
  const deletedTransportation = await prisma.transportationItem.deleteMany({});
  console.log(`Deleted ${deletedTransportation.count} transportation items`);
  
  // Delete travel requests
  const deletedTravelRequests = await prisma.travelRequest.deleteMany({});
  console.log(`Deleted ${deletedTravelRequests.count} travel requests`);
  
  console.log('✅ All travel and expense data has been deleted!');
  console.log('👤 User accounts remain intact');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
