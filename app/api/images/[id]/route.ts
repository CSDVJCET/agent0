import { getGeneratedImage } from "@/lib/image-store";

function getExtension(mediaType: string): string {
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  return "bin";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const image = getGeneratedImage(id);

  if (!image) {
    return new Response("Image not found or expired", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const shouldDownload = searchParams.get("download") === "1";
  const extension = getExtension(image.mediaType);

  return new Response(Buffer.from(image.bytes), {
    headers: {
      "Content-Type": image.mediaType,
      // Immutable within TTL — safe to cache since content is UUID-keyed
      "Cache-Control": "public, max-age=3600, immutable",
      ...(shouldDownload
        ? {
            "Content-Disposition": `attachment; filename=generated-${id}.${extension}`,
          }
        : {}),
    },
  });
}
