
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Calendar, MapPin, FileText, Euro, User, Briefcase } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/date-utils";

interface TravelRequest {
  id: string;
  name: string;
  position: string;
  dateOfApplication: string;
  destinationCountry: string;
  eventOrganiser: string;
  eventName: string;
  travelDateFrom: string;
  travelDateTo: string;
  purpose: string;
  estimatedCosts: number;
  status: string;
  approverComment?: string | null;
  submittedAt: string;
  user?: {
    name: string;
    email: string;
    position: string;
  };
  expenseClaims: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

export default function RequestDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/travel-requests/${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setRequest(data.travelRequest);
      } else {
        toast.error("Failed to fetch request");
      }
    } catch (error) {
      toast.error("Failed to fetch request");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Request not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalExpenses = request.expenseClaims?.reduce((sum, claim) => sum + claim.amount, 0) || 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{request.destinationCountry}</CardTitle>
                <StatusBadge status={request.status} />
              </div>
              <div className="text-sm text-gray-600">
                Submitted on {formatDate(request.submittedAt)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                €{request.estimatedCosts?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Estimated Cost</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4" />
                Traveler Information
              </div>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Name:</span> {request.name}</div>
                <div><span className="font-medium">Position:</span> {request.user?.position || request.position}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4" />
                Dates
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Application:</span>{" "}
                  {formatDate(request.dateOfApplication)}
                </div>
                <div>
                  <span className="font-medium">Business Travel:</span>{" "}
                  {formatDate(request.travelDateFrom)} -{" "}
                  {formatDate(request.travelDateTo)}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4" />
              Event Details
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Organiser:</span> {request.eventOrganiser}
              </div>
              <div>
                <span className="font-medium">Event Name:</span> {request.eventName}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4" />
              Purpose
            </div>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.purpose}</p>
          </div>

          {request.approverComment && (
            <div className="border-t pt-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-900 mb-2">Approver Comment</div>
                <p className="text-sm text-orange-800">{request.approverComment}</p>
              </div>
            </div>
          )}

          {request.expenseClaims && request.expenseClaims.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
                <Euro className="h-4 w-4" />
                Expense Claims ({request.expenseClaims.length})
              </div>
              <div className="space-y-2">
                {request.expenseClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{claim.description}</div>
                      <div className="text-xs text-gray-600">
                        {formatDate(claim.date)}
                      </div>
                    </div>
                    <div className="font-bold text-sm">€{claim.amount?.toFixed(2) || '0.00'}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-semibold">Total Expenses</span>
                  <span className="text-lg font-bold text-purple-600">€{totalExpenses.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
