import { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useSEO — Dynamic per-page SEO metadata for UniEval (CSR / React SPA)
//
// Usage:
//   useSEO({ title: 'Browse Courses', description: '...', canonical: 'https://unieval.in/browse' })
//
// The hook:
//  - Sets document.title with the " | UniEval" suffix
//  - Manages <meta name="description">, <link rel="canonical">, <meta name="robots">
//  - Manages all Open Graph and Twitter Card meta tags
//  - Injects JSON-LD structured data <script> tags into <head>
//  - Cleans up all dynamically-added tags on unmount to prevent stale metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOProps {
  /** Page title — " | UniEval" suffix is added automatically */
  title: string;
  /** Meta description — 120–160 chars recommended */
  description?: string;
  /** Absolute canonical URL, e.g. 'https://unieval.in/about'. Defaults to current URL without query params. */
  canonical?: string;
  /** Robots directive, e.g. 'noindex, nofollow'. Omit for default (indexable). */
  robots?: string;
  /** og:title — defaults to title */
  ogTitle?: string;
  /** og:description — defaults to description */
  ogDescription?: string;
  /** og:image — defaults to the UniEval OG card */
  ogImage?: string;
  /** og:type — defaults to 'website' */
  ogType?: string;
  /** og:url — defaults to canonical */
  ogUrl?: string;
  /** twitter:title — defaults to ogTitle */
  twitterTitle?: string;
  /** twitter:description — defaults to ogDescription */
  twitterDescription?: string;
  /** twitter:image — defaults to ogImage */
  twitterImage?: string;
  /**
   * Schema.org JSON-LD structured data.
   * Pass a single object or an array of objects.
   * Each object is injected as a separate <script type="application/ld+json"> tag.
   */
  jsonLd?: object | object[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_OG_IMAGE = 'https://unieval.in/img/og-image.png';
const SITE_NAME        = 'UniEval';
const TITLE_SUFFIX     = ` | ${SITE_NAME}`;
const BASE_URL: string = (import.meta.env.VITE_BASE_URL as string) || 'https://unieval.in';

// Sentinel attribute that marks tags created by this hook (vs. static tags in index.html)
const DYNAMIC_ATTR = 'data-dynamic';

// ── Helper: set or create a <meta> tag ────────────────────────────────────────
function setMeta(
  selectorAttr: string,
  selectorValue: string,
  contentValue: string,
  owned: Element[]
): void {
  const selector = `meta[${selectorAttr}="${selectorValue}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  const isNew = !el;

  if (isNew) {
    el = document.createElement('meta');
    el.setAttribute(selectorAttr, selectorValue);
    el.setAttribute(DYNAMIC_ATTR, 'true');
    document.head.appendChild(el);
    owned.push(el);
  }

  el!.setAttribute('content', contentValue);

  // Track dynamically-owned elements for cleanup
  if (!isNew && el!.getAttribute(DYNAMIC_ATTR) === 'true' && !owned.includes(el!)) {
    owned.push(el!);
  }
}

// ── Helper: set or create a <link> tag ────────────────────────────────────────
function setLink(
  rel: string,
  href: string,
  owned: Element[]
): void {
  const selector = `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  const isNew = !el;

  if (isNew) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(DYNAMIC_ATTR, 'true');
    document.head.appendChild(el);
    owned.push(el);
  }

  el!.setAttribute('href', href);

  if (!isNew && el!.getAttribute(DYNAMIC_ATTR) === 'true' && !owned.includes(el!)) {
    owned.push(el!);
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useSEO({
  title,
  description,
  canonical,
  robots,
  ogTitle,
  ogDescription,
  ogImage    = DEFAULT_OG_IMAGE,
  ogType     = 'website',
  ogUrl,
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
}: SEOProps): void {
  // Stringify jsonLd to a stable string for the dependency array
  // (prevents infinite re-runs when an object literal is passed inline)
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    // ── Save original title for cleanup ───────────────────────────────────────
    const prevTitle = document.title;

    // ── Set document.title ────────────────────────────────────────────────────
    document.title = `${title}${TITLE_SUFFIX}`;

    // Track all DOM elements created/modified by this effect for cleanup
    const owned: Element[] = [];
    const jsonLdScripts: HTMLScriptElement[] = [];

    // ── Derive computed values ─────────────────────────────────────────────────
    const computedCanonical = canonical ?? `${BASE_URL}${window.location.pathname}`;
    const computedOgTitle   = ogTitle       ?? title;
    const computedOgDesc    = ogDescription ?? description;
    const computedOgUrl     = ogUrl         ?? computedCanonical;
    const computedTwTitle   = twitterTitle  ?? computedOgTitle;
    const computedTwDesc    = twitterDescription ?? computedOgDesc;
    const computedTwImage   = twitterImage  ?? ogImage;

    // ── Meta description ──────────────────────────────────────────────────────
    if (description) {
      setMeta('name', 'description', description, owned);
    }

    // ── Canonical ─────────────────────────────────────────────────────────────
    setLink('canonical', computedCanonical, owned);

    // ── Robots ────────────────────────────────────────────────────────────────
    if (robots) {
      setMeta('name', 'robots', robots, owned);
    } else {
      // Remove any robots tag previously set by this hook
      const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (existing?.getAttribute(DYNAMIC_ATTR) === 'true') {
        existing.remove();
      }
    }

    // ── Open Graph ────────────────────────────────────────────────────────────
    setMeta('property', 'og:title',       computedOgTitle,  owned);
    setMeta('property', 'og:type',        ogType,           owned);
    setMeta('property', 'og:image',       ogImage,          owned);
    setMeta('property', 'og:url',         computedOgUrl,    owned);
    if (computedOgDesc) {
      setMeta('property', 'og:description', computedOgDesc, owned);
    }

    // ── Twitter Card ──────────────────────────────────────────────────────────
    setMeta('name', 'twitter:title',       computedTwTitle, owned);
    setMeta('name', 'twitter:image',       computedTwImage, owned);
    if (computedTwDesc) {
      setMeta('name', 'twitter:description', computedTwDesc, owned);
    }

    // ── JSON-LD Structured Data ───────────────────────────────────────────────
    if (jsonLdKey) {
      const parsed = JSON.parse(jsonLdKey) as object | object[];
      const schemas = Array.isArray(parsed) ? parsed : [parsed];
      schemas.forEach((schema) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-hook', 'true');
        script.setAttribute(DYNAMIC_ATTR, 'true');
        script.textContent = JSON.stringify(schema, null, 2);
        document.head.appendChild(script);
        jsonLdScripts.push(script);
      });
    }

    // ── Cleanup on unmount / before next run ──────────────────────────────────
    return () => {
      document.title = prevTitle;

      // Remove elements this hook created (marked with data-dynamic="true")
      owned.forEach((el) => {
        if (el.getAttribute(DYNAMIC_ATTR) === 'true') {
          el.remove();
        }
      });

      // Always remove injected JSON-LD scripts
      jsonLdScripts.forEach((s) => s.remove());
    };
  }, [
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogUrl,
    twitterTitle,
    twitterDescription,
    twitterImage,
    jsonLdKey,
  ]);
}
