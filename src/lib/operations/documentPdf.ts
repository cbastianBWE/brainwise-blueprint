// Client-side branded document PDF generator for Operations.
// One engine, three template variants (standard, corporate, detailed).
// Brand identity comes from the org record; the recipient block comes from the customer.

export type DocKind = "invoice" | "estimate" | "receipt";
export type TemplateKey = "standard" | "corporate" | "detailed";

export type DocBranding = {
  name?: string | null;
  legal_name?: string | null;
  address?: any;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  website?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  accent_color?: string | null;
};

export type DocParty = {
  display_name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  billing_address?: any;
  tax_id?: string | null;
  remit_bank_name?: string | null;
  remit_account_type?: string | null;
  remit_routing_number?: string | null;
  remit_account_number?: string | null;
};

export type DocLine = {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
};

export type DocData = {
  number: string;
  issue_date?: string | null;
  due_date?: string | null;
  expiration_date?: string | null;
  currency_code?: string | null;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  adjustment_amount?: number | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  notes_to_customer?: string | null;
  terms_and_conditions?: string | null;
  payment_options?: { bank_total: number; card_total: number } | null;
  lines: DocLine[];
};

const NAVY = "#021F36";
const ORANGE = "#F5741A";

function hexToRgb(hex?: string | null): [number, number, number] {
  const h = (hex || NAVY).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function money(v: number | null | undefined, currency?: string | null): string {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
    }).format(n || 0);
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
}

function addressLines(a: any): string[] {
  if (!a || typeof a !== "object") return [];
  return [
    a.line1,
    a.line2,
    [a.city, a.state, a.postal_code].filter(Boolean).join(", "),
    a.country,
  ].filter((x) => x && String(x).trim()) as string[];
}

async function fetchLogoDataUrl(url?: string | null): Promise<{ data: string; fmt: string } | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const fmt = blob.type.includes("png")
      ? "PNG"
      : blob.type.includes("jpeg") || blob.type.includes("jpg")
      ? "JPEG"
      : "PNG";
    const data: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    return { data, fmt };
  } catch {
    return null;
  }
}

const TITLES: Record<DocKind, string> = {
  invoice: "INVOICE",
  estimate: "ESTIMATE",
  receipt: "RECEIPT",
};

export async function generateDocumentPdf(args: {
  kind: DocKind;
  template: TemplateKey;
  data: DocData;
  branding: DocBranding;
  billTo: DocParty;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { kind, template, data, branding, billTo } = args;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const currency = data.currency_code;

  const brand = hexToRgb(branding.brand_color);
  const accent = hexToRgb(branding.accent_color || ORANGE);
  const headFill: [number, number, number] =
    template === "corporate" ? brand : template === "detailed" ? accent : [241, 241, 241];
  const headText: [number, number, number] = template === "standard" ? hexToRgb(NAVY) : [255, 255, 255];

  const logo = await fetchLogoDataUrl(branding.logo_url);
  let y = M;

  // ---- Header ----
  if (template === "corporate") {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, W, 86, "F");
    if (logo) { try { doc.addImage(logo.data, logo.fmt, M, 22, 42, 42); } catch { /* skip */ } }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(TITLES[kind], W - M, 46, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(branding.legal_name || branding.name || "", W - M, 64, { align: "right" });
    y = 110;
  } else {
    if (logo) { try { doc.addImage(logo.data, logo.fmt, M, y, 42, 42); } catch { /* skip */ } }
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(TITLES[kind], W - M, y + 18, { align: "right" });
    y += 52;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(2);
    doc.line(M, y, W - M, y);
    y += 18;
  }

  // ---- Company (from) ----
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(branding.legal_name || branding.name || "", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let cy = y + 14;
  [
    ...addressLines(branding.address),
    branding.email || "",
    branding.phone || "",
    branding.website || "",
    branding.tax_id ? `Tax ID: ${branding.tax_id}` : "",
  ]
    .filter(Boolean)
    .forEach((l) => { doc.text(String(l), M, cy); cy += 12; });

  // ---- Meta (right) ----
  const metaX = W - M;
  let my = y;
  const niceKind = TITLES[kind][0] + TITLES[kind].slice(1).toLowerCase();
  const meta: Array<[string, string]> = [
    [`${niceKind} #`, data.number],
    ["Issue date", fmtDate(data.issue_date)],
  ];
  if (kind === "invoice" && data.due_date) meta.push(["Due date", fmtDate(data.due_date)]);
  if (kind === "estimate" && data.expiration_date) meta.push(["Valid until", fmtDate(data.expiration_date)]);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, metaX - 130, my, { align: "left" });
    doc.setFont("helvetica", "normal");
    doc.text(String(v || ""), metaX, my, { align: "right" });
    my += 13;
  });
  if (kind === "receipt") {
    doc.setTextColor(45, 106, 79);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAID", metaX, my + 4, { align: "right" });
    my += 18;
  }

  y = Math.max(cy, my) + 16;

  // ---- Bill to ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("BILL TO", M, y);
  y += 13;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(billTo.display_name || billTo.legal_name || "", M, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  [
    ...addressLines(billTo.billing_address),
    billTo.email || "",
    billTo.tax_id ? `Tax ID: ${billTo.tax_id}` : "",
  ]
    .filter(Boolean)
    .forEach((l) => { doc.text(String(l), M, y); y += 12; });
  y += 12;

  // ---- Line table ----
  const descW = W - M * 2 - 70 - 90 - 90;
  const cols = [
    { key: "description", label: "Description", w: descW, align: "left" as const },
    { key: "quantity", label: "Qty", w: 70, align: "right" as const },
    { key: "unit_price", label: "Unit price", w: 90, align: "right" as const },
    { key: "line_total", label: "Amount", w: 90, align: "right" as const },
  ];
  const rowH = 18;
  const drawHead = () => {
    doc.setFillColor(headFill[0], headFill[1], headFill[2]);
    doc.rect(M, y, W - M * 2, rowH, "F");
    doc.setTextColor(headText[0], headText[1], headText[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let cx = M;
    cols.forEach((c) => {
      doc.text(c.label, c.align === "right" ? cx + c.w - 4 : cx + 4, y + 12, { align: c.align });
      cx += c.w;
    });
    y += rowH;
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
  };
  drawHead();

  const lines = (data.lines || []).filter((l) => l && (l.description || l.line_total != null));
  lines.forEach((l) => {
    if (y > H - 170) { doc.addPage(); y = M; drawHead(); }
    let cx = M;
    const vals = [
      String(l.description ?? ""),
      l.quantity != null ? String(l.quantity) : "",
      money(l.unit_price, currency),
      money(l.line_total, currency),
    ];
    cols.forEach((c, i) => {
      const txt = c.key === "description" ? doc.splitTextToSize(vals[i], c.w - 8)[0] : vals[i];
      doc.text(txt, c.align === "right" ? cx + c.w - 4 : cx + 4, y + 12, { align: c.align });
      cx += c.w;
    });
    y += rowH;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
  });
  y += 16;

  // ---- Totals ----
  const totalsX = W - M;
  const labelX = totalsX - 160;
  const drawTotal = (label: string, val: string, bold = false) => {
    if (y > H - 60) { doc.addPage(); y = M; }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9);
    if (bold) doc.setTextColor(brand[0], brand[1], brand[2]);
    else doc.setTextColor(60, 60, 60);
    doc.text(label, labelX, y);
    doc.text(val, totalsX, y, { align: "right" });
    y += bold ? 16 : 13;
  };
  if (template === "detailed") {
    drawTotal("Subtotal", money(data.subtotal_amount, currency));
    if (data.discount_amount) drawTotal("Discount", "-" + money(data.discount_amount, currency));
    if (data.tax_amount) drawTotal("Tax", money(data.tax_amount, currency));
    if (data.adjustment_amount) drawTotal("Adjustment", money(data.adjustment_amount, currency));
  }
  drawTotal("Total", money(data.total_amount, currency), true);
  if (kind !== "estimate") {
    drawTotal("Amount paid", money(data.amount_paid, currency));
    drawTotal("Balance due", money(data.balance_due, currency), true);
  }
  y += 10;

  // ---- Payment details (remit-to, invoices only) ----
  if (kind === "invoice") {
    const hasRemit =
      billTo.remit_bank_name || billTo.remit_account_number || billTo.remit_routing_number;
    if (hasRemit) {
      if (y > H - 120) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("PAYMENT DETAILS", M, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const at = billTo.remit_account_type ? String(billTo.remit_account_type) : "";
      const atNice = at ? at.charAt(0).toUpperCase() + at.slice(1) : "";
      [
        billTo.remit_bank_name ? `Bank: ${billTo.remit_bank_name}` : "",
        atNice ? `Account type: ${atNice}` : "",
        billTo.remit_routing_number ? `Routing number: ${billTo.remit_routing_number}` : "",
        billTo.remit_account_number ? `Account number: ${billTo.remit_account_number}` : "",
      ]
        .filter(Boolean)
        .forEach((l) => { doc.text(String(l), M, y); y += 12; });
      y += 6;
    }
  }

  // ---- Notes / terms ----
  const block = (label: string, text?: string | null) => {
    if (!text) return;
    if (y > H - 90) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label, M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const wrapped = doc.splitTextToSize(String(text), W - M * 2);
    doc.text(wrapped, M, y);
    y += 12 * wrapped.length + 6;
  };
  block("Notes", data.notes_to_customer);
  block("Terms", data.terms_and_conditions);

  // ---- Footer ----
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(branding.legal_name || branding.name || "", M, H - 24);

  return doc.output("blob");
}

export async function downloadDocumentPdf(
  args: Parameters<typeof generateDocumentPdf>[0],
  filename: string
): Promise<void> {
  const blob = await generateDocumentPdf(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =====================================================================
// Statement of Account
// =====================================================================

export type StatementData = {
  customer: {
    display_name?: string | null;
    legal_name?: string | null;
    email?: string | null;
    billing_address?: any;
    currency_code?: string | null;
  };
  from: string | null;
  to: string | null;
  unpaid_only: boolean;
  opening_balance: number | null;
  closing_balance: number;
  total_outstanding: number;
  transactions: {
    date: string;
    type: string;
    number: string | null;
    description: string | null;
    debit: number;
    credit: number;
    balance: number;
  }[];
  open_invoices: {
    invoice_number: string;
    issue_date: string | null;
    due_date: string | null;
    total_amount: number;
    balance_due: number;
    status: string;
  }[];
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export async function generateStatementPdf(args: {
  branding: DocBranding;
  statement: StatementData;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { branding, statement } = args;
  const currency = statement.customer?.currency_code;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  const brand = hexToRgb(branding.brand_color);
  const accent = hexToRgb(branding.accent_color || ORANGE);
  const headFill: [number, number, number] = [241, 241, 241];
  const headText: [number, number, number] = hexToRgb(NAVY);

  const logo = await fetchLogoDataUrl(branding.logo_url);
  let y = M;

  // ---- Header (standard style) ----
  if (logo) {
    try { doc.addImage(logo.data, logo.fmt, M, y, 42, 42); } catch { /* skip */ }
  }
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Statement of Account", W - M, y + 18, { align: "right" });
  y += 52;
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(2);
  doc.line(M, y, W - M, y);
  y += 18;

  // ---- Company (from) ----
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(branding.legal_name || branding.name || "", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let cy = y + 14;
  [
    ...addressLines(branding.address),
    branding.email || "",
    branding.phone || "",
    branding.website || "",
    branding.tax_id ? `Tax ID: ${branding.tax_id}` : "",
  ]
    .filter(Boolean)
    .forEach((l) => { doc.text(String(l), M, cy); cy += 12; });

  // ---- Date range (right) ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const rangeText = statement.from
    ? `From ${fmtDate(statement.from)} to ${fmtDate(statement.to)}`
    : `As of ${fmtDate(statement.to)}`;
  doc.text(rangeText, W - M, y, { align: "right" });

  y = cy + 8;

  // ---- Bill to ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("BILL TO", M, y);
  y += 13;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(statement.customer?.display_name || statement.customer?.legal_name || "", M, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  [
    ...addressLines(statement.customer?.billing_address),
    statement.customer?.email || "",
  ]
    .filter(Boolean)
    .forEach((l) => { doc.text(String(l), M, y); y += 12; });
  y += 12;

  const drawFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(branding.legal_name || branding.name || "", M, H - 24);
  };

  const rowH = 18;

  const drawTable = (
    cols: { label: string; w: number; align: "left" | "right" }[],
    rows: string[][],
  ) => {
    const drawHead = () => {
      doc.setFillColor(headFill[0], headFill[1], headFill[2]);
      doc.rect(M, y, W - M * 2, rowH, "F");
      doc.setTextColor(headText[0], headText[1], headText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      let cx = M;
      cols.forEach((c) => {
        doc.text(c.label, c.align === "right" ? cx + c.w - 4 : cx + 4, y + 12, { align: c.align });
        cx += c.w;
      });
      y += rowH;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
    };
    drawHead();
    rows.forEach((vals) => {
      if (y > H - 80) { drawFooter(); doc.addPage(); y = M; drawHead(); }
      let cx = M;
      cols.forEach((c, i) => {
        const txt = c.align === "left"
          ? doc.splitTextToSize(vals[i] ?? "", c.w - 8)[0]
          : (vals[i] ?? "");
        doc.text(String(txt), c.align === "right" ? cx + c.w - 4 : cx + 4, y + 12, { align: c.align });
        cx += c.w;
      });
      y += rowH;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
    });
  };

  const drawBalanceLine = (label: string, val: string, bold = false) => {
    if (y > H - 60) { drawFooter(); doc.addPage(); y = M; }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    if (bold) doc.setTextColor(brand[0], brand[1], brand[2]);
    else doc.setTextColor(60, 60, 60);
    const totalsX = W - M;
    doc.text(label, totalsX - 200, y + 12);
    doc.text(val, totalsX, y + 12, { align: "right" });
    y += bold ? 22 : 18;
  };

  // ---- Ledger (when not unpaid_only) ----
  if (!statement.unpaid_only) {
    drawBalanceLine("Opening balance", money(statement.opening_balance ?? 0, currency));
    y += 4;

    const innerW = W - M * 2;
    const ledgerCols: { label: string; w: number; align: "left" | "right" }[] = [
      { label: "Date", w: 70, align: "left" },
      { label: "Type", w: 80, align: "left" },
      { label: "Reference", w: innerW - 70 - 80 - 80 - 80 - 90, align: "left" },
      { label: "Debit", w: 80, align: "right" },
      { label: "Credit", w: 80, align: "right" },
      { label: "Balance", w: 90, align: "right" },
    ];
    const ledgerRows = (statement.transactions ?? []).map((t) => [
      fmtDate(t.date),
      cap(t.type ?? ""),
      t.number ?? "",
      Number(t.debit) ? money(t.debit, currency) : "",
      Number(t.credit) ? money(t.credit, currency) : "",
      money(t.balance, currency),
    ]);
    drawTable(ledgerCols, ledgerRows);
    y += 10;
    drawBalanceLine("Closing balance", money(statement.closing_balance, currency), true);
    y += 6;
  }

  // ---- Open Invoices (always) ----
  if (y > H - 140) { drawFooter(); doc.addPage(); y = M; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text("Open Invoices", M, y);
  y += 14;

  const innerW2 = W - M * 2;
  const invCols: { label: string; w: number; align: "left" | "right" }[] = [
    { label: "Invoice #", w: 90, align: "left" },
    { label: "Issue date", w: 80, align: "left" },
    { label: "Due date", w: 80, align: "left" },
    { label: "Total", w: 90, align: "right" },
    { label: "Balance due", w: 90, align: "right" },
    { label: "Status", w: innerW2 - 90 - 80 - 80 - 90 - 90, align: "left" },
  ];
  const invRows = (statement.open_invoices ?? []).map((r) => [
    r.invoice_number ?? "",
    fmtDate(r.issue_date),
    fmtDate(r.due_date),
    money(r.total_amount, currency),
    money(r.balance_due, currency),
    cap(String(r.status ?? "").replace(/_/g, " ")),
  ]);
  drawTable(invCols, invRows);
  y += 10;
  drawBalanceLine("Total outstanding", money(statement.total_outstanding, currency), true);

  drawFooter();
  return doc.output("blob");
}

export async function downloadStatementPdf(
  args: Parameters<typeof generateStatementPdf>[0],
  filename: string
): Promise<void> {
  const blob = await generateStatementPdf(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
