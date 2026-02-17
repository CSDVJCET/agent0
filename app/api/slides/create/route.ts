import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSlidesFromHeadings, generatePresentationPayload } from "@/ai/slides-tools";

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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSlidesSchema.parse(body);

    const normalizedHeadings = parsed.headings.slice(0, parsed.slideCount);
    while (normalizedHeadings.length < parsed.slideCount) {
      normalizedHeadings.push(`${parsed.topic} — Slide ${normalizedHeadings.length + 1}`);
    }

    const slides = buildSlidesFromHeadings(normalizedHeadings, parsed.topic);

    const result = generatePresentationPayload({
      title: parsed.title,
      subtitle: parsed.subtitle,
      topic: parsed.topic,
      slides,
      colorScheme: parsed.colorScheme,
      customColors: parsed.customColors,
    });

    return NextResponse.json(result);
  } catch (error) {
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
