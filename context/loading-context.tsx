"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  finishLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minDisplayTimeRef = useRef<NodeJS.Timeout | null>(null);
  const canHideRef = useRef(false);
  const pendingFinishRef = useRef(false);

  // Minimum display time for loading animation (800ms)
  const MIN_DISPLAY_TIME = 800;
  // Maximum display time as fallback (5000ms)
  const MAX_DISPLAY_TIME = 5000;

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    canHideRef.current = false;
    pendingFinishRef.current = false;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    // Clear any pending timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    if (minDisplayTimeRef.current) {
      clearTimeout(minDisplayTimeRef.current);
    }

    canHideRef.current = false;
    pendingFinishRef.current = false;
    setIsLoading(true);

    // After minimum display time, allow hiding
    minDisplayTimeRef.current = setTimeout(() => {
      canHideRef.current = true;
      if (pendingFinishRef.current) {
        hideLoading();
      }
    }, MIN_DISPLAY_TIME);

    // Force hide after maximum time (safety fallback)
    loadingTimeoutRef.current = setTimeout(() => {
      hideLoading();
    }, MAX_DISPLAY_TIME);
  }, [hideLoading]);

  const finishLoading = useCallback(() => {
    // Only hide if minimum display time has elapsed
    if (canHideRef.current) {
      hideLoading();
    } else {
      pendingFinishRef.current = true;
    }
  }, [hideLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (minDisplayTimeRef.current) {
        clearTimeout(minDisplayTimeRef.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, finishLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
