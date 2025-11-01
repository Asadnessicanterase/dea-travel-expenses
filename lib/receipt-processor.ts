import { supabase } from "./supabase-client";
import { PDFDocument, degrees } from "pdf-lib";

/**
 * Download a file from Supabase Storage as a Buffer
 */
export async function downloadFileAsBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "files";

    const { data, error } = await supabase.storage.from(bucketName).download(key);
    if (error || !data) {
      throw new Error(`Failed to download file from Supabase: ${error?.message}`);
    }

    // Read file into buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Infer content type from file extension
    let contentType = data.type || "application/octet-stream";
    if (!contentType || contentType === "application/octet-stream") {
      const lowerKey = key.toLowerCase();
      if (lowerKey.endsWith(".pdf")) contentType = "application/pdf";
      else if (lowerKey.match(/\.(jpg|jpeg)$/)) contentType = "image/jpeg";
      else if (lowerKey.endsWith(".png")) contentType = "image/png";
    }

    return { buffer, contentType };
  } catch (error) {
    console.error(`❌ Error downloading file from Supabase (key: ${key}):`, error);
    throw error;
  }
}

/**
 * Convert an image buffer to a properly sized A4 PDF page
 * with 10 mm margins, automatic rotation, and preserved aspect ratio.
 */
export async function convertImageToPdf(imageBuffer: Buffer, contentType: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    let image;
    if (contentType === "image/jpeg" || contentType === "image/jpg") {
      image = await pdfDoc.embedJpg(Uint8Array.from(imageBuffer));
    } else if (contentType === "image/png") {
      image = await pdfDoc.embedPng(Uint8Array.from(imageBuffer));
    } else {
      throw new Error(`Unsupported image type: ${contentType}`);
    }

    // A4 page size in points (1 pt = 1/72 inch)
    const A4_WIDTH = 595.28;  // 210 mm
    const A4_HEIGHT = 841.89; // 297 mm
    const MARGIN = 28.35;     // ≈ 10 mm

    const usableWidth = A4_WIDTH - MARGIN * 2;
    const usableHeight = A4_HEIGHT - MARGIN * 2;

    // Original image size
    const { width, height } = image.scale(1);

    // Auto-rotate landscape images
    let rotated = false;
    let displayWidth = width;
    let displayHeight = height;
    if (width > height) {
      rotated = true;
      [displayWidth, displayHeight] = [height, width];
    }

    // Scale to fit usable area
    const widthScale = usableWidth / displayWidth;
    const heightScale = usableHeight / displayHeight;
    const scale = Math.min(widthScale, heightScale);

    const finalWidth = displayWidth * scale;
    const finalHeight = displayHeight * scale;

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const x = (A4_WIDTH - finalWidth) / 2;
    const y = (A4_HEIGHT - finalHeight) / 2;

    // Apply rotation using pdf-lib helper
    page.drawImage(image, {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
      rotate: rotated ? degrees(90) : undefined,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("❌ Error converting image to PDF:", error);
    throw error;
  }
}

/**
 * Process a single receipt: download from Supabase and convert to PDF if needed
 */
export async function processReceipt(receiptKey: string): Promise<Buffer> {
  try {
    const { buffer, contentType } = await downloadFileAsBuffer(receiptKey);

    // Already a PDF → return as is
    if (contentType === "application/pdf") return buffer;

    // Image → convert
    if (contentType.startsWith("image/")) return await convertImageToPdf(buffer, contentType);

    throw new Error(`Unsupported file type: ${contentType}`);
  } catch (error) {
    console.error(`❌ Error processing receipt (key: ${receiptKey}):`, error);
    throw error;
  }
}

/**
 * Process multiple receipts from a claim
 */
export interface ReceiptInfo {
  type: "accommodation" | "transportation" | "other";
  key: string;
}

export async function processMultipleReceipts(
  receipts: ReceiptInfo[]
): Promise<Array<{ type: string; buffer: Buffer }>> {
  const results: Array<{ type: string; buffer: Buffer }> = [];

  for (const receipt of receipts) {
    try {
      const buffer = await processReceipt(receipt.key);
      results.push({ type: receipt.type, buffer });
    } catch (error) {
      console.error(`⚠️ Failed to process ${receipt.type} receipt:`, error);
      // Continue even if one fails
    }
  }

  return results;
}
