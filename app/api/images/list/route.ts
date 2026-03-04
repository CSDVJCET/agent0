import { list } from "@vercel/blob";

/**
 * Lists all images stored in Vercel Blob under the generated-images/ prefix.
 * Returns proxy URLs so the private blob token never reaches the browser.
 */
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json({ images: [] });
  }

  try {
    const { blobs } = await list({
      prefix: "generated-images/",
      token,
    });

    const images = blobs
      .filter((b) => b.contentType?.startsWith("image/"))
      .map((b) => ({
        url: `/api/images/blob?url=${encodeURIComponent(b.url)}`,
        title: b.pathname.split("/").pop() ?? b.pathname,
      }));

    return Response.json({ images });
  } catch (err) {
    console.error("[images/list] Failed to list blobs:", err);
    return Response.json({ images: [] });
  }
}
