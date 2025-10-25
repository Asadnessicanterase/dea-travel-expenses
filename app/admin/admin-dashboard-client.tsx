"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  Euro, 
  TrendingUp,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BudgetWidget } from "@/components/budget-widget";

interface DashboardStats {
  totalUsers: number;
  totalRequests: number;
  totalClaims: number;
  totalApproved: number;
  pendingRequests: number;
  pendingClaims: number;
  requestsByStatus: {
    status: string;
    count: number;
  }[];
  monthlySpending: {
    month: string;
    amount: number;
  }[];
  topUsers: {
    name: string;
    totalSpent: number;
    tripCount: number;
  }[];
}

interface BudgetData {
  totalBudget: number;
  reservedAmount: number;
  actualSpent: number;
  availableBudget: number;
  utilization: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#10b981",
  DENIED: "#ef4444",
  AMENDMENT_REQUESTED: "#8b5cf6",
  CLOSED: "#6b7280",
};

export default function AdminDashboardClient() {
  const { data: session } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRequests: 0,
    totalClaims: 0,
    totalApproved: 0,
    pendingRequests: 0,
    pendingClaims: 0,
    requestsByStatus: [],
    monthlySpending: [],
    topUsers: [],
  });
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalBudget: 0,
    reservedAmount: 0,
    actualSpent: 0,
    availableBudget: 0,
    utilization: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchBudgetData();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`/api/admin/budget?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        const utilization = data.totalBudget > 0 
          ? ((data.reservedAmount + data.actualSpent) / data.totalBudget) * 100 
          : 0;
        setBudgetData({
          ...data,
          utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal place
        });
      }
    } catch (error) {
      console.error("Failed to fetch budget data:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {session?.user?.name}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/users">
            <Button className="w-full h-20 text-lg" variant="default">
              <Users className="mr-2 h-6 w-6" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/budget">
            <Button className="w-full h-20 text-lg" variant="default">
              <Euro className="mr-2 h-6 w-6" />
              Budget Settings
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button className="w-full h-20 text-lg" variant="outline">
              <FileText className="mr-2 h-6 w-6" />
              View Reports
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="w-full h-20 text-lg" variant="outline">
              <TrendingUp className="mr-2 h-6 w-6" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Budget Overview */}
        <div className="mb-8">
          <BudgetWidget />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered in the system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Travel Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingRequests} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense Claims</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClaims}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingClaims} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{budgetData.utilization.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {budgetData.totalBudget > 0 
                  ? `€${(budgetData.reservedAmount + budgetData.actualSpent).toLocaleString()} of €${budgetData.totalBudget.toLocaleString()}`
                  : 'No budget set'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Requests by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Requests by Status</CardTitle>
              <CardDescription>Distribution of travel request statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.requestsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Spending Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>Approved expenses over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle>Top Travelers</CardTitle>
              <CardDescription>Users with highest approved expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => {
                      const tripCount = props.payload.tripCount || 0;
                      return [`€${Number(value).toFixed(2)} (${tripCount} ${tripCount === 1 ? 'trip' : 'trips'})`, 'Total Paid'];
                    }} 
                  />
                  <Bar dataKey="totalSpent" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Quick actions and system information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-gray-600">Add, edit, or remove users</p>
                    </div>
                  </div>
                  <Link href="/admin/users">
                    <Button size="sm">Manage</Button>
                  </Link>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Reports & Analytics</p>
                      <p className="text-sm text-gray-600">View detailed reports and export data</p>
                    </div>
                  </div>
                  <Link href="/admin/reports">
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-900">{stats.pendingRequests}</p>
                    <p className="text-xs text-yellow-700">Pending Requests</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-900">
                      {stats.requestsByStatus.find(s => s.status === 'APPROVED')?.count || 0}
                    </p>
                    <p className="text-xs text-green-700">Approved</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
