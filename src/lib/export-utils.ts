/**
 * Document Export Data Preparation
 * Handles collecting all documentation content from all tabs in a structured format
 */

import {
  markdownToFormattedText,
  markdownToStructuredContent,
} from "./markdown-converter";
import type { CustomTab } from "@/lib/api";

export interface ExportTabContent {
  key: string;
  label: string;
  content: string;
  isCustom?: boolean;
  order?: number;
}

export interface ExportDocumentData {
  projectName: string;
  projectDescription?: string;
  exportedAt: string;
  tabs: ExportTabContent[];
  totalTabs: number;
}

/**
 * Prepare comprehensive export data from all tabs
 */
export function prepareExportData(
  projectName: string,
  projectDescription: string | undefined,
  editedContent: Record<string, string>,
  allTabs: Array<{
    key: string;
    label: string;
    isNative: boolean;
    isCustom?: boolean;
  }>,
): ExportDocumentData {
  const tabs: ExportTabContent[] = [];

  // Collect content from all tabs in order
  for (const tab of allTabs) {
    const content = editedContent[tab.key as string];
    if (content && content.trim()) {
      tabs.push({
        key: tab.key as string,
        label: tab.label,
        content,
        isCustom: tab.isCustom ?? false,
        order: tabs.length,
      });
    }
  }

  return {
    projectName,
    projectDescription,
    exportedAt: new Date().toISOString(),
    tabs,
    totalTabs: tabs.length,
  };
}

/**
 * Convert markdown content to formatted text for exports
 */
export function formatTabContentForExport(
  content: string,
  format: "formatted" | "plain" = "formatted",
): string {
  switch (format) {
    case "plain":
      return markdownToPlainText(content);
    case "formatted":
    default:
      return markdownToFormattedText(content);
  }
}

/**
 * Remove markdown formatting while preserving structure
 */
function markdownToPlainText(markdown: string): string {
  let text = markdown;

  // Remove headings
  text = text.replace(/^#+\s+/gm, "");

  // Remove formatting
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/_(.*?)_/g, "$1");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

  // Remove blockquotes
  text = text.replace(/^>\s*/gm, "");

  // Clean list markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Remove code block markers
  text = text.replace(/```(?:\w+)?\n?([\s\S]*?)\n?```/g, "$1");

  // Remove horizontal lines
  text = text.replace(/^(-{3}|_{3}|\*{3})$/gm, "");

  // Clean up whitespace
  text = text.replace(/\n\n\n+/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Get tab content in specified format
 * Useful for exports that need clean, formatted text without markdown syntax
 */
export function getFormattedTabContent(
  tabs: ExportTabContent[],
  format: "formatted" | "plain" = "formatted",
): ExportTabContent[] {
  return tabs.map((tab) => ({
    ...tab,
    content: formatTabContentForExport(tab.content, format),
  }));
}

/**
 * Generate plain text export content
 * Useful for previewing what will be exported
 */
export function generatePlainTextExport(data: ExportDocumentData): string {
  const lines: string[] = [];

  // Header
  lines.push("═".repeat(60));
  lines.push(data.projectName.toUpperCase());
  lines.push("═".repeat(60));

  if (data.projectDescription) {
    lines.push("");
    lines.push(data.projectDescription);
  }

  lines.push("");
  lines.push(`Generated: ${new Date(data.exportedAt).toLocaleString()}`);
  lines.push(`Total Sections: ${data.totalTabs}`);
  lines.push("─".repeat(60));
  lines.push("");

  // Tabs content
  for (const tab of data.tabs) {
    lines.push(`\n${"═".repeat(60)}`);
    lines.push(`${tab.label.toUpperCase()}${tab.isCustom ? " (Custom)" : ""}`);
    lines.push("═".repeat(60));
    lines.push("");

    const formatted = markdownToFormattedText(tab.content);
    lines.push(formatted);
    lines.push("");
  }

  lines.push("\n" + "═".repeat(60));
  lines.push("END OF DOCUMENT");
  lines.push("═".repeat(60));

  return lines.join("\n");
}

/**
 * Export to structured format for third-party integrations
 */
export function exportToStructuredFormat(data: ExportDocumentData) {
  return {
    metadata: {
      title: data.projectName,
      description: data.projectDescription || "",
      exportedAt: data.exportedAt,
      format: "docnine-v1",
    },
    sections: data.tabs.map((tab) => ({
      id: tab.key,
      title: tab.label,
      type: tab.isCustom ? "custom" : "native",
      content: tab.content,
      contentFormatted: markdownToFormattedText(tab.content),
      contentStructured: markdownToStructuredContent(tab.content),
    })),
  };
}

/**
 * Create a summary of what will be exported
 */
export function getExportSummary(data: ExportDocumentData): string {
  const sections = data.tabs
    .map((t) => `${t.label}${t.isCustom ? " *" : ""}`)
    .join(", ");
  return `Exporting ${data.totalTabs} section(s): ${sections}`;
}
