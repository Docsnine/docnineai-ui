/**
 * Markdown to Formatted Text Converter
 * Converts markdown syntax to clean, formatted plain text preserving structure and emphasis
 */

/**
 * Convert markdown content to formatted plain text
 * Preserves hierarchy, emphasis, and structure without markdown syntax
 */
export function markdownToFormattedText(markdown: string): string {
  let text = markdown;

  // Headings: Convert to uppercase with spacing
  text = text.replace(/^### (.*?)$/gm, "\n$1\n" + "─".repeat(40) + "\n");
  text = text.replace(/^## (.*?)$/gm, "\n$1\n" + "═".repeat(40) + "\n");
  text = text.replace(/^# (.*?)$/gm, "\n$1\n" + "█".repeat(40) + "\n");

  // Bold & Italic combined
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");

  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // Italic
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/_(.*?)_/g, "$1");

  // Strikethrough
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Inline code - preserve with brackets
  text = text.replace(/`([^`]+)`/g, "「$1」");

  // Code blocks - preserve with borders
  text = text.replace(
    /```(?:\w+)?\n([\s\S]*?)```/g,
    "\n┌─ Code Block:\n$1\n└─\n",
  );

  // Links - show text and URL
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Images - show alt text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "[Image: $1]");

  // Blockquotes - add quote styling
  text = text.replace(/^> (.*?)$/gm, "┃ $1");

  // Bullet lists - replace with •
  text = text.replace(/^\s*[-*+] (.*?)$/gm, "  • $1");

  // Numbered lists - keep numbers
  text = text.replace(/^\s*\d+\. (.*?)$/gm, "  $1");

  // Checkboxes
  text = text.replace(/- \[x\] (.*?)$/gm, "  ✓ $1");
  text = text.replace(/- \[ \] (.*?)$/gm, "  ○ $1");

  // Horizontal lines
  text = text.replace(/^(-{3}|_{3}|\*{3})$/gm, "─".repeat(40));

  // Note blocks / callouts
  text = text.replace(/^::: note\n([\s\S]*?)\n:::$/gm, "\n📝 Note:\n$1\n");
  text = text.replace(
    /^::: warning\n([\s\S]*?)\n:::$/gm,
    "\n⚠️  Warning:\n$1\n",
  );
  text = text.replace(/^::: tip\n([\s\S]*?)\n:::$/gm, "\n💡 Tip:\n$1\n");
  text = text.replace(/^::: danger\n([\s\S]*?)\n:::$/gm, "\n⛔ Danger:\n$1\n");

  // Remove extra blank lines (more than 2 consecutive)
  text = text.replace(/\n\n\n+/g, "\n\n");

  // Clean up leading/trailing whitespace
  text = text.trim();

  return text;
}

/**
 * Extract plain text from markdown (removes ALL formatting)
 */
export function markdownToPlainText(markdown: string): string {
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
  text = text.replace(/^\s*-\s*\[.\]\s+/gm, "");

  // Remove code block markers
  text = text.replace(/```(?:\w+)?\n?([\s\S]*?)\n?```/g, "$1");

  // Remove horizontal lines
  text = text.replace(/^(-{3}|_{3}|\*{3})$/gm, "");

  // Remove callout blocks
  text = text.replace(/^:::\s*\w+\n([\s\S]*?)\n:::$/gm, "$1");

  // Clean up whitespace
  text = text.replace(/\n\n\n+/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Prepare content for structured export (HTML-like formatting preserved)
 * Used for Google Docs, Notion, etc. export
 */
export interface FormattedContentBlock {
  type: "heading" | "paragraph" | "list-item" | "code" | "quote" | "divider";
  level?: 1 | 2 | 3 | 4; // For headings
  content: string;
  children?: FormattedContentBlock[]; // For nested lists
}

export function markdownToStructuredContent(
  markdown: string,
): FormattedContentBlock[] {
  const blocks: FormattedContentBlock[] = [];
  const lines = markdown.split("\n");
  let currentList: FormattedContentBlock[] = [];
  let listLevel = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      if (currentList.length > 0) {
        blocks.push({
          type: "list-item",
          content: "",
          children: currentList,
        });
        currentList = [];
        listLevel = 0;
      }
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#+)\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: Math.min(headingMatch[1].length, 4) as 1 | 2 | 3 | 4,
        content: cleanFormatting(headingMatch[2]),
      });
      continue;
    }

    // Horizontal line
    if (/^(-{3}|_{3}|\*{3})$/.test(trimmed)) {
      blocks.push({ type: "divider", content: "" });
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      const codeLines = [trimmed.replace(/^```\w*\n?/, "")];
      let idx = lines.indexOf(trimmed) + 1;
      while (idx < lines.length && !lines[idx].trim().startsWith("```")) {
        codeLines.push(lines[idx]);
        idx++;
      }
      blocks.push({
        type: "code",
        content: codeLines.join("\n").replace(/```$/, "").trim(),
      });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      blocks.push({
        type: "quote",
        content: cleanFormatting(trimmed.replace(/^>\s*/, "")),
      });
      continue;
    }

    // List items
    const listMatch = trimmed.match(/^(\s*)[-*+]\s+(.*)$/);
    if (listMatch) {
      currentList.push({
        type: "list-item",
        content: cleanFormatting(listMatch[2]),
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: "paragraph",
      content: cleanFormatting(trimmed),
    });
  }

  if (currentList.length > 0) {
    blocks.push({
      type: "list-item",
      content: "",
      children: currentList,
    });
  }

  return blocks;
}

/**
 * Helper: Remove markdown formatting from text
 */
function cleanFormatting(text: string): string {
  let clean = text
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  return clean.trim();
}
