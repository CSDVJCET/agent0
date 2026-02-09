import { PDFDocument } from "pdf-lib";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractBase64Data(dataUrl: string): Uint8Array {
  const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  const base64String = base64Match ? base64Match[1] : dataUrl;
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { file, outputFileName = "compressed.pdf" } = body;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "A PDF file is required for compression" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const originalBytes = extractBase64Data(file);
    const originalSize = originalBytes.length;

    // Load the PDF
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

    // Compression strategy: rebuild the PDF from scratch
    // This strips out unused objects, metadata bloat, and redundant streams
    const compressedPdf = await PDFDocument.create();
    const pages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    pages.forEach((page) => compressedPdf.addPage(page));

    // Save with object-stream compression and without unnecessary metadata
    const compressedBytes = await compressedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedSize = compressedBytes.length;
    const reduction = originalSize > 0
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

    const base64 = Buffer.from(compressedBytes).toString("base64");
    const fileUrl = `data:application/pdf;base64,${base64}`;

    return Response.json({
      fileName: outputFileName,
      fileUrl,
      pageCount: compressedPdf.getPageCount(),
      originalSize: formatFileSize(originalSize),
      compressedSize: formatFileSize(compressedSize),
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      compressionRatio: Math.max(reduction, 0),
    });
  } catch (error) {
    console.error("PDF compress error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to compress PDF" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
