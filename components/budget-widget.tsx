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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalBudget === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <AlertCircle className="w-5 h-5 mr-2" />
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
    <Card className={isOverBudget ? 'border-red-300' : ''}>
      <CardHeader>
        <CardTitle className="text-lg">Budget Overview - {currentYear}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Responsive Grid: 1 column on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
          {/* Total Budget */}
          <div className="flex flex-col justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <DollarSign className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium">Total Budget</span>
            </div>
            <span className="font-bold text-blue-600 text-lg">
              €{summary.totalBudget.toLocaleString()}
            </span>
          </div>

          {/* Reserved */}
          {!compact && (
            <div className="flex flex-col justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingDown className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-sm font-medium">Reserved</span>
              </div>
              <span className="font-bold text-orange-600 text-lg">
                €{summary.reservedAmount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Spent */}
          {!compact && (
            <div className="flex flex-col justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingDown className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm font-medium">Spent</span>
              </div>
              <span className="font-bold text-red-600 text-lg">
                €{summary.actualSpent.toLocaleString()}
              </span>
            </div>
          )}

          {/* Available */}
          <div className={`flex flex-col justify-between p-3 rounded-lg border-2 ${
            isOverBudget 
              ? 'bg-red-50 border-red-300' 
              : isNearLimit 
                ? 'bg-yellow-50 border-yellow-300' 
                : 'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center mb-2">
              <TrendingUp className={`w-4 h-4 mr-2 ${
                isOverBudget 
                  ? 'text-red-600' 
                  : isNearLimit 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
              }`} />
              <span className="text-sm font-medium">Available</span>
            </div>
            <span className={`font-bold text-lg ${
              isOverBudget 
                ? 'text-red-600' 
                : isNearLimit 
                  ? 'text-yellow-600' 
                  : 'text-green-600'
            }`}>
              €{summary.availableBudget.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Warning messages */}
        {isOverBudget && (
          <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5" />
            <p className="text-sm text-red-800">
              <strong>Over Budget!</strong> The current commitments exceed the available budget.
            </p>
          </div>
        )}
        {isNearLimit && !isOverBudget && (
          <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> {percentageUsed.toFixed(0)}% of budget is committed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
