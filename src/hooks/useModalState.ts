/**
 * Hook: Modal State Management
 * Handles modal open/close and step navigation
 */

import { useState, useCallback, useEffect } from "react";
import { MODAL_CLOSE_DELAY_MS } from "@/configs/ProjectConfig";
import type { Step, ModalState } from "@/types/ProjectTypes";

export function useModalState(isOpen: boolean, onReset: () => void) {
  const [step, setStep] = useState<Step>("source");
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSetStep = useCallback((newStep: Step) => {
    setApiError(null);
    setStep(newStep);
  }, []);

  const handleGoBack = useCallback(() => {
    setApiError(null);
    setStep("source");
  }, []);

  const handleClose = useCallback(() => {
    setTimeout(() => {
      setStep("source");
      setApiError(null);
      setIsConnecting(false);
      onReset();
    }, MODAL_CLOSE_DELAY_MS);
  }, [onReset]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("source");
      setApiError(null);
      setIsConnecting(false);
    }
  }, [isOpen]);

  const state: ModalState = {
    step,
    isConnecting,
    apiError,
  };

  return {
    state,
    setStep: handleSetStep,
    setIsConnecting,
    setApiError,
    goBack: handleGoBack,
    handleClose,
  };
}
