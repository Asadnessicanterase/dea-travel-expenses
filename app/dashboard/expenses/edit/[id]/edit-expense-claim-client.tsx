
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ArrowLeft, Upload, X, Camera, FolderOpen } from "lucide-react";
import toast from "react-hot-toast";
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
  approverComment?: string | null;
  travelRequest: {
    id: string;
    eventName: string;
    destinationCountry: string;
    destinationCity?: string | null;
  };
}

export default function EditExpenseClaimClient({ expenseClaim }: { expenseClaim: ExpenseClaim }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState(expenseClaim.description);
  const [accommodation, setAccommodation] = useState(expenseClaim.accommodation?.toString() || "");
  const [transportation, setTransportation] = useState(expenseClaim.transportation?.toString() || "");
  const [otherAmount, setOtherAmount] = useState(expenseClaim.otherAmount?.toString() || "");
  const [otherDescription, setOtherDescription] = useState(expenseClaim.otherDescription || "");
  const [date, setDate] = useState(expenseClaim.date.split('T')[0]);

  // New file uploads (arrays to support multiple files)
  const [accommodationFiles, setAccommodationFiles] = useState<File[]>([]);
  const [transportationFiles, setTransportationFiles] = useState<File[]>([]);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);

  // Track which existing receipts to keep (array of indices)
  const [keepAccommodationIndices, setKeepAccommodationIndices] = useState<number[]>(
    expenseClaim.accommodationReceipts.map((_, index) => index)
  );
  const [keepTransportationIndices, setKeepTransportationIndices] = useState<number[]>(
    expenseClaim.transportationReceipts.map((_, index) => index)
  );
  const [keepOtherIndices, setKeepOtherIndices] = useState<number[]>(
    expenseClaim.otherReceipts.map((_, index) => index)
  );

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

  // Preview URLs for new uploads (arrays)
  const [previewUrls, setPreviewUrls] = useState<{
    accommodation: string[];
    transportation: string[];
    other: string[];
  }>({ accommodation: [], transportation: [], other: [] });

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
      [...previewUrls.accommodation, ...previewUrls.transportation, ...previewUrls.other].forEach(url => {
        if (url) revokePreviewUrl(url);
      });
    };
  }, [previewUrls]);

  // Debug: Log submitting state changes
  useEffect(() => {
    console.log('Submitting state changed:', submitting);
  }, [submitting]);

  const calculateTotal = () => {
    const acc = parseFloat(accommodation) || 0;
    const trans = parseFloat(transportation) || 0;
    const other = parseFloat(otherAmount) || 0;
    return acc + trans + other;
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

  // Handler to toggle keeping an existing receipt
  const handleToggleKeepExisting = (type: 'accommodation' | 'transportation' | 'other', index: number) => {
    if (type === 'accommodation') {
      setKeepAccommodationIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else if (type === 'transportation') {
      setKeepTransportationIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else if (type === 'other') {
      setKeepOtherIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = calculateTotal();
    if (total <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    const accommodationAmount = parseFloat(accommodation) || 0;
    const transportationAmount = parseFloat(transportation) || 0;
    const otherAmountValue = parseFloat(otherAmount) || 0;

    // Validate that at least one receipt is provided or kept from existing
    const hasAccommodationReceipt = keepAccommodationIndices.length > 0 || accommodationFiles.length > 0;
    const hasTransportationReceipt = keepTransportationIndices.length > 0 || transportationFiles.length > 0;
    const hasOtherReceipt = keepOtherIndices.length > 0 || otherFiles.length > 0;

    if (accommodationAmount > 0 && !hasAccommodationReceipt) {
      toast.error("Please upload at least one accommodation receipt or keep an existing one");
      return;
    }

    if (transportationAmount > 0 && !hasTransportationReceipt) {
      toast.error("Please upload at least one transportation receipt or keep an existing one");
      return;
    }

    if (otherAmountValue > 0 && !hasOtherReceipt) {
      toast.error("Please upload at least one receipt for other expenses or keep an existing one");
      return;
    }

    console.log('Setting submitting to true');
    setSubmitting(true);
    console.log('Submitting state set');

    try {
      const formData = new FormData();
      // Use event name + "Expenses" as default if description is empty
      const descriptionValue = description.trim() || `${expenseClaim.travelRequest.eventName} Expenses`;
      formData.append("description", descriptionValue);
      formData.append("amount", total.toString());
      formData.append("accommodation", accommodation || "0");
      formData.append("transportation", transportation || "0");
      formData.append("otherAmount", otherAmount || "0");
      formData.append("otherDescription", otherDescription);
      formData.append("date", date);

      // Append all new accommodation files
      accommodationFiles.forEach(file => {
        formData.append("accommodationReceipts", file);
      });
      // Send indices of existing receipts to keep
      formData.append("keepAccommodationIndices", JSON.stringify(keepAccommodationIndices));

      // Append all new transportation files
      transportationFiles.forEach(file => {
        formData.append("transportationReceipts", file);
      });
      // Send indices of existing receipts to keep
      formData.append("keepTransportationIndices", JSON.stringify(keepTransportationIndices));

      // Append all new other files
      otherFiles.forEach(file => {
        formData.append("otherReceipts", file);
      });
      // Send indices of existing receipts to keep
      formData.append("keepOtherIndices", JSON.stringify(keepOtherIndices));

      const response = await fetch(`/api/expense-claims/${expenseClaim.id}/resubmit`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        toast.success("Expense claim resubmitted successfully!");
        router.push("/dashboard?type=expenses");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to resubmit expense claim");
      }
    } catch (error) {
      toast.error("Failed to resubmit expense claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard?type=expenses")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expense Claims
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">Resubmit Expense Claim</h1>
        <p className="text-gray-600 mt-1">
          Update your expense claim based on the approver's feedback
        </p>
      </div>

      {expenseClaim.approverComment && (
        <Card className="mb-6 border-amber-500 bg-amber-50">
          <CardHeader>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <CardTitle className="text-lg text-amber-900">Approver's Feedback</CardTitle>
                <CardDescription className="text-amber-800 mt-2">
                  {expenseClaim.approverComment}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit Expense Details</CardTitle>
          <CardDescription>
            Trip: {expenseClaim.travelRequest.eventName} -{" "}
            {expenseClaim.travelRequest.destinationCity
              ? `${expenseClaim.travelRequest.destinationCity}, ${expenseClaim.travelRequest.destinationCountry}`
              : expenseClaim.travelRequest.destinationCountry}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Default: ${expenseClaim.travelRequest.eventName} Expenses`}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Claim Submission Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Accommodation */}
              <div className="space-y-2">
                <Label htmlFor="accommodation">Accommodation (€)</Label>
                <Input
                  id="accommodation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={accommodation}
                  onChange={(e) => setAccommodation(e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
                
                {/* Display existing receipts with individual checkboxes */}
                {expenseClaim.accommodationReceipts.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600 mb-1">Existing Receipts</Label>
                    <div className="space-y-2">
                      {expenseClaim.accommodationReceipts.map((receipt, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 border rounded">
                          <input
                            type="checkbox"
                            id={`keepAccommodation${index}`}
                            checked={keepAccommodationIndices.includes(index)}
                            onChange={() => handleToggleKeepExisting('accommodation', index)}
                            disabled={submitting}
                            className="rounded"
                          />
                          <label htmlFor={`keepAccommodation${index}`} className="text-xs flex-1 truncate">
                            Receipt {index + 1}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload new receipts */}
                <div className="mt-2">
                  <Label className="text-sm">Upload New Receipts (PDF or Image)</Label>
                  <div className="mt-1 flex items-center gap-2">
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
                      Choose File
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

                  {/* Display all newly uploaded files */}
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
                </div>
              </div>

              {/* Transportation */}
              <div className="space-y-2">
                <Label htmlFor="transportation">Transportation (€)</Label>
                <Input
                  id="transportation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transportation}
                  onChange={(e) => setTransportation(e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
                
                {/* Display existing receipts with individual checkboxes */}
                {expenseClaim.transportationReceipts.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-600 mb-1">Existing Receipts</Label>
                    <div className="space-y-2">
                      {expenseClaim.transportationReceipts.map((receipt, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 border rounded">
                          <input
                            type="checkbox"
                            id={`keepTransportation${index}`}
                            checked={keepTransportationIndices.includes(index)}
                            onChange={() => handleToggleKeepExisting('transportation', index)}
                            disabled={submitting}
                            className="rounded"
                          />
                          <label htmlFor={`keepTransportation${index}`} className="text-xs flex-1 truncate">
                            Receipt {index + 1}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload new receipts */}
                <div className="mt-2">
                  <Label className="text-sm">Upload New Receipts (PDF or Image)</Label>
                  <div className="mt-1 flex items-center gap-2">
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
                      Choose File
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

                  {/* Display all newly uploaded files */}
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
                </div>
              </div>
            </div>

            {/* Other Expenses */}
            <div className="space-y-2">
              <Label htmlFor="otherAmount">Other Expenses (€)</Label>
              <Input
                id="otherAmount"
                type="number"
                step="0.01"
                min="0"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherDescription">Other Expenses Description</Label>
              <Input
                id="otherDescription"
                type="text"
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                placeholder="E.g., Meals, Parking, etc."
                disabled={submitting}
              />
            </div>

            {/* Display existing other receipts with individual checkboxes */}
            {expenseClaim.otherReceipts.length > 0 && (
              <div className="mt-2">
                <Label className="text-sm text-gray-600 mb-1">Existing Other Expense Receipts</Label>
                <div className="space-y-2">
                  {expenseClaim.otherReceipts.map((receipt, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 border rounded">
                      <input
                        type="checkbox"
                        id={`keepOther${index}`}
                        checked={keepOtherIndices.includes(index)}
                        onChange={() => handleToggleKeepExisting('other', index)}
                        disabled={submitting}
                        className="rounded"
                      />
                      <label htmlFor={`keepOther${index}`} className="text-xs flex-1 truncate">
                        Receipt {index + 1}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload new other expense receipts */}
            {parseFloat(otherAmount) > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Upload New Other Expense Receipts (PDF or Image)</Label>
                <div className="flex items-center gap-2">
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
                    Choose File
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
                <p className="text-xs text-gray-500">Max 10MB per file - PDF, JPG, PNG, or WebP - Multiple files allowed</p>

                {/* Display all newly uploaded other expense files */}
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
            )}

            {/* Total Amount Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  €{calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || calculateTotal() <= 0}
              >
                {submitting ? "Signing and Resubmitting..." : "Sign and Resubmit Expense Claim"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard?type=expenses")}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
