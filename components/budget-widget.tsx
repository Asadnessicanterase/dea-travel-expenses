'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BudgetSummary {
  year: number;
  totalBudget: number;
  reservedAmount: number;
  actualSpent: number;
  availableBudget: number;
  lastUpdated: Date | null;
}

interface BudgetWidgetProps {
  year?: number;
  compact?: boolean;
}

const DASHBOARD_CARD_CLASS =
  'rounded-3xl border border-indigo-100/80 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl';

const METRIC_CARD_CLASS =
  'group flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-white/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg';

const ICON_WRAPPER_BASE =
  'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105';

const formatCurrency = (value: number) => `EUR ${Number(value || 0).toLocaleString()}`;

export function BudgetWidget({ year, compact = false }: BudgetWidgetProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = year || new Date().getFullYear();

  useEffect(() => {
    fetchBudget();
  }, [currentYear]);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/budget?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={DASHBOARD_CARD_CLASS}>
        <CardHeader className="space-y-1 pb-6">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalBudget === 0) {
    return (
      <Card className={DASHBOARD_CARD_CLASS}>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-lg font-semibold text-gray-900">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-4 text-sm text-gray-600">
            <AlertCircle className="h-5 w-5 text-indigo-500" />
            <span>No budget set for {currentYear}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentageUsed = ((summary.reservedAmount + summary.actualSpent) / summary.totalBudget) * 100;
  const isNearLimit = percentageUsed > 80;
  const isOverBudget = summary.availableBudget < 0;

  return (
    <Card className={`${DASHBOARD_CARD_CLASS} ${isOverBudget ? 'border-rose-300' : ''}`}>
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Budget Overview - {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Responsive Grid: 1 column on mobile, 4 columns on desktop */}
        <div
          className={`grid grid-cols-1 gap-4 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}
        >
          {/* Total Budget */}
          <div className={METRIC_CARD_CLASS}>
            <div className="flex items-center gap-3">
              <span className={`${ICON_WRAPPER_BASE} bg-indigo-100 text-indigo-600`}>
                <DollarSign className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-gray-900">Total Budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.totalBudget)}</p>
              <p className="text-xs text-gray-500">Allocated for {currentYear}</p>
            </div>
          </div>

          {/* Reserved */}
          {!compact && (
            <div className={METRIC_CARD_CLASS}>
              <div className="flex items-center gap-3">
                <span className={`${ICON_WRAPPER_BASE} bg-indigo-100 text-indigo-600`}>
                  <TrendingDown className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-gray-900">Reserved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.reservedAmount)}</p>
                <p className="text-xs text-gray-500">Committed funds awaiting completion</p>
              </div>
            </div>
          )}

          {/* Spent */}
          {!compact && (
            <div className={METRIC_CARD_CLASS}>
              <div className="flex items-center gap-3">
                <span className={`${ICON_WRAPPER_BASE} bg-indigo-100 text-indigo-600`}>
                  <TrendingDown className="h-4 w-4 rotate-180" />
                </span>
                <p className="text-sm font-semibold text-gray-900">Actual Spent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.actualSpent)}</p>
                <p className="text-xs text-gray-500">Reconciled expenses</p>
              </div>
            </div>
          )}

          {/* Available */}
          <div
            className={`${METRIC_CARD_CLASS} ${
              isOverBudget
                ? 'border-rose-200 bg-rose-50/80'
                : isNearLimit
                  ? 'border-amber-200 bg-amber-50/80'
                  : 'border-indigo-100 bg-white/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`${ICON_WRAPPER_BASE} ${
                  isOverBudget
                    ? 'bg-rose-100 text-rose-600'
                    : isNearLimit
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-gray-900">Available</p>
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${
                  isOverBudget
                    ? 'text-rose-600'
                    : isNearLimit
                      ? 'text-amber-600'
                      : 'text-indigo-600'
                }`}
              >
                {formatCurrency(summary.availableBudget)}
              </p>
              <p className="text-xs text-gray-500">{Math.round(percentageUsed)}% committed</p>
            </div>
          </div>
        </div>

        {/* Warning messages */}
        {isOverBudget && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
            <p>
              <span className="font-semibold">Over budget.</span> Current commitments exceed the
              available allocation.
            </p>
          </div>
        )}
        {isNearLimit && !isOverBudget && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            <p>
              <span className="font-semibold">Heads up.</span> {percentageUsed.toFixed(0)}% of this
              year&apos;s budget is already committed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

