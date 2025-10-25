import { prisma } from './db';

export interface BudgetSummary {
  year: number;
  totalBudget: number;
  reservedAmount: number;
  actualSpent: number;
  availableBudget: number;
  lastUpdated: Date | null;
}

/**
 * Get or create budget settings for a specific year
 */
export async function getBudgetForYear(year: number) {
  return await prisma.budgetSettings.findUnique({
    where: { year },
  });
}

/**
 * Set or update budget for a year
 */
export async function setBudget(year: number, totalBudget: number, createdBy: string) {
  return await prisma.budgetSettings.upsert({
    where: { year },
    update: {
      totalBudget,
      createdBy,
      updatedAt: new Date(),
    },
    create: {
      year,
      totalBudget,
      createdBy,
    },
  });
}

/**
 * Calculate current budget summary
 */
export async function getBudgetSummary(year: number): Promise<BudgetSummary> {
  // Get budget settings
  const budgetSettings = await getBudgetForYear(year);
  
  if (!budgetSettings) {
    return {
      year,
      totalBudget: 0,
      reservedAmount: 0,
      actualSpent: 0,
      availableBudget: 0,
      lastUpdated: null,
    };
  }

  // Calculate reserved amount (from approved travel requests that don't have expense claims approved yet)
  const approvedRequests = await prisma.travelRequest.findMany({
    where: {
      status: 'APPROVED',
      reservedAmount: { not: null },
      // Filter by year - requests approved in this year
      submittedAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    select: {
      reservedAmount: true,
      expenseClaims: {
        where: { status: { in: ['APPROVED', 'CLOSED'] } },
        select: { actualAmount: true },
      },
    },
  });

  // Calculate reserved amount (only for requests without approved/closed expense claims)
  const reservedAmount = approvedRequests.reduce((sum, request) => {
    // If there's an approved or closed expense claim, it's no longer reserved (it's been spent)
    const hasApprovedExpense = request.expenseClaims.some(claim => claim.actualAmount !== null);
    if (hasApprovedExpense) return sum;
    return sum + (request.reservedAmount || 0);
  }, 0);

  // Calculate actual spent (from approved and closed expense claims)
  // Both APPROVED and CLOSED represent money that has been paid out
  const approvedExpenses = await prisma.expenseClaim.findMany({
    where: {
      status: { in: ['APPROVED', 'CLOSED'] },
      actualAmount: { not: null },
      // Filter by year - expenses approved in this year
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    select: {
      actualAmount: true,
    },
  });

  const actualSpent = approvedExpenses.reduce((sum, expense) => {
    return sum + (expense.actualAmount || 0);
  }, 0);

  const availableBudget = budgetSettings.totalBudget - reservedAmount - actualSpent;

  return {
    year,
    totalBudget: budgetSettings.totalBudget,
    reservedAmount,
    actualSpent,
    availableBudget,
    lastUpdated: budgetSettings.updatedAt,
  };
}

/**
 * Check if there's enough budget for a request
 */
export async function checkBudgetAvailability(
  year: number,
  amount: number
): Promise<{ available: boolean; summary: BudgetSummary }> {
  const summary = await getBudgetSummary(year);
  return {
    available: summary.availableBudget >= amount,
    summary,
  };
}

/**
 * Generate voucher number: DEA-TPV-YYYYMMDD-XXXX
 */
export async function generateVoucherNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  // Find the last voucher created today
  const lastVoucher = await prisma.expenseClaim.findFirst({
    where: {
      voucherNumber: {
        startsWith: `DEA-TPV-${dateStr}-`,
      },
    },
    orderBy: {
      voucherNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastVoucher && lastVoucher.voucherNumber) {
    const lastSequence = parseInt(lastVoucher.voucherNumber.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `DEA-TPV-${dateStr}-${sequenceStr}`;
}
