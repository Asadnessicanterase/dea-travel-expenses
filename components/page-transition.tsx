'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import planeAnimation from "@/public/animations/travel-plane.json";
import coinAnimation from "@/public/animations/expense-coin.json";
import { useLoading } from "@/context/loading-context";

const travelMatchers = [/travel/, /request/, /approval/, /itinerary/, /trip/];
const expenseMatchers = [/expense/, /claim/, /reimbursement/, /finance/];

export function PageTransition() {
  const pathname = usePathname();
  const { isLoading, startLoading, finishLoading } = useLoading();
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);

  const previousPath = useRef<string | null>(null);
  const initialRender = useRef(true);

  const selectedAnimation = useMemo(() => {
    if (!pathname) {
      return planeAnimation;
    }

    const lowerPath = pathname.toLowerCase();
    if (expenseMatchers.some((pattern) => pattern.test(lowerPath))) {
      return coinAnimation;
    }

    if (travelMatchers.some((pattern) => pattern.test(lowerPath))) {
      return planeAnimation;
    }

    return planeAnimation;
  }, [pathname]);

  // Handle route changes - start loading animation
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      previousPath.current = pathname;
      return;
    }

    if (!pathname || previousPath.current === pathname) {
      return;
    }

    setAnimationData(selectedAnimation as Record<string, unknown>);
    setAnimationKey((key) => key + 1);
    setIsVisible(true);
    startLoading();

    previousPath.current = pathname;
  }, [pathname, selectedAnimation, startLoading]);

  // Sync isVisible with isLoading context
  useEffect(() => {
    setIsVisible(isLoading);
  }, [isLoading]);


  return (
    <AnimatePresence>
      {isVisible && animationData && (
        <motion.div
          key="page-transition"
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            key={animationKey}
            className="flex h-48 w-48 items-center justify-center overflow-visible"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-[180px] w-[180px] items-center justify-center overflow-visible">
              <Lottie
                animationData={animationData}
                loop={isLoading}
                autoplay
                className="h-full w-full object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
