export type CdrDurationPreset = "3m" | "6m" | "9m" | "1y" | "custom";

export interface CdrDurationOption {
  key: CdrDurationPreset;
  label: string;
  defaultDays: number;
}

export const CDR_DURATION_PRESETS: CdrDurationOption[] = [
  { key: "3m", label: "3 Months", defaultDays: 90 },
  { key: "6m", label: "6 Months", defaultDays: 170 },
  { key: "9m", label: "9 Months", defaultDays: 270 },
  { key: "1y", label: "1 Year", defaultDays: 360 },
  { key: "custom", label: "Custom Days", defaultDays: 170 },
];

export interface CdrTemplateConfig {
  id: string;
  name: string;
  category: "cdr" | "idp" | "loc" | "imei";
  file?: string;
  operatorKey: "Jazz" | "Telenor" | "Zong" | "Ufone" | "All" | string;
  type: "msisdn" | "imei" | "custom";
  defaultDays?: number;
  description?: string;
  generate: (input: string | string[], options?: CdrFormatOptions) => CdrGeneratedResult;
}

export interface CdrFormatOptions {
  referenceDate?: Date;
  customDays?: number;
  durationLabel?: string;
  authorNote?: string;
}

export interface CdrGeneratedResult {
  html: string;
  text: string;
  items: string[];
  totalCount: number;
  formattedDateRange?: {
    current: string;
    prior: string;
  };
  durationText?: string;
}

/**
 * Helper to calculate formatted dates given a reference date and days offset
 */
export function getCdrDates(referenceDate: Date = new Date(), daysOffset: number = 180) {
  const date = new Date(referenceDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (1 + date.getMonth()).toString().padStart(2, "0");
  const year = date.getFullYear();

  const currDateSlashFormat = `${day}/${month}/${year}`; // DD/MM/YYYY
  const currDateMinusFormat = `${day}-${month}-${year}`; // DD-MM-YYYY
  const currDateUfoneFormat = `${month}/${day}/${year}`; // MM/DD/YYYY

  const priorDate = new Date(new Date(referenceDate).setDate(date.getDate() - daysOffset));
  const pDay = priorDate.getDate().toString().padStart(2, "0");
  const pMonth = (1 + priorDate.getMonth()).toString().padStart(2, "0");
  const pYear = priorDate.getFullYear();

  const priorDateSlashFormat = `${pDay}/${pMonth}/${pYear}`; // DD/MM/YYYY
  const priorDateMinusFormat = `${pDay}-${pMonth}-${pYear}`; // DD-MM-YYYY
  const priorDateUfoneFormat = `${pMonth}/${pDay}/${pYear}`; // MM/DD/YYYY

  return {
    curr: { day, month, year, slash: currDateSlashFormat, minus: currDateMinusFormat, ufone: currDateUfoneFormat },
    prior: { day: pDay, month: pMonth, year: pYear, slash: priorDateSlashFormat, minus: priorDateMinusFormat, ufone: priorDateUfoneFormat },
    priorDate,
    currentDate: date,
  };
}

/**
 * Extract 12-digit MSISDNs (Strictly 10-12 digit mobile numbers formatted to 923XXXXXXXXX)
 */
export function extract12DigitNumbers(input: string | string[]): string[] {
  let lines: string[] = [];
  if (Array.isArray(input)) {
    lines = input;
  } else {
    lines = input.split(/[\n,\s]+/);
  }

  const result: string[] = [];
  for (const raw of lines) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("92")) {
      result.push(digits);
    } else if (digits.length === 11 && digits.startsWith("03")) {
      result.push("92" + digits.substring(1));
    } else if (digits.length === 10 && digits.startsWith("3")) {
      result.push("92" + digits);
    }
  }
  return result;
}

/**
 * Extract 15-digit IMEIs (Strictly 15 digits only, ignores phone numbers)
 */
export function extract15DigitIMEIs(input: string | string[]): string[] {
  let lines: string[] = [];
  if (Array.isArray(input)) {
    lines = input;
  } else {
    lines = input.split(/[\n,\s]+/);
  }

  const result: string[] = [];
  for (const raw of lines) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 15) {
      result.push(digits);
    }
  }
  return result;
}

/**
 * Extract line-by-line numbers for Zong
 */
export function extractZongNumbers(input: string | string[]): string[] {
  let lines: string[] = [];
  if (Array.isArray(input)) {
    lines = input;
  } else {
    lines = input.split(/[\n,\s]+/);
  }

  const result: string[] = [];
  for (const raw of lines) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("92")) {
      result.push(digits.substring(2));
    } else if (digits.length === 11 && digits.startsWith("03")) {
      result.push(digits.substring(1));
    } else if (digits.length === 10 && digits.startsWith("3")) {
      result.push(digits);
    }
  }
  return result;
}

/**
 * Registry of CDR & IDP Templates
 */
export const CDR_TEMPLATES: CdrTemplateConfig[] = [
  // ==========================================
  // 🔹 CDR TEMPLATES (With Date Ranges)
  // ==========================================

  // 1. Jazz / Warid CDR
  {
    id: "jazz",
    name: "Jazz CDR",
    category: "cdr",
    file: "jazz cdr 6 MONTH.html",
    operatorKey: "Jazz",
    type: "msisdn",
    defaultDays: 180,
    description: "Format: A;92300XXXXXXX;DD/MM/YYYY;DD/MM/YYYY;",
    generate: (input, options) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      const days = options?.customDays ?? 180;
      const dates = getCdrDates(options?.referenceDate, days);
      const durationText = options?.durationLabel ?? `${days} Days`;

      let html = "";
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }
      html += "<br/><br/>";
      for (let i = 0; i < items.length; i++) {
        html += `A;${items[i]};${dates.prior.slash};${dates.curr.slash};<br/>`;
      }

      let text = items.join("\n") + "\n\n\n";
      text += items.map(item => `A;${item};${dates.prior.slash};${dates.curr.slash};`).join("\n");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText,
        formattedDateRange: { current: dates.curr.slash, prior: dates.prior.slash },
      };
    },
  },

  // 2. Telenor CDR
  {
    id: "telenor",
    name: "Telenor CDR",
    category: "cdr",
    file: "Telenor 6 month cdr.html",
    operatorKey: "Telenor",
    type: "msisdn",
    defaultDays: 175,
    description: "Format: TPN:92345...,92345...:DD-MM-YYYY:DD-MM-YYYY:",
    generate: (input, options) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      const days = options?.customDays ?? 175;
      const dates = getCdrDates(options?.referenceDate, days);
      const durationText = options?.durationLabel ?? `${days} Days`;

      let html = "";
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }
      html += "<br/>";
      html += "TPN:";
      for (let i = 0; i < items.length; i++) {
        if (i === items.length - 1) {
          html += `${items[i]}:`;
        } else {
          html += `${items[i]},`;
        }
      }
      html += `${dates.prior.minus}:${dates.curr.minus}:`;

      let text = items.join("\n") + "\n\n";
      text += `TPN:${items.join(",")}:${dates.prior.minus}:${dates.curr.minus}:`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText,
        formattedDateRange: { current: dates.curr.minus, prior: dates.prior.minus },
      };
    },
  },

  // 3. Zong CDR
  {
    id: "zong",
    name: "Zong CDR",
    category: "cdr",
    file: "zong cdr 6 MONTH.html",
    operatorKey: "Zong",
    type: "msisdn",
    defaultDays: 180,
    description: "Format: PERIOD FROM DD/MM/YYYY TO DATE. 3XXXXXXXXX,3XXXXXXXXX ",
    generate: (input, options) => {
      const items = extractZongNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      const days = options?.customDays ?? 180;
      const dates = getCdrDates(options?.referenceDate, days);
      const durationText = options?.durationLabel ?? `${days} Days`;

      let html = "";
      items.forEach(n => {
        html += `${n}<br/>`;
      });
      html += "<br/><br/>";
      html += `PERIOD FROM ${dates.prior.slash} TO DATE. `;
      html += items.join(",") + " ";

      let text = items.join("\n") + "\n\n\n";
      text += `PERIOD FROM ${dates.prior.slash} TO DATE. ${items.join(",")}`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText,
        formattedDateRange: { current: "TO DATE", prior: dates.prior.slash },
      };
    },
  },

  // 4. Ufone CDR
  {
    id: "ufone",
    name: "Ufone CDR",
    category: "cdr",
    file: "ufone single cdr 1 year.html",
    operatorKey: "Ufone",
    type: "msisdn",
    defaultDays: 175,
    description: "Format: Single: MSISDN|All|MM/DD/YYYY|MM/DD/YYYY|92333... | Multiple: MSISDN|Both|MM/DD/YYYY|MM/DD/YYYY|92333...:92333...",
    generate: (input, options) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      const days = options?.customDays ?? 175;
      const dates = getCdrDates(options?.referenceDate, days);
      const durationText = options?.durationLabel ?? `${days} Days`;
      const mode = items.length === 1 ? "All" : "Both";

      let html = "";
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }
      html += "<br/><br/>";
      html += `MSISDN|${mode}|${dates.prior.ufone}|${dates.curr.ufone}|${items.join(":")}`;

      let text = items.join("\n") + "\n\n\n";
      text += `MSISDN|${mode}|${dates.prior.ufone}|${dates.curr.ufone}|${items.join(":")}`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText,
        formattedDateRange: { current: dates.curr.ufone, prior: dates.prior.ufone },
      };
    },
  },

  // 5. IMEI Multi-Network Format
  {
    id: "imei",
    name: "IMEI Format (All Networks)",
    category: "imei",
    file: "imei format 6 month.html",
    operatorKey: "All",
    type: "imei",
    defaultDays: 170,
    description: "Multi-operator IMEI CDR (TPI, Jazz, Zong & Ufone formats in one)",
    generate: (input, options) => {
      const items = extract15DigitIMEIs(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      const days = options?.customDays ?? 170;
      const dates = getCdrDates(options?.referenceDate, days);
      const durationText = options?.durationLabel ?? `${days} Days`;

      let html = "";
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }

      // TPI
      html += "<br/>TPI:";
      for (let i = 0; i < items.length; i++) {
        if (i === items.length - 1) {
          html += `${items[i].slice(0, -1)}:`;
        } else {
          html += `${items[i].slice(0, -1)},`;
        }
      }
      html += `${dates.prior.minus}:${dates.curr.minus}:`;

      // Jazz
      html += "<br/><br/><br/>";
      for (let i = 0; i < items.length; i++) {
        html += `I;${items[i].slice(0, -1)};${dates.prior.slash};${dates.curr.slash};<br/>`;
      }

      // Zong
      html += "<br/><br/><br/>";
      html += `PERIOD FROM ${dates.prior.slash} TO DATE. `;
      for (let i = 0; i < items.length; i++) {
        if (i === items.length - 1) {
          html += `${items[i]} `;
        } else {
          html += `${items[i]},`;
        }
      }

      // Ufone
      const imeiMode = items.length === 1 ? "All" : "Both";
      html += "<br/><br/><br/>";
      html += `IMEI|${imeiMode}|${dates.prior.ufone}|${dates.curr.ufone}|${items.join(":")}`;

      let text = items.join("\n") + "\n\n";

      const tpiList = items.map(im => im.slice(0, -1)).join(",");
      text += `TPI:${tpiList}:${dates.prior.minus}:${dates.curr.minus}:\n\n\n`;
      text += items.map(im => `I;${im.slice(0, -1)};${dates.prior.slash};${dates.curr.slash};`).join("\n") + "\n\n\n";
      text += `PERIOD FROM ${dates.prior.slash} TO DATE. ${items.join(",")}\n\n\n`;
      text += `IMEI|${imeiMode}|${dates.prior.ufone}|${dates.curr.ufone}|${items.join(":")}`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText,
        formattedDateRange: { current: dates.curr.slash, prior: dates.prior.slash },
      };
    },
  },

  // ==========================================
  // 🔹 IDP TEMPLATES (Subscriber Identity / Info)
  // ==========================================

  // 6. IDP Jazz / Mobilink
  {
    id: "idp-jazz",
    name: "IDP Jazz",
    category: "idp",
    operatorKey: "Jazz",
    type: "msisdn",
    description: "Format: A;92300XXXXXXX; (Per line ID Profile)",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>IDP MOBILINK</strong><br/><br/>`;
      for (let i = 0; i < items.length; i++) {
        html += `A;${items[i]};<br/>`;
      }

      let text = `IDP MOBILINK\n\n`;
      text += items.map(item => `A;${item};`).join("\n");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Subscriber Profile",
      };
    },
  },

  // 7. IDP Telenor
  {
    id: "idp-telenor",
    name: "IDP Telenor",
    category: "idp",
    operatorKey: "Telenor",
    type: "msisdn",
    description: "Format: TPS:92340...,92340...: (Comma separated TPS)",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>IDP TELENOR</strong><br/><br/>`;
      html += `TPS:${items.join(",")}:`;

      let text = `IDP TELENOR\n\n`;
      text += `TPS:${items.join(",")}:`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Subscriber Profile",
      };
    },
  },

  // 8. IDP Zong
  {
    id: "idp-zong",
    name: "IDP Zong",
    category: "idp",
    operatorKey: "Zong",
    type: "msisdn",
    description: "Format: 3183628991,3183628991 (Comma separated 10-digit)",
    generate: (input) => {
      const items = extractZongNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>IDP ZONG</strong><br/><br/>`;
      html += items.join(",");

      let text = `IDP ZONG\n\n`;
      text += items.join(",");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Subscriber Profile",
      };
    },
  },

  // 9. IDP Ufone (Official 2-Column Bordered Subscriber Table)
  {
    id: "idp-ufone",
    name: "IDP Ufone",
    category: "idp",
    operatorKey: "Ufone",
    type: "msisdn",
    description: "Format: Official MSISDN / Subscriber Information Table",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      // 1. Clean, Official Native HTML Table with 1px solid black borders for email & document
      let html = `<div style="margin-top:14px; font-family:Arial, sans-serif;">`;
      html += `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%; max-width:620px; border:1px solid #000000; font-family:Arial, sans-serif; font-size:12px; text-align:left;">`;
      html += `<thead style="background-color:#e2e8f0;">`;
      html += `<tr>`;
      html += `<th style="border:1px solid #000000; padding:8px 12px; font-weight:bold; width:45%; color:#000000;">MSISDN</th>`;
      html += `<th style="border:1px solid #000000; padding:8px 12px; font-weight:bold; width:55%; color:#000000;">SUBSCRIBER INFORMATION</th>`;
      html += `</tr>`;
      html += `</thead>`;
      html += `<tbody>`;
      for (let i = 0; i < items.length; i++) {
        html += `<tr>`;
        html += `<td style="border:1px solid #000000; padding:6px 12px; font-family:monospace; font-weight:bold; color:#000000;">${items[i]}</td>`;
        html += `<td style="border:1px solid #000000; padding:6px 12px;">&nbsp;</td>`;
        html += `</tr>`;
      }
      html += `</tbody>`;
      html += `</table>`;
      html += `</div>`;

      // 2. Plain Text — Clean standard ASCII divider so Gmail does not wrap or misalign
      const line = "--------------------------------------------------";
      let text = `MSISDN          SUBSCRIBER INFORMATION\n`;
      text += `${line}\n`;
      for (let i = 0; i < items.length; i++) {
        text += `${items[i]}\n`;
      }
      text += `${line}`;

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Subscriber Table",
      };
    },
  },

  // ==========================================
  // 🔹 LOC TEMPLATES (Location Requests)
  // ==========================================

  // 10. LOC Jazz / Mobilink
  {
    id: "loc-jazz",
    name: "LOC Mobilink",
    category: "loc",
    operatorKey: "Jazz",
    type: "msisdn",
    description: "Format: LOC MOBILINK A;92300XXXXXXX;",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>LOC<br/>MOBILINK</strong><br/><br/>`;
      for (let i = 0; i < items.length; i++) {
        html += `A;${items[i]};<br/>`;
      }

      let text = `LOC\nMOBILINK\n`;
      text += items.map(item => `A;${item};`).join("\n");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Location",
      };
    },
  },

  // 11. LOC Zong
  {
    id: "loc-zong",
    name: "LOC Zong",
    category: "loc",
    operatorKey: "Zong",
    type: "msisdn",
    description: "Format: LOC ZONG 318XXXXXXX,318XXXXXXX",
    generate: (input) => {
      const items = extractZongNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>LOC<br/>ZONG</strong><br/><br/>`;
      html += items.join(",");

      let text = `LOC\nZONG\n`;
      text += items.join(",");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Location",
      };
    },
  },

  // 12. LOC Telenor
  {
    id: "loc-telenor",
    name: "LOC Telenor",
    category: "loc",
    operatorKey: "Telenor",
    type: "msisdn",
    description: "Format: LOC TELENOR 92340XXXXXXX (per line)",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>LOC<br/>TELENOR</strong><br/><br/>`;
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }

      let text = `LOC\nTELENOR\n`;
      text += items.join("\n");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Location",
      };
    },
  },

  // 13. LOC Ufone
  {
    id: "loc-ufone",
    name: "LOC Ufone",
    category: "loc",
    operatorKey: "Ufone",
    type: "msisdn",
    description: "Format: LOC UFONE 92330XXXXXXX (per line)",
    generate: (input) => {
      const items = extract12DigitNumbers(input);
      if (items.length === 0) {
        return { html: "", text: "", items: [], totalCount: 0 };
      }

      let html = `<strong>LOC<br/>UFONE</strong><br/><br/>`;
      for (let i = 0; i < items.length; i++) {
        html += `${items[i]}<br/>`;
      }

      let text = `LOC\nUFONE\n`;
      text += items.join("\n");

      return {
        html,
        text,
        items,
        totalCount: items.length,
        durationText: "Location",
      };
    },
  },
];

/**
 * Helper to find a template by ID, name, or filename
 */
export function findCdrTemplate(key: string): CdrTemplateConfig | undefined {
  return CDR_TEMPLATES.find(
    t => t.id === key || t.name.toLowerCase() === key.toLowerCase() || t.file?.toLowerCase() === key.toLowerCase()
  );
}

/**
 * Helper to format CDR or IDP output for any given template
 */
export function generateCdr(templateKey: string, input: string | string[], options?: CdrFormatOptions): CdrGeneratedResult {
  const template = findCdrTemplate(templateKey);
  if (!template) {
    throw new Error(`Template not found for: ${templateKey}`);
  }
  return template.generate(input, options);
}
