import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

// ---------------------------------------------------------------------------
// Extension sets
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "tif", "avif", "svg", "ico",
]);

const TEXT_EXTENSIONS = new Set(["txt", "csv", "tsv", "html", "htm", "md"]);

// ---------------------------------------------------------------------------
// Normalization & mapping helpers
// ---------------------------------------------------------------------------

function normalizeExt(ext: string): string {
  if (ext === "jpeg") return "jpg";
  if (ext === "tif") return "tiff";
  if (ext === "htm") return "html";
  return ext;
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/gif": "gif",
    "image/tiff": "tiff",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/tab-separated-values": "tsv",
    "text/html": "html",
    "text/markdown": "md",
  };
  return map[mime] || "";
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    bmp: "image/bmp",
    gif: "image/gif",
    tiff: "image/tiff",
    tif: "image/tiff",
    avif: "image/avif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    txt: "text/plain",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    html: "text/html",
    htm: "text/html",
    md: "text/markdown",
  };
  return map[ext] || "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function extractBase64(dataUrl: string): { bytes: Buffer; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  return { bytes: Buffer.from(match[2], "base64"), mime: match[1] };
}

function toDataUrl(buffer: Buffer | Uint8Array, mime: string): string {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Local image → image conversion via sharp
// ---------------------------------------------------------------------------

async function convertImageLocal(
  inputBytes: Buffer,
  fromExt: string,
  toExt: string,
): Promise<Buffer> {
  const from = normalizeExt(fromExt);
  const to = normalizeExt(toExt);

  if (to === "ico") {
    return sharp(inputBytes)
      .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  if (to === "svg") {
    if (from === "svg") return inputBytes;
    throw new Error("Converting raster images to SVG is not supported. SVG is a vector format.");
  }

  let pipeline = sharp(inputBytes);

  switch (to) {
    case "png":
      pipeline = pipeline.png();
      break;
    case "jpg":
      pipeline = pipeline.jpeg({ quality: 90 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 90 });
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
    case "tiff":
      pipeline = pipeline.tiff();
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: 80 });
      break;
    case "bmp":
      pipeline = pipeline.raw();
      break;
    default:
      pipeline = pipeline.png();
  }

  return pipeline.toBuffer();
}

// ---------------------------------------------------------------------------
// Local image → PDF via pdf-lib (PNG and JPG only)
// ---------------------------------------------------------------------------

async function imageToPdfLocal(inputBytes: Buffer, fromExt: string): Promise<Buffer> {
  const from = normalizeExt(fromExt);

  // Convert to PNG or JPG via sharp for pdf-lib compatibility
  let imageBytes: Uint8Array;
  let isPng: boolean;

  if (from === "jpg") {
    imageBytes = new Uint8Array(inputBytes);
    isPng = false;
  } else {
    // Convert anything else to PNG first
    const pngBuf = await sharp(inputBytes).png().toBuffer();
    imageBytes = new Uint8Array(pngBuf);
    isPng = true;
  }

  const pdfDoc = await PDFDocument.create();
  const image = isPng
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  // A4 page, center the image scaled to fit
  const pageW = 595.28;
  const pageH = 841.89;
  const scale = Math.min(pageW / image.width, pageH / image.height, 1);
  const imgW = image.width * scale;
  const imgH = image.height * scale;
  const x = (pageW - imgW) / 2;
  const y = (pageH - imgH) / 2;

  const page = pdfDoc.addPage([pageW, pageH]);
  page.drawImage(image, { x, y, width: imgW, height: imgH });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ---------------------------------------------------------------------------
// ConvertAPI conversion (for all non-local conversions)
// ---------------------------------------------------------------------------

async function convertViaApi(
  inputBytes: Buffer,
  fromExt: string,
  toExt: string,
  fileName: string,
): Promise<{ files: Array<{ fileName: string; data: Buffer; mime: string }> }> {
  const secret = process.env.CONVERT_API_SECRET;
  if (!secret) {
    throw new Error("CONVERT_API_SECRET is not configured. Add it to your .env file.");
  }

  const from = normalizeExt(fromExt);
  const to = normalizeExt(toExt);

  const url = `https://v2.convertapi.com/convert/${from}/to/${to}?Secret=${encodeURIComponent(secret)}`;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(inputBytes)], { type: extToMime(from) });
  formData.append("File", blob, fileName);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`ConvertAPI error (${response.status}): ${errText}`);
  }

  const result = await response.json();

  if (!result.Files || result.Files.length === 0) {
    throw new Error("ConvertAPI returned no output files");
  }

  const files = result.Files.map((f: { FileName: string; FileData: string }) => ({
    fileName: f.FileName,
    data: Buffer.from(f.FileData, "base64"),
    mime: extToMime(to),
  }));

  return { files };
}

// ---------------------------------------------------------------------------
// Text ↔ Text conversion (local, free)
// ---------------------------------------------------------------------------

function convertTextLocal(inputBytes: Buffer, fromExt: string, toExt: string): Buffer {
  const from = normalizeExt(fromExt);
  const to = normalizeExt(toExt);
  const text = inputBytes.toString("utf-8");

  if (to === "txt") {
    if (from === "html") {
      return Buffer.from(text.replace(/<[^>]*>/g, "").trim());
    }
    return Buffer.from(text);
  }

  if (to === "html") {
    if (from === "md") {
      const html = text
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>\n");
      return Buffer.from(`<!DOCTYPE html><html><body>${html}</body></html>`);
    }
    if (from === "csv" || from === "tsv") {
      const sep = from === "csv" ? "," : "\t";
      const rows = text.trim().split("\n").map((r) => r.split(sep));
      let table = "<table border='1'>";
      rows.forEach((row, i) => {
        const tag = i === 0 ? "th" : "td";
        table += "<tr>" + row.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join("") + "</tr>";
      });
      table += "</table>";
      return Buffer.from(`<!DOCTYPE html><html><body>${table}</body></html>`);
    }
    return Buffer.from(`<!DOCTYPE html><html><body><pre>${escapeHtml(text)}</pre></body></html>`);
  }

  if (to === "md") {
    if (from === "html") {
      return Buffer.from(
        text
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
          .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
          .replace(/<em>(.*?)<\/em>/gi, "*$1*")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .trim()
      );
    }
    return Buffer.from(text);
  }

  if (to === "csv") {
    if (from === "tsv") {
      return Buffer.from(
        text.split("\n").map((line) =>
          line.split("\t").map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        ).join("\n")
      );
    }
    return Buffer.from(text);
  }

  if (to === "tsv") {
    if (from === "csv") {
      return Buffer.from(
        text.split("\n").map((line) => {
          const cells: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === "," && !inQuotes) { cells.push(current); current = ""; continue; }
            current += ch;
          }
          cells.push(current);
          return cells.join("\t");
        }).join("\n")
      );
    }
    return Buffer.from(text);
  }

  return Buffer.from(text);
}

// ---------------------------------------------------------------------------
// Decide what can be done locally (free) vs needs ConvertAPI
// ---------------------------------------------------------------------------

function canDoLocally(fromExt: string, toExt: string): "image" | "image-pdf" | "text" | false {
  const from = normalizeExt(fromExt);
  const to = normalizeExt(toExt);

  // Image → Image (sharp)
  if (IMAGE_EXTENSIONS.has(from) && IMAGE_EXTENSIONS.has(to)) {
    if (to === "svg" && from !== "svg") return false;
    return "image";
  }

  // Image → PDF (pdf-lib) — PNG/JPG directly, others via sharp→PNG first
  if (IMAGE_EXTENSIONS.has(from) && to === "pdf") {
    if (from === "png" || from === "jpg") return "image-pdf";
    // Other image formats: convert to PNG via sharp first, then embed in PDF
    return "image-pdf";
  }

  // Text ↔ Text
  if (TEXT_EXTENSIONS.has(from) && TEXT_EXTENSIONS.has(to)) return "text";

  return false;
}

// ---------------------------------------------------------------------------
// POST /api/convert
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file, targetFormat, fileName } = body as {
      file: string;
      targetFormat: string;
      fileName?: string;
    };

    if (!file || !targetFormat) {
      return NextResponse.json(
        { error: "Missing 'file' (data URL) or 'targetFormat'" },
        { status: 400 }
      );
    }

    const { bytes: inputBytes, mime: inputMime } = extractBase64(file);
    const fromExt = normalizeExt(
      mimeToExt(inputMime) || (fileName?.split(".").pop()?.toLowerCase() || "")
    );
    const toExt = normalizeExt(targetFormat.toLowerCase().replace(".", ""));

    if (!fromExt) {
      return NextResponse.json(
        { error: `Unsupported input format: ${inputMime}` },
        { status: 400 }
      );
    }

    if (fromExt === toExt) {
      return NextResponse.json(
        { error: `File is already in ${toExt.toUpperCase()} format` },
        { status: 400 }
      );
    }

    const originalName = fileName || `file.${fromExt}`;
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const outputFileName = `${baseName}.${toExt}`;

    let resultFiles: Array<{ fileName: string; dataUrl: string; size: string; sizeBytes: number }>;

    const localType = canDoLocally(fromExt, toExt);

    if (localType) {
      let outputBuffer: Buffer;

      if (localType === "image") {
        outputBuffer = await convertImageLocal(inputBytes, fromExt, toExt);
      } else if (localType === "image-pdf") {
        outputBuffer = await imageToPdfLocal(inputBytes, fromExt);
      } else {
        outputBuffer = convertTextLocal(inputBytes, fromExt, toExt);
      }

      const outMime = localType === "image" && toExt === "ico"
        ? "image/png"
        : localType === "image" && toExt === "bmp"
          ? "image/png" // sharp raw→BMP fallback outputs PNG
          : extToMime(toExt);

      resultFiles = [
        {
          fileName: outputFileName,
          dataUrl: toDataUrl(outputBuffer, outMime),
          size: formatSize(outputBuffer.length),
          sizeBytes: outputBuffer.length,
        },
      ];
    } else {
      // ConvertAPI handles everything else:
      // Image → DOCX/PPTX, PDF → DOCX/PNG/JPG/PPTX, DOC/DOCX → PDF/PNG/JPG/PPTX,
      // XLSX/XLS → PDF, PPTX/PPT → PDF, WEBP/BMP/GIF/TIFF/AVIF → PDF (quality)
      const apiResult = await convertViaApi(inputBytes, fromExt, toExt, originalName);
      resultFiles = apiResult.files.map((f) => ({
        fileName: f.fileName,
        dataUrl: toDataUrl(f.data, f.mime),
        size: formatSize(f.data.length),
        sizeBytes: f.data.length,
      }));
    }

    return NextResponse.json({
      success: true,
      fromFormat: fromExt.toUpperCase(),
      toFormat: toExt.toUpperCase(),
      originalFileName: originalName,
      originalSize: formatSize(inputBytes.length),
      files: resultFiles,
    });
  } catch (error) {
    console.error("[convert] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed" },
      { status: 500 }
    );
  }
}
