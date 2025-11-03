
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
  Plane,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, animate, useMotionValue } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

function MiniEmptyArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="8" y="12" width="32" height="24" rx="6" />
      <path d="M16 20h16M16 26h10" />
      <circle cx="34" cy="28" r="3" />
      <path d="M14 36c-2 4-6 5-6 5" />
      <path d="M34 9l2.5-2.5" />
      <path d="M40 16l4-1" />
    </svg>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    motionValue.set(0);
    setDisplayValue(0);
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: "easeOut",
    });
    const unsubscribe = motionValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionValue, value]);

  return <span>{displayValue}</span>;
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
      gradientTo: "to-yellow-50",
      borderColor: "border-yellow-300/40",
      tooltip: summary.isApprover
        ? "Requests awaiting your approval"
        : "Awaiting reviewer action",
      emptyMessage: summary.isApprover
        ? "No requests awaiting your approval"
        : "No pending requests yet",
      emptyArtColor: "text-yellow-300",
    },
    {
      status: "approved",
      label: "Approved",
      icon: CheckCircle,
      color: "text-green-600",
      gradientTo: "to-green-50",
      borderColor: "border-green-300/40",
      tooltip: "Request approved and ready for travel",
      emptyMessage: summary.isApprover
        ? "You haven't approved any requests yet"
        : "No approved trips yet",
      emptyArtColor: "text-green-300",
    },
    {
      status: "denied",
      label: "Denied",
      icon: XCircle,
      color: "text-red-600",
      gradientTo: "to-red-50",
      borderColor: "border-red-300/40",
      tooltip: "Request denied – review the feedback to adjust",
      emptyMessage: summary.isApprover
        ? "You haven't denied any requests yet"
        : "No denied requests yet",
      emptyArtColor: "text-red-300",
    },
    {
      status: "amendmentRequested",
      label: "Amendment Requested",
      icon: FileEdit,
      color: "text-orange-600",
      gradientTo: "to-orange-50",
      borderColor: "border-orange-300/40",
      tooltip: "Changes requested – update the details and resubmit",
      emptyMessage: summary.isApprover
        ? "No amendment requests outstanding"
        : "No amendment requests yet",
      emptyArtColor: "text-orange-300",
    },
    {
      status: "closed",
      label: "Closed",
      icon: Lock,
      color: "text-gray-600",
      gradientTo: "to-gray-50",
      borderColor: "border-gray-300/40",
      tooltip: "Closed trips cannot be edited",
      emptyMessage: "No closed trips yet",
      emptyArtColor: "text-gray-300",
    },
  ];

  // Status cards for Expense Claims
  const expenseClaimStatusCards = [
    {
      status: "pending",
      label: summary.isApprover ? "Requires Approval" : "Pending",
      icon: Clock,
      color: "text-yellow-600",
      gradientTo: "to-yellow-50",
      borderColor: "border-yellow-300/40",
      tooltip: summary.isApprover
        ? "Claims awaiting your approval"
        : "Waiting for finance review",
      emptyMessage: summary.isApprover
        ? "No claims awaiting your approval"
        : "No pending claims yet",
      emptyArtColor: "text-yellow-300",
    },
    {
      status: "approved",
      label: "Approved for Payment",
      icon: CheckCircle,
      color: "text-green-600",
      gradientTo: "to-green-50",
      borderColor: "border-green-300/40",
      tooltip: "Approved and queued for reimbursement",
      emptyMessage: summary.isApprover
        ? "No claims approved for payment yet"
        : "No approved claims yet",
      emptyArtColor: "text-green-300",
    },
    {
      status: "denied",
      label: "Denied",
      icon: XCircle,
      color: "text-red-600",
      gradientTo: "to-red-50",
      borderColor: "border-red-300/40",
      tooltip: "Claim denied – check notes for details",
      emptyMessage: summary.isApprover
        ? "You haven't denied any claims yet"
        : "No denied claims yet",
      emptyArtColor: "text-red-300",
    },
    {
      status: "amendmentRequested",
      label: "Amendment Requested",
      icon: FileEdit,
      color: "text-orange-600",
      gradientTo: "to-orange-50",
      borderColor: "border-orange-300/40",
      tooltip: "More info required before approval",
      emptyMessage: summary.isApprover
        ? "No claims awaiting amendments"
        : "No amendment requests yet",
      emptyArtColor: "text-orange-300",
    },
    {
      status: "closed",
      label: "Closed",
      icon: Lock,
      color: "text-gray-600",
      gradientTo: "to-gray-50",
      borderColor: "border-gray-300/40",
      tooltip: "Closed claims are archived",
      emptyMessage: "No closed claims yet",
      emptyArtColor: "text-gray-300",
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
    <TooltipProvider delayDuration={150}>
      <div className="container mx-auto max-w-7xl px-4 py-8 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 after:content-[''] after:block after:h-[3px] after:w-10 after:bg-indigo-500 after:mt-1">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <Link href="/dashboard/new-request">
            <Card className="rounded-xl border border-blue-300/40 shadow-md transition-all transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_0_10px_rgba(0,0,0,0.05)] cursor-pointer bg-gradient-to-b from-white to-blue-50 hover:border-blue-400/60">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">New Travel Request</CardTitle>
                      <Plane className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-gray-600">Submit a new travel request for approval</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card
            className={`rounded-xl transition-all transition-transform duration-150 border shadow-md bg-gradient-to-b from-white ${
              hasApprovedRequest
                ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_10px_rgba(0,0,0,0.05)] border-green-400/40 hover:border-green-500/60 to-green-50"
                : "cursor-not-allowed border-gray-300/40 to-gray-50 opacity-60"
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">New Expense Claim</CardTitle>
                    <ClipboardList className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
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
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <FileText className="h-6 w-6 text-indigo-500" />
            <h2 className="text-2xl font-bold text-gray-900">Travel Requests</h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
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
                  className={`rounded-xl border shadow-md transition-all transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_0_10px_rgba(0,0,0,0.05)] cursor-pointer bg-gradient-to-b from-white ${card.gradientTo} ${card.borderColor}`}
                >
                  <CardHeader className="px-4 pt-3 pb-1 space-y-1 sm:px-6 sm:pt-5 sm:pb-3 sm:space-y-1.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <StatusIcon
                            aria-label={card.tooltip}
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                          <p className="max-w-[180px] text-xs font-medium text-gray-900">{card.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 sm:px-6 sm:pb-5">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-0.5 sm:mb-1">
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="font-extrabold tracking-tight"
                      >
                        <AnimatedCount value={count} />
                      </motion.div>
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                      {card.label}
                    </CardTitle>
                    {count === 0 && (
                      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
                        <MiniEmptyArt className={`h-10 w-10 ${card.emptyArtColor}`} />
                        <span>{card.emptyMessage}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Expense Claims Section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <DollarSign className="h-6 w-6 text-indigo-500" />
            <h2 className="text-2xl font-bold text-gray-900">Expense Claims</h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
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
                  className={`rounded-xl border shadow-md transition-all transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_0_10px_rgba(0,0,0,0.05)] cursor-pointer bg-gradient-to-b from-white ${card.gradientTo} ${card.borderColor}`}
                >
                  <CardHeader className="px-4 pt-3 pb-1 space-y-1 sm:px-6 sm:pt-5 sm:pb-3 sm:space-y-1.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <StatusIcon
                            aria-label={card.tooltip}
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                          <p className="max-w-[180px] text-xs font-medium text-gray-900">{card.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 sm:px-6 sm:pb-5">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-0.5 sm:mb-1">
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="font-extrabold tracking-tight"
                      >
                        <AnimatedCount value={count} />
                      </motion.div>
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                      {card.label}
                    </CardTitle>
                    {count === 0 && (
                      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
                        <MiniEmptyArt className={`h-10 w-10 ${card.emptyArtColor}`} />
                        <span>{card.emptyMessage}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
