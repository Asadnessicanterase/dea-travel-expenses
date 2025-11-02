
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Euro,
  FileText,
  FileEdit,
  User,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/date-utils";
import { BudgetWidget } from "@/components/budget-widget";

interface TransportationItem {
  id: string;
  description: string;
  estimatedCost: number;
}

interface Approval {
  id: string;
  action: string;
  comment?: string;
  approverEmail: string;
  createdAt: string;
}

interface ExpenseApproval {
  id: string;
  action: string;
  comment?: string;
  approverEmail: string;
  createdAt: string;
}

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
  estimatedAccommodation?: number;
  transportationItems?: TransportationItem[];
  estimatedOther?: number;
  estimatedOtherDescription?: string;
  status: string;
  submittedAt: string;
  approvals?: Approval[];
  user?: {
    name: string;
    email: string;
    position: string;
  };
}

interface ExpenseClaim {
  id: string;
  description: string;
  amount: number;
  accommodation?: number;
  transportation?: number;
  otherAmount?: number;
  otherDescription?: string;
  date: string;
  accommodationReceipts: string[];
  transportationReceipts: string[];
  otherReceipts: string[];
  status: string;
  createdAt: string;
  voucherPdfPath?: string;
  voucherNumber?: string;
  expenseApprovals?: ExpenseApproval[];
  travelRequest: {
    id: string;
    destinationCountry: string;
    eventName: string;
    estimatedCosts: number;
    estimatedAccommodation?: number;
    transportationItems?: TransportationItem[];
    estimatedOther?: number;
    user: {
      name: string;
      email: string;
      position: string;
    };
  };
}

export default function ApprovalsClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("requests");
  
  // Travel Requests state
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [requestActionType, setRequestActionType] = useState<string>("");
  const [requestComment, setRequestComment] = useState("");
  const [requestProcessing, setRequestProcessing] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  
  // Expense Claims state
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [claimActionType, setClaimActionType] = useState<string>("");
  const [claimComment, setClaimComment] = useState("");
  const [claimProcessing, setClaimProcessing] = useState(false);
  const [voucherGenerating, setVoucherGenerating] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>("all");
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  
  // Receipt Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);

  useEffect(() => {
    // Check for tab from URL
    const tabParam = searchParams?.get("tab");
    if (tabParam === "expenses") {
      setActiveTab("expenses");
    }
    
    // Check for status filter from URL
    const statusParam = searchParams?.get("status");
    if (statusParam) {
      setRequestStatusFilter(statusParam);
      setClaimStatusFilter(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRequests();
    fetchExpenseClaims();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/travel-requests");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      toast.error("Failed to fetch requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchExpenseClaims = async () => {
    try {
      const response = await fetch("/api/expense-claims");
      const data = await response.json();
      setExpenseClaims(data.expenseClaims || []);
    } catch (error) {
      toast.error("Failed to fetch expense claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  const openRequestActionDialog = (request: TravelRequest, action: string) => {
    setSelectedRequest(request);
    setRequestActionType(action);
    setRequestComment("");
  };

  const closeRequestDialog = () => {
    setSelectedRequest(null);
    setRequestActionType("");
    setRequestComment("");
  };

  const handleRequestAction = async () => {
    if (!selectedRequest) return;

    setRequestProcessing(true);

    try {
      const response = await fetch(`/api/travel-requests/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: requestActionType,
          comment: requestComment || null,
        }),
      });

      if (response.ok) {
        const actionLabel = 
          requestActionType === "APPROVE" ? "approved" : 
          requestActionType === "DENY" ? "denied" : 
          "marked for amendment";
        toast.success(`Request ${actionLabel} successfully`);
        closeRequestDialog();
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to process request");
      }
    } catch (error) {
      toast.error("Failed to process request");
    } finally {
      setRequestProcessing(false);
    }
  };

  const openClaimActionDialog = (claim: ExpenseClaim, action: string) => {
    setSelectedClaim(claim);
    setClaimActionType(action);
    setClaimComment("");
  };

  const closeClaimDialog = () => {
    setSelectedClaim(null);
    setClaimActionType("");
    setClaimComment("");
    setVoucherGenerating(false);
  };

  const handleClaimAction = async () => {
    if (!selectedClaim) return;

    const isApproving = claimActionType === "APPROVE";

    setClaimProcessing(true);
    if (isApproving) {
      setVoucherGenerating(true);
    }

    try {
      const response = await fetch(`/api/expense-claims/${selectedClaim.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: claimActionType,
          comment: claimComment || null,
        }),
      });

      if (response.ok) {
        const actionLabel = 
          claimActionType === "APPROVE" ? "approved for payment" : 
          claimActionType === "DENY" ? "denied" :
          "returned for amendment";
        toast.success(`Expense claim ${actionLabel} successfully`);
        closeClaimDialog();
        fetchExpenseClaims();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to process expense claim");
      }
    } catch (error) {
      toast.error("Failed to process expense claim");
    } finally {
      if (isApproving) {
        setVoucherGenerating(false);
      }
      setClaimProcessing(false);
    }
  };

  const handleDownloadReceipt = async (claimId: string, type: string, index: number = 0) => {
    try {
      const response = await fetch(`/api/expense-claims/${claimId}/download?type=${type}&index=${index}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // Open in new tab to trigger download
          const link = document.createElement('a');
          link.href = data.url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("Receipt download initiated");
        } else {
          toast.error("Receipt not available");
        }
      } else {
        toast.error("Failed to download receipt");
      }
    } catch (error) {
      toast.error("Failed to download receipt");
    }
  };

  const handlePreviewReceipt = async (claimId: string, type: string, receiptType: string, index: number = 0) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewType(receiptType);

    try {
      const response = await fetch(`/api/expense-claims/${claimId}/download?type=${type}&index=${index}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // Use the signed URL directly - simpler and avoids CORS issues
          setPreviewUrl(data.url);
          setPreviewIsPdf(data.isPdf || false);
        } else {
          toast.error("Receipt not available");
          setPreviewOpen(false);
        }
      } else {
        toast.error("Failed to load receipt");
        setPreviewOpen(false);
      }
    } catch (error) {
      console.error("Error loading receipt:", error);
      toast.error("Failed to load receipt");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewUrl("");
    setPreviewType("");
    setPreviewIsPdf(false);
  };

  // Voucher download
  const handleDownloadVoucher = async (claimId: string) => {
    try {
      const response = await fetch(`/api/expense-claims/${claimId}/download-voucher`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.downloadUrl) {
          // Open in new tab to trigger download
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("Voucher download initiated");
        } else {
          toast.error("Voucher not available");
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to download voucher");
      }
    } catch (error) {
      console.error("Error downloading voucher:", error);
      toast.error("Failed to download voucher");
    }
  };

  const checkVoucherStatus = (claim: ExpenseClaim) => {
    // Check if voucher exists in the claim data
    return !!(claim as any).voucherPdfPath;
  };

  // Filter requests based on selected status
  const filteredRequests = requests.filter((request) => {
    if (requestStatusFilter === "all") return true;
    
    const statusMap: { [key: string]: string } = {
      pending: "PENDING",
      approved: "APPROVED",
      denied: "DENIED",
      amendmentRequested: "AMENDMENT_REQUESTED",
      closed: "CLOSED",
    };
    
    return request.status === statusMap[requestStatusFilter];
  });

  // Filter claims based on selected status
  const filteredClaims = expenseClaims.filter((claim) => {
    if (claimStatusFilter === "all") return true;
    
    const statusMap: { [key: string]: string } = {
      pending: "PENDING",
      approved: "APPROVED",
      denied: "DENIED",
      amendmentRequested: "AMENDMENT_REQUESTED",
      closed: "CLOSED",
    };
    
    return claim.status === statusMap[claimStatusFilter];
  });

  const pendingRequests = filteredRequests.filter(r => r.status === "PENDING");
  const reviewedRequests = filteredRequests.filter(r => r.status !== "PENDING");

  const pendingClaims = filteredClaims.filter(c => c.status === "PENDING");
  const amendmentRequestedClaims = filteredClaims.filter(c => c.status === "AMENDMENT_REQUESTED");
  const reviewedClaims = filteredClaims.filter(c => c.status !== "PENDING" && c.status !== "AMENDMENT_REQUESTED");

  // Toggle functions for expand/collapse
  const toggleRequestExpanded = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const toggleClaimExpanded = (claimId: string) => {
    setExpandedClaims(prev => {
      const newSet = new Set(prev);
      if (newSet.has(claimId)) {
        newSet.delete(claimId);
      } else {
        newSet.add(claimId);
      }
      return newSet;
    });
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
        <p className="text-gray-600 mt-1">Review and approve travel requests and expense claims</p>
      </div>

      {/* Budget Overview Widget */}
      <div className="mb-6">
        <BudgetWidget />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="requests" className="gap-2 flex-1 sm:flex-initial">
              <FileText className="h-4 w-4" />
              <span className="hidden xs:inline">Travel Requests</span>
              <span className="xs:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2 flex-1 sm:flex-initial">
              <Euro className="h-4 w-4" />
              <span className="hidden xs:inline">Expense Claims</span>
              <span className="xs:hidden">Expenses</span>
            </TabsTrigger>
          </TabsList>

          <Link href="/summary" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Back to Summary
            </Button>
          </Link>
        </div>

        {/* TRAVEL REQUESTS TAB */}
        <TabsContent value="requests" className="space-y-6">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
            </div>
            <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
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
              Showing {filteredRequests.length} of {requests.length} requests
            </span>
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Pending Requests */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Pending Approval ({pendingRequests.length})
                </h2>

                {pendingRequests.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No pending requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {pendingRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-xl">{request.eventName}</CardTitle>
                                <StatusBadge status={request.status} />
                              </div>
                              <CardDescription className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{request.name} - {request.position}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="text-sm">Organizer: {request.eventOrganiser}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {formatDate(request.travelDateFrom)} - {formatDate(request.travelDateTo)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {request.destinationCity ? `${request.destinationCity}, ` : ''}{request.destinationCountry}
                                  </span>
                                </div>
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                €{request.estimatedCosts?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-gray-500">Estimated Cost</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Purpose:</div>
                            <div className="text-sm text-gray-900">{request.purpose}</div>
                          </div>

                          {/* Cost Breakdown */}
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Accommodation:</span>
                                <span className="font-medium text-gray-900">
                                  €{request.estimatedAccommodation?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                              
                              {/* Transportation Items */}
                              {request.transportationItems && request.transportationItems.length > 0 && (
                                <div className="border-t border-blue-200 pt-2 mt-2">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">Transportation:</div>
                                  {request.transportationItems.map((item, index) => (
                                    <div key={item.id || index} className="flex justify-between text-sm pl-3 mb-1">
                                      <span className="text-gray-600 text-xs">
                                        {item.description || `Transportation ${index + 1}`}:
                                      </span>
                                      <span className="font-medium text-gray-900 text-xs">
                                        €{item.estimatedCost?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-sm font-medium border-t border-blue-200 pt-1 mt-1">
                                    <span className="text-gray-700">Total Transportation:</span>
                                    <span className="font-medium text-gray-900">
                                      €{(request.transportationItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                  Other{request.estimatedOtherDescription ? ` (${request.estimatedOtherDescription})` : ''}:
                                </span>
                                <span className="font-medium text-gray-900">
                                  €{request.estimatedOther?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                                <span className="font-semibold text-gray-900">Total:</span>
                                <span className="font-bold text-blue-600">
                                  €{request.estimatedCosts?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              size="sm"
                              className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => openRequestActionDialog(request, "APPROVE")}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 flex-1 border-orange-500 text-orange-700 hover:bg-orange-50"
                              onClick={() => openRequestActionDialog(request, "REQUEST_AMENDMENT")}
                            >
                              <AlertCircle className="h-4 w-4" />
                              Request Amendment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 flex-1 border-red-500 text-red-700 hover:bg-red-50"
                              onClick={() => openRequestActionDialog(request, "DENY")}
                            >
                              <XCircle className="h-4 w-4" />
                              Deny
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviewed Requests */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Previously Reviewed ({reviewedRequests.length})
                </h2>

                {reviewedRequests.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No reviewed requests yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {reviewedRequests.map((request) => {
                      const isExpanded = expandedRequests.has(request.id);
                      
                      return (
                        <Card 
                          key={request.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => toggleRequestExpanded(request.id)}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-gray-900">{request.eventName}</span>
                                  <StatusBadge status={request.status} />
                                </div>
                                <div className="text-sm text-gray-600">
                                  {request.name} • {formatDate(request.travelDateFrom)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-bold text-gray-900">€{request.estimatedCosts?.toFixed(2) || '0.00'}</div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-gray-600 mb-1">Employee</div>
                                    <div className="font-medium">{request.name} - {request.position}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Organizer</div>
                                    <div className="font-medium">{request.eventOrganiser}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Travel Dates</div>
                                    <div className="font-medium">
                                      {formatDate(request.travelDateFrom)} - {formatDate(request.travelDateTo)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Location</div>
                                    <div className="font-medium">
                                      {request.destinationCity ? `${request.destinationCity}, ` : ''}{request.destinationCountry}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">Purpose:</div>
                                  <div className="text-sm text-gray-900">{request.purpose}</div>
                                </div>

                                {/* Approver Comment - Only show for denied/amendment requested */}
                                {(request.status === "DENIED" || request.status === "AMENDMENT_REQUESTED") && 
                                 request.approvals && request.approvals.length > 0 && request.approvals[0].comment && (
                                  <div className={`p-4 rounded-lg border ${
                                    request.status === "DENIED" 
                                      ? "bg-red-50 border-red-200" 
                                      : "bg-orange-50 border-orange-200"
                                  }`}>
                                    <div className="text-sm font-semibold text-gray-900 mb-2">
                                      {request.status === "DENIED" ? "Reason for Denial:" : "Reason for Amendment Request:"}
                                    </div>
                                    <div className="text-sm text-gray-800">{request.approvals[0].comment}</div>
                                  </div>
                                )}

                                {/* Cost Breakdown */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <div className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-700">Accommodation:</span>
                                      <span className="font-medium text-gray-900">
                                        €{request.estimatedAccommodation?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    
                                    {/* Transportation Items */}
                                    {request.transportationItems && request.transportationItems.length > 0 && (
                                      <div className="border-t border-blue-200 pt-2 mt-2">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Transportation:</div>
                                        {request.transportationItems.map((item, index) => (
                                          <div key={item.id || index} className="flex justify-between text-sm pl-3 mb-1">
                                            <span className="text-gray-600 text-xs">
                                              {item.description || `Transportation ${index + 1}`}:
                                            </span>
                                            <span className="font-medium text-gray-900 text-xs">
                                              €{item.estimatedCost?.toFixed(2) || '0.00'}
                                            </span>
                                          </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-medium border-t border-blue-200 pt-1 mt-1">
                                          <span className="text-gray-700">Total Transportation:</span>
                                          <span className="font-medium text-gray-900">
                                            €{(request.transportationItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0)).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-700">
                                        Other{request.estimatedOtherDescription ? ` (${request.estimatedOtherDescription})` : ''}:
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        €{request.estimatedOther?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                                      <span className="font-semibold text-gray-900">Total:</span>
                                      <span className="font-bold text-blue-600">
                                        €{request.estimatedCosts?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* EXPENSE CLAIMS TAB */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
            </div>
            <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved for Payment</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 hidden sm:inline">
              Showing {filteredClaims.length} of {expenseClaims.length} claims
            </span>
          </div>

          {claimsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Pending Claims */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Pending Approval ({pendingClaims.length})
                </h2>

                {pendingClaims.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No pending expense claims</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {pendingClaims.map((claim) => (
                      <Card key={claim.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-xl">{claim.travelRequest.eventName}</CardTitle>
                                <StatusBadge status={claim.status} />
                              </div>
                              <CardDescription className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{claim.travelRequest.user.name} - {claim.travelRequest.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>Travel: {claim.travelRequest.destinationCountry}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Claim Submission Date: {formatDate(claim.date)}</span>
                                </div>
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">
                                €{claim.amount?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-gray-500">Total Amount</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Budget Comparison */}
                          {(() => {
                            const estimatedTotal = claim.travelRequest.estimatedCosts;
                            const actualTotal = claim.amount;
                            const variance = actualTotal - estimatedTotal;
                            const variancePercent = estimatedTotal > 0 ? ((variance / estimatedTotal) * 100) : 0;
                            const isOverBudget = variance > 0;
                            
                            return (
                              <div className={`p-4 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="text-sm font-semibold text-gray-900 mb-3">Budget Comparison</div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 mb-1">Original Estimated</div>
                                    <div className="text-lg font-bold text-gray-900">
                                      €{estimatedTotal.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 mb-1">Actual Total</div>
                                    <div className="text-lg font-bold text-gray-900">
                                      €{actualTotal.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 mb-1">Variance</div>
                                    <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                      {variance >= 0 ? '+' : ''}€{variance.toFixed(2)}
                                    </div>
                                    <div className={`text-xs ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                      ({variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Cost Breakdown */}
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</div>
                            <div className="space-y-2">
                              {claim.accommodation !== null && claim.accommodation !== undefined && claim.accommodation > 0 && (
                                <div className="flex justify-between text-sm">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-700">Accommodation:</span>
                                    {claim.accommodationReceipts && claim.accommodationReceipts.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {claim.accommodationReceipts.map((receipt, index) => (
                                          <div key={index} className="flex items-center gap-1">
                                            <button
                                              onClick={() => handlePreviewReceipt(claim.id, 'accommodation', `Accommodation ${index + 1}`, index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Preview receipt ${index + 1}`}
                                            >
                                              <Eye className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDownloadReceipt(claim.id, 'accommodation', index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Download receipt ${index + 1}`}
                                            >
                                              <Download className="h-3 w-3" />
                                            </button>
                                            {claim.accommodationReceipts.length > 1 && (
                                              <span className="text-xs text-gray-500">#{index + 1}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    €{claim.accommodation.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {claim.transportation !== null && claim.transportation !== undefined && claim.transportation > 0 && (
                                <div className="flex justify-between text-sm">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-700">Transportation:</span>
                                    {claim.transportationReceipts && claim.transportationReceipts.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {claim.transportationReceipts.map((receipt, index) => (
                                          <div key={index} className="flex items-center gap-1">
                                            <button
                                              onClick={() => handlePreviewReceipt(claim.id, 'transportation', `Transportation ${index + 1}`, index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Preview receipt ${index + 1}`}
                                            >
                                              <Eye className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDownloadReceipt(claim.id, 'transportation', index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Download receipt ${index + 1}`}
                                            >
                                              <Download className="h-3 w-3" />
                                            </button>
                                            {claim.transportationReceipts.length > 1 && (
                                              <span className="text-xs text-gray-500">#{index + 1}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    €{claim.transportation.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {claim.otherAmount !== null && claim.otherAmount !== undefined && claim.otherAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-700">
                                      Other{claim.otherDescription ? ` (${claim.otherDescription})` : ''}:
                                    </span>
                                    {claim.otherReceipts && claim.otherReceipts.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {claim.otherReceipts.map((receipt, index) => (
                                          <div key={index} className="flex items-center gap-1">
                                            <button
                                              onClick={() => handlePreviewReceipt(claim.id, 'other', `Other ${index + 1}`, index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Preview receipt ${index + 1}`}
                                            >
                                              <Eye className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDownloadReceipt(claim.id, 'other', index)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title={`Download receipt ${index + 1}`}
                                            >
                                              <Download className="h-3 w-3" />
                                            </button>
                                            {claim.otherReceipts.length > 1 && (
                                              <span className="text-xs text-gray-500">#{index + 1}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    €{claim.otherAmount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                                <span className="font-semibold text-gray-900">Total:</span>
                                <span className="font-bold text-green-600">
                                  €{claim.amount?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => openClaimActionDialog(claim, "APPROVE")}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Sign and Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 flex-1 border-red-500 text-red-700 hover:bg-red-50"
                                onClick={() => openClaimActionDialog(claim, "DENY")}
                              >
                                <XCircle className="h-4 w-4" />
                                Deny
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full border-amber-500 text-amber-700 hover:bg-amber-50"
                              onClick={() => openClaimActionDialog(claim, "REQUEST_AMENDMENT")}
                            >
                              <AlertCircle className="h-4 w-4" />
                              Request Amendment
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Amendment Requested Claims */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-amber-600" />
                  Pending Amendments ({amendmentRequestedClaims.length})
                </h2>

                {amendmentRequestedClaims.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No expense claims awaiting amendment</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {amendmentRequestedClaims.map((claim) => {
                      const estimatedTotal = claim.travelRequest.estimatedCosts;
                      const actualTotal = claim.amount;
                      const variance = actualTotal - estimatedTotal;
                      const variancePercent = estimatedTotal > 0 ? ((variance / estimatedTotal) * 100) : 0;
                      const isOverBudget = variance > 0;
                      
                      return (
                        <Card key={claim.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-xl">{claim.travelRequest.eventName}</CardTitle>
                                  <StatusBadge status={claim.status} />
                                </div>
                                <CardDescription className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{claim.travelRequest.user.name} - {claim.travelRequest.user.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>Travel: {claim.travelRequest.destinationCountry}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Claim Submission Date: {formatDate(claim.date)}</span>
                                  </div>
                                </CardDescription>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-amber-600">
                                  €{claim.amount?.toFixed(2) || '0.00'}
                                </div>
                                <div className="text-xs text-gray-500">Total Amount</div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Amendment Request Reason */}
                            {claim.expenseApprovals && claim.expenseApprovals.length > 0 && claim.expenseApprovals[0].comment && (
                              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <div className="text-sm font-semibold text-gray-900 mb-2">
                                  Reason for Amendment Request:
                                </div>
                                <div className="text-sm text-gray-800">{claim.expenseApprovals[0].comment}</div>
                              </div>
                            )}

                            {/* Budget Comparison */}
                            <div className={`p-4 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                              <div className="text-sm font-semibold text-gray-900 mb-3">Budget Comparison</div>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <div className="text-xs text-gray-600 mb-1">Original Estimated</div>
                                  <div className="text-lg font-bold text-gray-900">
                                    €{estimatedTotal.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-600 mb-1">Actual Total</div>
                                  <div className="text-lg font-bold text-gray-900">
                                    €{actualTotal.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-600 mb-1">Variance</div>
                                  <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                    {variance >= 0 ? '+' : ''}€{variance.toFixed(2)}
                                  </div>
                                  <div className={`text-xs ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                    ({variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <div className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</div>
                              <div className="space-y-2">
                                {claim.accommodation !== null && claim.accommodation !== undefined && claim.accommodation > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-gray-700">Accommodation:</span>
                                      {claim.accommodationReceipts && claim.accommodationReceipts.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {claim.accommodationReceipts.map((receipt, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <button
                                                onClick={() => handlePreviewReceipt(claim.id, 'accommodation', `Accommodation ${index + 1}`, index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Preview receipt ${index + 1}`}
                                              >
                                                <Eye className="h-3 w-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDownloadReceipt(claim.id, 'accommodation', index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Download receipt ${index + 1}`}
                                              >
                                                <Download className="h-3 w-3" />
                                              </button>
                                              {claim.accommodationReceipts.length > 1 && (
                                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      €{claim.accommodation.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {claim.transportation !== null && claim.transportation !== undefined && claim.transportation > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-gray-700">Transportation:</span>
                                      {claim.transportationReceipts && claim.transportationReceipts.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {claim.transportationReceipts.map((receipt, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <button
                                                onClick={() => handlePreviewReceipt(claim.id, 'transportation', `Transportation ${index + 1}`, index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Preview receipt ${index + 1}`}
                                              >
                                                <Eye className="h-3 w-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDownloadReceipt(claim.id, 'transportation', index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Download receipt ${index + 1}`}
                                              >
                                                <Download className="h-3 w-3" />
                                              </button>
                                              {claim.transportationReceipts.length > 1 && (
                                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      €{claim.transportation.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {claim.otherAmount !== null && claim.otherAmount !== undefined && claim.otherAmount > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-gray-700">
                                        Other{claim.otherDescription ? ` (${claim.otherDescription})` : ''}:
                                      </span>
                                      {claim.otherReceipts && claim.otherReceipts.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {claim.otherReceipts.map((receipt, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <button
                                                onClick={() => handlePreviewReceipt(claim.id, 'other', `Other ${index + 1}`, index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Preview receipt ${index + 1}`}
                                              >
                                                <Eye className="h-3 w-3" />
                                              </button>
                                              <button
                                                onClick={() => handleDownloadReceipt(claim.id, 'other', index)}
                                                className="text-blue-600 hover:text-blue-700"
                                                title={`Download receipt ${index + 1}`}
                                              >
                                                <Download className="h-3 w-3" />
                                              </button>
                                              {claim.otherReceipts.length > 1 && (
                                                <span className="text-xs text-gray-500">#{index + 1}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      €{claim.otherAmount.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                                  <span className="font-semibold text-gray-900">Total:</span>
                                  <span className="font-bold text-green-600">
                                    €{claim.amount?.toFixed(2) || '0.00'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="text-sm text-amber-900">
                                <strong>Awaiting resubmission:</strong> The submitter has been notified to make the requested amendments and resubmit this claim.
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reviewed Claims */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Previously Reviewed ({reviewedClaims.length})
                </h2>

                {reviewedClaims.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No reviewed expense claims yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {reviewedClaims.map((claim) => {
                      const isExpanded = expandedClaims.has(claim.id);
                      
                      return (
                        <Card 
                          key={claim.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => toggleClaimExpanded(claim.id)}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-gray-900">{claim.travelRequest.eventName}</span>
                                  <StatusBadge status={claim.status} />
                                </div>
                                <div className="text-sm text-gray-600">
                                  {claim.travelRequest.user.name} • {formatDate(claim.date)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-bold text-gray-900">€{claim.amount?.toFixed(2) || '0.00'}</div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-gray-600 mb-1">Employee</div>
                                    <div className="font-medium">
                                      {claim.travelRequest.user.name} - {claim.travelRequest.user.position}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Travel Destination</div>
                                    <div className="font-medium">{claim.travelRequest.destinationCountry}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Claim Submission Date</div>
                                    <div className="font-medium">{formatDate(claim.date)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 mb-1">Total Amount</div>
                                    <div className="font-medium text-green-600">€{claim.amount?.toFixed(2) || '0.00'}</div>
                                  </div>
                                </div>

                                {/* Approver Comment - Show for denied and amendment requested claims */}
                                {(claim.status === "DENIED" || claim.status === "AMENDMENT_REQUESTED") && 
                                 claim.expenseApprovals && claim.expenseApprovals.length > 0 && claim.expenseApprovals[0].comment && (
                                  <div className={`p-4 rounded-lg border ${
                                    claim.status === "DENIED" 
                                      ? "bg-red-50 border-red-200" 
                                      : "bg-amber-50 border-amber-200"
                                  }`}>
                                    <div className="text-sm font-semibold text-gray-900 mb-2">
                                      {claim.status === "DENIED" ? "Reason for Denial:" : "Reason for Amendment Request:"}
                                    </div>
                                    <div className="text-sm text-gray-800">{claim.expenseApprovals[0].comment}</div>
                                  </div>
                                )}

                                {/* Cost Breakdown */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                  <div className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</div>
                                  <div className="space-y-2">
                                    {claim.accommodation !== null && claim.accommodation !== undefined && claim.accommodation > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-gray-700">Accommodation:</span>
                                          {claim.accommodationReceipts && claim.accommodationReceipts.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {claim.accommodationReceipts.map((receipt, index) => (
                                                <div key={index} className="flex items-center gap-1">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handlePreviewReceipt(claim.id, 'accommodation', `Accommodation ${index + 1}`, index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Preview receipt ${index + 1}`}
                                                  >
                                                    <Eye className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDownloadReceipt(claim.id, 'accommodation', index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Download receipt ${index + 1}`}
                                                  >
                                                    <Download className="h-3 w-3" />
                                                  </button>
                                                  {claim.accommodationReceipts.length > 1 && (
                                                    <span className="text-xs text-gray-500">#{index + 1}</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <span className="font-medium text-gray-900">
                                          €{claim.accommodation.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {claim.transportation !== null && claim.transportation !== undefined && claim.transportation > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-gray-700">Transportation:</span>
                                          {claim.transportationReceipts && claim.transportationReceipts.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {claim.transportationReceipts.map((receipt, index) => (
                                                <div key={index} className="flex items-center gap-1">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handlePreviewReceipt(claim.id, 'transportation', `Transportation ${index + 1}`, index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Preview receipt ${index + 1}`}
                                                  >
                                                    <Eye className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDownloadReceipt(claim.id, 'transportation', index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Download receipt ${index + 1}`}
                                                  >
                                                    <Download className="h-3 w-3" />
                                                  </button>
                                                  {claim.transportationReceipts.length > 1 && (
                                                    <span className="text-xs text-gray-500">#{index + 1}</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <span className="font-medium text-gray-900">
                                          €{claim.transportation.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {claim.otherAmount !== null && claim.otherAmount !== undefined && claim.otherAmount > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-gray-700">
                                            Other{claim.otherDescription ? ` (${claim.otherDescription})` : ''}:
                                          </span>
                                          {claim.otherReceipts && claim.otherReceipts.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {claim.otherReceipts.map((receipt, index) => (
                                                <div key={index} className="flex items-center gap-1">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handlePreviewReceipt(claim.id, 'other', `Other ${index + 1}`, index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Preview receipt ${index + 1}`}
                                                  >
                                                    <Eye className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDownloadReceipt(claim.id, 'other', index);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title={`Download receipt ${index + 1}`}
                                                  >
                                                    <Download className="h-3 w-3" />
                                                  </button>
                                                  {claim.otherReceipts.length > 1 && (
                                                    <span className="text-xs text-gray-500">#{index + 1}</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <span className="font-medium text-gray-900">
                                          €{claim.otherAmount.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                                      <span className="font-semibold text-gray-900">Total:</span>
                                      <span className="font-bold text-green-600">
                                        €{claim.amount?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Voucher Section - For APPROVED and CLOSED Claims */}
                                {(claim.status === "APPROVED" || claim.status === "CLOSED") && (
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900">Payment Voucher</div>
                                          {claim.voucherNumber && (
                                            <div className="text-xs text-gray-600">{claim.voucherNumber}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        {checkVoucherStatus(claim) ? (
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadVoucher(claim.id);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            Download Voucher
                                          </Button>
                                        ) : (
                                          <div className="text-sm text-muted-foreground italic">
                                            Voucher not available
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Travel Request Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestActionType === "APPROVE" && "Approve Request"}
              {requestActionType === "DENY" && "Deny Request"}
              {requestActionType === "REQUEST_AMENDMENT" && "Request Amendment"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.destinationCountry} - {selectedRequest?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="requestComment">
                Comment {requestActionType !== "APPROVE" && "*"}
              </Label>
              <Textarea
                id="requestComment"
                value={requestComment}
                onChange={(e) => setRequestComment(e.target.value)}
                placeholder={
                  requestActionType === "APPROVE" 
                    ? "Optional: Add a comment..." 
                    : "Explain the reason..."
                }
                rows={4}
                required={requestActionType !== "APPROVE"}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleRequestAction}
                disabled={requestProcessing || (requestActionType !== "APPROVE" && !requestComment.trim())}
              >
                {requestProcessing ? "Processing..." : "Confirm"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeRequestDialog}
                disabled={requestProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Claim Action Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={closeClaimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {claimActionType === "APPROVE" && "Approve Expense Claim for Payment"}
              {claimActionType === "DENY" && "Deny Expense Claim"}
              {claimActionType === "REQUEST_AMENDMENT" && "Request Amendment to Expense Claim"}
            </DialogTitle>
            <DialogDescription>
              {selectedClaim?.description} - €{selectedClaim?.amount?.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="claimComment">
                Comment {(claimActionType === "DENY" || claimActionType === "REQUEST_AMENDMENT") && "*"}
              </Label>
              <Textarea
                id="claimComment"
                value={claimComment}
                onChange={(e) => setClaimComment(e.target.value)}
                placeholder={
                  claimActionType === "APPROVE" 
                    ? "Optional: Add a comment..." 
                    : claimActionType === "REQUEST_AMENDMENT"
                    ? "Explain what needs to be amended..."
                    : "Explain the reason for denial..."
                }
                rows={4}
                required={claimActionType === "DENY" || claimActionType === "REQUEST_AMENDMENT"}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleClaimAction}
                disabled={claimProcessing || ((claimActionType === "DENY" || claimActionType === "REQUEST_AMENDMENT") && !claimComment.trim())}
              >
                {claimProcessing ? "Processing..." : "Confirm"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeClaimDialog}
                disabled={claimProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={voucherGenerating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[320px] [&>button]:hidden">
          <div className="flex flex-col items-center gap-4 py-6">
            <div
              className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"
              aria-hidden="true"
            />
            <DialogTitle className="text-center text-lg font-semibold">
              💾 Generating payment voucher...
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500">
              Please hang tight; this only takes a moment.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="capitalize">{previewType} Receipt</DialogTitle>
            <div className="flex items-center gap-2">
              {!previewLoading && previewUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewUrl;
                    link.target = '_blank';
                    link.download = `${previewType}-receipt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading receipt...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="w-full h-full min-h-[500px]">
                {previewIsPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full min-h-[500px] border rounded"
                    title="Receipt Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <img
                      src={previewUrl}
                      alt={`${previewType} Receipt`}
                      className="max-w-full h-auto rounded shadow-lg"
                      onError={(e) => {
                        console.error('Image failed to load');
                        toast.error('Failed to load image');
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">No receipt available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
