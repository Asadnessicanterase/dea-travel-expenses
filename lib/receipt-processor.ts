import { supabase } from "./supabase-client";
import { PDFDocument } from "pdf-lib";

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
 * Convert an image buffer to a PDF page
 */
export async function convertImageToPdf(imageBuffer: Buffer, contentType: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    let image;
    if (contentType === "image/jpeg" || contentType === "image/jpg") {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (contentType === "image/png") {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      throw new Error(`Unsupported image type: ${contentType}`);
    }

    // Match page to image size
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("❌ Error converting image to PDF:", error);
    throw error;
  }
}

/**
 * Process a receipt: download from Supabase and convert to PDF if needed
 */
export async function processReceipt(receiptKey: string): Promise<Buffer> {
  try {
    const { buffer, contentType } = await downloadFileAsBuffer(receiptKey);

    // If already a PDF, return directly
    if (contentType === "application/pdf") return buffer;

    // If image, convert it
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
      // Continue with other receipts even if one fails
    }
  }

  return results;
}
