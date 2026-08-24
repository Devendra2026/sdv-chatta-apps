/**
 * A4 Property Tax Demand Notice — matches SDV EDUTECH demand-notice PDF layout.
 * Site imagery and GIS map/coordinates are intentionally omitted.
 */

type FloorRow = {
  floorLabel: string
  usageType?: string | null
  usageFactor?: string | null
  buildingType?: string | null
  areaSqFt?: string | number | null
  areaSqMeter?: string | number | null
}

export type NoticeFloorCalc = {
  floorLabel: string
  usageType: string
  usageFactor: string
  construction: string
  areaSqFt: number
  rate: number
  alv: number
  tax: number
}

export type NoticeTaxSummary = {
  propertyTaxPct: number
  waterTaxPct: number
  drainageTaxPct: number
  propertyTax: number
  waterTax: number
  drainageTax: number
  totalDemand: number
  annualBaseRate: number | null
  configFound: boolean
}

type SurveyData = Record<string, unknown> & {
  surveyId?: string
  ownerName?: string | null
  ownerFatherName?: string | null
  mobile?: string | null
  ward?: { number: number; name: string } | null
  propertyNo?: string | null
  houseNo?: string | null
  parcelNo?: string | null
  propertyUse?: string | null
  taxRateZone?: string | null
  roadType?: string | null
  city?: string | null
  pincode?: string | null
  locality?: string | null
  colony?: string | null
  streetName?: string | null
  floors?: FloorRow[]
}

function esc(value: unknown): string {
  const s = String(value ?? "—")
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildAddress(survey: SurveyData): string {
  const parts = [
    survey.houseNo,
    survey.streetName,
    survey.locality,
    survey.colony,
    survey.city ?? "Nagar Panchayat Chhata",
    survey.pincode,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "—"
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function currentAssessmentYear(): string {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

function maskMobile(mobile?: string | null): string {
  if (!mobile?.trim()) return "—"
  const digits = mobile.replace(/\D/g, "")
  if (digits.length < 4) return esc(mobile)
  return `XXXXXX${digits.slice(-4)}`
}

function defaultFloorCalcs(floors: FloorRow[]): NoticeFloorCalc[] {
  return floors.map((f) => ({
    floorLabel: f.floorLabel || "—",
    usageType: f.usageType ?? "—",
    usageFactor: f.usageFactor ?? "—",
    construction: f.buildingType ?? "—",
    areaSqFt: Number(f.areaSqFt) || 0,
    rate: 0,
    alv: 0,
    tax: 0,
  }))
}

export function generateDemandNoticeHtml(
  survey: SurveyData,
  options?: {
    floors?: NoticeFloorCalc[]
    tax?: NoticeTaxSummary
    /** Absolute URL or data URI — required for print popup (about:blank). */
    logoUrl?: string
  }
): string {
  const logoUrl =
    options?.logoUrl?.trim() ||
    "/branding/up-government-logo.png"
  const rawFloors = (survey.floors ?? []) as FloorRow[]
  const floors =
    options?.floors && options.floors.length > 0
      ? options.floors
      : defaultFloorCalcs(rawFloors)

  const tax: NoticeTaxSummary = options?.tax ?? {
    propertyTaxPct: 10,
    waterTaxPct: 7.5,
    drainageTaxPct: 2.5,
    propertyTax: 0,
    waterTax: 0,
    drainageTax: 0,
    totalDemand: 0,
    annualBaseRate: null,
    configFound: false,
  }

  const totalArea = floors.reduce((s, f) => s + f.areaSqFt, 0)
  const totalAlv = floors.reduce((s, f) => s + f.alv, 0)
  const totalTax = floors.reduce((s, f) => s + f.tax, 0)

  const floorRows =
    floors.length > 0
      ? floors
          .map(
            (f, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(f.floorLabel)}</td>
        <td>${esc(f.usageType)}</td>
        <td>${esc(f.usageFactor)}</td>
        <td>${esc(f.construction)}</td>
        <td class="r">${money(f.areaSqFt)}</td>
        <td class="r">${f.rate > 0 ? money(f.rate) : "—"}</td>
        <td class="r">${money(f.alv)}</td>
        <td class="r">${money(f.tax)}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="9" class="c muted">No floor data available</td></tr>`

  const baseRateLabel =
    tax.annualBaseRate != null && tax.annualBaseRate > 0
      ? `₹${money(tax.annualBaseRate)}/sqft/yr`
      : "—"

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<title>Demand Notice - ${esc(survey.surveyId ?? "")}</title>
<style>
/* Exact A4 — print at Scale 100% / Actual size (do not Fit to page) */
@page {
  size: A4 portrait;
  margin: 0;
}
* { margin: 0; padding: 0; box-sizing: border-box; }

html {
  background: #e2e8f0;
}
body {
  font-family: "Segoe UI", "Noto Sans Devanagari", Lato, Tahoma, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  color: #020617;
  background: #e2e8f0;
  margin: 0;
  padding: 16px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 210mm;
  height: 297mm;
  margin: 0 auto;
  padding: 12mm 11mm 11mm 11mm;
  background: #fff;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}

@media print {
  html, body {
    width: 210mm;
    height: 297mm;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }
  .no-print { display: none !important; }
  .page {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 12mm 11mm 11mm 11mm;
    box-shadow: none;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
}

/* —— Header —— */
.header {
  display: grid;
  grid-template-columns: 88px 1fr 88px;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 3px solid #0f172a;
  flex-shrink: 0;
}
.logo {
  width: 84px; height: 84px;
  display: flex; align-items: center; justify-content: center;
}
.logo img {
  width: 84px; height: 84px;
  object-fit: contain;
  display: block;
}
.header-center { text-align: center; }
.office-en { font-size: 14px; font-weight: 700; color: #0f172a; }
.office-loc { font-size: 11px; color: #334155; margin-top: 2px; }
.title-en {
  margin-top: 8px; font-size: 18px; font-weight: 800;
  color: #0369a1; letter-spacing: 0.2px;
}
.title-hi { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px; }

/* —— Meta —— */
.meta {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden;
  margin-top: 12px;
  flex-shrink: 0;
}
.meta-cell {
  text-align: center; padding: 10px 8px;
  border-right: 1px solid #94a3b8; background: #f8fafc;
}
.meta-cell:last-child { border-right: none; }
.meta-label {
  font-size: 9px; font-weight: 700; color: #475569;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.meta-value { font-size: 14px; font-weight: 800; color: #020617; margin-top: 4px; }

/* —— Specs / Owner —— */
.cols {
  display: grid; grid-template-columns: 1fr 1fr;
  border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden;
  margin-top: 12px;
  flex: 0 0 auto;
}
.col { min-width: 0; display: flex; flex-direction: column; }
.col + .col { border-left: 1.5px solid #94a3b8; }
.col-head {
  background: #0f172a; color: #fff;
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; padding: 7px 10px;
}
.row {
  display: grid; grid-template-columns: 40% 60%;
  border-bottom: 1px solid #e2e8f0;
  flex: 1;
  min-height: 28px;
  align-items: stretch;
}
.row:last-child { border-bottom: none; }
.lbl {
  padding: 7px 10px; font-size: 9px; font-weight: 700;
  color: #475569; text-transform: uppercase; letter-spacing: 0.2px;
  background: #f8fafc; display: flex; align-items: center;
}
.val {
  padding: 7px 10px; font-size: 12px; font-weight: 600; color: #020617;
  display: flex; align-items: center;
}

/* —— Section band —— */
.sec {
  background: #e2e8f0; border: 1.5px solid #94a3b8; border-bottom: none;
  font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
  text-transform: uppercase; padding: 7px 10px; color: #0f172a;
  margin-top: 12px;
  flex-shrink: 0;
}

/* —— ALV table —— */
.alv-wrap { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
table.alv {
  width: 100%; border-collapse: collapse;
  border: 1.5px solid #94a3b8;
  flex: 1;
}
table.alv th {
  background: #0f172a; color: #fff;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2px; padding: 8px 4px; border: 1px solid #1e293b;
  text-align: center;
}
table.alv td {
  font-size: 11px; padding: 8px 5px;
  border: 1px solid #cbd5e1; vertical-align: middle;
}
table.alv td.c, table.alv th.c { text-align: center; }
table.alv td.r { text-align: right; font-variant-numeric: tabular-nums; }
table.alv tr.total td {
  font-weight: 800; background: #f1f5f9; padding: 9px 5px;
}
.muted { color: #64748b; font-style: italic; }

/* —— Tax summary —— */
.tax-wrap { flex-shrink: 0; }
.tax-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1.2fr;
  border: 1.5px solid #94a3b8; border-top: none; border-radius: 0 0 4px 4px;
  overflow: hidden;
}
.tax-box {
  text-align: center; padding: 14px 6px;
  border-right: 1px solid #94a3b8; background: #fff;
}
.tax-box:last-child {
  border-right: none; background: #166534; color: #fff;
}
.tax-lbl {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.3px; color: #475569;
}
.tax-box:last-child .tax-lbl { color: #bbf7d0; }
.tax-amt {
  font-size: 16px; font-weight: 800; margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

/* —— Important notice —— */
.notice {
  border: 1.5px solid #94a3b8; border-radius: 4px;
  padding: 10px 12px; margin-top: 12px; background: #fffbeb;
  flex-shrink: 0;
}
.notice-title {
  font-size: 11px; font-weight: 800; color: #0f172a;
  text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;
}
.notice-body {
  font-size: 10px; line-height: 1.55; color: #0f172a; text-align: justify;
}
.notice-body .note { margin-top: 6px; font-weight: 600; }

/* —— Signature (pinned to page bottom) —— */
.sig {
  display: flex; justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
  flex-shrink: 0;
}
.sig-box { width: 180px; text-align: center; }
.sig-mark { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.sig-line {
  border-top: 1.5px solid #0f172a; margin-top: 36px; padding-top: 6px;
}
.sig-en { font-size: 11px; font-weight: 800; }
.sig-hi { font-size: 10px; color: #334155; margin-top: 2px; }

.no-print {
  max-width: 210mm;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.no-print button {
  padding: 10px 22px; font-size: 14px; cursor: pointer;
  background: #0f172a; color: #fff; border: none; border-radius: 8px;
  font-weight: 600;
}
.no-print button:hover { background: #1e293b; }
.no-print .hint {
  font-size: 12px; color: #334155;
  background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
  padding: 8px 12px;
}
</style>
</head>
<body>
<div class="no-print">
  <button type="button" onclick="window.print()">Print A4 Notice</button>
  <p class="hint"><strong>Print tip:</strong> Paper = A4 · Scale = <strong>100%</strong> / Actual size · Margins = None · Background graphics = On</p>
</div>

<div class="page">
  <header class="header">
    <div class="logo">
      <img
        src="${esc(logoUrl)}"
        alt="उत्तर प्रदेश सरकार"
        width="84"
        height="84"
      />
    </div>
    <div class="header-center">
      <div class="office-en">Office of Nagar Panchayat Chhata</div>
      <div class="office-loc">Nagar Panchayat Chhata, Mathura, Uttar Pradesh</div>
      <div class="title-en">Property Tax Demand Notice</div>
      <div class="title-hi">संपत्ति कर मांग सूचना पत्र</div>
    </div>
    <div aria-hidden="true"></div>
  </header>

  <div class="meta">
    <div class="meta-cell">
      <div class="meta-label">Assessment Year</div>
      <div class="meta-value">${esc(currentAssessmentYear())}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Notice Date</div>
      <div class="meta-value">${esc(formatDate())}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Property ID</div>
      <div class="meta-value">${esc(survey.surveyId ?? "—")}</div>
    </div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="col-head">Property Specifications / संपत्ति विनिर्देश</div>
      <div class="row">
        <div class="lbl">Road Width Zone</div>
        <div class="val">${esc(survey.taxRateZone ?? survey.roadType)}</div>
      </div>
      <div class="row">
        <div class="lbl">Ward No</div>
        <div class="val">Ward No. ${esc(survey.ward?.number ?? "—")}${survey.ward?.name ? ` — ${esc(survey.ward.name)}` : ""}</div>
      </div>
      <div class="row">
        <div class="lbl">Annual Base Rate</div>
        <div class="val">${esc(baseRateLabel)}</div>
      </div>
      <div class="row">
        <div class="lbl">Old House No</div>
        <div class="val">${esc(survey.houseNo ?? survey.propertyNo)}</div>
      </div>
      <div class="row">
        <div class="lbl">GIS Parcel</div>
        <div class="val">${esc(survey.parcelNo)}</div>
      </div>
      <div class="row">
        <div class="lbl">Property Use</div>
        <div class="val">${esc(survey.propertyUse)}</div>
      </div>
    </div>
    <div class="col">
      <div class="col-head">Owner Profile / स्वामी विवरण</div>
      <div class="row">
        <div class="lbl">Property Owner Name</div>
        <div class="val">${esc(survey.ownerName)}</div>
      </div>
      <div class="row">
        <div class="lbl">Father/Husband Name</div>
        <div class="val">${esc(survey.ownerFatherName)}</div>
      </div>
      <div class="row">
        <div class="lbl">Mobile Number</div>
        <div class="val">${maskMobile(survey.mobile)}</div>
      </div>
      <div class="row">
        <div class="lbl">Address</div>
        <div class="val">${esc(buildAddress(survey))}</div>
      </div>
    </div>
  </div>

  <div class="alv-wrap">
    <div class="sec">Assessment &amp; ALV Calculation Details / मूल्यांकन एवं वार्षिक मूल्यांकन विवरण</div>
    <table class="alv">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Floor / तल</th>
          <th>Usage Type / उपयोग प्रकार</th>
          <th>Usage Factor / उपयोग कारक</th>
          <th>Construction / निर्माण</th>
          <th>Area (Sqft) / क्षेत्रफल</th>
          <th>Rate (₹) / दर</th>
          <th>ALV (₹) / वार्षिक मूल्यांकन</th>
          <th>Tax (${esc(tax.propertyTaxPct)}) / कर</th>
        </tr>
      </thead>
      <tbody>
        ${floorRows}
        <tr class="total">
          <td colspan="5" class="r">TOTAL</td>
          <td class="r">${money(totalArea)}</td>
          <td class="r">—</td>
          <td class="r">${money(totalAlv)}</td>
          <td class="r">${money(totalTax)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="tax-wrap">
    <div class="sec" style="margin-top:0;border-radius:0">Tax Demand Summary / कर मांग सारांश</div>
    <div class="tax-grid">
      <div class="tax-box">
        <div class="tax-lbl">Property Tax (${esc(tax.propertyTaxPct)}%)</div>
        <div class="tax-amt">₹ ${money(tax.propertyTax)}</div>
      </div>
      <div class="tax-box">
        <div class="tax-lbl">Water Tax (${esc(tax.waterTaxPct)}%)</div>
        <div class="tax-amt">₹ ${money(tax.waterTax)}</div>
      </div>
      <div class="tax-box">
        <div class="tax-lbl">Drainage Tax (${esc(tax.drainageTaxPct)}%)</div>
        <div class="tax-amt">₹ ${money(tax.drainageTax)}</div>
      </div>
      <div class="tax-box">
        <div class="tax-lbl">Total Demand / कुल मांग</div>
        <div class="tax-amt">₹ ${money(tax.totalDemand)}</div>
      </div>
    </div>
  </div>

  <div class="notice">
    <div class="notice-title">Important Notice / महत्वपूर्ण सूचना</div>
    <div class="notice-body">
      कृपया नोटिस प्राप्ति के 15 दिवस के अन्दर यदि कोई आपत्ति हो तो पालिका में दाखिल करें। अन्यथा कथित स्थिति में आपकी स्वीकृति मानते हुए उक्त मूल्यांकन दर प्रभावी कर दी जायेगी। वाद मियाद डिमांड कायम करते हुए नगर पालिका अधिनियम 1916 की धारा 141 क 2 के अनुसार शास्ति निर्धारण करते हुए बिल मांग प्रेषित की जायेगी एवं अधिनियम 1916 की धारा 144 एवं भूमि/भवन स्वकर निर्धारण नियमावली 2024 के अन्तर्गत वसूली की जायेगी एवं निर्धारण अवधि में कर जमा करने पर सम्पत्ति कर में छूट एवं निर्धारण अवधि में कर जमा न करने पर ब्याज सहित वसूला जाएगा।
      <div class="note">नोट:- उक्त कर निर्धारण वाद प्रक्रिया हेतु मान्य नहीं होगा एवं कोई भी भवन स्वामी का उक्त प्रक्रिया एवं कर रसीद के स्वामित्व का दावा मान्य नहीं होगा। यदि पूर्व में गृह कर की धन राशि बकाया है तो वह मांग के अनुसार देय होगी।</div>
    </div>
  </div>

  <div class="sig">
    <div class="sig-box">
      <div class="sig-mark">Sd/-</div>
      <div class="sig-line">
        <div class="sig-en">EXECUTIVE OFFICER</div>
        <div class="sig-hi">अधिशासी अधिकारी</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`
}
