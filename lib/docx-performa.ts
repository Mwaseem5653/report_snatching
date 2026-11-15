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
 * Generates an official PDF version of the Performa using jsPDF and jspdf-autotable
 */
export async function generateFilledPerformaPdf(
  numbers: string[],
  options: GeneratePerformaOptions = {}
): Promise<Blob> {
  const refDate = options.referenceDate || new Date();
  const currentDateStr = formatDateDDMMYYYY(refDate);

  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = (autoTableModule as any).default || autoTableModule;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TECHNICAL ASSISTANCE REQUEST FORM FOR THE PROVISION DATA", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(8.5);
  doc.text("(SSP KORANGI (DIC BRANCH) E-MAIL I.D: - diclandhi1@gmail.com)", pageWidth / 2, 19, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Request No: ....................", 14, 25);
  doc.text("SP Landhi District Korangi, Karachi", pageWidth - 14, 25, { align: "right" });

  // Table 1: Case Reference / FIR Info
  autoTable(doc, {
    startY: 28,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["FIR NO", "U/S", "DATED"]],
    body: [["CASE REF: CASE NO 1523/2024 PS KORANGI CASE", "", currentDateStr]],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], fontStyle: "bold", textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 35 },
      2: { cellWidth: 47, halign: "center", fontStyle: "bold" },
    },
  });

  // Requirements Heading
  const afterTbl1 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REQUIREMENTS", pageWidth / 2, afterTbl1, { align: "center" });

  // Format Numbers: 3 per line
  const formattedNums = numbers.map(formatNumberWith92).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < formattedNums.length; i += 3) {
    lines.push(formattedNums.slice(i, i + 3).join(", "));
  }
  const numbersText = lines.length > 0 ? lines.join("\n") : "-";

  // Table 2: Requirements Table
  autoTable(doc, {
    startY: afterTbl1 + 2,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["S.No", "Cell Phone Number / IMEI Number", "Required Information", "Period of Information\n(Dates)"]],
    body: [[
      "01",
      numbersText,
      "CDR, Registration Details, IMEI Search,\nNADRA record, Cell Location",
      "FROM 30-11-2025\nTO DATE",
    ]],
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.5, textColor: [0, 0, 0], valign: "middle" },
    headStyles: { fillColor: [240, 240, 240], fontStyle: "bold", textColor: [0, 0, 0], halign: "center" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 85, fontStyle: "bold" },
      2: { cellWidth: 50, halign: "center" },
      3: { cellWidth: 35, halign: "center" },
    },
  });

  // Undertaking Section
  const afterTbl2 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("UNDERTAKING", 14, afterTbl2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const undertakingText = "As a in charge, i am fully aware regarding the sanctity, security and integrity of the requisitioned Cellular Data and would never manipulate misuse and exploit any sort of Cellular Data for the vested interests. Further, I will remain caution & responsible for the safe handling Cellular Data and would not produce the same in any Court of Law as part of Prosecution Proceeding etc. Further, will be remain bound down myself & staff (PS) to obey all the direction and SOP, (If) issued by the worthy DIGP office & IB SPHQ.";
  const splitUndertaking = doc.splitTextToSize(undertakingText, pageWidth - 28);
  doc.text(splitUndertaking, 14, afterTbl2 + 4);

  // Enclosed Documents Checklist
  const afterUndertaking = afterTbl2 + 4 + (splitUndertaking.length * 3.2) + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Following documents must be enclosed with this Performa.", 14, afterUndertaking);

  autoTable(doc, {
    startY: afterUndertaking + 2,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["Attached Document", "Status"]],
    body: [
      ["1- S.S.P Letter &", "Yes (    )  No (    )"],
      ["2- Copy of FIR & UNDERTAKING", "Yes (    )  No (    )"],
      ["3- Current Progress Report / Status of the Case", "Yes (    )  No (    )"],
    ],
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], fontStyle: "bold", textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 52, halign: "center" },
    },
  });

  // Office Use Box
  const afterChecklist = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: afterChecklist,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["FOR OFFICE ONLY USED."]],
    body: [
      ["Name of Incharge: _______________       Signature / Stamp: _______________       Remarks: _______________"],
    ],
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 3, textColor: [0, 0, 0] },
    headStyles: { fillColor: [230, 230, 230], fontStyle: "bold", textColor: [0, 0, 0], halign: "center" },
  });

  return doc.output("blob");
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
