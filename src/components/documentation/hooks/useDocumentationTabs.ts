import React from "react";

/**
 * Hook for managing Documentation page tab state
 * Handles active tab, edit mode, chat panel, and history panel
 */
export function useDocumentationTabs(initialTab: string = "readme") {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  return {
    activeTab,
    setActiveTab,
    isEditMode,
    setIsEditMode,
    isChatOpen,
    setIsChatOpen,
    isHistoryOpen,
    setIsHistoryOpen,
  };
}
