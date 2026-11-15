import JSZip from "jszip";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

export interface GeneratePerformaOptions {
  referenceDate?: Date;
  periodDays?: number;
  templatePath?: string;
  performaType?: 1 | 2;
}

/**
 * Format a Date object to DD-MM-YYYY string
 */
export function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Ensure number is formatted with 92 prefix (e.g. 923XXXXXXXXX) or 15-digit IMEI
 */
export function formatNumberWith92(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 15) return digits;
  if (digits.length === 12 && digits.startsWith("92")) return digits;
  if (digits.length === 11 && digits.startsWith("03")) return "92" + digits.substring(1);
  if (digits.length === 10 && digits.startsWith("3")) return "92" + digits;
  return digits || raw.trim();
}

/**
 * Helper to split array into chunks of given size
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generates a filled DOCX Blob based on /imei PERFORMA.docx template.
 * - Table 0 DATED: Updated to current date (DD-MM-YYYY)
 * - Table 1 S.No: Stays "01" (untouched)
 * - Table 1 Required Information & Period (Dates): Stays untouched
 * - Table 1 Cell Phone Number / IMEI column: Numbers formatted with 92, placed 3 per line in small writing
 */
export async function generateFilledPerformaDocx(
  numbers: string[],
  options: GeneratePerformaOptions = {}
): Promise<Blob> {
  const refDate = options.referenceDate || new Date();
  const currentDateStr = formatDateDDMMYYYY(refDate);

  // 1. Fetch template according to performa type
  const defaultPath = options.performaType === 2 ? "/performa2.docx" : "/performa1.docx";
  const targetPath = options.templatePath || defaultPath;
  let res = await fetch(targetPath);
  if (!res.ok) {
    // Fallback to original names with spaces
    const fallbackPath = options.performaType === 2 ? "/imei PERFORMA copy.docx" : "/imei PERFORMA.docx";
    res = await fetch(fallbackPath);
  }
  if (!res.ok) {
    throw new Error(`Could not load template file ${targetPath}`);
  }
  const arrayBuffer = await res.arrayBuffer();

  // 2. Load zip with JSZip
  const zip = await JSZip.loadAsync(arrayBuffer);
  let docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) {
    throw new Error("Invalid DOCX format: word/document.xml missing");
  }

  // 3. Extract tables
  const tableMatches = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g);
  if (!tableMatches || tableMatches.length < 2) {
    throw new Error("Could not find required tables in document template");
  }

  let table0 = tableMatches[0];
  let table1 = tableMatches[1];

  // 4. Update Table 0 - DATED cell (Row 1, Cell 2)
  const updatedDatedCell = `<w:tc><w:tcPr><w:tcW w:w="3960" w:type="dxa"/></w:tcPr><w:p w14:paraId="343BCDE4" w14:textId="3A066DAE" w:rsidR="000F7A53" w:rsidRDefault="0048137D" w:rsidP="000F7A53"><w:pPr><w:ind w:right="-1170"/><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${currentDateStr}</w:t></w:r></w:p></w:tc>`;
  
  const tbl0Rows = table0.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  if (tbl0Rows && tbl0Rows.length >= 2) {
    let row1 = tbl0Rows[1];
    const row1Cells = row1.match(/<w:tc[\s\S]*?<\/w:tc>/g);
    if (row1Cells && row1Cells.length >= 3) {
      const newRow1 = row1.replace(row1Cells[2], updatedDatedCell);
      table0 = table0.replace(row1, newRow1);
    }
  }

  // 5. Update Table 1:
  // S.No remains 01 untouched.
  // Period column remains untouched.
  // Cell 1 (Cell Phone / IMEI): Format with 92 prefix, 3 numbers per line in small writing (sz=16 / 8pt).
  const formattedNums = numbers.map(formatNumberWith92).filter(Boolean);
  const numberLines = formattedNums.length > 0 ? chunkArray(formattedNums, 3) : [[]];

  const cell1Paragraphs = numberLines.map((line, idx) => {
    const text = line.join(", ");
    return `<w:p w14:paraId="${(0x7B3EA6B3 + idx).toString(16)}" w14:textId="4D757A05" w:rsidR="00090FBE" w:rsidRPr="00C3491E" w:rsidRDefault="00090FBE" w:rsidP="00316D58">` +
      `<w:pPr><w:pStyle w:val="NoSpacing"/><w:rPr><w:rFonts w:cstheme="minorHAnsi"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:b/><w:bCs/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:rPr></w:pPr>` +
      `<w:r><w:rPr><w:rFonts w:cstheme="minorHAnsi"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:b/><w:bCs/></w:rPr><w:t>${text}</w:t></w:r>` +
      `</w:p>`;
  }).join("");

  const updatedCell1 = `<w:tc><w:tcPr><w:tcW w:w="3858" w:type="dxa"/></w:tcPr>${cell1Paragraphs}</w:tc>`;

  const tbl1Rows = table1.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  if (tbl1Rows && tbl1Rows.length >= 2) {
    let row1 = tbl1Rows[1];
    const row1Cells = row1.match(/<w:tc[\s\S]*?<\/w:tc>/g);
    if (row1Cells && row1Cells.length >= 2) {
      const newRow1 = row1.replace(row1Cells[1], updatedCell1);
      table1 = table1.replace(row1, newRow1);
    }
  }

  // 6. Replace tables in docXml
  let updatedDocXml = docXml.replace(tableMatches[0], table0);
  updatedDocXml = updatedDocXml.replace(tableMatches[1], table1);

  zip.file("word/document.xml", updatedDocXml);

  // 7. Generate Blob
  const generatedBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return generatedBlob;
}

/**
 * Trigger download of Blob in browser
 */
export function downloadDocxBlob(blob: Blob, filename: string = "Performa_Document.docx") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Trigger download of PDF Blob in browser
 */
export function downloadPdfBlob(blob: Blob, filename: string = "Performa_Document.pdf") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Generates PDF by converting the actual filled DOCX template to PDF
 * (DOCX → HTML via mammoth → html2canvas → jsPDF)
 * This ensures the PDF looks exactly like the Word performa template.
 */
export async function generateFilledPerformaPdf(
  numbers: string[],
  options: GeneratePerformaOptions = {}
): Promise<Blob> {
  // Step 1: Generate the filled DOCX blob (same as Word download)
  const docxBlob = await generateFilledPerformaDocx(numbers, options);

  // Step 2: Convert DOCX → HTML using mammoth
  const mammoth = await import("mammoth");
  const arrayBuffer = await docxBlob.arrayBuffer();
  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  const html = mammothResult.value;

  // Step 3: Render HTML in a hidden off-screen div
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "width:794px",           // A4 at 96dpi ≈ 794px
    "padding:40px 50px",
    "background:#ffffff",
    "font-family:Arial,sans-serif",
    "font-size:12px",
    "line-height:1.5",
    "color:#000000",
    "box-sizing:border-box",
  ].join(";");

  // Basic table styling so mammoth tables look like Word tables
  container.innerHTML = `
    <style>
      table { border-collapse: collapse; width: 100%; margin: 8px 0; }
      td, th { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
      th { background: #e8e8e8; font-weight: bold; }
      p { margin: 4px 0; }
      strong { font-weight: bold; }
    </style>
    ${html}
  `;
  document.body.appendChild(container);

  // Wait one frame for layout
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Step 4: Capture to canvas via html2canvas
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(container, {
    scale: 2,           // 2x for sharper text
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  // Cleanup hidden div
  document.body.removeChild(container);

  // Step 5: Add canvas image to jsPDF page(s)
  const { jsPDF } = await import("jspdf");
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;

  let yOffset = 0;
  let remaining = imgH;

  // If content spans multiple pages, slice the image across pages
  while (remaining > 0) {
    pdf.addImage(imgData, "JPEG", 0, -yOffset, imgW, imgH);
    remaining -= pageH;
    yOffset += pageH;
    if (remaining > 0) pdf.addPage();
  }

  return pdf.output("blob");
}

/**
 * Native mobile share or web download + email
 */
export async function shareOrAttachPerformaDocx(
  blob: Blob,
  filename: string = "Performa_Document.docx",
  emailSubject: string = "Official Performa Request",
  emailBody: string = ""
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: emailSubject,
          text: emailBody,
          url: savedFile.uri,
          dialogTitle: "Send Performa via Email",
        });
      };
    } catch {
      downloadDocxBlob(blob, filename);
    }
  } else {
    // In Web Browser:
    // Try navigator.share if supported with files
    const file = new File([blob], filename, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: emailSubject,
          text: emailBody,
          files: [file],
        });
        return;
      } catch (e: any) {
        if (e.name === "AbortError") return;
      }
    }

    // Default Web fallback: Download docx file
    downloadDocxBlob(blob, filename);
  }
}
