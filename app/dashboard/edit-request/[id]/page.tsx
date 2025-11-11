
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { COUNTRIES } from "@/lib/countries";

export default function EditRequestPage() {
  const router = useRouter();
  const params = useParams();
  const { finishLoading } = useLoading();
  const id = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    dateOfApplication: "",
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
  const [transportationItems, setTransportationItems] = useState<
    { description: string; estimatedCost: string }[]
  >([{ description: "", estimatedCost: "" }]);
  const [approverComment, setApproverComment] = useState("");

  const handleTransportationChange = (
    index: number,
    field: "description" | "estimatedCost",
    value: string
  ) => {
    setTransportationItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const addTransportationItem = () => {
    setTransportationItems((prev) => [...prev, { description: "", estimatedCost: "" }]);
  };

  const removeTransportationItem = (index: number) => {
    setTransportationItems((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const totalTransportation = transportationItems.reduce((sum, item) => {
    return sum + (parseFloat(item.estimatedCost) || 0);
  }, 0);

  const calculatedTotal =
    (parseFloat(formData.estimatedAccommodation) || 0) +
    totalTransportation +
    (parseFloat(formData.estimatedOther) || 0);
  const hasOtherAmount = parseFloat(formData.estimatedOther) > 0;

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
        const request = data.travelRequest;
        setFormData({
          name: request.name || "",
          position: request.position || "",
          dateOfApplication: request.dateOfApplication?.split('T')?.[0] || "",
          destinationCountry: request.destinationCountry || "",
          destinationCity: request.destinationCity || "",
          eventOrganiser: request.eventOrganiser || "",
          eventName: request.eventName || "",
          travelDateFrom: request.travelDateFrom?.split('T')?.[0] || "",
          travelDateTo: request.travelDateTo?.split('T')?.[0] || "",
          purpose: request.purpose || "",
          estimatedAccommodation: request.estimatedAccommodation?.toString() || "",
          estimatedOther: request.estimatedOther?.toString() || "",
          estimatedOtherDescription: request.estimatedOtherDescription || "",
        });
        setApproverComment(request.approverComment || "");
        if (Array.isArray(request.transportationItems) && request.transportationItems.length > 0) {
          setTransportationItems(
            request.transportationItems.map((item: any) => ({
              description: item.description || "",
              estimatedCost: item.estimatedCost?.toString() || "",
            }))
          );
        } else {
          setTransportationItems([{ description: "", estimatedCost: "" }]);
        }
      } else {
        toast.error("Failed to fetch request");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to fetch request");
      router.push("/dashboard");
    } finally {
      setFetching(false);
      finishLoading();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (new Date(formData.travelDateTo) < new Date(formData.travelDateFrom)) {
      toast.error("Business Travel Date To cannot be before the start date");
      return;
    }

    setLoading(true);

    const validTransportationItems = transportationItems.filter(
      (item) => item.description.trim() && parseFloat(item.estimatedCost) > 0
    );
    const totalCost = Number(calculatedTotal.toFixed(2));
    const payload = {
      ...formData,
      estimatedAccommodation: formData.estimatedAccommodation || "0",
      estimatedOther: formData.estimatedOther || "0",
      estimatedOtherDescription: hasOtherAmount ? formData.estimatedOtherDescription : "",
      estimatedCosts: totalCost,
      transportationItems: validTransportationItems.map((item) => ({
        description: item.description.trim(),
        estimatedCost: parseFloat(item.estimatedCost),
      })),
    };

    try {
      const response = await fetch(`/api/travel-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Travel request updated and resubmitted successfully");
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update request");
      }
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      {approverComment && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Approver Comments</h3>
          <p className="text-orange-800">{approverComment}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit Travel Request</CardTitle>
          <CardDescription>
            Update your travel request based on the approver's feedback and resubmit
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
                <p className="text-xs text-gray-500">Cannot be changed</p>
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
                <p className="text-xs text-gray-500">Cannot be changed</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfApplication">Date of Application *</Label>
              <Input
                id="dateOfApplication"
                name="dateOfApplication"
                type="date"
                value={formData.dateOfApplication}
                onChange={handleChange}
                required
              />
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
                  value={formData.travelDateFrom}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelDateTo">Business Travel Date To *</Label>
                <Input
                  id="travelDateTo"
                  name="travelDateTo"
                  type="date"
                  value={formData.travelDateTo}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Estimated Costs Breakdown</h3>
                <p className="text-sm text-gray-500">Update the categories below. The total is calculated automatically.</p>
              </div>

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

              <div className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Label className="font-medium">Transportation</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTransportationItem}
                    className="w-full md:w-auto"
                  >
                    Add Transportation
                  </Button>
                </div>

                {transportationItems.map((item, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                      {transportationItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransportationItem(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`transportation-description-${index}`} className="text-xs text-gray-500">
                        Description
                      </Label>
                      <Input
                        id={`transportation-description-${index}`}
                        value={item.description}
                        onChange={(e) => handleTransportationChange(index, "description", e.target.value)}
                        placeholder="e.g., Flight to Brussels"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`transportation-cost-${index}`} className="text-xs text-gray-500">
                        Estimated Cost (€)
                      </Label>
                      <Input
                        id={`transportation-cost-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.estimatedCost}
                        onChange={(e) => handleTransportationChange(index, "estimatedCost", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}

                {totalTransportation > 0 && (
                  <p className="text-sm text-gray-600">Total transportation: €{totalTransportation.toFixed(2)}</p>
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

              {hasOtherAmount && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedOtherDescription">What does "Other" relate to? *</Label>
                  <Input
                    id="estimatedOtherDescription"
                    name="estimatedOtherDescription"
                    value={formData.estimatedOtherDescription}
                    onChange={handleChange}
                    placeholder="e.g., Conference materials, meals"
                    required={hasOtherAmount}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="calculatedTotal">Calculated Total (€)</Label>
                <Input id="calculatedTotal" value={calculatedTotal.toFixed(2)} readOnly />
                <p className="text-xs text-gray-500">This value is derived from the amounts above.</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? "Resubmitting..." : "Resubmit Request"}
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
