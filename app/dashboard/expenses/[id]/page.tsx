
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Download, FileText, MapPin, Camera, FolderOpen, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/date-utils";
import { ReceiptScannerOverlay } from "@/components/ui/receipt-scanner-overlay";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { isImageFile, createPreviewUrl, revokePreviewUrl } from "@/lib/image-utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ExpenseClaim {
  id: string;
  description: string;
  amount: number;
  accommodation?: number | null;
  transportation?: number | null;
  otherAmount?: number | null;
  otherDescription?: string | null;
  date: string;
  accommodationReceipts: string[];
  transportationReceipts: string[];
  otherReceipts: string[];
}

interface TravelRequest {
  id: string;
  eventName: string;
  destinationCity: string;
  destinationCountry: string;
  estimatedCosts: number;
  expenseClaims: ExpenseClaim[];
}

export default function ExpensesPage() {
  const params = useParams();
  const id = params?.id as string;
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    accommodation: "",
    transportation: "",
    otherAmount: "",
    otherDescription: "",
  });
  const [accommodationFiles, setAccommodationFiles] = useState<File[]>([]);
  const [transportationFiles, setTransportationFiles] = useState<File[]>([]);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [scannerOverlay, setScannerOverlay] = useState<'accommodation' | 'transportation' | 'other' | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const accommodationInputRef = useRef<HTMLInputElement>(null);
  const transportationInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    type: 'accommodation' | 'transportation' | 'other' | null;
    file: File | null;
  }>({ isOpen: false, type: null, file: null });

  // Preview URLs - now arrays
  const [previewUrls, setPreviewUrls] = useState<{
    accommodation: string[];
    transportation: string[];
    other: string[];
  }>({ accommodation: [], transportation: [], other: [] });

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup all preview URLs
      [...previewUrls.accommodation, ...previewUrls.transportation, ...previewUrls.other].forEach(url => {
        if (url) revokePreviewUrl(url);
      });
    };
  }, [previewUrls]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/travel-requests/${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setRequest(data.travelRequest);
        // Auto-populate description with event name + "Expenses" if not already set
        if (!formData.description && data.travelRequest?.eventName) {
          setFormData(prev => ({
            ...prev,
            description: `${data.travelRequest.eventName} Expenses`
          }));
        }
      } else {
        toast.error("Failed to fetch request");
      }
    } catch (error) {
      toast.error("Failed to fetch request");
    } finally {
      setLoading(false);
    }
  };

  // Check if user can create a new claim (no active claim exists)
  const canCreateNewClaim = !request?.expenseClaims?.some(
    (claim: any) => claim.status !== "DENIED"
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTakePhoto = (type: 'accommodation' | 'transportation' | 'other') => {
    if (!isMobile) {
      // On desktop, just trigger file input directly
      const inputRef = type === 'accommodation' ? accommodationInputRef :
                       type === 'transportation' ? transportationInputRef : otherInputRef;
      inputRef.current?.click();
      return;
    }

    // On mobile, show overlay first
    setScannerOverlay(type);

    // Wait 1 second, then trigger the file input
    setTimeout(() => {
      const inputRef = type === 'accommodation' ? accommodationInputRef :
                       type === 'transportation' ? transportationInputRef : otherInputRef;
      inputRef.current?.click();
    }, 1000);
  };

  const handleFileChange = (type: 'accommodation' | 'transportation' | 'other') => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hide overlay when file is selected or cancelled
    setScannerOverlay(null);

    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      // Validate all files
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
      ];

      const maxSize = 10 * 1024 * 1024; // 10MB in bytes

      for (const file of selectedFiles) {
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Only PDF and image files (JPG, PNG, WebP) are allowed`);
          e.target.value = '';
          return;
        }

        if (file.size > maxSize) {
          toast.error(`${file.name}: File size must be less than 10MB`);
          e.target.value = '';
          return;
        }
      }

      // Process each file
      selectedFiles.forEach(file => {
        if (isImageFile(file)) {
          // For images, open crop modal one at a time
          setCropModalState({
            isOpen: true,
            type,
            file,
          });
        } else {
          // For PDFs, add directly to the array
          if (type === 'accommodation') {
            setAccommodationFiles(prev => [...prev, file]);
          } else if (type === 'transportation') {
            setTransportationFiles(prev => [...prev, file]);
          } else if (type === 'other') {
            setOtherFiles(prev => [...prev, file]);
          }
        }
      });
    }

    // Reset file input
    e.target.value = '';
  };

  const handleCropSave = (croppedFile: File) => {
    const type = cropModalState.type;
    if (!type) return;

    // Add the cropped file to the array
    if (type === 'accommodation') {
      setAccommodationFiles(prev => [...prev, croppedFile]);
    } else if (type === 'transportation') {
      setTransportationFiles(prev => [...prev, croppedFile]);
    } else if (type === 'other') {
      setOtherFiles(prev => [...prev, croppedFile]);
    }

    // Create preview URL and add to array
    const previewUrl = createPreviewUrl(croppedFile);
    setPreviewUrls(prev => ({
      ...prev,
      [type]: [...prev[type], previewUrl]
    }));

    // Close modal
    setCropModalState({ isOpen: false, type: null, file: null });
    toast.success("Photo processed successfully");
  };

  const handleCropCancel = () => {
    setCropModalState({ isOpen: false, type: null, file: null });
  };

  const handleRemoveFile = (type: 'accommodation' | 'transportation' | 'other', index: number) => {
    if (type === 'accommodation') {
      // Remove file from array
      setAccommodationFiles(prev => prev.filter((_, i) => i !== index));
      // Cleanup preview URL
      if (previewUrls.accommodation[index]) {
        revokePreviewUrl(previewUrls.accommodation[index]);
      }
      // Remove preview URL from array
      setPreviewUrls(prev => ({
        ...prev,
        accommodation: prev.accommodation.filter((_, i) => i !== index)
      }));
    } else if (type === 'transportation') {
      setTransportationFiles(prev => prev.filter((_, i) => i !== index));
      if (previewUrls.transportation[index]) {
        revokePreviewUrl(previewUrls.transportation[index]);
      }
      setPreviewUrls(prev => ({
        ...prev,
        transportation: prev.transportation.filter((_, i) => i !== index)
      }));
    } else if (type === 'other') {
      setOtherFiles(prev => prev.filter((_, i) => i !== index));
      if (previewUrls.other[index]) {
        revokePreviewUrl(previewUrls.other[index]);
      }
      setPreviewUrls(prev => ({
        ...prev,
        other: prev.other.filter((_, i) => i !== index)
      }));
    }
  };

  // Calculate total amount from breakdown
  const calculatedTotal =
    (parseFloat(formData.accommodation) || 0) +
    (parseFloat(formData.transportation) || 0) +
    (parseFloat(formData.otherAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const accommodationAmount = parseFloat(formData.accommodation) || 0;
    const transportationAmount = parseFloat(formData.transportation) || 0;

    if (calculatedTotal <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    if (accommodationAmount > 0 && accommodationFiles.length === 0) {
      toast.error("Please upload at least one accommodation receipt before submitting.");
      return;
    }

    if (transportationAmount > 0 && transportationFiles.length === 0) {
      toast.error("Please upload at least one transportation receipt before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("travelRequestId", id);
      // Use event name + "Expenses" as default if description is empty
      const descriptionValue = formData.description.trim() || `${request?.eventName || "Event"} Expenses`;
      formDataToSend.append("description", descriptionValue);
      formDataToSend.append("amount", calculatedTotal.toString());
      formDataToSend.append("accommodation", formData.accommodation || "0");
      formDataToSend.append("transportation", formData.transportation || "0");
      formDataToSend.append("otherAmount", formData.otherAmount || "0");
      formDataToSend.append("otherDescription", formData.otherDescription);
      // Auto-set submission date to today
      const today = new Date().toISOString().split('T')[0];
      formDataToSend.append("date", today);

      // Append all accommodation files
      accommodationFiles.forEach(file => {
        formDataToSend.append("accommodationReceipts", file);
      });

      // Append all transportation files
      transportationFiles.forEach(file => {
        formDataToSend.append("transportationReceipts", file);
      });

      // Append all other files
      otherFiles.forEach(file => {
        formDataToSend.append("otherReceipts", file);
      });

      const response = await fetch("/api/expense-claims", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success("Expense claim added successfully");
        setFormData({
          description: "",
          accommodation: "",
          transportation: "",
          otherAmount: "",
          otherDescription: ""
        });

        // Clear all files
        setAccommodationFiles([]);
        setTransportationFiles([]);
        setOtherFiles([]);

        // Cleanup all preview URLs
        [...previewUrls.accommodation, ...previewUrls.transportation, ...previewUrls.other].forEach(url => {
          if (url) revokePreviewUrl(url);
        });
        setPreviewUrls({ accommodation: [], transportation: [], other: [] });

        fetchRequest();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add expense claim");
      }
    } catch (error) {
      toast.error("Failed to add expense claim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async (claimId: string, type: 'accommodation' | 'transportation' | 'other', index: number = 0) => {
    try {
      const response = await fetch(`/api/expense-claims/${claimId}/download?type=${type}&index=${index}`);
      const data = await response.json();

      if (response.ok && data.url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Failed to download receipt");
      }
    } catch (error) {
      toast.error("Failed to download receipt");
    }
  };

  const totalExpenses = request?.expenseClaims?.reduce((sum, claim) => sum + claim.amount, 0) || 0;
  const remainingBudget = (request?.estimatedCosts || 0) - totalExpenses;

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Request not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{request.eventName}</h1>
        <div className="flex items-center gap-2 text-gray-600 mt-2">
          <MapPin className="h-4 w-4" />
          <span>{request.destinationCity}, {request.destinationCountry}</span>
        </div>
        <p className="text-gray-600 mt-1">Manage expense claims for this trip</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Estimated Budget</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              €{request.estimatedCosts?.toFixed(2) || '0.00'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Actual Expenditure</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              €{totalExpenses.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              {remainingBudget < 0 ? 'Exceeded estimate by:' : 'Under budget:'}
            </CardDescription>
            <CardTitle className={`text-2xl ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
              €{Math.abs(remainingBudget).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
  <h4 className="font-semibold text-amber-900 mb-2">Receipt Requirements</h4>
  <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
    <li>If you want to reimburse Deutsche Bahn tickets, please make sure to request an invoice and do not just upload the ticket itself, as the ticket is not VAT deductible. You can request the invoice in your DB profile and download it immediately.</li>
    <li>Please remember that all invoices need to be addressed to the DEA and include the DEA's official address.</li>
  </ul>
</div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add New Claim Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Expense Claim
            </CardTitle>
            <CardDescription>Upload receipts and document your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {!canCreateNewClaim ? (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Expense Claim Already Exists
                  </h3>
                  <p className="text-sm text-gray-600">
                    You already have an active expense claim for this travel request.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    You can view it on the right, or wait for amendment requests from the approver.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Auto-filled with event name"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accommodation">Accommodation (€)</Label>
                <Input
                  id="accommodation"
                  name="accommodation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.accommodation}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={submitting}
                />
                {formData.accommodation && parseFloat(formData.accommodation) > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600">
                      Accommodation Receipt (PDF or Image)
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTakePhoto('accommodation')}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => accommodationInputRef.current?.click()}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Add File
                      </Button>
                    </div>
                    <Input
                      id="accommodationReceipt"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                      capture="environment"
                      multiple
                      ref={accommodationInputRef}
                      onChange={handleFileChange('accommodation')}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 10MB per file - PDF, JPG, PNG, or WebP - Multiple files allowed</p>

                    {/* Display all uploaded files */}
                    {accommodationFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {accommodationFiles.map((file, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-xs text-green-800 truncate flex-1">
                                {file.name}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile('accommodation', index)}
                                className="h-6 w-6 p-0 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {previewUrls.accommodation[index] && (
                              <img
                                src={previewUrls.accommodation[index]}
                                alt={`Accommodation receipt ${index + 1}`}
                                className="w-full max-h-48 object-contain rounded border"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {accommodationFiles.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        At least one accommodation receipt is required when claiming this expense.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportation">Transportation (€)</Label>
                <Input
                  id="transportation"
                  name="transportation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.transportation}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={submitting}
                />
                {formData.transportation && parseFloat(formData.transportation) > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600">
                      Transportation Receipt (PDF or Image)
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTakePhoto('transportation')}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => transportationInputRef.current?.click()}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Add File
                      </Button>
                    </div>
                    <Input
                      id="transportationReceipt"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                      capture="environment"
                      multiple
                      ref={transportationInputRef}
                      onChange={handleFileChange('transportation')}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 10MB per file - PDF, JPG, PNG, or WebP - Multiple files allowed</p>

                    {/* Display all uploaded files */}
                    {transportationFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {transportationFiles.map((file, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-xs text-green-800 truncate flex-1">
                                {file.name}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile('transportation', index)}
                                className="h-6 w-6 p-0 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {previewUrls.transportation[index] && (
                              <img
                                src={previewUrls.transportation[index]}
                                alt={`Transportation receipt ${index + 1}`}
                                className="w-full max-h-48 object-contain rounded border"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {transportationFiles.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        At least one transportation receipt is required when claiming this expense.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherAmount">Other (€)</Label>
                <Input
                  id="otherAmount"
                  name="otherAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.otherAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              {formData.otherAmount && parseFloat(formData.otherAmount) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="otherDescription">What does "Other" relate to?</Label>
                  <Input
                    id="otherDescription"
                    name="otherDescription"
                    value={formData.otherDescription}
                    onChange={handleChange}
                    placeholder="e.g., Conference materials, meals"
                    disabled={submitting}
                  />
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600">
                      Other Expenses Receipt (PDF or Image)
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTakePhoto('other')}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => otherInputRef.current?.click()}
                        className="flex-1 gap-2"
                        disabled={submitting}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Add File
                      </Button>
                    </div>
                    <Input
                      id="otherReceipt"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                      capture="environment"
                      multiple
                      ref={otherInputRef}
                      onChange={handleFileChange('other')}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 10MB per file - PDF, JPG, PNG, or WebP - Multiple files allowed</p>

                    {/* Display all uploaded files */}
                    {otherFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {otherFiles.map((file, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-xs text-green-800 truncate flex-1">
                                {file.name}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile('other', index)}
                                className="h-6 w-6 p-0 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {previewUrls.other[index] && (
                              <img
                                src={previewUrls.other[index]}
                                alt={`Other expenses receipt ${index + 1}`}
                                className="w-full max-h-48 object-contain rounded border"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                <Label className="text-sm font-semibold">Total Amount</Label>
                <div className="text-2xl font-bold text-blue-600">
                  €{calculatedTotal.toFixed(2)}
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting || calculatedTotal <= 0}>
                <Plus className="h-4 w-4" />
                {submitting ? "Signing and Sending..." : "Sign and Send Expense Claim"}
              </Button>
            </form>
            )}
          </CardContent>
        </Card>

        {/* Existing Claims List */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Claims ({request.expenseClaims?.length || 0})</CardTitle>
            <CardDescription>Your submitted expense claims</CardDescription>
          </CardHeader>
          <CardContent>
            {!request.expenseClaims || request.expenseClaims.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No expense claims yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {request.expenseClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{claim.description}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(claim.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          €{claim.amount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    {(claim.accommodation || claim.transportation || claim.otherAmount) && (
                      <div className="mt-3 pt-3 border-t text-sm space-y-1">
                        {claim.accommodation && claim.accommodation > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Accommodation:</span>
                            <span className="font-medium">€{claim.accommodation.toFixed(2)}</span>
                          </div>
                        )}
                        {claim.transportation && claim.transportation > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Transportation:</span>
                            <span className="font-medium">€{claim.transportation.toFixed(2)}</span>
                          </div>
                        )}
                        {claim.otherAmount && claim.otherAmount > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Other{claim.otherDescription ? ` (${claim.otherDescription})` : ''}:</span>
                            <span className="font-medium">€{claim.otherAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Receipt Download Buttons */}
                    <div className="mt-3 space-y-1">
                      {/* Accommodation Receipts */}
                      {claim.accommodationReceipts && claim.accommodationReceipts.length > 0 && (
                        <div className="space-y-1">
                          {claim.accommodationReceipts.length > 1 && (
                            <p className="text-xs font-medium text-gray-600">Accommodation ({claim.accommodationReceipts.length})</p>
                          )}
                          {claim.accommodationReceipts.map((receipt, index) => (
                            <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full text-xs"
                              onClick={() => handleDownloadReceipt(claim.id, 'accommodation', index)}
                            >
                              <Download className="h-3 w-3" />
                              {claim.accommodationReceipts.length > 1 ? `Accommodation Receipt ${index + 1}` : 'Accommodation Receipt'}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Transportation Receipts */}
                      {claim.transportationReceipts && claim.transportationReceipts.length > 0 && (
                        <div className="space-y-1">
                          {claim.transportationReceipts.length > 1 && (
                            <p className="text-xs font-medium text-gray-600">Transportation ({claim.transportationReceipts.length})</p>
                          )}
                          {claim.transportationReceipts.map((receipt, index) => (
                            <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full text-xs"
                              onClick={() => handleDownloadReceipt(claim.id, 'transportation', index)}
                            >
                              <Download className="h-3 w-3" />
                              {claim.transportationReceipts.length > 1 ? `Transportation Receipt ${index + 1}` : 'Transportation Receipt'}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Other Receipts */}
                      {claim.otherReceipts && claim.otherReceipts.length > 0 && (
                        <div className="space-y-1">
                          {claim.otherReceipts.length > 1 && (
                            <p className="text-xs font-medium text-gray-600">Other ({claim.otherReceipts.length})</p>
                          )}
                          {claim.otherReceipts.map((receipt, index) => (
                            <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full text-xs"
                              onClick={() => handleDownloadReceipt(claim.id, 'other', index)}
                            >
                              <Download className="h-3 w-3" />
                              {claim.otherReceipts.length > 1 ? `Other Receipt ${index + 1}` : 'Other Receipt'}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scanner Overlays */}
      <ReceiptScannerOverlay
        isOpen={scannerOverlay === 'accommodation'}
        onClose={() => setScannerOverlay(null)}
      />
      <ReceiptScannerOverlay
        isOpen={scannerOverlay === 'transportation'}
        onClose={() => setScannerOverlay(null)}
      />
      <ReceiptScannerOverlay
        isOpen={scannerOverlay === 'other'}
        onClose={() => setScannerOverlay(null)}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalState.isOpen}
        imageFile={cropModalState.file}
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />

      {/* Form Submission Loading Dialog */}
      <Dialog open={submitting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[320px] [&>button]:hidden">
          <div className="flex flex-col items-center gap-4 py-6">
            <div
              className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"
              aria-hidden="true"
            />
            <DialogTitle className="text-center text-lg font-semibold">
              📝 Submitting expense claim...
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500">
              Please wait while we process your submission.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
