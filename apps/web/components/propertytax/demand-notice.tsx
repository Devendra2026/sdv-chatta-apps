"use client"

import type { PublicPropertyTaxDues } from "@workspace/types"

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildAddress(dues: PublicPropertyTaxDues): string {
  const parts = [
    dues.houseNo,
    dues.streetName,
    dues.locality,
    dues.colony,
    dues.city ?? "Nagar Panchayat Chhata",
    dues.pincode,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "—"
}

export function DemandNoticeView({ dues }: { dues: PublicPropertyTaxDues }) {
  const floors = dues.floors
  const tax = dues.tax
  const totalArea = floors.reduce((s, f) => s + f.areaSqFt, 0)
  const totalAlv = floors.reduce((s, f) => s + f.alv, 0)
  const totalFloorTax = floors.reduce((s, f) => s + f.tax, 0)
  const baseRateLabel =
    tax.annualBaseRate != null && tax.annualBaseRate > 0
      ? `₹${money(tax.annualBaseRate)}/sqft/mo`
      : "—"

  return (
    <div className="demand-notice-root">
      <style>{NOTICE_CSS}</style>
      <article className="page">
        <header className="header">
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/up-government-logo.png"
              alt="Uttar Pradesh Government"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
          <div className="header-center">
            <div className="office-en">NAGAR PANCHAYAT CHHATA, MATHURA</div>
            <div className="office-loc">Uttar Pradesh, India</div>
            <div className="title-en">Online House Tax Payment</div>
            <div className="title-hi">ऑनलाइन गृह कर भुगतान</div>
          </div>
          <div className="logo" aria-hidden />
        </header>

        <div className="meta">
          <div className="meta-cell">
            <div className="meta-label">Survey / Property ID</div>
            <div className="meta-value">{dues.surveyId}</div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Assessment Year</div>
            <div className="meta-value">{dues.assessmentYear.name}</div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Ward</div>
            <div className="meta-value">
              {String(dues.wardNumber).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="cols">
          <div className="col">
            <div className="col-head">Property Particulars</div>
            <div className="row">
              <div className="lbl">Property No.</div>
              <div className="val">{dues.propertyNo || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Parcel No.</div>
              <div className="val">{dues.parcelNo || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">House No.</div>
              <div className="val">{dues.houseNo || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Address</div>
              <div className="val">{buildAddress(dues)}</div>
            </div>
            <div className="row">
              <div className="lbl">Property Use</div>
              <div className="val">{dues.propertyUse || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Tax Rate Zone</div>
              <div className="val">{dues.taxRateZone || "—"}</div>
            </div>
          </div>
          <div className="col">
            <div className="col-head">Owner Particulars</div>
            <div className="row">
              <div className="lbl">Owner Name</div>
              <div className="val">{dues.ownerName || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Mobile</div>
              <div className="val">{dues.mobileMasked}</div>
            </div>
            <div className="row">
              <div className="lbl">Ward Name</div>
              <div className="val">{dues.wardName}</div>
            </div>
            <div className="row">
              <div className="lbl">Road Type</div>
              <div className="val">{dues.roadType || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Base Rate</div>
              <div className="val">{baseRateLabel}</div>
            </div>
            <div className="row">
              <div className="lbl">Config Ver.</div>
              <div className="val">v{dues.taxConfig.version}</div>
            </div>
          </div>
        </div>

        <div className="sec">Annual Letting Value (ALV) — Floor Details</div>
        <div className="alv-wrap">
          <table className="alv">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>Floor</th>
                <th>Usage</th>
                <th>Factor</th>
                <th>Construction</th>
                <th className="c">Area (sqft)</th>
                <th className="c">Rate</th>
                <th className="c">ALV</th>
                <th className="c">Tax</th>
              </tr>
            </thead>
            <tbody>
              {floors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="c muted">
                    No floor data available
                  </td>
                </tr>
              ) : (
                floors.map((f, i) => (
                  <tr key={`${f.floorLabel}-${i}`}>
                    <td className="c">{i + 1}</td>
                    <td>{f.floorLabel}</td>
                    <td>{f.usageType}</td>
                    <td>{f.usageFactor}</td>
                    <td>{f.construction}</td>
                    <td className="r">{money(f.areaSqFt)}</td>
                    <td className="r">{f.rate > 0 ? money(f.rate) : "—"}</td>
                    <td className="r">{money(f.alv)}</td>
                    <td className="r">{money(f.tax)}</td>
                  </tr>
                ))
              )}
              {floors.length > 0 ? (
                <tr className="total">
                  <td colSpan={5} className="c">
                    Total
                  </td>
                  <td className="r">{money(totalArea)}</td>
                  <td className="c">—</td>
                  <td className="r">{money(totalAlv)}</td>
                  <td className="r">{money(totalFloorTax)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="sec">Tax Summary</div>
        <div className="tax-wrap">
          <div className="tax-grid">
            <div className="tax-box">
              <div className="tax-lbl">
                Property Tax ({tax.propertyTaxPct}%)
              </div>
              <div className="tax-amt">₹{money(tax.propertyTax)}</div>
            </div>
            <div className="tax-box">
              <div className="tax-lbl">Water Tax ({tax.waterTaxPct}%)</div>
              <div className="tax-amt">₹{money(tax.waterTax)}</div>
            </div>
            <div className="tax-box">
              <div className="tax-lbl">
                Drainage Tax ({tax.drainageTaxPct}%)
              </div>
              <div className="tax-amt">₹{money(tax.drainageTax)}</div>
            </div>
            <div className="tax-box">
              <div className="tax-lbl">Total Demand</div>
              <div className="tax-amt">₹{money(tax.totalDemand)}</div>
            </div>
          </div>
        </div>

        <div className="notice">
          <div className="notice-title">Important</div>
          <div className="notice-body">
            This is a computer-generated house tax statement based on the
            published municipal tax configuration for the assessment year shown
            above. Please verify particulars with Nagar Panchayat Chhata before
            making payment. To pay online, use the Pay Online button on this
            page and complete payment through the secure gateway.
            {tax.penalty > 0 ? (
              <div className="note">
                Penalty included: ₹{money(tax.penalty)} ({tax.penaltyPct}%).
              </div>
            ) : null}
          </div>
        </div>

        <div className="sig">
          <div className="sig-box">
            <div className="sig-mark">Authorized Signatory</div>
            <div className="sig-line" />
            <div className="sig-role">Executive Officer</div>
            <div className="sig-office">Nagar Panchayat Chhata</div>
          </div>
        </div>
      </article>
    </div>
  )
}

const NOTICE_CSS = `
.demand-notice-root {
  background: #e2e8f0;
  padding: 16px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.demand-notice-root .page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm 11mm 11mm 11mm;
  background: #fff;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", "Noto Sans Devanagari", Lato, Tahoma, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  color: #020617;
}
.demand-notice-root .header {
  display: grid;
  grid-template-columns: 124px 1fr 124px;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 3px solid #0f172a;
}
.demand-notice-root .logo {
  width: 120px; height: 120px;
  display: flex; align-items: center; justify-content: center;
}
.demand-notice-root .logo img {
  width: 120px; height: 120px; object-fit: contain;
}
.demand-notice-root .header-center { text-align: center; }
.demand-notice-root .office-en { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; }
.demand-notice-root .office-loc { font-size: 12px; color: #334155; margin-top: 2px; }
.demand-notice-root .title-en {
  margin-top: 8px; font-size: 26px; font-weight: 800; color: #0369a1;
  line-height: 1.2;
}
.demand-notice-root .title-hi { font-size: 18px; font-weight: 700; margin-top: 4px; }
.demand-notice-root .meta {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden; margin-top: 12px;
}
.demand-notice-root .meta-cell {
  text-align: center; padding: 10px 8px;
  border-right: 1px solid #94a3b8; background: #f8fafc;
}
.demand-notice-root .meta-cell:last-child { border-right: none; }
.demand-notice-root .meta-label {
  font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase;
}
.demand-notice-root .meta-value { font-size: 14px; font-weight: 800; margin-top: 4px; }
.demand-notice-root .cols {
  display: grid; grid-template-columns: 1fr 1fr;
  border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden; margin-top: 12px;
}
.demand-notice-root .col + .col { border-left: 1.5px solid #94a3b8; }
.demand-notice-root .col-head {
  background: #0f172a; color: #fff; font-size: 10px; font-weight: 700;
  letter-spacing: 0.6px; text-transform: uppercase; padding: 7px 10px;
}
.demand-notice-root .row {
  display: grid; grid-template-columns: 40% 60%;
  border-bottom: 1px solid #e2e8f0; min-height: 28px; align-items: stretch;
}
.demand-notice-root .row:last-child { border-bottom: none; }
.demand-notice-root .lbl {
  padding: 7px 10px; font-size: 9px; font-weight: 700; color: #475569;
  text-transform: uppercase; background: #f8fafc; display: flex; align-items: center;
}
.demand-notice-root .val {
  padding: 7px 10px; font-size: 12px; font-weight: 600; display: flex; align-items: center;
}
.demand-notice-root .sec {
  background: #e2e8f0; border: 1.5px solid #94a3b8; border-bottom: none;
  font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
  padding: 7px 10px; margin-top: 12px;
}
.demand-notice-root table.alv {
  width: 100%; border-collapse: collapse; border: 1.5px solid #94a3b8;
}
.demand-notice-root table.alv th {
  background: #0f172a; color: #fff; font-size: 8.5px; font-weight: 700;
  text-transform: uppercase; padding: 8px 4px; border: 1px solid #1e293b; text-align: center;
}
.demand-notice-root table.alv td {
  font-size: 11px; padding: 8px 5px; border: 1px solid #cbd5e1;
}
.demand-notice-root table.alv td.c, .demand-notice-root table.alv th.c { text-align: center; }
.demand-notice-root table.alv td.r { text-align: right; font-variant-numeric: tabular-nums; }
.demand-notice-root table.alv tr.total td { font-weight: 800; background: #f1f5f9; }
.demand-notice-root .muted { color: #64748b; font-style: italic; }
.demand-notice-root .tax-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1.2fr;
  border: 1.5px solid #94a3b8; border-top: none; border-radius: 0 0 4px 4px; overflow: hidden;
}
.demand-notice-root .tax-box {
  text-align: center; padding: 14px 6px; border-right: 1px solid #94a3b8; background: #fff;
}
.demand-notice-root .tax-box:last-child {
  border-right: none; background: #166534; color: #fff;
}
.demand-notice-root .tax-lbl {
  font-size: 9px; font-weight: 700; text-transform: uppercase; color: #475569;
}
.demand-notice-root .tax-box:last-child .tax-lbl { color: #bbf7d0; }
.demand-notice-root .tax-amt {
  font-size: 16px; font-weight: 800; margin-top: 6px; font-variant-numeric: tabular-nums;
}
.demand-notice-root .notice {
  border: 1.5px solid #94a3b8; border-radius: 4px; padding: 10px 12px;
  margin-top: 12px; background: #fffbeb;
}
.demand-notice-root .notice-title {
  font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px;
}
.demand-notice-root .notice-body { font-size: 10px; line-height: 1.55; text-align: justify; }
.demand-notice-root .notice-body .note { margin-top: 6px; font-weight: 600; }
.demand-notice-root .sig {
  display: flex; justify-content: flex-end; margin-top: auto; padding-top: 16px;
}
.demand-notice-root .sig-box { width: 180px; text-align: center; }
.demand-notice-root .sig-mark { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.demand-notice-root .sig-line {
  border-bottom: 1px solid #0f172a; height: 36px; margin-bottom: 6px;
}
.demand-notice-root .sig-role { font-size: 11px; font-weight: 700; }
.demand-notice-root .sig-office { font-size: 10px; color: #475569; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  .no-print { display: none !important; }
  .demand-notice-root {
    background: #fff !important; padding: 0 !important;
  }
  .demand-notice-root .page {
    box-shadow: none; width: 210mm; min-height: 297mm; margin: 0;
  }
}
`
