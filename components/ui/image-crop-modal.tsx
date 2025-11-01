"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Label } from "./label";
import { Slider } from "./slider";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { getCroppedImg, compressAndProcessImage, createPreviewUrl } from "@/lib/image-utils";
import toast from "react-hot-toast";

interface ImageCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onSave: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ isOpen, imageFile, onSave, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (imageFile) {
      const url = createPreviewUrl(imageFile);
      setImageSrc(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !imageFile) return;

    setProcessing(true);
    try {
      // Step 1: Apply crop and rotation
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

      // Step 2: Convert blob to File
      const croppedFile = new File([croppedBlob], imageFile.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Step 3: Compress and process (resize, grayscale, optimize)
      const processedFile = await compressAndProcessImage(croppedFile);

      // Step 4: Return processed file to parent
      onSave(processedFile);

      // Reset state
      resetState();
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const resetState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Receipt Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </Label>
                <span className="text-sm text-gray-600">{zoom.toFixed(1)}x</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Rotation</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{rotation}°</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  className="gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Rotate 90°
                </Button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Tips:</strong> Adjust the crop area to focus on the receipt.
              Use zoom to fit the entire receipt, and rotate if needed.
              The image will be automatically optimized after saving.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? "Processing..." : "Save & Optimize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
