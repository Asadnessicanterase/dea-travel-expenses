import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all submissions...');
  
  // Delete all expense claims first (due to foreign key)
  await prisma.expenseClaim.deleteMany({});
  console.log('✓ Cleared all expense claims');
  
  // Delete all approvals
  await prisma.approval.deleteMany({});
  console.log('✓ Cleared all approvals');
  
  // Delete all travel requests
  await prisma.travelRequest.deleteMany({});
  console.log('✓ Cleared all travel requests');
  
  console.log('✅ Database cleared successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
