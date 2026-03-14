import {
  Book,
  FileCode2,
  Database,
  BookOpen,
  ShieldAlert,
  FileCode,
} from "lucide-react";
import type { CustomTab } from "@/lib/api";

// ── Tab type definitions ──────────────────────────────────────────────────────
// Native tabs are always available and tied to document sections with version history.
// Custom tabs are user-created and managed dynamically.

export type NativeTab =
  | "readme"
  | "api"
  | "schema"
  | "internal"
  | "security"
  | "other_docs";
export type DocTab = NativeTab | `custom_${string}`;

export interface TabDef {
  key: DocTab;
  label: string;
  icon: React.ElementType;
  field?: string; // Only for native tabs — maps to API project field
  isNative: boolean;
  isCustom?: boolean;
  customTab?: CustomTab;
}

// ── Native tabs (always defined) ──────────────────────────────────────────
export const NATIVE_TABS: TabDef[] = [
  {
    key: "readme",
    label: "README",
    icon: Book,
    field: "readme",
    isNative: true,
  },
  {
    key: "api",
    label: "API Reference",
    icon: FileCode2,
    field: "apiReference",
    isNative: true,
  },
  {
    key: "schema",
    label: "Schema Docs",
    icon: Database,
    field: "schemaDocs",
    isNative: true,
  },
  {
    key: "internal",
    label: "Internal Docs",
    icon: BookOpen,
    field: "internalDocs",
    isNative: true,
  },
  {
    key: "security",
    label: "Security",
    icon: ShieldAlert,
    field: "securityReport",
    isNative: true,
  },
  { key: "other_docs", label: "Other Docs", icon: FileCode, isNative: true },
];

// ── Helper: Build full tab list from native + custom tabs ──────────────────
export function buildTabList(customTabs: CustomTab[] = []): TabDef[] {
  const customDefs: TabDef[] = (customTabs ?? [])
    .sort((a, b) => a.order - b.order)
    .map((ct) => ({
      key: `custom_${ct._id}` as DocTab,
      label: ct.name,
      icon: FileCode,
      isNative: false,
      isCustom: true,
      customTab: ct,
    }));
  return [
    ...NATIVE_TABS.slice(0, -1),
    ...customDefs,
    NATIVE_TABS[NATIVE_TABS.length - 1],
  ]; // Other Docs always last
}

// ── Section key → DocumentVersion section name (native tabs only) ──────────
export const TAB_TO_SECTION: Partial<Record<NativeTab, string>> = {
  readme: "readme",
  api: "apiReference",
  schema: "schemaDocs",
  internal: "internalDocs",
  security: "securityReport",
};
