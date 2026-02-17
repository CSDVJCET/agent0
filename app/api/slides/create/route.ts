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
        .describe("2-5 bullet points with REAL facts, stats, or concrete information. Each bullet should be one concise sentence with actual content, not generic filler."),
      layout: z
        .enum(["text-image-split", "full-image-overlay", "two-column", "text-only", "image-grid"])
        .describe("Choose the best layout for this slide's content"),
      imageSearchQuery: z
        .string()
        .describe("A specific 2-4 word Unsplash search query that will find a highly relevant image for THIS slide's content. Be specific — e.g. 'red Ferrari F40' not 'car'."),
      transition: z
        .enum(["slide", "zoom", "convex", "fade"])
        .describe("Slide transition effect"),
    })
  ),
  theme: z.object({
    primary: z.string().describe("Primary color hex (e.g. #dc2626). Should match the topic's vibe — red for Ferrari, pink for Valentine's, green for nature, etc."),
    secondary: z.string().describe("Secondary color hex that complements the primary"),
    accent: z.string().describe("Accent color hex for highlights and bullets"),
    bg: z.string().describe("Dark background color hex (keep dark for readability, e.g. #0f0f15)"),
    text: z.string().describe("Light text color hex (keep light for contrast, e.g. #f1f5f9)"),
    muted: z.string().describe("Muted text color hex for captions and secondary text"),
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
    let modelInstance: any;
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
      prompt: `You are a presentation content expert. Create detailed, factual slide content for a presentation about "${parsed.topic}".

Title: "${parsed.title}"
${parsed.subtitle ? `Subtitle: "${parsed.subtitle}"` : ""}

Slide headings (in order):
${normalizedHeadings.map((h, i) => `${i + 1}. ${h}`).join("\n")}

CRITICAL RULES:
1. Write EXACTLY 2-5 bullet points per slide (not more, not less). Each bullet should be REAL, FACTUAL content with specific stats, facts, dates, names, and concrete details.
   - BAD: "Key points about Ferrari vs Benz: Current Landscape"
   - GOOD: "Ferrari's 2024 revenue hit €6.4B, up 17% YoY, with the SF-90 XX leading supercar sales"
2. Each bullet should be a complete, informative sentence (not a generic heading or placeholder).
3. For the imageSearchQuery, write specific queries that will match real photos on Unsplash. Be concrete:
   - BAD: "cars background" 
   - GOOD: "Ferrari 488 red sports car"
   - BAD: "technology"
   - GOOD: "circuit board macro photography"
4. Choose a color theme that MATCHES the topic's identity/vibe:
   - Ferrari → red primary (#dc2626), dark bg
   - Valentine's Day → pink (#ec4899), rose tones
   - Nature/Environment → green (#22c55e)
   - Ocean/Marine → cyan/teal (#06b6d4)
   - Finance → deep blue (#1e40af)
   - Technology → electric blue (#3b82f6) or purple
   - Food/Cooking → warm amber (#f59e0b)
   - Be creative for other topics — pick colors that evoke the subject
5. Vary layouts across slides — don't use the same layout for every slide.
6. First slide should be an overview/introduction, last slide should be a summary/conclusion.
7. ALWAYS use dark background colors (low brightness) so text stays readable.`,
    });

    // Fetch real Unsplash images for each slide
    const imageQueries = generated.slides.map((s) => s.imageSearchQuery);
    const imageResults = await searchUnsplashImages(imageQueries, parsed.topic);

    // Build slides with real content and real images
    const slides: PresentationSlide[] = generated.slides.map((s, i) => ({
      title: s.title,
      content: s.bullets.join("\n"),
      layout: s.layout,
      imageKeywords: [s.imageSearchQuery],
      imageCount: s.layout === "image-grid" ? 3 : s.layout === "two-column" ? 2 : 1,
      transition: s.transition,
      unsplashImageUrl: imageResults[i] || undefined,
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
