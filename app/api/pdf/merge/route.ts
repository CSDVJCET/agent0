import { PDFDocument } from "pdf-lib";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractBase64Data(dataUrl: string): Uint8Array {
  // Handle both data URLs and raw base64
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
    const { files, outputFileName = "merged.pdf" } = body;

    if (!files || !Array.isArray(files) || files.length < 2) {
      return new Response(
        JSON.stringify({ error: "At least 2 PDF files are required for merging" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      try {
        const pdfBytes = extractBase64Data(files[i]);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (pageError) {
        return new Response(
          JSON.stringify({ error: `Failed to process PDF file ${i + 1}: ${pageError instanceof Error ? pageError.message : "Invalid PDF"}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const mergedBytes = await mergedPdf.save();
    const base64 = Buffer.from(mergedBytes).toString("base64");
    const fileUrl = `data:application/pdf;base64,${base64}`;

    return Response.json({
      fileName: outputFileName,
      fileUrl,
      pageCount: mergedPdf.getPageCount(),
      fileSize: formatFileSize(mergedBytes.length),
      fileSizeBytes: mergedBytes.length,
    });
  } catch (error) {
    console.error("PDF merge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to merge PDFs" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
