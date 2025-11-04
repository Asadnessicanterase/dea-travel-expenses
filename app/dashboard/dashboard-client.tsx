
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLoading } from "@/context/loading-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { 
  Plus, 
  FileText, 
  Calendar, 
  Euro, 
  MapPin, 
  Edit, 
  DollarSign,
  Lock,
  Filter,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TravelRequest {
  id: string;
  name: string;
  position: string;
  dateOfApplication: string;
  destinationCountry: string;
  destinationCity?: string;
  eventOrganiser: string;
  eventName: string;
  travelDateFrom: string;
  travelDateTo: string;
  purpose: string;
  estimatedCosts: number;
  status: string;
  approverComment?: string | null;
  submittedAt: string;
  expenseClaims: ExpenseClaim[];
}

interface ExpenseClaim {
  id: string;
  amount: number;
  description?: string;
  accommodation?: number;
  transportation?: number;
  otherAmount?: number;
  otherDescription?: string;
  date?: string;
  status?: string;
  approverComment?: string | null;
  createdAt?: string;
  travelRequest?: {
    id: string;
    destinationCountry: string;
    destinationCity?: string;
    eventName: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export default function DashboardClient() {
  const { data: session } = useSession() || {};
  const searchParams = useSearchParams();
  const { finishLoading } = useLoading();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewType, setViewType] = useState<"requests" | "expenses">("requests");

  const isApprover = session?.user?.role === "APPROVER";

  useEffect(() => {
    // Check for view type from URL
    const typeParam = searchParams?.get("type");
    if (typeParam === "expenses") {
      setViewType("expenses");
    } else {
      setViewType("requests");
    }
    
    // Check for status filter from URL
    const statusParam = searchParams?.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (viewType === "requests") {
      fetchRequests();
    } else {
      fetchExpenseClaims();
    }
  }, [viewType]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/travel-requests");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
      finishLoading();
    }
  };

  const fetchExpenseClaims = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/expense-claims");
      const data = await response.json();
      setExpenseClaims(data.expenseClaims || []);
    } catch (error) {
      toast.error("Failed to fetch expense claims");
    } finally {
      setLoading(false);
      finishLoading();
    }
  };

  const handleCloseTrip = async (requestId: string) => {
    if (!confirm("Are you sure you want to close this trip? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/travel-requests/${requestId}/close`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Trip closed successfully");
        fetchRequests();
      } else {
        toast.error("Failed to close trip");
      }
    } catch (error) {
      toast.error("Failed to close trip");
    }
  };

  const handleAcknowledgePayment = async (claimId: string) => {
    if (!confirm("Confirm that you have received payment for this expense claim?")) {
      return;
    }

    try {
      const response = await fetch(`/api/expense-claims/${claimId}/acknowledge`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Payment acknowledged successfully");
        fetchExpenseClaims();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to acknowledge payment");
      }
    } catch (error) {
      toast.error("Failed to acknowledge payment");
    }
  };

  const totalExpenses = (request: TravelRequest) => {
    return request.expenseClaims?.reduce((sum, claim) => sum + claim.amount, 0) || 0;
  };

  // Filter requests based on selected status
  const filteredRequests = requests.filter((request) => {
    if (statusFilter === "all") return true;
    
    // Map filter values to database statuses
    const statusMap: { [key: string]: string } = {
      pending: "PENDING",
      approved: "APPROVED",
      denied: "DENIED",
      amendmentRequested: "AMENDMENT_REQUESTED",
      closed: "CLOSED",
    };
    
    return request.status === statusMap[statusFilter];
  });

  // Filter expense claims based on selected status
  const filteredExpenseClaims = expenseClaims.filter((claim) => {
    if (statusFilter === "all") return true;
    
    // Map filter values to database statuses
    const statusMap: { [key: string]: string } = {
      pending: "PENDING",
      approved: "APPROVED",
      denied: "DENIED",
      amendmentRequested: "AMENDMENT_REQUESTED",
      closed: "CLOSED",
    };
    
    return claim.status === statusMap[statusFilter];
  });

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      all: "All Statuses",
      pending: "Pending",
      approved: "Approved",
      denied: "Denied",
      amendmentRequested: "Amendment Requested",
      closed: "Closed",
    };
    return labels[status] || "All Statuses";
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 overflow-x-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {viewType === "requests" 
            ? (isApprover ? "All Travel Requests" : "My Travel Requests")
            : (isApprover ? "All Expense Claims" : "My Expense Claims")}
        </h1>
        <p className="text-gray-600 mt-1">
          {viewType === "requests" 
            ? (isApprover ? "View and manage all travel requests in the system" : "Manage your travel requests and expense claims")
            : (isApprover ? "View and manage all expense claims in the system" : "View and manage your expense claims")}
        </p>
      </div>

      {/* Quick Actions - Only for regular users */}
      {!isApprover && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/dashboard/new-request">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-500">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">New Travel Request</CardTitle>
                    <CardDescription>Submit a new travel request for approval</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card
            className={`transition-all cursor-pointer border-2 ${
              requests.some(r => r.status === "APPROVED")
                ? "hover:shadow-lg border-transparent hover:border-green-500"
                : "opacity-60 cursor-not-allowed border-gray-200"
            }`}
            onClick={() => {
              if (requests.some(r => r.status === "APPROVED")) {
                // Find the first approved request
                const approvedRequest = requests.find(r => r.status === "APPROVED");
                if (approvedRequest) {
                  // Check if this request already has an active expense claim
                  const hasActiveClaim = approvedRequest.expenseClaims?.some(
                    (claim: any) => claim.status !== "DENIED"
                  );
                  if (hasActiveClaim) {
                    toast.error("You already have an active expense claim for this travel request");
                    return;
                  }
                  window.location.href = `/dashboard/expenses/${approvedRequest.id}`;
                }
              } else {
                toast.error("You need an approved travel request before submitting expense claims");
              }
            }}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                <div className={`p-3 rounded-lg ${
                  requests.some(r => r.status === "APPROVED") 
                    ? "bg-green-100" 
                    : "bg-gray-100"
                }`}>
                  <Euro className={`h-6 w-6 ${
                    requests.some(r => r.status === "APPROVED") 
                      ? "text-green-600" 
                      : "text-gray-400"
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-lg">New Expense Claim</CardTitle>
                  <CardDescription>
                    {requests.some(r => r.status === "APPROVED")
                      ? "Submit expenses for an approved trip"
                      : "Requires an approved travel request"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:flex-nowrap">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="amendmentRequested">Amendment Requested</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500 hidden sm:inline">
          {viewType === "requests"
            ? `Showing ${filteredRequests.length} of ${requests.length} requests`
            : `Showing ${filteredExpenseClaims.length} of ${expenseClaims.length} expense claims`}
        </span>
        <Link href="/summary" className="w-full sm:w-auto sm:ml-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Back to Summary
          </Button>
        </Link>
      </div>

      {viewType === "requests" ? (
        requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No travel requests yet</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Get started by creating your first travel request. It's quick and easy!
              </p>
              <Link href="/dashboard/new-request">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests match this filter</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Try selecting a different status or view all requests.
              </p>
              <Button onClick={() => setStatusFilter("all")} variant="outline">
                Show All Requests
              </Button>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-6">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3 mb-2">
                      <CardTitle className="text-xl">{request.eventName}</CardTitle>
                      <StatusBadge status={request.status} />
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:flex-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(request.travelDateFrom)} - {formatDate(request.travelDateTo)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {request.destinationCity ? `${request.destinationCity}, ${request.destinationCountry}` : request.destinationCountry}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="mt-2 w-full text-left sm:mt-0 sm:w-auto sm:text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      €{request.estimatedCosts.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Estimated</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Event Organiser</div>
                    <div className="text-sm text-gray-900">{request.eventOrganiser}</div>
                  </div>

                  {request.approverComment && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-orange-900 mb-1">Approver Comment</div>
                      <div className="text-sm text-orange-800">{request.approverComment}</div>
                    </div>
                  )}

                  {request.status === "APPROVED" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-medium text-blue-900">Expense Claims</div>
                          <div className="text-xs text-blue-700 mt-1">
                            {request.expenseClaims?.length || 0} claims • €{totalExpenses(request).toFixed(2)} total
                          </div>
                        </div>
                        <Link href={`/dashboard/expenses/${request.id}`} className="w-full sm:w-auto">
                          <Button size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
                            <DollarSign className="h-4 w-4" />
                            Submit Expense Claim
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                    {request.status === "AMENDMENT_REQUESTED" && (
                      <Link href={`/dashboard/edit-request/${request.id}`}>
                        <Button size="sm" className="w-full gap-2 sm:w-auto">
                          <Edit className="h-4 w-4" />
                          Amend & Resubmit
                        </Button>
                      </Link>
                    )}

                    {request.status === "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloseTrip(request.id)}
                        className="w-full gap-2 sm:w-auto"
                      >
                        <Lock className="h-4 w-4" />
                        Close Trip
                      </Button>
                    )}

                    <Link href={`/dashboard/request/${request.id}`}>
                      <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
      ) : (
        /* Expense Claims View */
        expenseClaims.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No expense claims yet</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Submit expense claims for your approved travel requests.
              </p>
            </CardContent>
          </Card>
        ) : filteredExpenseClaims.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No expense claims match this filter</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Try selecting a different status or view all expense claims.
              </p>
              <Button onClick={() => setStatusFilter("all")} variant="outline">
                Show All Expense Claims
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredExpenseClaims.map((claim) => {
              const destination = claim.travelRequest?.destinationCity 
                ? `${claim.travelRequest.destinationCity}, ${claim.travelRequest.destinationCountry}`
                : claim.travelRequest?.destinationCountry;
              
              return (
                <Card key={claim.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3 mb-2">
                          <CardTitle className="text-xl">{claim.travelRequest?.eventName || "Expense Claim"}</CardTitle>
                          <StatusBadge status={claim.status || "PENDING"} />
                        </div>
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:flex-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {claim.date ? formatDate(claim.date) : "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {destination || "N/A"}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="mt-2 w-full text-left sm:mt-0 sm:w-auto sm:text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          €{claim.amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-gray-500">Total Amount</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Cost Breakdown */}
                      {(claim.accommodation || claim.transportation || claim.otherAmount) && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown</div>
                          <div className="space-y-1 text-sm">
                            {claim.accommodation && claim.accommodation > 0 && (
                              <div className="flex flex-col gap-1 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                                <span>Accommodation:</span>
                                <span className="font-medium">€{claim.accommodation.toFixed(2)}</span>
                              </div>
                            )}
                            {claim.transportation && claim.transportation > 0 && (
                              <div className="flex flex-col gap-1 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                                <span>Transportation:</span>
                                <span className="font-medium">€{claim.transportation.toFixed(2)}</span>
                              </div>
                            )}
                            {claim.otherAmount && claim.otherAmount > 0 && (
                              <div className="flex flex-col gap-1 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                                <span>Other{claim.otherDescription ? ` (${claim.otherDescription})` : ''}:</span>
                                <span className="font-medium">€{claim.otherAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Approver Comment for Amendment Requested */}
                      {claim.status === "AMENDMENT_REQUESTED" && claim.approverComment && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="text-sm font-medium text-amber-900 mb-1">Reason for Amendment Request</div>
                          <div className="text-sm text-amber-800">{claim.approverComment}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                        {claim.status === "APPROVED" && (
                          <Button 
                            size="sm" 
                            className="w-full gap-2 sm:w-auto"
                            onClick={() => handleAcknowledgePayment(claim.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Acknowledge Payment Received
                          </Button>
                        )}
                        
                        {claim.status === "AMENDMENT_REQUESTED" && (
                          <Link href={`/dashboard/expenses/edit/${claim.id}`}>
                            <Button 
                              size="sm" 
                              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 sm:w-auto"
                            >
                              <Edit className="h-4 w-4" />
                              Resubmit Claim
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
