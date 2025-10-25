
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { COUNTRIES } from "@/lib/countries";

export default function NewRequestPage() {
  const router = useRouter();
  const { data: session } = useSession() || {};
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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Travel Request</CardTitle>
          <CardDescription>
            Fill out the form below to submit a new travel request for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  className="bg-gray-50"
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
                  className="bg-gray-50"
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
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
                required
              />
            </div>

<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
  <h4 className="font-semibold text-blue-900 mb-2">Important Travel Guidelines</h4>
  <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
    <li>Trip should only be booked after receiving approval.</li>
    <li>Only transport and accommodation can be claimed.</li>
    <li>Costs can only be reimbursed if there is an invoice for every expense. The invoices need to be addressed to the DEA's address (doesn't hold for public transportation tickets – here the ticket itself is fine):</li>
  </ul>
  <div className="mt-3 ml-6 text-sm text-blue-800 bg-blue-100 p-3 rounded">
    <p className="font-medium">Digital Euro Association e.V.</p>
    <p>Thurn- und Taxis-Platz 6</p>
    <p>60313 Frankfurt am Main</p>
    <p>Germany</p>
  </div>
  <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside mt-3">
    <li>For planes, only economy class costs will be reimbursed.</li>
    <li>For trains, only traveling in second/economy class will be reimbursed.</li>
  </ul>
</div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-gray-900">Estimated Costs Breakdown</h3>
              
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
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Transportation</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTransportationItem}
                    className="gap-2"
                  >
                    <span className="text-lg">+</span> Add Transportation
                  </Button>
                </div>
                
                {transportationItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Transportation Item {index + 1}</Label>
                      {transportationItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransportationItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      />
                    </div>
                  </div>
                ))}
                
                {totalTransportation > 0 && (
                  <div className="text-sm font-medium text-gray-700 pl-4">
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
                    required
                  />
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700">Total Estimated Costs</Label>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  €{calculatedTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? "Submitting..." : "🚀 Test Submit Button"}
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
