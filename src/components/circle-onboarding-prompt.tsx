"use client";

import { useState, useEffect } from "react";
import { CircleOnboardingModal } from "./circle-onboarding-modal";

interface CircleOnboardingPromptProps {
  userName?: string;
  hasCircles: boolean;
  isNewUser?: boolean;
}

export function CircleOnboardingPrompt({
  userName,
  hasCircles,
  isNewUser = false,
}: CircleOnboardingPromptProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if user should see the modal
    const hasSeenModal = localStorage.getItem("circle-onboarding-seen");

    // Show modal for new users who haven't seen it yet
    // and don't have any circles beyond their personal one
    if (!hasSeenModal && !hasCircles && isNewUser) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCircles, isNewUser]);

  return (
    <CircleOnboardingModal
      open={showModal}
      onOpenChange={setShowModal}
      userName={userName}
      hasCircles={hasCircles}
    />
  );
}
