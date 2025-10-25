"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  ArrowLeft,
  FileText,
  Euro,
  PieChart as PieChartIcon,
  CreditCard,
  MapPin
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/date-utils";
import { StatusBadge } from "@/components/status-badge";
import {
  BarChart,
  Bar,
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
import { WorldMap } from "@/components/world-map";

interface TravelRequest {
  id: string;
  name: string;
  position: string;
  destinationCountry: string;
  destinationCity?: string;
  eventName: string;
  travelDateFrom: string;
  travelDateTo: string;
  estimatedCosts: number;
  status: string;
  submittedAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface ExpenseClaim {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  createdAt: string;
  travelRequest: {
    id: string;
    eventName: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface AnalyticsData {
  categoryBreakdown: {
    accommodation: number;
    transportation: number;
    other: number;
    total: number;
  };
  financialReports: {
    outstandingPayments: Array<{
      id: string;
      userName: string;
      userEmail: string;
      eventName: string;
      amount: number;
      description: string;
      date: string;
      createdAt: string;
    }>;
    outstandingTotal: number;
    paymentVouchers: Array<{
      id: string;
      voucherNumber: string;
      userName: string;
      userEmail: string;
      eventName: string;
      amount: number;
      description: string;
      paidDate: string;
    }>;
  };
  destinations: Array<{
    country: string;
    city: string | null;
    tripCount: number;
    totalCost: number;
    avgCost: number;
  }>;
}

// Country name to coordinates mapping for markers (approximate capitals/centers)
const countryCoordinates: Record<string, [number, number]> = {
  "Argentina": [-63.6167, -38.4161],
  "Australia": [133.7751, -25.2744],
  "Austria": [14.5501, 47.5162],
  "Belgium": [4.4699, 50.5039],
  "Brazil": [-51.9253, -14.2350],
  "Canada": [-106.3468, 56.1304],
  "Chile": [-71.5430, -35.6751],
  "China": [104.1954, 35.8617],
  "Colombia": [-74.2973, 4.5709],
  "Croatia": [15.2, 45.1],
  "Czech Republic": [15.4730, 49.8175],
  "Denmark": [9.5018, 56.2639],
  "Egypt": [30.8025, 26.8206],
  "Finland": [25.7482, 61.9241],
  "France": [2.2137, 46.2276],
  "Germany": [10.4515, 51.1657],
  "Greece": [21.8243, 39.0742],
  "Hungary": [19.5033, 47.1625],
  "Iceland": [-19.0208, 64.9631],
  "India": [78.9629, 20.5937],
  "Indonesia": [113.9213, -0.7893],
  "Ireland": [-8.2439, 53.4129],
  "Israel": [34.8516, 31.0461],
  "Italy": [12.5674, 41.8719],
  "Japan": [138.2529, 36.2048],
  "Kenya": [37.9062, -0.0236],
  "Luxembourg": [6.1296, 49.8153],
  "Malaysia": [101.9758, 4.2105],
  "Mexico": [-102.5528, 23.6345],
  "Morocco": [-7.0926, 31.7917],
  "Netherlands": [5.2913, 52.1326],
  "New Zealand": [174.8860, -40.9006],
  "Norway": [8.4689, 60.4720],
  "Peru": [-75.0152, -9.1900],
  "Poland": [19.1451, 51.9194],
  "Portugal": [-8.2245, 39.3999],
  "Romania": [24.9668, 45.9432],
  "Russia": [105.3188, 61.5240],
  "Saudi Arabia": [45.0792, 23.8859],
  "Singapore": [103.8198, 1.3521],
  "South Africa": [22.9375, -30.5595],
  "South Korea": [127.7669, 35.9078],
  "Spain": [-3.7492, 40.4637],
  "Sweden": [18.6435, 60.1282],
  "Switzerland": [8.2275, 46.8182],
  "Thailand": [100.9925, 15.8700],
  "Turkey": [35.2433, 38.9637],
  "UAE": [53.8478, 23.4241],
  "United Arab Emirates": [53.8478, 23.4241],
  "United Kingdom": [-3.4360, 55.3781],
  "UK": [-3.4360, 55.3781],
  "United States": [-95.7129, 37.0902],
  "USA": [-95.7129, 37.0902],
  "Vietnam": [108.2772, 14.0583],
};

export default function ReportsClient() {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, claimsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/reports/travel-requests"),
        fetch("/api/admin/reports/expense-claims"),
        fetch("/api/admin/reports/analytics"),
      ]);

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }

      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    if (dateFrom && new Date(req.submittedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(req.submittedAt) > new Date(dateTo)) return false;
    return true;
  });

  const filteredClaims = claims.filter((claim) => {
    if (statusFilter !== "all" && claim.status !== statusFilter) return false;
    if (dateFrom && new Date(claim.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(claim.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) => 
        headers.map((header) => {
          const value = row[header] || "";
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  };

  const exportRequests = () => {
    const dataToExport = filteredRequests.map((req) => ({
      name: req.user.name,
      email: req.user.email,
      position: req.position,
      eventName: req.eventName,
      destination: `${req.destinationCountry}${req.destinationCity ? `, ${req.destinationCity}` : ''}`,
      travelDateFrom: formatDate(req.travelDateFrom),
      travelDateTo: formatDate(req.travelDateTo),
      estimatedCosts: req.estimatedCosts,
      status: req.status,
      submittedAt: formatDate(req.submittedAt),
    }));

    exportToCSV(
      dataToExport,
      "travel_requests",
      ["name", "email", "position", "eventName", "destination", "travelDateFrom", "travelDateTo", "estimatedCosts", "status", "submittedAt"]
    );
  };

  const exportClaims = () => {
    const dataToExport = filteredClaims.map((claim) => ({
      name: claim.travelRequest.user.name,
      email: claim.travelRequest.user.email,
      eventName: claim.travelRequest.eventName,
      description: claim.description,
      amount: claim.amount,
      date: formatDate(claim.date),
      status: claim.status,
      submittedAt: formatDate(claim.createdAt),
    }));

    exportToCSV(
      dataToExport,
      "expense_claims",
      ["name", "email", "eventName", "description", "amount", "date", "status", "submittedAt"]
    );
  };

  const calculateTotals = (items: any[], key: string) => {
    return items.reduce((sum, item) => sum + Number(item[key] || 0), 0);
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
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">View detailed reports and export data</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter reports by status and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="DENIED">Denied</SelectItem>
                    <SelectItem value="AMENDMENT_REQUESTED">Amendment Requested</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Reports */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="analytics">
              <PieChartIcon className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="financial">
              <CreditCard className="mr-2 h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="destinations">
              <MapPin className="mr-2 h-4 w-4" />
              Destinations
            </TabsTrigger>
            <TabsTrigger value="requests">
              <FileText className="mr-2 h-4 w-4" />
              Requests ({filteredRequests.length})
            </TabsTrigger>
            <TabsTrigger value="claims">
              <Euro className="mr-2 h-4 w-4" />
              Claims ({filteredClaims.length})
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab - Expense Category Breakdown */}
          <TabsContent value="analytics">
            {analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Category Distribution</CardTitle>
                    <CardDescription>Breakdown by expense type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.categoryBreakdown.total > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Accommodation', value: analytics.categoryBreakdown.accommodation },
                              { name: 'Transportation', value: analytics.categoryBreakdown.transportation },
                              { name: 'Other', value: analytics.categoryBreakdown.other },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#10b981" />
                            <Cell fill="#8b5cf6" />
                          </Pie>
                          <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No expense data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Category Totals</CardTitle>
                    <CardDescription>Total amount spent by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.categoryBreakdown.total > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { category: 'Accommodation', amount: analytics.categoryBreakdown.accommodation },
                            { category: 'Transportation', amount: analytics.categoryBreakdown.transportation },
                            { category: 'Other', amount: analytics.categoryBreakdown.other },
                          ].filter(item => item.amount > 0)}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                          <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No expense data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Cards */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Expense Summary</CardTitle>
                    <CardDescription>Total expenses by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Accommodation</p>
                        <p className="text-2xl font-bold text-blue-900">
                          €{analytics.categoryBreakdown.accommodation.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Transportation</p>
                        <p className="text-2xl font-bold text-green-900">
                          €{analytics.categoryBreakdown.transportation.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Other Expenses</p>
                        <p className="text-2xl font-bold text-purple-900">
                          €{analytics.categoryBreakdown.other.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">
                          €{analytics.categoryBreakdown.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse">Loading analytics...</div>
              </div>
            )}
          </TabsContent>

          {/* Financial Reports Tab */}
          <TabsContent value="financial">
            {analytics ? (
              <div className="space-y-6">
                {/* Outstanding Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Payments</CardTitle>
                    <CardDescription>
                      Approved claims awaiting payment acknowledgment | Total: €{analytics.financialReports.outstandingTotal.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.financialReports.outstandingPayments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Claim Date</TableHead>
                              <TableHead>Approved On</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.financialReports.outstandingPayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <div className="font-medium">{payment.userName}</div>
                                  <div className="text-sm text-gray-500">{payment.userEmail}</div>
                                </TableCell>
                                <TableCell>{payment.eventName}</TableCell>
                                <TableCell>{payment.description}</TableCell>
                                <TableCell className="font-semibold">€{payment.amount.toFixed(2)}</TableCell>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell>{formatDate(payment.createdAt)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        No outstanding payments. All approved claims have been acknowledged.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Vouchers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Vouchers</CardTitle>
                    <CardDescription>
                      Recently paid claims with voucher numbers (Last 50)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.financialReports.paymentVouchers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Voucher Number</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.financialReports.paymentVouchers.map((voucher) => (
                              <TableRow key={voucher.id}>
                                <TableCell className="font-mono text-sm font-medium">
                                  {voucher.voucherNumber}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{voucher.userName}</div>
                                  <div className="text-sm text-gray-500">{voucher.userEmail}</div>
                                </TableCell>
                                <TableCell>{voucher.eventName}</TableCell>
                                <TableCell className="font-semibold">€{voucher.amount.toFixed(2)}</TableCell>
                                <TableCell>{formatDate(voucher.paidDate)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        No payment vouchers available yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse">Loading financial reports...</div>
              </div>
            )}
          </TabsContent>

          {/* Destinations Tab */}
          <TabsContent value="destinations">
            {analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* World Map */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>World Travel Map</CardTitle>
                    <CardDescription>Visual representation of travel destinations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.destinations.length > 0 ? (
                      <>
                        <WorldMap 
                          destinations={analytics.destinations} 
                          countryCoordinates={countryCoordinates}
                        />
                        <div className="mt-4 text-sm text-gray-600">
                          <p className="flex items-center">
                            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                            Marker size indicates number of trips to that destination
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-[500px] flex items-center justify-center text-gray-500">
                        No destination data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Travel Destinations</CardTitle>
                    <CardDescription>Most frequently visited locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.destinations.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={analytics.destinations} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey={(item) => item.city ? `${item.city}, ${item.country}` : item.country} 
                            type="category" 
                            width={150}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'tripCount') return [value, 'Trips'];
                              return [`€${Number(value).toFixed(2)}`, name === 'totalCost' ? 'Total Cost' : 'Avg Cost'];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="tripCount" fill="#3b82f6" name="Number of Trips" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-gray-500">
                        No destination data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Table */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Destination Analysis</CardTitle>
                    <CardDescription>Detailed breakdown of travel costs by destination</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.destinations.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Destination</TableHead>
                              <TableHead className="text-right">Number of Trips</TableHead>
                              <TableHead className="text-right">Total Cost</TableHead>
                              <TableHead className="text-right">Average Cost per Trip</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.destinations.map((dest, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                                    <div>
                                      {dest.city && <div>{dest.city}</div>}
                                      <div className={dest.city ? "text-sm text-gray-500" : ""}>
                                        {dest.country}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{dest.tripCount}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  €{dest.totalCost.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  €{dest.avgCost.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        No destination data available yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse">Loading destination analytics...</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Travel Requests Report</CardTitle>
                  <CardDescription className="mt-2">
                    Total: {filteredRequests.length} requests | 
                    Total Amount: €{calculateTotals(filteredRequests, "estimatedCosts").toFixed(2)}
                  </CardDescription>
                </div>
                <Button onClick={exportRequests}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Travel Dates</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-medium">{req.user.name}</div>
                            <div className="text-sm text-gray-500">{req.position}</div>
                          </TableCell>
                          <TableCell>{req.eventName}</TableCell>
                          <TableCell>
                            {req.destinationCountry}
                            {req.destinationCity && <div className="text-sm text-gray-500">{req.destinationCity}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(req.travelDateFrom)} - {formatDate(req.travelDateTo)}
                            </div>
                          </TableCell>
                          <TableCell>€{req.estimatedCosts.toFixed(2)}</TableCell>
                          <TableCell>
                            <StatusBadge status={req.status} />
                          </TableCell>
                          <TableCell>{formatDate(req.submittedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Expense Claims Report</CardTitle>
                  <CardDescription className="mt-2">
                    Total: {filteredClaims.length} claims | 
                    Total Amount: €{calculateTotals(filteredClaims, "amount").toFixed(2)}
                  </CardDescription>
                </div>
                <Button onClick={exportClaims}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell>
                            <div className="font-medium">{claim.travelRequest.user.name}</div>
                            <div className="text-sm text-gray-500">{claim.travelRequest.user.email}</div>
                          </TableCell>
                          <TableCell>{claim.travelRequest.eventName}</TableCell>
                          <TableCell>{claim.description}</TableCell>
                          <TableCell>€{claim.amount.toFixed(2)}</TableCell>
                          <TableCell>{formatDate(claim.date)}</TableCell>
                          <TableCell>
                            <StatusBadge status={claim.status} />
                          </TableCell>
                          <TableCell>{formatDate(claim.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
