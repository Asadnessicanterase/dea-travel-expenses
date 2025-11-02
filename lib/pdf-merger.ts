
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PDFSection {
  title: string;
  pdfBuffer: Buffer;
}

/**
 * Merge multiple PDFs into a single document with optional separator pages
 */
export async function mergePDFs(sections: PDFSection[], options?: {
  addSeparators?: boolean;
  addPageNumbers?: boolean;
}): Promise<Buffer> {
  try {
    const { addSeparators = true, addPageNumbers = true } = options || {};
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Embed font for separator pages and page numbers
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    
    let pageNumber = 1;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Add separator page (except before the first section)
      if (addSeparators && i > 0) {
        const separatorPage = mergedPdf.addPage([595, 842]); // A4 size
        const { width, height } = separatorPage.getSize();
        
        // Draw section title
        separatorPage.drawText(section.title, {
          x: 50,
          y: height - 100,
          size: 24,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        
        // Draw decorative line
        separatorPage.drawLine({
          start: { x: 50, y: height - 120 },
          end: { x: width - 50, y: height - 120 },
          thickness: 2,
          color: rgb(0.8, 0.8, 0.8),
        });
        
        if (addPageNumbers) {
          separatorPage.drawText(`Page ${pageNumber}`, {
            x: width / 2 - 30,
            y: 30,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        pageNumber++;
      }
      
      // Load the section PDF
      let sectionPdf;
      try {
        sectionPdf = await PDFDocument.load(new Uint8Array(section.pdfBuffer));
      } catch (error) {
        console.error(`Error loading PDF section "${section.title}":`, error);
        continue; // Skip this section if it can't be loaded
      }
      
      // Copy all pages from the section PDF
      const copiedPages = await mergedPdf.copyPages(sectionPdf, sectionPdf.getPageIndices());
      
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
        
        // Add page number
        if (addPageNumbers) {
          const { width } = page.getSize();
          page.drawText(`Page ${pageNumber}`, {
            x: width / 2 - 30,
            y: 30,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        pageNumber++;
      }
    }
    
    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
}

/**
 * Simple merge without separators or page numbers (faster)
 */
export async function simpleMergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  try {
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfBuffer of pdfBuffers) {
      try {
        const pdf = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        console.error('Error loading PDF buffer:', error);
        // Continue with other PDFs
      }
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    console.error('Error in simple PDF merge:', error);
    throw error;
  }
}
