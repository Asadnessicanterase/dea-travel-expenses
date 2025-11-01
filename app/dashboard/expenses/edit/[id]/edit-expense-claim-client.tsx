
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

interface ExpenseClaim {
  id: string;
  description: string;
  amount: number;
  accommodation?: number | null;
  transportation?: number | null;
  otherAmount?: number | null;
  otherDescription?: string | null;
  date: string;
  accommodationReceipt?: string | null;
  transportationReceipt?: string | null;
  otherReceipt?: string | null;
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

  const [accommodationFile, setAccommodationFile] = useState<File | null>(null);
  const [transportationFile, setTransportationFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);

  const [keepExistingAccommodationReceipt, setKeepExistingAccommodationReceipt] = useState(true);
  const [keepExistingTransportationReceipt, setKeepExistingTransportationReceipt] = useState(true);
  const [keepExistingOtherReceipt, setKeepExistingOtherReceipt] = useState(true);

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

  // Preview URLs
  const [previewUrls, setPreviewUrls] = useState<{
    accommodation?: string;
    transportation?: string;
    other?: string;
  }>({});

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
      Object.values(previewUrls).forEach(url => {
        if (url) revokePreviewUrl(url);
      });
    };
  }, [previewUrls]);

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

  const handleFileChange = (
    type: 'accommodation' | 'transportation' | 'other',
    setter: (file: File | null) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hide overlay when file is selected or cancelled
    setScannerOverlay(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file type (PDF or common image formats)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("Please select a PDF or image file (JPG, PNG, WebP)");
        e.target.value = '';
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        toast.error("File size must be less than 10MB");
        e.target.value = '';
        return;
      }

      // Check if it's an image (open crop modal) or PDF (save directly)
      if (isImageFile(selectedFile)) {
        // Open crop modal for images
        setCropModalState({
          isOpen: true,
          type,
          file: selectedFile,
        });
      } else {
        // For PDFs, save directly without cropping
        setter(selectedFile);
      }
    }

    // Reset file input
    e.target.value = '';
  };

  const handleCropSave = (croppedFile: File) => {
    const type = cropModalState.type;
    if (!type) return;

    // Save the cropped and processed file
    if (type === 'accommodation') {
      setAccommodationFile(croppedFile);
    } else if (type === 'transportation') {
      setTransportationFile(croppedFile);
    } else if (type === 'other') {
      setOtherFile(croppedFile);
    }

    // Create preview URL
    const previewUrl = createPreviewUrl(croppedFile);
    setPreviewUrls(prev => {
      // Clean up old preview URL if exists
      if (prev[type]) {
        revokePreviewUrl(prev[type]!);
      }
      return { ...prev, [type]: previewUrl };
    });

    // Close modal
    setCropModalState({ isOpen: false, type: null, file: null });
    toast.success("Photo processed successfully");
  };

  const handleCropCancel = () => {
    setCropModalState({ isOpen: false, type: null, file: null });
  };

  const handleRemoveFile = (type: 'accommodation' | 'transportation' | 'other') => {
    if (type === 'accommodation') {
      setAccommodationFile(null);
      if (previewUrls.accommodation) {
        revokePreviewUrl(previewUrls.accommodation);
        setPreviewUrls(prev => ({ ...prev, accommodation: undefined }));
      }
    } else if (type === 'transportation') {
      setTransportationFile(null);
      if (previewUrls.transportation) {
        revokePreviewUrl(previewUrls.transportation);
        setPreviewUrls(prev => ({ ...prev, transportation: undefined }));
      }
    } else if (type === 'other') {
      setOtherFile(null);
      if (previewUrls.other) {
        revokePreviewUrl(previewUrls.other);
        setPreviewUrls(prev => ({ ...prev, other: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = calculateTotal();
    if (total <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    // Validate that at least one receipt is provided or kept from existing
    const hasAccommodationReceipt = keepExistingAccommodationReceipt || accommodationFile !== null;
    const hasTransportationReceipt = keepExistingTransportationReceipt || transportationFile !== null;
    const hasOtherReceipt = keepExistingOtherReceipt || otherFile !== null;

    const accommodationAmount = parseFloat(accommodation) || 0;
    const transportationAmount = parseFloat(transportation) || 0;
    const otherAmountValue = parseFloat(otherAmount) || 0;

    if (accommodationAmount > 0 && !hasAccommodationReceipt) {
      toast.error("Please upload accommodation receipt");
      return;
    }

    if (transportationAmount > 0 && !hasTransportationReceipt) {
      toast.error("Please upload transportation receipt");
      return;
    }

    if (otherAmountValue > 0 && !hasOtherReceipt) {
      toast.error("Please upload receipt for other expenses");
      return;
    }

    setSubmitting(true);

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

      // Handle file uploads and existing receipts
      if (accommodationFile) {
        formData.append("accommodationReceipt", accommodationFile);
      } else {
        formData.append("keepAccommodationReceipt", keepExistingAccommodationReceipt.toString());
      }

      if (transportationFile) {
        formData.append("transportationReceipt", transportationFile);
      } else {
        formData.append("keepTransportationReceipt", keepExistingTransportationReceipt.toString());
      }

      if (otherFile) {
        formData.append("otherReceipt", otherFile);
      } else {
        formData.append("keepOtherReceipt", keepExistingOtherReceipt.toString());
      }

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
                />
                
                {expenseClaim.accommodationReceipt && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        id="keepAccommodation"
                        checked={keepExistingAccommodationReceipt}
                        onChange={(e) => setKeepExistingAccommodationReceipt(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="keepAccommodation">Keep existing receipt</label>
                    </div>
                  </div>
                )}

                {(!expenseClaim.accommodationReceipt || !keepExistingAccommodationReceipt) && (
                  <div className="mt-2">
                    <Label className="text-sm">
                      {accommodationFile ? "Receipt uploaded" : "Upload Receipt (PDF or Image)"}
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTakePhoto('accommodation')}
                        className="flex-1 gap-2"
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
                      ref={accommodationInputRef}
                      onChange={handleFileChange('accommodation', setAccommodationFile)}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 10MB - PDF, JPG, PNG, or WebP</p>
                    {accommodationFile && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-800 truncate flex-1">
                            {accommodationFile.name}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile('accommodation')}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {previewUrls.accommodation && (
                          <img
                            src={previewUrls.accommodation}
                            alt="Accommodation receipt preview"
                            className="w-full max-h-48 object-contain rounded border"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                />
                
                {expenseClaim.transportationReceipt && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        id="keepTransportation"
                        checked={keepExistingTransportationReceipt}
                        onChange={(e) => setKeepExistingTransportationReceipt(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="keepTransportation">Keep existing receipt</label>
                    </div>
                  </div>
                )}

                {(!expenseClaim.transportationReceipt || !keepExistingTransportationReceipt) && (
                  <div className="mt-2">
                    <Label className="text-sm">
                      {transportationFile ? "Receipt uploaded" : "Upload Receipt (PDF or Image)"}
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTakePhoto('transportation')}
                        className="flex-1 gap-2"
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
                      ref={transportationInputRef}
                      onChange={handleFileChange('transportation', setTransportationFile)}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 10MB - PDF, JPG, PNG, or WebP</p>
                    {transportationFile && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-800 truncate flex-1">
                            {transportationFile.name}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile('transportation')}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {previewUrls.transportation && (
                          <img
                            src={previewUrls.transportation}
                            alt="Transportation receipt preview"
                            className="w-full max-h-48 object-contain rounded border"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
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
              />
            </div>

            {expenseClaim.otherReceipt && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    id="keepOther"
                    checked={keepExistingOtherReceipt}
                    onChange={(e) => setKeepExistingOtherReceipt(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="keepOther">Keep existing other expenses receipt</label>
                </div>
              </div>
            )}

            {(!expenseClaim.otherReceipt || !keepExistingOtherReceipt) && parseFloat(otherAmount) > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  {otherFile ? "Receipt uploaded" : "Upload Other Expenses Receipt (PDF or Image)"}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTakePhoto('other')}
                    className="flex-1 gap-2"
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
                  ref={otherInputRef}
                  onChange={handleFileChange('other', setOtherFile)}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">Max 10MB - PDF, JPG, PNG, or WebP</p>
                {otherFile && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-800 truncate flex-1">
                        {otherFile.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile('other')}
                        className="h-6 w-6 p-0 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {previewUrls.other && (
                      <img
                        src={previewUrls.other}
                        alt="Other expenses receipt preview"
                        className="w-full max-h-48 object-contain rounded border"
                      />
                    )}
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
    </div>
  );
}
