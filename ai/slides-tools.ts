import { tool } from "ai";
import { z } from "zod";

/**
 * Slides/Presentation Tools for Agent0
 *
 * Creates vibrant, topic-aware reveal.js presentations with proper layouts
 * that prevent text clipping and support animations in both new-tab and
 * downloaded modes.
 */

// ── Unsplash API ────────────────────────────────────────────────────

/**
 * Search Unsplash for relevant images using the API.
 * Returns an array of image URLs (one per query).
 */
export async function searchUnsplashImages(
  queries: string[]
): Promise<(string | null)[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY not set, falling back to picsum");
    return queries.map(() => null);
  }

  const results = await Promise.all(
    queries.map(async (query, idx) => {
      try {
        const trimmedQuery = query;
        const searchQuery = encodeURIComponent(trimmedQuery);
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=3&orientation=landscape`,
          {
            headers: { Authorization: `Client-ID ${accessKey}` },
          }
        );
        if (!res.ok) {
          console.warn(`Unsplash search failed for "${query}":`, res.status);
          return null;
        }
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          // Pick a varied result based on index to avoid same image
          const photo = data.results[idx % data.results.length];
          return photo.urls?.regular || photo.urls?.small || null;
        }
        return null;
      } catch (err) {
        console.warn(`Unsplash fetch error for "${query}":`, err);
        return null;
      }
    })
  );

  return results;
}

// ── Schema ──────────────────────────────────────────────────────────

const slideLayoutSchema = z
  .enum([
    "text-image-split",
    "full-image-overlay",
    "two-column",
    "text-only",
    "image-grid",
  ])
  .optional();

const slideTransitionSchema = z
  .enum(["slide", "zoom", "convex", "fade", "none"])
  .optional();

const presentationSlideSchema = z.object({
  title: z.string().describe("Slide title (2-8 words)"),
  content: z
    .string()
    .describe("Main content — concise bullets separated by newlines, or a short paragraph"),
  layout: slideLayoutSchema.describe("Layout style for the slide"),
  imageKeywords: z
    .array(z.string())
    .optional()
    .describe("Keywords for relevant images"),
  imageCount: z
    .number()
    .min(0)
    .max(3)
    .optional()
    .describe("Number of images (0-3, default 1)"),
  transition: slideTransitionSchema.describe("Slide transition effect"),
  unsplashImageUrl: z.string().optional().describe("Real Unsplash image URL fetched by API"),
  useFragments: z.boolean().optional().describe("Whether bullets animate in one-by-one (true) or all at once (false)"),
});

const colorSchemeSchema = z.enum([
  "auto",
  "tech",
  "energy",
  "nature",
  "luxury",
  "ocean",
  "sunset",
  "corporate",
  "creative",
  "medical",
  "finance",
  "education",
  "minimal",
  "warm",
  "custom",
]);

const createPresentationInputSchema = z.object({
  title: z.string().describe("Main title of the presentation"),
  subtitle: z.string().optional().describe("Optional subtitle"),
  topic: z
    .string()
    .describe("Main topic/theme (used for image keywords and auto-theming)"),
  slides: z
    .array(presentationSlideSchema)
    .min(3)
    .describe("Array of slide objects (minimum 3)"),
  colorScheme: colorSchemeSchema
    .optional()
    .describe(
      "Color theme — use 'auto' to match the topic vibe automatically"
    ),
  customColors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional()
    .describe("Custom color overrides (only when colorScheme is 'custom')"),
  agentColors: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      bg: z.string(),
      text: z.string(),
      muted: z.string(),
      cardBg: z.string(),
      overlayBg: z.string(),
    })
    .optional()
    .describe("Full color palette from AI agent (overrides all other color settings)"),
  unsplashImages: z
    .array(z.string().nullable())
    .optional()
    .describe("Array of real Unsplash image URLs (one per slide)"),
  customCSS: z.string().optional().describe("LLM-generated CSS override block for custom gradients, typography, etc."),
  googleFont: z.string().optional().describe("Google Fonts family name chosen by LLM (e.g. 'Playfair Display', 'Space Grotesk')"),
  closingData: z
    .object({
      headline: z.string(),
      subtext: z.string(),
      ctaText: z.string().optional(),
    })
    .optional()
    .describe("LLM-generated closing slide content"),
});

const headingDraftInputSchema = z.object({
  topic: z.string().describe("Main presentation topic"),
  title: z.string().optional().describe("Proposed presentation title"),
  subtitle: z.string().optional().describe("Optional subtitle"),
  slideCount: z
    .number()
    .min(3)
    .max(20)
    .optional()
    .describe("Suggested number of content slides"),
  headings: z
    .array(z.string())
    .optional()
    .describe("Proposed slide headings (without title/thank-you slides)"),
  audience: z.string().optional().describe("Intended audience"),
  objective: z.string().optional().describe("Presentation objective"),
});

type CreatePresentationInput = z.infer<typeof createPresentationInputSchema>;
export type PresentationSlide = z.infer<typeof presentationSlideSchema>;

// ── Color palettes ──────────────────────────────────────────────────

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  muted: string;
  cardBg: string;
  overlayBg: string;
}

const COLOR_PALETTES: Record<string, ColorPalette> = {
  tech: {
    primary: "#60a5fa",
    secondary: "#a78bfa",
    accent: "#34d399",
    bg: "#0f172a",
    text: "#f1f5f9",
    muted: "#94a3b8",
    cardBg: "rgba(30,41,59,0.7)",
    overlayBg: "rgba(15,23,42,0.82)",
  },
  energy: {
    primary: "#ef4444",
    secondary: "#f97316",
    accent: "#fbbf24",
    bg: "#1c1917",
    text: "#fef2f2",
    muted: "#a8a29e",
    cardBg: "rgba(41,37,36,0.7)",
    overlayBg: "rgba(28,25,23,0.82)",
  },
  nature: {
    primary: "#22c55e",
    secondary: "#10b981",
    accent: "#a3e635",
    bg: "#052e16",
    text: "#f0fdf4",
    muted: "#86efac",
    cardBg: "rgba(20,83,45,0.7)",
    overlayBg: "rgba(5,46,22,0.82)",
  },
  luxury: {
    primary: "#d4a853",
    secondary: "#b8860b",
    accent: "#f5deb3",
    bg: "#171717",
    text: "#fef3c7",
    muted: "#a3a3a3",
    cardBg: "rgba(38,38,38,0.7)",
    overlayBg: "rgba(17,17,17,0.88)",
  },
  ocean: {
    primary: "#22d3ee",
    secondary: "#0ea5e9",
    accent: "#67e8f9",
    bg: "#0c1929",
    text: "#ecfeff",
    muted: "#7dd3fc",
    cardBg: "rgba(22,78,99,0.7)",
    overlayBg: "rgba(12,25,41,0.82)",
  },
  sunset: {
    primary: "#fb923c",
    secondary: "#f43f5e",
    accent: "#fbbf24",
    bg: "#1c1017",
    text: "#fff7ed",
    muted: "#fdba74",
    cardBg: "rgba(59,19,35,0.7)",
    overlayBg: "rgba(28,16,23,0.82)",
  },
  corporate: {
    primary: "#3b82f6",
    secondary: "#1e40af",
    accent: "#93c5fd",
    bg: "#0c1220",
    text: "#e2e8f0",
    muted: "#94a3b8",
    cardBg: "rgba(30,41,59,0.7)",
    overlayBg: "rgba(12,18,32,0.88)",
  },
  creative: {
    primary: "#e879f9",
    secondary: "#a855f7",
    accent: "#f0abfc",
    bg: "#1a0a1e",
    text: "#fdf4ff",
    muted: "#d8b4fe",
    cardBg: "rgba(46,16,101,0.7)",
    overlayBg: "rgba(26,10,30,0.82)",
  },
  medical: {
    primary: "#14b8a6",
    secondary: "#06b6d4",
    accent: "#5eead4",
    bg: "#0f1729",
    text: "#f0fdfa",
    muted: "#99f6e4",
    cardBg: "rgba(19,78,74,0.7)",
    overlayBg: "rgba(15,23,41,0.82)",
  },
  finance: {
    primary: "#3b82f6",
    secondary: "#1d4ed8",
    accent: "#60a5fa",
    bg: "#0f172a",
    text: "#dbeafe",
    muted: "#93c5fd",
    cardBg: "rgba(30,58,95,0.7)",
    overlayBg: "rgba(15,23,42,0.88)",
  },
  education: {
    primary: "#a78bfa",
    secondary: "#7c3aed",
    accent: "#c4b5fd",
    bg: "#1e1b2e",
    text: "#ede9fe",
    muted: "#c4b5fd",
    cardBg: "rgba(46,16,101,0.7)",
    overlayBg: "rgba(30,27,46,0.82)",
  },
  warm: {
    primary: "#f59e0b",
    secondary: "#d97706",
    accent: "#fcd34d",
    bg: "#1a1509",
    text: "#fef3c7",
    muted: "#fbbf24",
    cardBg: "rgba(66,32,6,0.7)",
    overlayBg: "rgba(26,21,9,0.82)",
  },
  minimal: {
    primary: "#94a3b8",
    secondary: "#64748b",
    accent: "#cbd5e1",
    bg: "#111111",
    text: "#f8fafc",
    muted: "#94a3b8",
    cardBg: "rgba(30,30,30,0.7)",
    overlayBg: "rgba(17,17,17,0.88)",
  },
};

/** Pick a palette automatically from topic keywords, or use the explicit choice. */
function inferColorScheme(
  topic: string,
  explicitScheme?: string
): ColorPalette {
  if (
    explicitScheme &&
    explicitScheme !== "auto" &&
    explicitScheme in COLOR_PALETTES
  ) {
    return COLOR_PALETTES[explicitScheme];
  }

  const t = topic.toLowerCase();

  if (
    /medic|health|hospital|pharma|doctor|nurse|patient|clinical|biotech|wellness/i.test(
      t
    )
  )
    return COLOR_PALETTES.medical;
  if (
    /financ|bank|invest|stock|market|money|economy|budget|revenue|profit|trading/i.test(
      t
    )
  )
    return COLOR_PALETTES.finance;
  if (
    /school|education|learn|university|student|teach|academic|course|training/i.test(
      t
    )
  )
    return COLOR_PALETTES.education;
  if (
    /food|cook|recipe|restaurant|culinary|nutrition|diet|meal|beverage|cafe/i.test(
      t
    )
  )
    return COLOR_PALETTES.warm;
  if (
    /ocean|sea|marine|water|aqua|surf|beach|coast|maritime/i.test(t)
  )
    return COLOR_PALETTES.ocean;
  if (
    /nature|eco|green|forest|plant|garden|environment|sustain|climate|organic/i.test(
      t
    )
  )
    return COLOR_PALETTES.nature;
  if (
    /art|design|creative|music|film|paint|photo|fashion|style|brand/i.test(t)
  )
    return COLOR_PALETTES.creative;
  if (
    /sport|fitness|game|athlete|team|competition|exercise|racing/i.test(t)
  )
    return COLOR_PALETTES.energy;
  if (
    /luxury|premium|elegant|exclusive|jewel|diamond|gold|wine/i.test(t)
  )
    return COLOR_PALETTES.luxury;
  if (
    /travel|journey|adventure|explore|destination|tourism|flight|vacation/i.test(
      t
    )
  )
    return COLOR_PALETTES.sunset;
  if (
    /business|corporate|enterprise|management|strategy|consult|startup|company/i.test(
      t
    )
  )
    return COLOR_PALETTES.corporate;
  if (
    /tech|software|ai|machine|data|digital|code|program|computer|cyber|cloud|web|app/i.test(
      t
    )
  )
    return COLOR_PALETTES.tech;
  if (
    /energy|power|electric|solar|renewable|nuclear|fuel|battery/i.test(t)
  )
    return COLOR_PALETTES.energy;

  return COLOR_PALETTES.tech;
}

// ── Image helpers ───────────────────────────────────────────────────

const sanitizeSeed = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "slide";

const buildFallbackImageUrl = (
  width: number,
  height: number,
  keywords: string,
  index: number
) => {
  const seed = sanitizeSeed(`${keywords}-${index}`);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

/** Build an image tag, preferring real Unsplash URLs when available. */
const imageTag = (
  width: number,
  height: number,
  keywords: string,
  index: number,
  className = "",
  realImageUrl?: string
) => {
  const src = realImageUrl || buildFallbackImageUrl(width, height, keywords, index);
  const fallback = buildFallbackImageUrl(width, height, keywords, index);
  if (realImageUrl) {
    return `<img src="${src}" class="${className}" alt="" loading="lazy">`;
  }
  return `<img src="${src}" data-fallback-src="${fallback}" onerror="if(this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;this.removeAttribute('data-fallback-src');}" class="${className}" alt="" loading="lazy">`;
};

// ── Heading helpers ─────────────────────────────────────────────────

const buildHeuristicHeadings = (topic: string, count: number) => {
  const base = topic.trim();
  const templates = [
    `The Story of ${base}`,
    `Why ${base} Matters Now`,
    `${base}: Core Principles`,
    `${base} in the Real World`,
    `Breakthroughs & Milestones`,
    `The People Behind ${base}`,
    `${base} vs. The Alternatives`,
    `Inside the Numbers`,
    `What Critics Get Wrong About ${base}`,
    `The Road Ahead for ${base}`,
    `Lessons Learned`,
    `Expert Perspectives`,
    `${base} Around the Globe`,
    `The Defining Moments`,
    `Looking Forward`,
  ];
  return Array.from({ length: count }).map(
    (_, i) => templates[i] || `${base} — Slide ${i + 1}`
  );
};

/** Build default slide objects from confirmed headings — used by the
 *  HITL /api/slides/create endpoint. */
export function buildSlidesFromHeadings(
  headings: string[],
  topic: string
): PresentationSlide[] {
  const layouts: PresentationSlide["layout"][] = [
    "text-image-split",
    "two-column",
    "text-image-split",
    "full-image-overlay",
    "text-only",
    "text-image-split",
    "image-grid",
    "two-column",
  ];

  return headings.map((heading, index) => ({
    title: heading,
    content:
      index === 0
        ? `Overview of ${topic} and why it matters.`
        : index === headings.length - 1
          ? `Summary and key next steps for ${topic}.`
          : `Key points about ${heading}.\nPractical examples and insights.`,
    layout: layouts[index % layouts.length],
    imageKeywords: [topic, ...heading.split(" ").slice(0, 2)],
    imageCount: 1,
    transition: (["slide", "fade", "convex", "zoom"] as const)[index % 4],
  }));
}

// ── Slide HTML renderers ────────────────────────────────────────────

function renderContentSlide(
  slide: PresentationSlide,
  index: number,
  topic: string,
  imgCounter: { value: number },
  unsplashImages?: (string | null)[]
): string {
  const transition = slide.transition || "slide";
  const layout = slide.layout || "text-image-split";
  const keywords = slide.imageKeywords?.join(",") || topic;
  // Use per-slide Unsplash URL if available, or the array-based one
  const realImgUrl = slide.unsplashImageUrl || unsplashImages?.[index] || undefined;
  const contentLines = slide.content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const useFragments = slide.useFragments !== false; // default true
  const bulletHtml =
    contentLines.length > 1
      ? `<ul>${contentLines
          .map(
            (line, i) =>
              useFragments
                ? `<li class="fragment fade-in" data-fragment-index="${i}">${line}</li>`
                : `<li>${line}</li>`
          )
          .join("")}</ul>`
      : useFragments
        ? `<p class="fragment fade-in">${slide.content}</p>`
        : `<p>${slide.content}</p>`;

  // ─── Full-image overlay ───
  if (layout === "full-image-overlay") {
    const bgImg = realImgUrl || buildFallbackImageUrl(1600, 900, keywords, imgCounter.value++);
    return `
      <section data-transition="${transition}" data-background-image="${bgImg}" data-background-size="cover" class="overlay-slide">
        <div class="overlay-box">
          <h2>${slide.title}</h2>
          ${bulletHtml}
        </div>
      </section>`;
  }

  // ─── Two-column ───
  if (layout === "two-column") {
    return `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="layout-grid">
          <div class="grid-cell">
            ${imageTag(600, 400, keywords, imgCounter.value++, "slide-img fragment fade-up", realImgUrl)}
            <p class="fragment fade-in">${contentLines[0] || slide.content}</p>
          </div>
          <div class="grid-cell">
            ${imageTag(600, 400, keywords, imgCounter.value++, "slide-img fragment fade-up")}
            <p class="fragment fade-in">${contentLines[1] || contentLines[0] || slide.content}</p>
          </div>
        </div>
      </section>`;
  }

  // ─── Image grid ───
  if (layout === "image-grid") {
    const count = Math.min(slide.imageCount ?? 3, 3);
    return `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="layout-images cols-${count}">
          ${Array.from({ length: count })
            .map(
              (_, gi) =>
                `<div class="fragment fade-up">${imageTag(400, 300, keywords, imgCounter.value++, "slide-img", gi === 0 ? realImgUrl : undefined)}</div>`
            )
            .join("")}
        </div>
        <div class="fragment fade-in" style="margin-top:12px;">${bulletHtml}</div>
      </section>`;
  }

  // ─── Text only ───
  if (layout === "text-only") {
    return `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="text-large">${bulletHtml}</div>
      </section>`;
  }

  // ─── Default: text-image-split (alternating left/right) ───
  const imgHtml = imageTag(
    700,
    500,
    keywords,
    imgCounter.value++,
    "slide-img fragment fade-up",
    realImgUrl
  );

  // Alternate image side for visual variety
  if (index % 2 === 0) {
    return `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="layout-side">
          <div class="text-col">${bulletHtml}</div>
          <div class="img-col">${imgHtml}</div>
        </div>
      </section>`;
  }

  return `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="layout-side">
          <div class="img-col">${imgHtml}</div>
          <div class="text-col">${bulletHtml}</div>
        </div>
      </section>`;
}

/** Render the closing slide using LLM-provided content when available, with a quality fallback. */
function renderClosingSlide(
  title: string,
  topic: string,
  totalContentSlides: number,
  imgCounter: { value: number },
  colors: ColorPalette,
  closingData?: { headline: string; subtext: string; ctaText?: string }
): string {
  const keywords = topic.split(" ").slice(0, 3).join(",");

  // LLM-generated closing slide
  if (closingData) {
    const bgImg = buildFallbackImageUrl(1600, 900, `${keywords}-closing`, imgCounter.value++);
    return `
      <section data-transition="zoom" data-background-image="${bgImg}" data-background-size="cover" class="overlay-slide centered">
        <div class="overlay-box" style="text-align:center; max-width:760px;">
          <h2 class="fragment fade-in" style="font-size:36pt; line-height:1.15;">${closingData.headline}</h2>
          <div style="width:60px; height:3px; background:${colors.accent}; margin:16px auto;" class="fragment fade-in"></div>
          <p class="fragment fade-in" style="font-size:17pt; margin-top:8px; color:${colors.muted};">${closingData.subtext}</p>
          ${closingData.ctaText ? `<div class="fragment zoom-in" style="margin-top:24px; display:inline-block; padding:14px 32px; background:${colors.primary}; color:#fff; border-radius:8px; font-size:16pt; font-weight:700; letter-spacing:0.03em;">${closingData.ctaText}</div>` : ""}
        </div>
      </section>`;
  }

  // Fallback variants when no LLM data
  const variant = totalContentSlides % 3;

  if (variant === 0) {
    const bgImg = buildFallbackImageUrl(1600, 900, `${keywords} conclusion`, imgCounter.value++);
    return `
      <section data-transition="zoom" data-background-image="${bgImg}" data-background-size="cover" class="overlay-slide centered">
        <div class="overlay-box" style="text-align:center;">
          <h2 class="fragment fade-in" style="font-size:36pt;">The Bottom Line</h2>
          <div style="width:60px; height:3px; background:${colors.accent}; margin:16px auto;" class="fragment fade-in"></div>
          <p class="fragment fade-in" style="font-size:18pt; margin-top:12px;">${topic} — what it means for you</p>
          <p class="fragment fade-in caption" style="margin-top:16px;">Questions &amp; Discussion</p>
        </div>
      </section>`;
  }

  if (variant === 1) {
    return `
      <section data-transition="fade" class="centered">
        <h2 class="fragment fade-in" style="font-size:32pt;">What We Learned</h2>
        <div style="max-width:600px; margin:20px auto; text-align:left;">
          <div class="accent-card fragment fade-up">The core of ${topic}</div>
          <div class="accent-card fragment fade-up" style="border-color:${colors.secondary};">Why it changes everything</div>
          <div class="accent-card fragment fade-up" style="border-color:${colors.accent};">Your next move</div>
        </div>
        <p class="fragment fade-in caption" style="margin-top:20px;">Thank you for your attention</p>
      </section>`;
  }

  // variant 2 — bold CTA
  return `
      <section data-transition="convex" class="centered">
        <h2 style="font-size:40pt; margin-bottom:16px;" class="fragment fade-in">${title}</h2>
        <div style="width:80px; height:4px; background:${colors.accent}; margin:0 auto 20px; border-radius:2px;" class="fragment fade-in"></div>
        <p class="fragment fade-in" style="font-size:18pt;">The conversation starts here.</p>
        <div class="fragment zoom-in" style="margin-top:24px; display:inline-block; padding:14px 32px; background:${colors.primary}; color:#fff; border-radius:8px; font-size:16pt; font-weight:700;">Let&apos;s Get Started &rarr;</div>
      </section>`;
}

// ── Main payload generator ──────────────────────────────────────────

export function generatePresentationPayload({
  title,
  subtitle,
  topic,
  slides,
  colorScheme = "auto",
  customColors,
  agentColors,
  unsplashImages,
  customCSS,
  googleFont,
  closingData,
}: CreatePresentationInput) {
  // Resolve colors — prefer agent-generated colors, then custom, then auto
  let colors: ColorPalette;
  if (agentColors) {
    colors = agentColors;
  } else if (colorScheme === "custom" && customColors) {
    colors = {
      ...COLOR_PALETTES.tech,
      primary: customColors.primary || COLOR_PALETTES.tech.primary,
      secondary: customColors.secondary || COLOR_PALETTES.tech.secondary,
      accent: customColors.accent || COLOR_PALETTES.tech.accent,
    };
  } else {
    colors = inferColorScheme(topic, colorScheme);
  }

  const titleKeywords = topic.split(" ").slice(0, 3).join(",");
  // Use first unsplash image as title background if available
  const titleBgImg = unsplashImages?.[0] || buildFallbackImageUrl(1600, 900, `${titleKeywords}-background`, 0);
  const imgCounter = { value: 1 };

  // Title slide
  let slidesHtml = `
      <section data-transition="zoom" data-background-image="${titleBgImg}" data-background-size="cover" class="overlay-slide centered">
        <h1 class="fragment fade-in">${title}</h1>
        ${subtitle ? `<p class="fragment fade-in" style="font-size:20pt; margin-top:8px; color:${colors.muted};">${subtitle}</p>` : ""}
      </section>`;

  // Content slides
  for (let i = 0; i < slides.length; i++) {
    slidesHtml += renderContentSlide(slides[i], i, topic, imgCounter, unsplashImages);
  }

  // Closing slide (LLM-generated or varied fallback)
  slidesHtml += renderClosingSlide(
    title,
    topic,
    slides.length,
    imgCounter,
    colors,
    closingData
  );

  const htmlContent = buildFullHtml(title, slidesHtml, colors, googleFont, customCSS);

  return {
    error: false,
    title,
    slideCount: slides.length + 2,
    htmlContent,
    colorScheme: colorScheme === "auto" ? "auto" : colorScheme,
    message: `Created "${title}" with ${slides.length + 2} slides.`,
  };
}

// ── Full HTML builder ───────────────────────────────────────────────

function buildFullHtml(
  title: string,
  slidesHtml: string,
  colors: ColorPalette,
  googleFont?: string,
  customCSS?: string
): string {
  const fontFamily = googleFont || "Inter";
  const fontSlug = fontFamily.replace(/ /g, "+");
  const googleFontLink = googleFont
    ? `<link href="https://fonts.googleapis.com/css2?family=${fontSlug}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`
    : `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${googleFontLink}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/black.css">
  <style>
    :root {
      --r-background-color: ${colors.bg};
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
      --text: ${colors.text};
      --muted: ${colors.muted};
      --card-bg: ${colors.cardBg};
      --overlay-bg: ${colors.overlayBg};
    }

    body {
      background-color: var(--r-background-color);
      /* Subtle radial gradient to break up flat backgrounds */
      background-image: radial-gradient(circle at 50% 40%, var(--card-bg) 0%, var(--r-background-color) 90%);
    }

    .reveal { font-family: "${fontFamily}", "Inter", "Segoe UI", Helvetica, sans-serif; }

    /* ---- SLIDE LAYOUT ---- */
    .reveal .slides > section,
    .reveal .slides > section > section {
      display: flex !important;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      height: 100%;
      padding: 28px 48px;
      box-sizing: border-box;
      text-align: left;
    }

    .reveal .slides section.centered {
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    /* ---- TYPOGRAPHY ---- */
    .reveal h1 {
      font-size: 42pt;
      font-weight: 800;
      color: var(--primary);
      margin: 0 0 10px;
      line-height: 1.1;
      text-shadow: 0 2px 20px rgba(0,0,0,0.4);
    }

    .reveal h2 {
      font-size: 26pt;
      font-weight: 700;
      color: var(--primary);
      margin: 0 0 14px;
      line-height: 1.15;
      flex-shrink: 0;
    }

    .reveal h3 {
      font-size: 18pt;
      font-weight: 600;
      color: var(--secondary);
      margin: 0 0 8px;
    }

    .reveal p,
    .reveal li {
      font-size: 15pt;
      line-height: 1.5;
      color: var(--text);
    }

    .reveal ul {
      list-style: none;
      padding-left: 1.2em;
      margin: 0;
    }

    .reveal ul li {
      position: relative;
      padding-left: 0;
      margin-bottom: 8px;
    }

    .reveal ul li::before {
      content: "\\25B8";
      color: var(--accent);
      position: absolute;
      left: -1em;
      font-weight: bold;
    }

    /* ---- IMAGES ---- */
    .slide-img {
      max-height: 40vh;
      max-width: 100%;
      width: 100%;
      object-fit: cover;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }

    /* ---- LAYOUTS ---- */
    .layout-side {
      display: flex;
      gap: 24px;
      flex: 1;
      min-height: 0;
      align-items: flex-start;
    }

    .layout-side .text-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .layout-side .img-col {
      flex: 0 0 44%;
    }

    .layout-side .img-col .slide-img {
      width: 100%;
      max-height: 52vh;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
      align-items: start;
    }

    .grid-cell {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .grid-cell .slide-img {
      max-height: 35vh;
    }

    .layout-images {
      display: grid;
      gap: 12px;
      min-height: 0;
    }

    .layout-images.cols-2 { grid-template-columns: 1fr 1fr; }
    .layout-images.cols-3 { grid-template-columns: repeat(3, 1fr); }

    .layout-images .slide-img {
      max-height: 32vh;
    }

    /* ---- OVERLAY SLIDES ---- */
    .overlay-slide { position: relative; }

    .overlay-slide::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--overlay-bg);
      z-index: 0;
    }

    .overlay-slide > * {
      position: relative;
      z-index: 1;
    }

    .overlay-box {
      background: rgba(0,0,0,0.45);
      padding: 24px 32px;
      border-radius: 14px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 720px;
    }

    /* ---- TEXT MODIFIERS ---- */
    .text-large p,
    .text-large li {
      font-size: 18pt;
    }

    .caption {
      font-size: 11pt;
      color: var(--muted);
      font-style: italic;
      margin-top: 4px;
    }

    .accent-card {
      background: var(--card-bg);
      border-left: 4px solid var(--accent);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 10px 0;
      font-size: 15pt;
      color: var(--text);
    }

    /* ---- CONTROLS ---- */
    .reveal .progress { color: var(--primary); }
    .reveal .controls { color: var(--primary); }
    .reveal .slide-number { color: var(--muted); font-size: 10pt; }
  </style>
  ${customCSS ? `<style id="agent-custom">
${customCSS}
  </style>` : ""}
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
  <script>
    // Use 'load' event to guarantee reveal.js + all assets are ready
    window.addEventListener('load', function() {
      if (typeof Reveal !== 'undefined') {
        Reveal.initialize({
          hash: true,
          transition: 'slide',
          transitionSpeed: 'default',
          backgroundTransition: 'fade',
          controls: true,
          progress: true,
          center: false,
          slideNumber: true,
          autoAnimateDuration: 0.7,
          fragments: true,
        });
      }
    });
  </script>
</body>
</html>`;
}

// ── Tool definitions ────────────────────────────────────────────────

export const schedulePresentationHeadingsTool = tool({
  description:
    "Draft presentation heading overview first (HITL). Return proposed title, slide count, and editable headings for user confirmation before generating HTML.",
  inputSchema: headingDraftInputSchema,
  execute: async ({
    topic,
    title,
    subtitle,
    slideCount,
    headings,
    audience,
    objective,
  }) => {
    const normalizedCount = Math.max(
      3,
      Math.min(
        20,
        slideCount ?? headings?.length ?? (topic.length > 80 ? 8 : 6)
      )
    );

    const normalizedHeadings = (
      headings?.filter(Boolean) ??
      buildHeuristicHeadings(topic, normalizedCount)
    ).slice(0, normalizedCount);

    while (normalizedHeadings.length < normalizedCount) {
      normalizedHeadings.push(
        `${topic} — Slide ${normalizedHeadings.length + 1}`
      );
    }

    return {
      status: "pending_confirmation" as const,
      presentationDetails: {
        topic,
        title: title || `${topic}: Overview`,
        subtitle: subtitle || "",
        slideCount: normalizedCount,
        headings: normalizedHeadings,
        colorScheme: "auto" as const,
      },
      reasoning: `Prepared a ${normalizedCount}-slide structure${audience ? ` for ${audience}` : ""}${
        objective ? ` focused on ${objective}` : ""
      }. Please review and edit before generating the final reveal.js deck.`,
    };
  },
});

export const createPresentationTool = tool({
  description: `Create a vibrant, topic-aware HTML presentation using reveal.js.

  IMPORTANT:
  1. Include relevant images on every content slide (1-2 per slide)
  2. Use Unsplash for images: https://source.unsplash.com/1600x900/?keyword1,keyword2
  3. Use fragment animations on text and images for progressive reveal
  4. Use data-transition on sections: slide, zoom, convex, fade
  5. Content must be concise — short headings (2-8 words), 3-5 bullet points max per slide
  6. Text is placed BESIDE images, never below where it can clip
  7. Color scheme is auto-detected from topic — the presentation matches the topic vibe
  8. Closing slide should vary — not always just "Thank You"
  9. DO NOT output slide outlines or summaries in chat text — the UI card handles display`,
  inputSchema: createPresentationInputSchema,
  execute: async ({
    title,
    subtitle,
    topic,
    slides,
    colorScheme = "auto",
    customColors,
  }) => {
    try {
      return generatePresentationPayload({
        title,
        subtitle,
        topic,
        slides,
        colorScheme,
        customColors,
      });
    } catch (err) {
      return {
        error: true,
        message:
          err instanceof Error ? err.message : "Failed to create presentation",
      };
    }
  },
});

export const slidesTools = {
  schedulePresentationHeadings: schedulePresentationHeadingsTool,
  createPresentation: createPresentationTool,
};

export default slidesTools;
