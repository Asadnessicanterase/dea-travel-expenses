import { simpleMergePDFs } from "./pdf-merger";
import { downloadFileAsBuffer, convertImageToPdf } from "./receipt-processor";
import { uploadFile } from "./storage";

/**
 * Check if a file path represents an image based on extension
 */
function isImageFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return (
    lowerPath.endsWith('.jpg') ||
    lowerPath.endsWith('.jpeg') ||
    lowerPath.endsWith('.png') ||
    lowerPath.endsWith('.webp')
  );
}

/**
 * Merge multiple receipts (images and PDFs) into a single PDF
 * @param receiptPaths - Array of file paths in Supabase storage
 * @param categoryName - Name of the category for the merged filename
 * @param claimId - Expense claim ID for the merged filename
 * @returns Path to the merged PDF in Supabase storage
 */
export async function mergeReceiptsToSinglePdf(
  receiptPaths: string[],
  categoryName: string,
  claimId: string
): Promise<string> {
  try {
    console.log(`🔄 Merging ${receiptPaths.length} receipts for category: ${categoryName}`);

    // If only one receipt, no need to merge
    if (receiptPaths.length === 1) {
      console.log(`✅ Only one receipt, no merge needed`);
      return receiptPaths[0];
    }

    // Download and convert all receipts to PDF buffers
    const pdfBuffers: Buffer[] = [];

    for (const receiptPath of receiptPaths) {
      try {
        const { buffer, contentType } = await downloadFileAsBuffer(receiptPath);

        // If it's an image, convert to PDF first
        if (isImageFile(receiptPath) || contentType.startsWith('image/')) {
          console.log(`📄 Converting image to PDF: ${receiptPath}`);
          const pdfBuffer = await convertImageToPdf(buffer, contentType);
          pdfBuffers.push(pdfBuffer);
        } else if (contentType === 'application/pdf') {
          console.log(`📄 Adding PDF: ${receiptPath}`);
          pdfBuffers.push(buffer);
        } else {
          console.warn(`⚠️ Skipping unsupported file type: ${contentType} for ${receiptPath}`);
        }
      } catch (error) {
        console.error(`❌ Error processing receipt ${receiptPath}:`, error);
        // Continue with other receipts even if one fails
      }
    }

    if (pdfBuffers.length === 0) {
      throw new Error(`No valid receipts found to merge for category: ${categoryName}`);
    }

    // Merge all PDF buffers into a single PDF
    console.log(`🔗 Merging ${pdfBuffers.length} PDFs...`);
    const mergedPdfBuffer = await simpleMergePDFs(pdfBuffers);

    // Generate filename for merged PDF
    const timestamp = Date.now();
    const mergedFileName = `expense-claim-${claimId}-${categoryName}-merged-${timestamp}.pdf`;

    // Upload merged PDF to Supabase
    console.log(`⬆️ Uploading merged PDF: ${mergedFileName}`);
    const mergedFilePath = await uploadFile(mergedPdfBuffer, mergedFileName);

    console.log(`✅ Successfully merged receipts for ${categoryName}: ${mergedFilePath}`);
    return mergedFilePath;
  } catch (error) {
    console.error(`❌ Error merging receipts for category ${categoryName}:`, error);
    throw error;
  }
}

/**
 * Process and merge receipts for a category if there are multiple files
 * @param receiptPaths - Array of receipt file paths
 * @param categoryName - Name of the category (accommodation, transportation, other)
 * @param claimId - Expense claim ID
 * @returns Array with single merged file path, or original array if only one file
 */
export async function processCategoryReceipts(
  receiptPaths: string[],
  categoryName: string,
  claimId: string
): Promise<string[]> {
  try {
    // If no receipts or only one receipt, return as-is
    if (receiptPaths.length <= 1) {
      return receiptPaths;
    }

    // Merge multiple receipts into one PDF
    const mergedFilePath = await mergeReceiptsToSinglePdf(
      receiptPaths,
      categoryName,
      claimId
    );

    // Return array with single merged file
    return [mergedFilePath];
  } catch (error) {
    console.error(`❌ Error processing category receipts for ${categoryName}:`, error);
    // On error, return original paths to avoid data loss
    console.warn(`⚠️ Returning original receipt paths due to merge error`);
    return receiptPaths;
  }
}
