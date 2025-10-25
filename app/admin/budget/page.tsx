'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BudgetSummary {
  year: number;
  totalBudget: number;
  reservedAmount: number;
  actualSpent: number;
  availableBudget: number;
  lastUpdated: Date | null;
}

export default function AdminBudgetPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalBudget, setTotalBudget] = useState('');
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchBudgetSummary();
  }, [session, status, year]);

  const fetchBudgetSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/budget?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
        setTotalBudget(data.totalBudget.toString());
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    const budgetValue = parseFloat(totalBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, totalBudget: budgetValue })
      });

      if (response.ok) {
        toast.success('Budget saved successfully');
        fetchBudgetSummary();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save budget');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Budget Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure and monitor the annual travel budget
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Budget Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Set Annual Budget</CardTitle>
            <CardDescription>
              Configure the total travel budget for the year
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <Label htmlFor="budget">Total Budget (€)</Label>
              <Input
                id="budget"
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Enter total budget"
                min="0"
                step="1000"
              />
            </div>
            <Button
              onClick={handleSaveBudget}
              disabled={saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Budget'}
            </Button>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Current budget status for {year}</CardDescription>
          </CardHeader>
          <CardContent>
            {summary && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium">Total Budget</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    €{summary.totalBudget.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingDown className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="font-medium">Reserved</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">
                    €{summary.reservedAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-medium">Spent</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    €{summary.actualSpent.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium">Available</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    €{summary.availableBudget.toLocaleString()}
                  </span>
                </div>

                {summary.lastUpdated && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Last updated: {new Date(summary.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
