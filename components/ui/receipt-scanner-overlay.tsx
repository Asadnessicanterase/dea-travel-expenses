"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";

interface ReceiptScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptScannerOverlay({ isOpen, onClose }: ReceiptScannerOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or when not open
  if (!mounted || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative w-[85%] max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Scanning frame */}
        <div className="relative aspect-[3/4] border-2 border-white rounded-lg shadow-2xl">
          {/* Corner indicators */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-12 h-12 text-white/50" />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-white text-lg font-medium mb-2">
            Align receipt within frame
          </p>
          <p className="text-white/80 text-sm">
            Position the entire receipt within the frame for best results
          </p>
        </div>
      </div>
    </div>
  );
}
