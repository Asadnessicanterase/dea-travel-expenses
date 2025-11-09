import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBudgetForYear, setBudget, getBudgetSummary } from '@/lib/budget';

export const dynamic = "force-dynamic";

// GET /api/admin/budget?year=2025
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or approver
    if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const summary = await getBudgetSummary(year);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

// POST /api/admin/budget
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can set budget
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { year, totalBudget } = body;

    if (!year || totalBudget === undefined || totalBudget < 0) {
      return NextResponse.json(
        { error: 'Invalid year or totalBudget' },
        { status: 400 }
      );
    }

    const budget = await setBudget(year, totalBudget, session.user.email);

    return NextResponse.json({
      success: true,
      budget,
    });
  } catch (error) {
    console.error('Error setting budget:', error);
    return NextResponse.json(
      { error: 'Failed to set budget' },
      { status: 500 }
    );
  }
}
