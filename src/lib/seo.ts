import { useEffect, useRef } from "react";

// ─── Defaults ─────────────────────────────────────────────────────

const DEFAULT_SITE_NAME = "Docnine";
const DEFAULT_DESCRIPTION =
  "Docnine reads your codebase and instantly generates docs that stay in sync with every push — no writing, no maintenance, no stale README.";
const DEFAULT_IMAGE_PATH = "/web-app-manifest-512x512.png";
const TITLE_SUFFIX = "";

// ─── Types ────────────────────────────────────────────────────────

export interface SeoConfig {
  title: string;
  description?: string;
  pathname?: string;
  canonicalUrl?: string;
  robots?: string;
  keywords?: string[];
  type?: "website" | "article";
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  twitterCard?: "summary" | "summary_large_image";
  twitterSite?: string;
  siteName?: string;
  locale?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  structuredDataId?: string;
  /** Append " | Docnine" suffix. Default: true */
  appendSiteName?: boolean;
}

// ─── URL helpers ──────────────────────────────────────────────────

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === "string") return trimSlash(envUrl);
  if (typeof window !== "undefined") return trimSlash(window.location.origin);
  return "https://docnineai.com";
}

function toAbsoluteUrl(
  urlOrPath: string | undefined,
  siteUrl: string,
): string | undefined {
  if (!urlOrPath) return undefined;
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${trimSlash(siteUrl)}${cleanPath}`;
}

// ─── DOM helpers ──────────────────────────────────────────────────

function upsertMeta(attr: "name" | "property", value: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${value}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(attr: "name" | "property", value: string) {
  document.head.querySelector(`meta[${attr}="${value}"]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertStructuredData(
  data: Record<string, unknown> | Record<string, unknown>[],
  id: string,
) {
  let script = document.head.querySelector<HTMLScriptElement>(`script#${id}`);
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function removeStructuredData(id: string) {
  document.head.querySelector<HTMLScriptElement>(`script#${id}`)?.remove();
}

// ─── Core apply function ──────────────────────────────────────────

export function applySeo(config: SeoConfig | null) {
  if (!config || typeof document === "undefined") return;

  const siteUrl = getSiteUrl();
  const siteName = config.siteName ?? DEFAULT_SITE_NAME;
  const description = (config.description ?? DEFAULT_DESCRIPTION).trim();
  const robots = config.robots ?? "index, follow";
  const locale = config.locale ?? "en_US";
  const type = config.type ?? "website";
  const sdId = config.structuredDataId ?? "docnine-seo-jsonld";
  const image = toAbsoluteUrl(config.image ?? DEFAULT_IMAGE_PATH, siteUrl);
  const twitterCard =
    config.twitterCard ?? (image ? "summary_large_image" : "summary");

  // Build canonical URL
  const canonicalUrl =
    config.canonicalUrl ??
    toAbsoluteUrl(
      config.pathname ??
        (typeof window !== "undefined" ? window.location.pathname : "/"),
      siteUrl,
    ) ??
    siteUrl;

  // Build title — append suffix unless the title already contains "Docnine"
  const appendSuffix = config.appendSiteName ?? true;
  const fullTitle =
    appendSuffix && !/docnine/i.test(config.title)
      ? `${config.title}${TITLE_SUFFIX}`
      : config.title;

  const keywords = (config.keywords ?? []).filter(Boolean).join(", ");

  // ── <title> ───────────────────────────────────────────────────
  document.title = fullTitle;

  // ── Canonical + core meta ─────────────────────────────────────
  upsertLink("canonical", canonicalUrl);
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("name", "application-name", siteName);

  if (keywords) upsertMeta("name", "keywords", keywords);
  else removeMeta("name", "keywords");

  // ── Open Graph ────────────────────────────────────────────────
  upsertMeta("property", "og:title", fullTitle);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:locale", locale);

  if (image) {
    upsertMeta("property", "og:image", image);
    if (config.imageWidth)
      upsertMeta("property", "og:image:width", String(config.imageWidth));
    if (config.imageHeight)
      upsertMeta("property", "og:image:height", String(config.imageHeight));
    upsertMeta("property", "og:image:alt", fullTitle);
  } else {
    removeMeta("property", "og:image");
    removeMeta("property", "og:image:width");
    removeMeta("property", "og:image:height");
    removeMeta("property", "og:image:alt");
  }

  // ── Twitter / X card ─────────────────────────────────────────
  upsertMeta("name", "twitter:card", twitterCard);
  upsertMeta("name", "twitter:title", fullTitle);
  upsertMeta("name", "twitter:description", description);
  if (image) upsertMeta("name", "twitter:image", image);
  else removeMeta("name", "twitter:image");

  if (config.twitterSite)
    upsertMeta("name", "twitter:site", config.twitterSite);

  // ── Structured data (JSON-LD) ─────────────────────────────────
  if (config.structuredData) upsertStructuredData(config.structuredData, sdId);
  else removeStructuredData(sdId);
}

// ─── React hook ───────────────────────────────────────────────────

/**
 * Apply SEO config whenever it changes.
 * Restores the previous title and description on unmount so
 * components that set their own SEO don't leave stale values
 * if they're conditionally rendered.
 */
export function useSeo(config: SeoConfig | null) {
  const prevTitle = useRef<string>("");
  const sdId = config?.structuredDataId ?? "docnine-seo-jsonld";

  useEffect(() => {
    prevTitle.current = document.title;
    applySeo(config);

    return () => {
      // Only clean up structured data — title/meta are overwritten
      // by the next page's useSeo call, so no flicker needed.
      removeStructuredData(sdId);
    };
  }, [config, sdId]);
}
