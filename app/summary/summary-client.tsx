
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
  Lock,
  ArrowRight,
  Plus,
  Euro,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface SummaryData {
  travelRequests: {
    pending: number;
    approved: number;
    denied: number;
    amendmentRequested: number;
    closed: number;
  };
  expenseClaims: {
    pending: number;
    approved: number;
    denied: number;
    amendmentRequested: number;
    closed: number;
  };
  isApprover: boolean;
}

export default function SummaryClient() {
  const { data: session } = useSession() || {};
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApprovedRequest, setHasApprovedRequest] = useState(false);
  const [firstApprovedRequestId, setFirstApprovedRequestId] = useState<string | null>(null);
  const [firstApprovedRequest, setFirstApprovedRequest] = useState<any>(null);

  useEffect(() => {
    fetchSummary();
    fetchUserRequests();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/summary");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      toast.error("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRequests = async () => {
    try {
      const response = await fetch("/api/travel-requests");
      const data = await response.json();
      const approvedRequest = data.requests?.find((r: any) => r.status === "APPROVED");
      if (approvedRequest) {
        setHasApprovedRequest(true);
        setFirstApprovedRequestId(approvedRequest.id);
        setFirstApprovedRequest(approvedRequest);
      }
    } catch (error) {
      // Silently fail - this is just for the action buttons
    }
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

  if (!summary) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 overflow-x-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load summary</div>
        </div>
      </div>
    );
  }

  // Status cards for Travel Requests
  const travelRequestStatusCards = [
    {
      status: "pending",
      label: summary.isApprover ? "Requires Approval" : "Pending",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      status: "approved",
      label: "Approved",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      status: "denied",
      label: "Denied",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      status: "amendmentRequested",
      label: "Amendment Requested",
      icon: FileEdit,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      status: "closed",
      label: "Closed",
      icon: Lock,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  ];

  // Status cards for Expense Claims
  const expenseClaimStatusCards = [
    {
      status: "pending",
      label: summary.isApprover ? "Requires Approval" : "Pending",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      status: "approved",
      label: "Approved for Payment",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      status: "denied",
      label: "Denied",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      status: "amendmentRequested",
      label: "Amendment Requested",
      icon: FileEdit,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      status: "closed",
      label: "Closed",
      icon: Lock,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  ];

  const totalTravelRequests = Object.values(summary.travelRequests).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalExpenseClaims = Object.values(summary.expenseClaims).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {summary.isApprover ? "Approval Dashboard" : "My Dashboard"}
        </h1>
        <p className="text-gray-600 mt-1">
          {summary.isApprover
            ? "Overview of all travel requests and expense claims"
            : "Overview of your travel requests and expense claims"}
        </p>
      </div>

      {/* Quick Actions - Only for regular users */}
      {!summary.isApprover && (
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
                    <p className="text-sm text-gray-600">Submit a new travel request for approval</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card
            className={`transition-all cursor-pointer border-2 ${
              hasApprovedRequest
                ? "hover:shadow-lg border-transparent hover:border-green-500"
                : "opacity-60 cursor-not-allowed border-gray-200"
            }`}
            onClick={() => {
              if (hasApprovedRequest && firstApprovedRequestId) {
                // Check if this request already has an active expense claim
                const hasActiveClaim = firstApprovedRequest?.expenseClaims?.some(
                  (claim: any) => claim.status !== "DENIED"
                );
                if (hasActiveClaim) {
                  toast.error("You already have an active expense claim for this travel request");
                  return;
                }
                window.location.href = `/dashboard/expenses/${firstApprovedRequestId}`;
              } else {
                toast.error("You need an approved travel request before submitting expense claims");
              }
            }}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                <div className={`p-3 rounded-lg ${
                  hasApprovedRequest ? "bg-green-100" : "bg-gray-100"
                }`}>
                  <Euro className={`h-6 w-6 ${
                    hasApprovedRequest ? "text-green-600" : "text-gray-400"
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-lg">New Expense Claim</CardTitle>
                  <p className="text-sm text-gray-600">
                    {hasApprovedRequest
                      ? "Submit expenses for an approved trip"
                      : "Requires an approved travel request"}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Travel Requests Section */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Travel Requests</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {totalTravelRequests} total
            </span>
          </div>
          {summary.isApprover ? (
            <Link
              href="/approvals?tab=requests"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
            >
              View All Requests
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/dashboard?type=requests"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
            >
              View All Requests
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {travelRequestStatusCards.map((card) => {
            const StatusIcon = card.icon;
            const count =
              summary.travelRequests[
                card.status as keyof typeof summary.travelRequests
              ];
            const linkHref = summary.isApprover
              ? `/approvals?tab=requests&status=${card.status}`
              : `/dashboard?type=requests&status=${card.status}`;

            return (
              <Link key={card.status} href={linkHref}>
                <Card
                  className={`hover:shadow-lg transition-all cursor-pointer border-2 ${card.borderColor} ${card.bgColor}`}
                >
                  <CardHeader className="px-4 pt-3 pb-1 space-y-1 sm:px-6 sm:pt-5 sm:pb-3 sm:space-y-1.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 sm:px-6 sm:pb-5">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-0.5 sm:mb-1">
                      {count}
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                      {card.label}
                    </CardTitle>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Expense Claims Section */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Expense Claims</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {totalExpenseClaims} total
            </span>
          </div>
          {summary.isApprover ? (
            <Link
              href="/approvals?tab=expenses"
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm font-medium"
            >
              View All Expenses
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/dashboard?type=expenses"
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm font-medium"
            >
              View All Expenses
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {expenseClaimStatusCards.map((card) => {
            const StatusIcon = card.icon;
            const count =
              summary.expenseClaims[
                card.status as keyof typeof summary.expenseClaims
              ];
            const linkHref = summary.isApprover
              ? `/approvals?tab=expenses&status=${card.status}`
              : `/dashboard?type=expenses&status=${card.status}`;

            return (
              <Link key={card.status} href={linkHref}>
                <Card
                  className={`hover:shadow-lg transition-all cursor-pointer border-2 ${card.borderColor} ${card.bgColor}`}
                >
                  <CardHeader className="px-4 pt-3 pb-1 space-y-1 sm:px-6 sm:pt-5 sm:pb-3 sm:space-y-1.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 sm:px-6 sm:pb-5">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-0.5 sm:mb-1">
                      {count}
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                      {card.label}
                    </CardTitle>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
