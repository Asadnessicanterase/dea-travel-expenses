
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoading } from "@/context/loading-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, PlaneTakeoff, Send } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { COUNTRIES } from "@/lib/countries";

export default function NewRequestPage() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const { finishLoading } = useLoading();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    destinationCountry: "",
    destinationCity: "",
    eventOrganiser: "",
    eventName: "",
    travelDateFrom: "",
    travelDateTo: "",
    purpose: "",
    estimatedAccommodation: "",
    estimatedOther: "",
    estimatedOtherDescription: "",
  });

  const [transportationItems, setTransportationItems] = useState<{
    description: string;
    estimatedCost: string;
  }[]>([{ description: "", estimatedCost: "" }]);

  const fieldAppearance =
    "rounded-xl border border-slate-200/80 bg-white/80 placeholder:text-slate-400 transition-all duration-200 ease-out focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/70 focus-visible:outline-none";
  const cardSurface =
    "rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_25px_65px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm";
  // Signal that page is loaded
  useEffect(() => {
    finishLoading();
  }, [finishLoading]);

  // Auto-populate name and position from session
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || "",
        position: (session.user as any).position || "",
      }));
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTransportationChange = (index: number, field: 'description' | 'estimatedCost', value: string) => {
    const updated = [...transportationItems];
    updated[index][field] = value;
    setTransportationItems(updated);
  };

  const addTransportationItem = () => {
    setTransportationItems([...transportationItems, { description: "", estimatedCost: "" }]);
  };

  const removeTransportationItem = (index: number) => {
    if (transportationItems.length > 1) {
      setTransportationItems(transportationItems.filter((_, i) => i !== index));
    }
  };

  // Calculate total transportation costs
  const totalTransportation = transportationItems.reduce((sum, item) => {
    return sum + (parseFloat(item.estimatedCost) || 0);
  }, 0);

  // Calculate total estimated costs from breakdown
  const calculatedTotal = 
    (parseFloat(formData.estimatedAccommodation) || 0) +
    totalTransportation +
    (parseFloat(formData.estimatedOther) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    const travelFrom = new Date(formData.travelDateFrom);
    const travelTo = new Date(formData.travelDateTo);
    
    // Check if travel start date is in the future
    if (travelFrom < today) {
      toast.error("Business Travel Date From must be a future date");
      return;
    }
    
    // Check if travel end date is after start date
    if (travelTo <= travelFrom) {
      toast.error("Business Travel Date To must be after the start date");
      return;
    }
    
    setLoading(true);

    try {
      // Filter out empty transportation items
      const validTransportationItems = transportationItems.filter(
        item => item.description.trim() && parseFloat(item.estimatedCost) > 0
      );

      const response = await fetch("/api/travel-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          dateOfApplication: new Date().toISOString(), // Auto-populate with current date
          estimatedCosts: calculatedTotal,
          transportationItems: validTransportationItems,
        }),
      });

      if (response.ok) {
        toast.success("Travel request submitted successfully");
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10">
      <div className="container mx-auto max-w-3xl px-4 overflow-x-hidden">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-8 gap-2 rounded-xl text-slate-600 hover:bg-slate-100/80 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <Card className={cardSurface}>
          <CardHeader className="space-y-1.5 rounded-t-2xl border-b border-slate-200/60 bg-white/70 pb-6">
            <CardTitle className="text-2xl font-semibold text-slate-900">New Travel Request</CardTitle>
            <CardDescription className="text-slate-600">
              Fill out the form below to submit a new travel request for approval
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name and Surname *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly
                  className={`${fieldAppearance} bg-slate-50/80`}
                  required
                />
                <p className="text-xs text-gray-500">Auto-filled from your profile</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  readOnly
                  className={`${fieldAppearance} bg-slate-50/80`}
                  required
                />
                <p className="text-xs text-gray-500">Auto-filled from your profile</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination Country *</Label>
                <Select
                  value={formData.destinationCountry}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destinationCountry: value })
                  }
                  required
                >
                  <SelectTrigger className={`${fieldAppearance} h-11`}>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200/80 bg-white/90 shadow-lg">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationCity">City/Town</Label>
                <Input
                  id="destinationCity"
                  name="destinationCity"
                  value={formData.destinationCity}
                  onChange={handleChange}
                  placeholder="e.g., Berlin, Paris, Madrid"
                  className={fieldAppearance}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventOrganiser">Event Organiser *</Label>
                <Input
                  id="eventOrganiser"
                  name="eventOrganiser"
                  value={formData.eventOrganiser}
                  onChange={handleChange}
                  className={fieldAppearance}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name *</Label>
                <Input
                  id="eventName"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  placeholder="e.g., Digital Euro Implementation Conference"
                  className={fieldAppearance}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="travelDateFrom">Business Travel Date From *</Label>
                <Input
                  id="travelDateFrom"
                  name="travelDateFrom"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.travelDateFrom}
                  onChange={handleChange}
                  className={fieldAppearance}
                  required
                />
                <p className="text-xs text-gray-500">Must be a future date</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelDateTo">Business Travel Date To *</Label>
                <Input
                  id="travelDateTo"
                  name="travelDateTo"
                  type="date"
                  min={formData.travelDateFrom || new Date().toISOString().split('T')[0]}
                  value={formData.travelDateTo}
                  onChange={handleChange}
                  className={fieldAppearance}
                  required
                />
                <p className="text-xs text-gray-500">Must be after the start date</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Describe the purpose of your travel..."
                rows={4}
                className={`${fieldAppearance} min-h-[140px]`}
                required
              />
            </div>

<div className="rounded-2xl border border-indigo-100/70 bg-indigo-50/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
  <h4 className="mb-3 text-lg font-semibold text-indigo-900">Important Travel Guidelines</h4>
  <ul className="list-disc list-inside space-y-2 text-sm text-indigo-900/90">
    <li>Trip should only be booked after receiving approval.</li>
    <li>Only transport and accommodation can be claimed.</li>
    <li>Costs can only be reimbursed if there is an invoice for every expense. The invoices need to be addressed to the DEA's address (doesn't hold for public transportation tickets - here the ticket itself is fine):</li>
  </ul>
  <div className="mt-3 ml-6 rounded-xl border border-indigo-100/80 bg-indigo-100/60 p-4 text-sm text-indigo-900 shadow-sm">
    <p className="font-medium">Digital Euro Association e.V.</p>
    <p>Thurn- und Taxis-Platz 6</p>
    <p>60313 Frankfurt am Main</p>
    <p>Germany</p>
  </div>
  <ul className="mt-4 list-disc list-inside space-y-2 text-sm text-indigo-900/90">
    <li>For planes, only economy class costs will be reimbursed.</li>
    <li>For trains, only traveling in second/economy class will be reimbursed.</li>
  </ul>
</div>

            <div className="space-y-5 border-t border-slate-200/60 pt-6">
              <h3 className="text-lg font-semibold text-slate-900">Estimated Costs Breakdown</h3>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedAccommodation">Accommodation (€)</Label>
                <Input
                  id="estimatedAccommodation"
                  name="estimatedAccommodation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedAccommodation}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={fieldAppearance}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-base font-medium text-slate-900">Transportation</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTransportationItem}
                    className="w-full gap-2 rounded-xl border-slate-200/80 text-slate-700 hover:bg-slate-100/80 sm:w-auto"
                  >
                    <span className="text-lg">+</span> Add Transportation
                  </Button>
                </div>
                
                {transportationItems.map((item, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-[0_22px_45px_-38px_rgba(15,23,42,0.5)] sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Label className="text-sm font-medium">Transportation Item {index + 1}</Label>
                      {transportationItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransportationItem(index)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 sm:w-auto"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`transportation-description-${index}`} className="text-xs">
                        Description (e.g., "Flight from Berlin to Paris")
                      </Label>
                      <Input
                        id={`transportation-description-${index}`}
                        value={item.description}
                        onChange={(e) => handleTransportationChange(index, 'description', e.target.value)}
                        placeholder="e.g., Flight, Train, Taxi"
                        className={fieldAppearance}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`transportation-cost-${index}`} className="text-xs">
                        Estimated Cost (€)
                      </Label>
                      <Input
                        id={`transportation-cost-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.estimatedCost}
                        onChange={(e) => handleTransportationChange(index, 'estimatedCost', e.target.value)}
                        placeholder="0.00"
                        className={fieldAppearance}
                      />
                    </div>
                  </div>
                ))}
                
                {totalTransportation > 0 && (
                  <div className="pl-4 text-sm font-medium text-slate-600">
                    Total Transportation: €{totalTransportation.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedOther">Other (€)</Label>
                <Input
                  id="estimatedOther"
                  name="estimatedOther"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedOther}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={fieldAppearance}
                />
              </div>

              {formData.estimatedOther && parseFloat(formData.estimatedOther) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedOtherDescription">What does "Other" relate to? *</Label>
                  <Input
                    id="estimatedOtherDescription"
                    name="estimatedOtherDescription"
                    value={formData.estimatedOtherDescription}
                    onChange={handleChange}
                    placeholder="e.g., Conference materials, meals"
                    className={fieldAppearance}
                    required
                  />
                </div>
              )}

              <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-r from-indigo-50 via-white to-slate-50 p-5 shadow-[0_25px_50px_-35px_rgba(79,70,229,0.45)]">
                <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700/70">
                  Total Estimated Costs
                </Label>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                  €{calculatedTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
              <Button
                type="submit"
                className="w-full gap-2 rounded-xl shadow-[0_18px_40px_-30px_rgba(79,70,229,0.6)] sm:w-auto"
                disabled={loading}
              >
                <Send className="h-4 w-4" />
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full rounded-xl border-slate-200/80 sm:w-auto">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    {loading && (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-5 text-center" role="status" aria-live="assertive">
          <PlaneTakeoff className="h-12 w-12 text-indigo-600 animate-bounce" />
          <div className="h-10 w-10 rounded-full border-t-2 border-b-2 border-indigo-600/80 animate-spin" />
          <p className="text-lg font-medium text-indigo-800">Submitting your travel request...</p>
        </div>
      </div>
    )}
  </div>
);
}
