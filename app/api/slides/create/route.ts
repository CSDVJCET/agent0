import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { generatePresentationPayload, searchUnsplashImages } from "@/ai/slides-tools";
import type { PresentationSlide } from "@/ai/slides-tools";

// Initialize free provider clients
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Agent0",
  },
});

const createSlidesSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  topic: z.string().min(1),
  slideCount: z.number().min(3).max(20),
  headings: z.array(z.string().min(1)).min(3),
  colorScheme: z.enum(["auto", "tech", "energy", "nature", "luxury", "ocean", "sunset", "corporate", "creative", "medical", "finance", "education", "minimal", "warm", "custom"]).optional(),
  customColors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  model: z.string().optional(),
});

// Schema for LLM-generated slide content
// Note: Some models don't support minItems/maxItems constraints, so we rely on prompt guidance instead
const agentSlideSchema = z.object({
  slides: z.array(
    z.object({
      title: z.string().describe("Slide heading (2-8 words, punchy and specific)"),
      bullets: z
        .array(z.string())
        .describe("3-5 bullet points (fewer is better, never crowd) with REAL facts, stats, or concrete information. Each bullet should be one concise sentence with actual content, not generic filler."),
      layout: z
        .enum(["text-image-split", "full-image-overlay", "two-column", "text-only", "image-grid"])
        .describe("Choose the best layout for this slide's content"),
      imageSearchQuery: z
        .string()
        .describe("A descriptive, visual Unsplash search query (2-5 words). Focus on mood, lighting, and subject. e.g. 'cinematic red ferrari on track' instead of 'car'. 'modern minimal office workspace' instead of 'office'."),
      transition: z
        .enum(["slide", "zoom", "convex", "fade"])
        .describe("Slide transition effect"),
      useFragments: z
        .boolean()
        .describe("true = bullets animate in one-by-one (use for step-by-step flows, comparisons, reveals). false = all bullets appear at once (use for data-heavy, factual, or info-dense slides). Choose deliberately."),
    })
  ),
  theme: z.object({
    primary: z.string().describe("Primary color hex. CAPTURE THE EMOTIONAL IDENTITY of the topic — be unexpected and bold. Cybersecurity? Blood-red or acid green. Blockchain? Gold on obsidian. Ancient Rome? Burnt sienna. Tech doesn't have to be blue."),
    secondary: z.string().describe("Secondary color hex that complements the primary"),
    accent: z.string().describe("Accent color hex for highlights and bullets"),
    bg: z.string().describe("Background color hex. Dark mode (e.g. #0f0f15) is preferred for tech/modern topics. Light mode (e.g. #f8f9fa) is allowed for wellness, medical, or clean topics. Use the most appropriate."),
    text: z.string().describe("Text color hex (must contrast with bg). e.g. #f1f5f9 for dark mode, #1e293b for light mode."),
    muted: z.string().describe("Muted text color hex for captions and secondary text"),
  }),
  googleFont: z.string().describe("Google Fonts family that matches the mood of this topic. Examples: 'Playfair Display' for luxury/editorial, 'Space Grotesk' for tech/modern, 'Bebas Neue' for sports/energy, 'Lora' for history/academic, 'DM Sans' for clean minimal, 'Syne' for creative/bold. Pick the most fitting, not always the default."),
  customCSS: z.string().describe("A CSS override block (no <style> tags, just rules) for this presentation. Use it for: custom gradients on h2, unique bullet markers, background textures on .overlay-slide, accent typography. Be creative but don't break readability. Can be empty string."),
  closingSlide: z.object({
    headline: z.string().describe("A powerful, topic-specific closing headline. NOT 'Thank You' or 'Questions & Discussion'. Make it memorable — a bold claim, call to action, or profound takeaway specific to this topic."),
    subtext: z.string().describe("Supporting line that reinforces the headline. One sentence, specific to the topic."),
    ctaText: z.string().describe("CTA button text when there's a clear next step (e.g. 'Start Building Today', 'Join the Movement'). Use empty string '' if no CTA is appropriate."),
  }),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSlidesSchema.parse(body);

    const normalizedHeadings = parsed.headings.slice(0, parsed.slideCount);
    while (normalizedHeadings.length < parsed.slideCount) {
      normalizedHeadings.push(`${parsed.topic} — Slide ${normalizedHeadings.length + 1}`);
    }

    // Use AI agent to generate real content for each slide
    // Use the selected model from the request, fallback to gemini-2.0-flash-exp
    const modelId = parsed.model || "gemini-2.0-flash-exp";
    
    // Determine the model instance based on provider
    let modelInstance;
    if (modelId.startsWith("groq:")) {
      const model = modelId.replace("groq:", "");
      modelInstance = groq(model);
    } else if (modelId.startsWith("cohere:")) {
      const model = modelId.replace("cohere:", "");
      modelInstance = cohere(model);
    } else if (modelId.startsWith("openrouter:")) {
      const model = modelId.replace("openrouter:", "");
      modelInstance = openrouter(model);
    } else {
      // Default to Google Gemini
      modelInstance = google(modelId);
    }
    
    const { object: generated } = await generateObject({
      model: modelInstance,
      schema: agentSlideSchema,
      prompt: `You are a presentation content expert. Create detailed, factual, and visually expressive slide content for a presentation about "${parsed.topic}".

Title: "${parsed.title}"
${parsed.subtitle ? `Subtitle: "${parsed.subtitle}"` : ""}

Slide headings (in order):
${normalizedHeadings.map((h, i) => `${i + 1}. ${h}`).join("\n")}

CONTENT RULES:
1. Write 3-5 bullet points per slide. Fewer is better — never crowd. Each bullet must contain REAL, FACTUAL content: specific stats, dates, names, and concrete details.
   - BAD: "Key points about Ferrari vs Benz: Current Landscape"
   - GOOD: "Ferrari's 2024 revenue hit €6.4B, up 17% YoY, with the SF-90 XX leading supercar sales"
2. Each bullet must be a complete, informative sentence — not a generic heading or placeholder.
3. First slide = overview/introduction. Last content slide = summary/conclusion.
4. Vary layouts across slides — don't repeat the same layout consecutively.

IMAGE QUERIES (imageSearchQuery):
- Use 2-5 words. Be descriptive and visual.
- BAD: "technology" → GOOD: "glowing blue circuit board close up"
- BAD: "team" → GOOD: "diverse startup team meeting modern office"
- BAD: "red Ferrari" → GOOD: "cinematic red Ferrari F40 on race track"

FRAGMENT STRATEGY (useFragments):
- Set true ONLY where progressive reveal genuinely helps: step-by-step processes, comparisons, before/after, sequential arguments.
- Set false for factual/data-heavy slides where showing everything at once is clearer.
- Do NOT default to true for every slide.

COLOR THEMING (theme):
- Pick colors that CAPTURE THE EMOTIONAL IDENTITY of the topic. Be unexpected and specific.
- DON'T default to blue/tech unless the topic is literally a tech product.
- Examples: cybersecurity → blood-red (#7f1d1d) on near-black; blockchain → gold (#d97706) on obsidian; wellness → sage green (#4d7c0f) on soft cream (#fcfdfa).
- Choose Dark or Light mode based on topic sentiment.
- SUGGEST A GRADIENT (linear-gradient) in customCSS if appropriate.

TYPOGRAPHY (googleFont):
- Pick a font that matches the emotional register of the topic:
  - Luxury, history, editorial → 'Playfair Display' or 'Lora'
  - Tech, SaaS, modern → 'Space Grotesk' or 'DM Sans'
  - Sports, energy, impact → 'Bebas Neue' or 'Oswald'
  - Creative, design, art → 'Syne' or 'Cabinet Grotesk'
  - Academic, science → 'Lora' or 'Source Serif 4'
  - Do NOT always choose Inter.

CUSTOM CSS (customCSS):
- Write 2-5 CSS rules that personalize the deck. Ideas:
  - Custom h2 gradient using the topic's colors
  - Unique bullet marker (\\25BA arrow, ✦ star, — dash…)
  - Background tint on .overlay-box
  - Letter-spacing or text-transform on h1/h2 for personality
- Rules only (no <style> tags). Can be empty string if nothing meaningful to add.

CLOSING SLIDE (closingSlide):
- headline: A bold, topic-specific statement. NOT "Thank You". Think: the most powerful insight or call to action from this topic.
  - BAD: "Thank You", "Questions & Discussion"
  - GOOD (for Ferrari): "The Prancing Horse Never Slows Down"
  - GOOD (for Climate Change): "The Window Is Closing. Act Now."
- subtext: One specific supporting sentence about this topic.
- ctaText (optional): A button label only if there's a natural next step (e.g. "Start Building", "Join the Mission").

ALWAYS keep backgrounds dark (low brightness) so text remains readable.`,
    });

    // Fetch real Unsplash images for each slide
    const imageQueries = generated.slides.map((s) => s.imageSearchQuery);
    const imageResults = await searchUnsplashImages(imageQueries);

    // Build slides with real content and real images
    const slides: PresentationSlide[] = generated.slides.map((s, i) => ({
      title: s.title,
      content: s.bullets.join("\n"),
      layout: s.layout,
      imageKeywords: [s.imageSearchQuery],
      imageCount: s.layout === "image-grid" ? 3 : s.layout === "two-column" ? 2 : 1,
      transition: s.transition,
      unsplashImageUrl: imageResults[i] || undefined,
      useFragments: s.useFragments,
    }));

    // Build color palette from LLM-chosen theme
    const colors = {
      primary: generated.theme.primary,
      secondary: generated.theme.secondary,
      accent: generated.theme.accent,
      bg: generated.theme.bg,
      text: generated.theme.text,
      muted: generated.theme.muted,
      cardBg: `${generated.theme.bg}cc`,
      overlayBg: `${generated.theme.bg}dd`,
    };

    const result = generatePresentationPayload({
      title: parsed.title,
      subtitle: parsed.subtitle,
      topic: parsed.topic,
      slides,
      colorScheme: "custom",
      customColors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
      },
      agentColors: colors,
      unsplashImages: imageResults,
      googleFont: generated.googleFont,
      customCSS: generated.customCSS || undefined,
      closingData: generated.closingSlide
        ? {
            headline: generated.closingSlide.headline,
            subtext: generated.closingSlide.subtext,
            ctaText: generated.closingSlide.ctaText || undefined,
          }
        : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Slides creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: true,
          message: "Invalid request body",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to create presentation",
      },
      { status: 500 }
    );
  }
}
