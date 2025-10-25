import { jsPDF } from "jspdf";
import { uploadFile } from "./storage";
import { processMultipleReceipts, ReceiptInfo } from "./receipt-processor";
import { mergePDFs, PDFSection } from "./pdf-merger";
import crypto from "crypto";
import { ALLURA_SUBSET_BASE64 } from "./fonts/allura";

/** Voucher data structure */
interface VoucherData {
  voucherNumber: string;
  employeeName: string;
  employeeEmail: string;
  employeePosition: string;
  eventName: string;
  destination: string;
  travelDates: string;
  accommodationCost: number;
  transportationCost: number;
  mealsCost: number;
  otherCost: number;
  otherDescription?: string;
  totalAmount: number;
  estimatedTotal: number;
  variance: number;
  approverName: string;
  approvalDate: string;
  paymentDate: string;
}

/** Generate tamper detection hash */
function generateVerificationHash(data: VoucherData): string {
  const hashContent = `${data.voucherNumber}|${data.employeeName}|${data.totalAmount}|${data.approverName}|${data.approvalDate}`;
  const hash = crypto.createHash("sha256").update(hashContent).digest("hex");
  return hash.substring(0, 16).toUpperCase();
}

/** Register custom font */
function registerAlluraFont(doc: jsPDF): void {
  doc.addFileToVFS("Allura-Regular.ttf", ALLURA_SUBSET_BASE64);
  doc.addFont("Allura-Regular.ttf", "Allura", "normal");
}

/** Add header (no logo) */
function addHeader(doc: jsPDF, voucherNumber: string, pageWidth: number): number {
  const margin = 20;
  let y = 25;

  doc.setFontSize(20).setFont("helvetica", "bold");
  doc.text("PAYMENT VOUCHER", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(12).setFont("helvetica", "normal");
  doc.text("Digital Euro Association", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(10);
  doc.text(`Voucher Number: ${voucherNumber}`, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  return y + 8;
}

/** Add signatures + verification code */
function addSignaturesToPDF(doc: jsPDF, data: VoucherData, startY: number, pageWidth: number, margin: number): number {
  let y = startY;
  doc.setFontSize(12).setFont("helvetica", "bold").text("Signatures", margin, y);
  y += 12;

  const leftX = margin;
  const rightX = pageWidth / 2 + 10;
  const signatureStartY = y;

  // Submitter
  let submitterY = signatureStartY;
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text("Submitted by:", leftX, submitterY);
  submitterY += 8;
  doc.setFontSize(14).setFont("Allura", "normal");
  doc.text(data.employeeName, leftX, submitterY);
  submitterY += 2;
  doc.setLineWidth(0.3).line(leftX, submitterY, leftX + 60, submitterY);
  submitterY += 5;
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text(data.employeePosition, leftX, submitterY);
  submitterY += 4;
  doc.text(`Date: ${data.approvalDate}`, leftX, submitterY);

  // Approver
  let approverY = signatureStartY;
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text("Approved by:", rightX, approverY);
  approverY += 8;
  doc.setFontSize(14).setFont("Allura", "normal");
  doc.text(data.approverName, rightX, approverY);
  approverY += 2;
  doc.setLineWidth(0.3).line(rightX, approverY, rightX + 60, approverY);
  approverY += 5;
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text("Managing Director", rightX, approverY);
  approverY += 4;
  doc.text(`Date: ${data.approvalDate}`, rightX, approverY);

  y = Math.max(submitterY, approverY) + 10;

  // Verification code
  const verificationHash = generateVerificationHash(data);
  doc.setFontSize(8).setTextColor(100, 100, 100);
  doc.text(`Verification Code: VER-${verificationHash}`, pageWidth / 2, y, { align: "center" });
  return y + 8;
}

/** Create base voucher PDF */
export async function generatePaymentVoucherPDF(data: VoucherData): Promise<string> {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    registerAlluraFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = addHeader(doc, data.voucherNumber, pageWidth);

    // --- EMPLOYEE INFORMATION ---
    doc.setFontSize(14).setFont("helvetica", "bold").text("Employee Information", margin, y);
    y += 7;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(`Name: ${data.employeeName}`, margin, y);
    y += 5;
    doc.text(`Position: ${data.employeePosition}`, margin, y);
    y += 5;
    doc.text(`Email: ${data.employeeEmail}`, margin, y);
    y += 10;

    // --- TRAVEL DETAILS ---
    doc.setFontSize(14).setFont("helvetica", "bold").text("Travel Details", margin, y);
    y += 7;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(`Event: ${data.eventName}`, margin, y);
    y += 5;
    doc.text(`Destination: ${data.destination}`, margin, y);
    y += 5;
    doc.text(`Travel Period: ${data.travelDates}`, margin, y);
    y += 10;

    // --- EXPENSE BREAKDOWN ---
    doc.setFontSize(14).setFont("helvetica", "bold").text("Expense Breakdown", margin, y);
    y += 7;
    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("Category", margin, y);
    doc.text("Amount (€)", pageWidth - margin - 30, y);
    y += 3;
    doc.setLineWidth(0.3).line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    if (data.accommodationCost > 0) {
      doc.text("Accommodation", margin, y);
      doc.text(`€${data.accommodationCost.toFixed(2)}`, pageWidth - margin - 30, y);
      y += 5;
    }
    if (data.transportationCost > 0) {
      doc.text("Transportation", margin, y);
      doc.text(`€${data.transportationCost.toFixed(2)}`, pageWidth - margin - 30, y);
      y += 5;
    }
    if (data.mealsCost > 0) {
      doc.text("Meals & Per Diem", margin, y);
      doc.text(`€${data.mealsCost.toFixed(2)}`, pageWidth - margin - 30, y);
      y += 5;
    }
    if (data.otherCost > 0) {
      const otherLabel = data.otherDescription ? `Other (${data.otherDescription})` : "Other Expenses";
      doc.text(otherLabel, margin, y);
      doc.text(`€${data.otherCost.toFixed(2)}`, pageWidth - margin - 30, y);
      y += 5;
    }

    // Total line
    y += 2;
    doc.setLineWidth(0.3).line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT", margin, y);
    doc.text(`€${data.totalAmount.toFixed(2)}`, pageWidth - margin - 30, y);
    y += 10;

    // --- BUDGET COMPARISON ---
    doc.setFontSize(14).setFont("helvetica", "bold").text("Budget Comparison", margin, y);
    y += 7;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(`Estimated Budget: €${data.estimatedTotal.toFixed(2)}`, margin, y);
    y += 5;
    doc.text(`Actual Expense: €${data.totalAmount.toFixed(2)}`, margin, y);
    y += 5;
    const varianceSign = data.variance > 0 ? "+" : "";
    const varianceText = `Variance: ${varianceSign}€${data.variance.toFixed(2)} (${(
      (data.variance / data.estimatedTotal) *
      100
    ).toFixed(1)}%)`;
    if (data.variance > 0) doc.setTextColor(255, 0, 0);
    else doc.setTextColor(0, 128, 0);
    doc.text(varianceText, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    // --- APPROVAL INFORMATION ---
    doc.setFontSize(14).setFont("helvetica", "bold").text("Approval Information", margin, y);
    y += 7;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(`Approved By: ${data.approverName}`, margin, y);
    y += 5;
    doc.text(`Approval Date: ${data.approvalDate}`, margin, y);
    y += 15;

    // --- SIGNATURES ---
    y = addSignaturesToPDF(doc, data, y, pageWidth, margin);

    // --- FOOTER ---
    doc.setFontSize(8).setTextColor(128, 128, 128);
    doc.text(
      "This is an automatically generated payment voucher. For any discrepancies, please contact the finance department.",
      pageWidth / 2,
      y,
      { align: "center", maxWidth: pageWidth - 2 * margin }
    );

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const fileName = `voucher-${data.voucherNumber}.pdf`;
    const filePath = await uploadFile(pdfBuffer, fileName);
    return filePath;
  } catch (error) {
    console.error("❌ Error generating voucher:", error);
    throw error;
  }
}

/** Generate voucher with attached receipts */
export async function generatePaymentVoucherWithReceipts(
  data: VoucherData,
  receipts: { accommodationReceipt?: string; transportationReceipt?: string; otherReceipt?: string }
): Promise<string> {
  try {
    console.log("🚀 Generating main voucher PDF...");
    const voucherPath = await generatePaymentVoucherPDF(data);

    const { supabase } = await import("./supabase-client");
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "files";
    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucketName).download(voucherPath);

    if (downloadError || !downloadData) throw new Error(`Failed to download base voucher PDF: ${downloadError?.message}`);

    const arrayBuffer = await downloadData.arrayBuffer();
    const voucherBuffer = Buffer.from(arrayBuffer);

    const receiptsToProcess: ReceiptInfo[] = [];
    if (receipts.accommodationReceipt) receiptsToProcess.push({ type: "accommodation", key: receipts.accommodationReceipt });
    if (receipts.transportationReceipt) receiptsToProcess.push({ type: "transportation", key: receipts.transportationReceipt });
    if (receipts.otherReceipt) receiptsToProcess.push({ type: "other", key: receipts.otherReceipt });

    if (receiptsToProcess.length === 0) return voucherPath;

    const processedReceipts = await processMultipleReceipts(receiptsToProcess);
    if (processedReceipts.length === 0) return voucherPath;

    const sections: PDFSection[] = [{ title: "Payment Voucher", pdfBuffer: voucherBuffer }];
    for (const receipt of processedReceipts) {
      const title = `${receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)} Receipt`;
      sections.push({ title, pdfBuffer: receipt.buffer });
    }

    const mergedBuffer = await mergePDFs(sections, { addSeparators: true, addPageNumbers: true });
    const mergedFileName = `voucher-${data.voucherNumber}.pdf`;
    const mergedPath = await uploadFile(mergedBuffer, mergedFileName);

    console.log(`✅ Successfully created merged voucher with receipts: ${mergedPath}`);
    return mergedPath;
  } catch (error) {
    console.error("❌ Error in generatePaymentVoucherWithReceipts:", error);
    throw error;
  }
}
