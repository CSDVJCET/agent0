import { tool } from "ai";
import { z } from "zod";

/**
 * Slides/Presentation Tools for Agent0
 * 
 * This tool allows the AI agent to create beautiful reveal.js presentations
 * with enhanced visuals, image frames, and animations.
 * 
 * Users invoke this tool using @slides mentions in their prompts.
 */

const slideLayoutSchema = z
  .enum(["single-column", "two-column", "image-focused", "full-background", "image-grid"])
  .optional();

const slideTransitionSchema = z.enum(["slide", "zoom", "convex", "fade"]).optional();

const presentationSlideSchema = z.object({
  title: z.string().describe("Title of the slide"),
  content: z.string().describe("Main content/body text for the slide (can include HTML)"),
  layout: slideLayoutSchema.describe("Layout style for the slide"),
  imageKeywords: z.array(z.string()).optional().describe("Keywords for searching relevant images (e.g., ['technology', 'innovation'])"),
  imageCount: z.number().min(0).max(4).optional().describe("Number of images to include (0-4, default 1)"),
  transition: slideTransitionSchema.describe("Slide transition effect"),
});

const colorSchemeSchema = z.enum(["tech", "energy", "nature", "luxury", "custom"]);

const createPresentationInputSchema = z.object({
  title: z.string().describe("Main title of the presentation"),
  subtitle: z.string().optional().describe("Optional subtitle for the title slide"),
  topic: z.string().describe("Main topic/theme of the presentation (used for image search keywords)"),
  slides: z.array(presentationSlideSchema).min(3).describe("Array of slide objects (minimum 3 slides)"),
  colorScheme: colorSchemeSchema.optional().describe("Color theme for the presentation"),
  customColors: z
    .object({
      primary: z.string().optional().describe("Primary color hex code"),
      secondary: z.string().optional().describe("Secondary color hex code"),
      accent: z.string().optional().describe("Accent color hex code"),
    })
    .optional()
    .describe("Custom color scheme (only if colorScheme is 'custom')"),
});

const headingDraftInputSchema = z.object({
  topic: z.string().describe("Main presentation topic"),
  title: z.string().optional().describe("Proposed presentation title"),
  subtitle: z.string().optional().describe("Optional subtitle"),
  slideCount: z.number().min(3).max(20).optional().describe("Suggested number of content slides"),
  headings: z.array(z.string()).optional().describe("Proposed slide headings (without title/thank-you slides)"),
  audience: z.string().optional().describe("Intended audience"),
  objective: z.string().optional().describe("Presentation objective"),
});

type CreatePresentationInput = z.infer<typeof createPresentationInputSchema>;
export type PresentationSlide = z.infer<typeof presentationSlideSchema>;

const sanitizeSeed = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "slide";

const buildUnsplashUrl = (width: number, height: number, keywords: string, index: number) =>
  `https://source.unsplash.com/${width}x${height}/?${keywords},${index}`;

const buildFallbackImageUrl = (width: number, height: number, keywords: string, index: number) => {
  const seed = sanitizeSeed(`${keywords}-${index}`);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

const imageTag = (
  width: number,
  height: number,
  keywords: string,
  index: number,
  className: string
) => {
  const src = buildUnsplashUrl(width, height, keywords, index);
  const fallback = buildFallbackImageUrl(width, height, keywords, index);
  return `<img src="${src}" data-fallback-src="${fallback}" onerror="if(this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;this.removeAttribute('data-fallback-src');}" class="${className}">`;
};

const buildHeuristicHeadings = (topic: string, count: number) => {
  const base = topic.trim();
  const templates = [
    `Introduction to ${base}`,
    `${base}: Current Landscape`,
    `Key Drivers in ${base}`,
    `${base} Use Cases`,
    `Implementation Strategy`,
    `Challenges and Mitigations`,
    `Measuring Success`,
    `Future of ${base}`,
    `Action Plan`,
    `Q&A`,
  ];

  return Array.from({ length: count }).map((_, index) => templates[index] || `${base} — Slide ${index + 1}`);
};

export function buildSlidesFromHeadings(headings: string[], topic: string): PresentationSlide[] {
  return headings.map((heading, index) => ({
    title: heading,
    content:
      index === 0
        ? `Overview of ${topic} and why it matters.`
        : index === headings.length - 1
        ? `Summary and key next steps for ${topic}.`
        : `Key points about ${heading}.\nPractical examples and insights.`,
    layout: index % 3 === 0 ? "image-focused" : index % 2 === 0 ? "two-column" : "single-column",
    imageKeywords: [topic, heading],
    imageCount: index % 2 === 0 ? 2 : 1,
    transition: index % 2 === 0 ? "slide" : "convex",
  } as const));
}

export function generatePresentationPayload({
  title,
  subtitle,
  topic,
  slides,
  colorScheme = "tech",
  customColors,
}: CreatePresentationInput) {
  const colorSchemes = {
    tech: { primary: "#667eea", secondary: "#764ba2", accent: "#f093fb" },
    energy: { primary: "#ff6b6b", secondary: "#feca57", accent: "#ff9ff3" },
    nature: { primary: "#26de81", secondary: "#20bf6b", accent: "#45b7d1" },
    luxury: { primary: "#f39c12", secondary: "#2c3e50", accent: "#e74c3c" },
    custom: customColors || { primary: "#667eea", secondary: "#764ba2", accent: "#f093fb" },
  };

  const colors = colorSchemes[colorScheme];
  let slidesHtml = "";
  const titleImageKeywords = topic.split(" ").slice(0, 3).join(",");
  const titleImage = buildUnsplashUrl(1600, 900, `${titleImageKeywords},background`, 0);

  slidesHtml += `
      <section data-transition="zoom" data-background-image="${titleImage}" class="slide-overlay">
        <h1 class="fragment fade-in">${title}</h1>
        ${subtitle ? `<p class="fragment fade-in" style="font-size: 1.5em;">${subtitle}</p>` : ""}
      </section>
      `;

  let imageCounter = 1;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const transition = slide.transition || "slide";
    const layout = slide.layout || "single-column";
    const imageCount = slide.imageCount ?? 1;
    const keywords = slide.imageKeywords?.join(",") || topic.split(" ").join(",");

    if (layout === "full-background") {
      slidesHtml += `
      <section data-transition="${transition}" data-background-image="${buildUnsplashUrl(1600, 900, keywords, imageCounter++)}" class="slide-overlay">
        <div class="text-box fragment fade-in">
          <h2>${slide.title}</h2>
          <p>${slide.content}</p>
        </div>
      </section>
          `;
    } else if (layout === "two-column") {
      slidesHtml += `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="two-columns">
          <div>
            ${imageTag(600, 400, keywords, imageCounter++, "img-glass fragment fade-up")}
            <p>${slide.content.split("\n")[0] || slide.content}</p>
          </div>
          <div>
            ${imageTag(600, 400, keywords, imageCounter++, "img-glass fragment fade-up")}
            <p>${slide.content.split("\n")[1] || slide.content}</p>
          </div>
        </div>
      </section>
          `;
    } else if (layout === "image-grid") {
      const gridImages = Math.min(imageCount, 3);
      slidesHtml += `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        <div class="img-grid-${gridImages}">
          ${Array.from({ length: gridImages })
            .map(
              () => `
          <div class="fragment fade-up">
            ${imageTag(400, 300, keywords, imageCounter++, "img-elevated")}
            <p class="img-caption">${slide.title}</p>
          </div>
            `
            )
            .join("")}
        </div>
        <p class="fragment">${slide.content}</p>
      </section>
          `;
    } else if (layout === "image-focused") {
      slidesHtml += `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        ${imageTag(1200, 600, keywords, imageCounter++, "img-rounded-border fragment zoom-in")}
        <p class="img-caption fragment">${slide.content}</p>
      </section>
          `;
    } else {
      slidesHtml += `
      <section data-transition="${transition}">
        <h2>${slide.title}</h2>
        ${imageCount > 0 ? imageTag(1000, 500, keywords, imageCounter++, "img-elevated fragment fade-up") : ""}
        <div class="fragment fade-in">
          ${slide.content.replace(/\n/g, "<br>")}
        </div>
      </section>
          `;
    }
  }

  slidesHtml += `
      <section data-transition="zoom" data-background-image="${buildUnsplashUrl(1600, 900, `${titleImageKeywords},conclusion`, imageCounter++)}" class="slide-overlay">
        <h2 class="fragment fade-in">Thank You!</h2>
        <p class="fragment fade-in" style="font-size: 1.3em;">Questions?</p>
      </section>
      `;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/black.css">
  <style>
    :root {
      --primary-color: ${colors.primary};
      --secondary-color: ${colors.secondary};
      --accent-color: ${colors.accent};
      --text-color: #ffffff;
      --bg-color: #1a1a2e;
    }

    .reveal h1 {
      font-size: 3.5em;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }

    .reveal h2 {
      font-size: 2.5em;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 0.5em;
    }

    .reveal h3 {
      font-size: 1.8em;
      color: var(--secondary-color);
    }

    .img-elevated {
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      transform: translateY(0);
      transition: transform 0.3s ease;
      max-width: 100%;
      height: auto;
    }

    .img-elevated:hover {
      transform: translateY(-10px);
    }

    .img-rounded-border {
      border-radius: 20px;
      border: 4px solid var(--primary-color);
      padding: 8px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      max-width: 100%;
      height: auto;
    }

    .img-polaroid {
      background: white;
      padding: 16px 16px 60px 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      transform: rotate(-2deg);
      max-width: 100%;
      height: auto;
    }

    .img-glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 20px;
      max-width: 100%;
      height: auto;
    }

    .img-neon {
      border-radius: 12px;
      box-shadow: 0 0 20px var(--primary-color), 0 0 40px var(--primary-color), 0 0 60px var(--primary-color);
      max-width: 100%;
      height: auto;
    }

    .img-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2em;
      align-items: center;
    }

    .img-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5em;
    }

    .slide-overlay {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
    }

    .text-box {
      background: rgba(0, 0, 0, 0.6);
      padding: 2em;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .reveal ul {
      list-style: none;
    }

    .reveal ul li::before {
      content: "→";
      color: var(--primary-color);
      font-weight: bold;
      display: inline-block;
      width: 1em;
      margin-left: -1em;
    }

    .highlight-box {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      padding: 1.5em;
      border-radius: 12px;
      margin: 1em 0;
    }

    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3em;
      align-items: center;
    }

    .img-caption {
      font-size: 0.7em;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 0.5em;
      font-style: italic;
    }

    .reveal .progress {
      background: rgba(0, 0, 0, 0.2);
      color: var(--primary-color);
    }

    .reveal .controls {
      color: var(--primary-color);
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
  <script>
    if (typeof Reveal !== "undefined") {
      Reveal.initialize({
        hash: true,
        transition: "slide",
        transitionSpeed: "default",
        backgroundTransition: "fade",
        controls: true,
        progress: true,
        center: true,
        slideNumber: true,
        autoAnimateDuration: 0.5,
      });
    } else {
      console.warn("Reveal.js failed to load.");
    }
  </script>
</body>
</html>`;

  return {
    error: false,
    title,
    slideCount: slides.length + 2,
    htmlContent,
    colorScheme,
    message: `Successfully created presentation "${title}" with ${slides.length + 2} slides. The presentation includes rich visuals, image frames, and smooth animations. Open the HTML file in a browser to view.`,
  };
}

export const schedulePresentationHeadingsTool = tool({
  description:
    "Draft presentation heading overview first (HITL). Return proposed title, slide count, and editable headings for user confirmation before generating HTML.",
  inputSchema: headingDraftInputSchema,
  execute: async ({ topic, title, subtitle, slideCount, headings, audience, objective }) => {
    const normalizedCount = Math.max(
      3,
      Math.min(20, slideCount ?? headings?.length ?? (topic.length > 80 ? 8 : 6))
    );

    const normalizedHeadings = (headings?.filter(Boolean) ?? buildHeuristicHeadings(topic, normalizedCount)).slice(
      0,
      normalizedCount
    );

    while (normalizedHeadings.length < normalizedCount) {
      normalizedHeadings.push(`${topic} — Slide ${normalizedHeadings.length + 1}`);
    }

    return {
      status: "pending_confirmation" as const,
      presentationDetails: {
        topic,
        title: title || `${topic}: Overview`,
        subtitle: subtitle || "",
        slideCount: normalizedCount,
        headings: normalizedHeadings,
        colorScheme: "tech" as const,
      },
      reasoning: `Prepared a ${normalizedCount}-slide structure${audience ? ` for ${audience}` : ""}${
        objective ? ` focused on ${objective}` : ""
      }. Please review and edit before generating the final reveal.js deck.`,
    };
  },
});

export const createPresentationTool = tool({
  description: `Create a beautiful, visual-rich HTML presentation using reveal.js. 
  
  IMPORTANT INSTRUCTIONS FOR CREATING PRESENTATIONS:
  
  1. ALWAYS include relevant images on every slide (minimum 1 per slide, ideally 2-3 for content slides)
  2. Use Unsplash API for images: https://source.unsplash.com/1600x900/?keyword1,keyword2
  3. Apply CSS image frame classes: img-elevated, img-rounded-border, img-polaroid, img-glass, img-neon
  4. Add fragment animations to text and images: class="fragment fade-in", "fragment zoom-in", etc.
  5. Use data-transition attributes on sections: zoom, slide, convex, fade
  6. Create a title slide with hero image background
  7. Include section dividers with full-screen background images
  8. Use two-column layouts when comparing/contrasting concepts
  9. Apply consistent color scheme using CSS variables
  10. Add image captions for context
  
  Example slide with image:
  <section data-transition="slide">
    <h2>Innovation in Action</h2>
    <img src="https://source.unsplash.com/1200x600/?innovation,technology" class="img-elevated fragment fade-up">
    <p class="img-caption">Leading the way in technological advancement</p>
  </section>
  
  The presentation should be visually stunning, engaging, and professionally designed.`,
  inputSchema: createPresentationInputSchema,
  execute: async ({ title, subtitle, topic, slides, colorScheme = "tech", customColors }) => {
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
        message: err instanceof Error ? err.message : "Failed to create presentation",
      };
    }
  },
});

/**
 * Export all slides tools
 */
export const slidesTools = {
  schedulePresentationHeadings: schedulePresentationHeadingsTool,
  createPresentation: createPresentationTool,
};

export default slidesTools;
