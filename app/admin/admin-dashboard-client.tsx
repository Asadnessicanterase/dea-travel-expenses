"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLoading } from "@/context/loading-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  Euro,
  TrendingUp,
  Shield,
  CheckCircle,
  Clock,
  Building2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  PENDING: "#a5b4fc",
  APPROVED: "#818cf8",
  DENIED: "#6366f1",
  AMENDMENT_REQUESTED: "#4f46e5",
  CLOSED: "#3730a3",
};

const QUICK_ACTION_BUTTON_CLASS =
  "w-full h-20 rounded-2xl border border-indigo-500/10 bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

const DASHBOARD_CARD_CLASS =
  "rounded-3xl border border-indigo-100/80 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl";

const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  borderColor: "rgba(99, 102, 241, 0.25)",
  boxShadow: "0 12px 30px rgba(79, 70, 229, 0.12)",
  padding: 12,
  backgroundColor: "rgba(255,255,255,0.96)",
};

const CHART_CURSOR_STYLE = { fill: "rgba(79, 70, 229, 0.05)" };

const formatCurrency = (value: number) =>
  `EUR ${Number(value || 0).toLocaleString()}`;

export default function AdminDashboardClient() {
  const { data: session } = useSession() || {};
  const { finishLoading } = useLoading();
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

  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/admin/users", label: "Manage Users", icon: Users },
    { href: "/admin/departments", label: "Departments", icon: Building2 },
    { href: "/admin/budget", label: "Budget Settings", icon: Euro },
    { href: "/admin/reports", label: "View Reports", icon: FileText },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch both in parallel
        const year = new Date().getFullYear();
        const [statsResponse, budgetResponse] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch(`/api/admin/budget?year=${year}`),
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        if (budgetResponse.ok) {
          const budgetDataResponse = await budgetResponse.json();
          const utilization = budgetDataResponse.totalBudget > 0
            ? ((budgetDataResponse.reservedAmount + budgetDataResponse.actualSpent) / budgetDataResponse.totalBudget) * 100
            : 0;
          setBudgetData({
            ...budgetDataResponse,
            utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal place
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
        finishLoading();
      }
    };

    loadData();
  }, [finishLoading]);

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
      finishLoading();
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
    } finally {
      finishLoading();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Button
                variant="ghost"
                className={`${QUICK_ACTION_BUTTON_CLASS} group flex items-center justify-between px-6`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-6 w-6 text-white" />
                  </span>
                  <span className="text-left">{label}</span>
                </div>
                <TrendingUp className="h-5 w-5 text-white/70 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          ))}
        </div>

        {/* Budget Overview */}
        <div className="mb-8">
          <BudgetWidget />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">Total Users</CardTitle>
              <Users className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <p className="text-xs font-medium text-gray-400">
                Registered in the system
              </p>
            </CardContent>
          </Card>

          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">Travel Requests</CardTitle>
              <FileText className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900">{stats.totalRequests}</div>
              <p className="text-xs font-medium text-gray-400">
                {stats.pendingRequests} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">Expense Claims</CardTitle>
              <Euro className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalClaims}</div>
              <p className="text-xs font-medium text-gray-400">
                {stats.pendingClaims} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">Budget Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{budgetData.utilization.toFixed(1)}%</div>
              <p className="text-xs font-medium text-gray-400">
                {budgetData.totalBudget > 0
                  ? `${formatCurrency(budgetData.reservedAmount + budgetData.actualSpent)} of ${formatCurrency(budgetData.totalBudget)}`
                  : "No budget set"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Requests by Status */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-lg font-semibold text-gray-900">Requests by Status</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Distribution of travel request statuses
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.requestsByStatus} barSize={18}>
                  <CartesianGrid stroke="rgba(99, 102, 241, 0.08)" vertical={false} />
                  <XAxis
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={CHART_CURSOR_STYLE}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number | string) => [`${Number(value)}`, "Requests"]}
                  />
                  <Bar dataKey="count" radius={[12, 12, 12, 12]}>
                    {stats.requestsByStatus.map(({ status }) => (
                      <Cell key={status} fill={STATUS_COLORS[status] ?? "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Spending Trend */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-lg font-semibold text-gray-900">Monthly Spending Trend</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Approved expenses over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlySpending} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid stroke="rgba(99, 102, 241, 0.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={CHART_CURSOR_STYLE}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number | string) => [formatCurrency(Number(value)), "Total Approved"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: "#4338ca", r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Users */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-lg font-semibold text-gray-900">Top Travelers</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Users with highest approved expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topUsers} layout="vertical" barSize={18} margin={{ left: 12, right: 24 }}>
                  <CartesianGrid stroke="rgba(99, 102, 241, 0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={CHART_CURSOR_STYLE}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number | string, _name: string, props: { payload?: { tripCount?: number } }) => {
                      const tripCount = props?.payload?.tripCount ?? 0;
                      const tripLabel = tripCount === 1 ? "trip" : "trips";
                      const amount = formatCurrency(Number(value));
                      return [`${amount} | ${tripCount} ${tripLabel}`, "Total Approved"];
                    }}
                  />
                  <Bar dataKey="totalSpent" radius={[12, 12, 12, 12]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick System Info */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-lg font-semibold text-gray-900">System Overview</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Quick actions and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="group flex items-center justify-between rounded-2xl border border-indigo-100 bg-white/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-transform duration-200 group-hover:scale-105">
                      <Shield className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">User Management</p>
                      <p className="text-xs text-gray-500">Add, edit, or remove users</p>
                    </div>
                  </div>
                  <Link href="/admin/users">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl border border-indigo-100 bg-white/90 px-4 text-sm font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-600 hover:text-white"
                    >
                      Manage
                    </Button>
                  </Link>
                </div>

                <div className="group flex items-center justify-between rounded-2xl border border-indigo-100 bg-white/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-transform duration-200 group-hover:scale-105">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Reports & Analytics</p>
                      <p className="text-xs text-gray-500">View detailed reports and export data</p>
                    </div>
                  </div>
                  <Link href="/admin/reports">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl border border-indigo-100 bg-white/90 px-4 text-sm font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-600 hover:text-white"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                <div className="group rounded-2xl border border-indigo-100 bg-white/80 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <Clock className="mx-auto mb-2 h-5 w-5 text-indigo-500" />
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                  <p className="text-xs text-gray-500">Pending Requests</p>
                </div>
                <div className="group rounded-2xl border border-indigo-100 bg-white/80 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <CheckCircle className="mx-auto mb-2 h-5 w-5 text-indigo-500" />
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.requestsByStatus.find((s) => s.status === "APPROVED")?.count || 0}
                  </p>
                  <p className="text-xs text-gray-500">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




