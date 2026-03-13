/**
 * PDF Export Generator
 * Creates beautifully formatted PDF documents with all documentation sections
 */

import type { ExportDocumentData, ExportTabContent } from "./export-utils";
import { markdownToFormattedText } from "./markdown-converter";

export interface PDFExportOptions {
  includeTableOfContents?: boolean;
  includeTimestamp?: boolean;
  pageNumbers?: boolean;
  headerFooter?: boolean;
}

/**
 * Generate structured HTML for PDF export that preserves formatting
 */
export function generatePDFHTML(
  data: ExportDocumentData,
  options: PDFExportOptions = {},
): string {
  const {
    includeTableOfContents = true,
    includeTimestamp = true,
    pageNumbers = true,
    headerFooter = true,
  } = options;

  const tabs = data.tabs;

  // CSS Styling for PDF
  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background: #fff;
      }
      
      .pdf-container {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.5in;
      }
      
      /* Cover Page */
      .cover-page {
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        border-bottom: 3px solid #0066cc;
        padding: 2in;
        text-align: center;
      }
      
      .cover-title {
        font-size: 3em;
        font-weight: 700;
        color: #0066cc;
        margin-bottom: 0.5em;
        line-height: 1.2;
      }
      
      .cover-subtitle {
        font-size: 1.2em;
        color: #666;
        margin-bottom: 2em;
      }
      
      .cover-meta {
        font-size: 0.9em;
        color: #999;
        margin-top: 3em;
        padding-top: 2em;
        border-top: 1px solid #ddd;
      }
      
      /* Table of Contents */
      .toc-page {
        page-break-after: always;
        padding: 2in;
      }
      
      .toc-title {
        font-size: 1.8em;
        font-weight: 700;
        margin-bottom: 1em;
        color: #0066cc;
      }
      
      .toc-list {
        list-style: none;
      }
      
      .toc-item {
        margin: 0.5em 0;
        font-size: 1em;
        color: #333;
      }
      
      .toc-item.custom::after {
        content: " *";
        color: #0066cc;
        font-weight: 700;
      }
      
      .toc-number {
        color: #999;
        margin-right: 0.5em;
      }
      
      /* Section Headers */
      .section {
        page-break-after: avoid;
        margin: 2em 0;
        padding-top: 1.5em;
        border-top: 2px solid #e0e0e0;
      }
      
      .section:first-of-type {
        page-break-before: avoid;
        border-top: none;
        margin-top: 0;
        padding-top: 0;
      }
      
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.5em;
        margin-bottom: 1em;
        padding-bottom: 0.75em;
        border-bottom: 2px solid #0066cc;
      }
      
      .section-number {
        display: inline-block;
        background: #0066cc;
        color: white;
        width: 1.8em;
        height: 1.8em;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-weight: 700;
        font-size: 0.9em;
      }
      
      .section-title {
        font-size: 1.6em;
        font-weight: 700;
        color: #0066cc;
        flex: 1;
      }
      
      .section-badge {
        background: #e3f2fd;
        color: #0066cc;
        padding: 0.25em 0.75em;
        border-radius: 0.25em;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        flex-shrink: 0;
      }
      
      .section-content {
        font-size: 0.95em;
        line-height: 1.8;
      }
      
      /* Markdown Elements */
      h1, h2, h3, h4, h5, h6 {
        margin: 1em 0 0.5em;
        font-weight: 700;
        color: #1a1a1a;
      }
      
      h1 { font-size: 1.5em; }
      h2 { font-size: 1.3em; }
      h3 { font-size: 1.1em; }
      h4, h5, h6 { font-size: 1em; }
      
      p {
        margin-bottom: 0.75em;
      }
      
      ul, ol {
        margin-left: 1.5em;
        margin-bottom: 0.75em;
      }
      
      li {
        margin-bottom: 0.25em;
      }
      
      code {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 0.25em;
        padding: 0.1em 0.3em;
        font-family: "Monaco", "Courier New", monospace;
        font-size: 0.9em;
      }
      
      pre {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 0.5em;
        padding: 1em;
        overflow-x: auto;
        margin-bottom: 0.75em;
        page-break-inside: avoid;
      }
      
      pre code {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85em;
        color: #333;
      }
      
      blockquote {
        border-left: 4px solid #0066cc;
        padding-left: 1em;
        margin: 0.75em 0;
        color: #666;
        font-style: italic;
      }
      
      a {
        color: #0066cc;
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.75em 0;
        page-break-inside: avoid;
      }
      
      th {
        background: #f5f5f5;
        border: 1px solid #ddd;
        padding: 0.5em;
        text-align: left;
        font-weight: 600;
      }
      
      td {
        border: 1px solid #ddd;
        padding: 0.5em;
      }
      
      tr:nth-child(even) {
        background: #fafafa;
      }
      
      /* Footer */
      .footer {
        margin-top: 3em;
        padding-top: 1em;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 0.8em;
        color: #999;
        page-break-inside: avoid;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .pdf-container {
          max-width: 100%;
          padding: 0.5in;
        }
      }
    </style>
  `;

  // Generate HTML content
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.projectName} - Documentation</title>
  ${styles}
</head>
<body>
  <div class="pdf-container">
`;

  // Cover Page
  html += `
    <div class="cover-page">
      <div class="cover-title">${escapeHtml(data.projectName)}</div>
      ${data.projectDescription ? `<div class="cover-subtitle">${escapeHtml(data.projectDescription)}</div>` : ""}
      <div class="cover-meta">
        <p>Documentation</p>
        ${includeTimestamp ? `<p>Generated on ${new Date(data.exportedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
        <p>${data.tabs.length} section${data.tabs.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
`;

  // Table of Contents
  if (includeTableOfContents && tabs.length > 0) {
    html += `
    <div class="toc-page">
      <div class="toc-title">Table of Contents</div>
      <ul class="toc-list">
`;
    tabs.forEach((tab, idx) => {
      html += `<li class="toc-item ${tab.isCustom ? "custom" : ""}">
        <span class="toc-number">${idx + 1}.</span>
        ${escapeHtml(tab.label)}
      </li>`;
    });
    html += `
      </ul>
    </div>
`;
  }

  // Sections
  tabs.forEach((tab, idx) => {
    html += `
    <div class="section">
      <div class="section-header">
        <div class="section-number">${idx + 1}</div>
        <div class="section-title">${escapeHtml(tab.label)}</div>
        ${tab.isCustom ? `<div class="section-badge">Custom</div>` : ""}
      </div>
      <div class="section-content">
        ${markdownToHtml(tab.content)}
      </div>
    </div>
`;
  });

  // Footer
  if (headerFooter) {
    html += `
    <div class="footer">
      <p>${escapeHtml(data.projectName)} • Generated ${new Date(data.exportedAt).toLocaleString()}</p>
    </div>
`;
  }

  html += `
  </div>
</body>
</html>`;

  return html;
}

/**
 * Convert markdown to HTML for PDF embedding
 */
function markdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Code blocks
  html = html.replace(
    /```(?:\w+)?\n([\s\S]*?)\n```/g,
    "<pre><code>$1</code></pre>",
  );

  // Inline code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  if (!html.startsWith("<p>")) html = "<p>" + html;
  if (!html.endsWith("</p>")) html = html + "</p>";

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate blob for PDF file (requires backend or html2pdf library)
 */
export async function generatePDFBlob(
  data: ExportDocumentData,
  options?: PDFExportOptions,
): Promise<Blob> {
  const html = generatePDFHTML(data, options);
  return new Blob([html], { type: "text/html" });
}
