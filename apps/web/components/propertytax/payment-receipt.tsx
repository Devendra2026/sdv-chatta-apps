"use client"

import type { PublicPropertyTaxReceipt } from "@workspace/types"

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

export function PaymentReceiptView({
  receipt,
}: {
  receipt: PublicPropertyTaxReceipt
}) {
  return (
    <div className="receipt-root">
      <style>{RECEIPT_CSS}</style>
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
            <div className="title-en">Property Tax Payment Receipt</div>
            <div className="title-hi">सम्पत्ति कर भुगतान रसीद</div>
          </div>
          <div className="logo" aria-hidden />
        </header>

        <div className="status-banner">PAYMENT SUCCESSFUL</div>

        <div className="meta">
          <div className="meta-cell">
            <div className="meta-label">Receipt No.</div>
            <div className="meta-value">
              {receipt.receiptNumber || receipt.merchTxnId || "—"}
            </div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Paid on</div>
            <div className="meta-value">{formatWhen(receipt.paidAt)}</div>
          </div>
          <div className="meta-cell">
            <div className="meta-label">Amount</div>
            <div className="meta-value amount">₹{money(receipt.amount)}</div>
          </div>
        </div>

        <div className="cols">
          <div className="col">
            <div className="col-head">Transaction</div>
            <div className="row">
              <div className="lbl">Merchant Txn ID</div>
              <div className="val">{receipt.merchTxnId || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Gateway Txn ID</div>
              <div className="val">{receipt.atomTxnId || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Gateway</div>
              <div className="val">{receipt.gateway || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Currency</div>
              <div className="val">{receipt.currency}</div>
            </div>
          </div>
          <div className="col">
            <div className="col-head">Property</div>
            <div className="row">
              <div className="lbl">Survey / Property ID</div>
              <div className="val">{receipt.surveyId || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Property No.</div>
              <div className="val">{receipt.propertyNo || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Parcel No.</div>
              <div className="val">{receipt.parcelNo || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Ward</div>
              <div className="val">
                {receipt.wardNumber != null
                  ? `${String(receipt.wardNumber).padStart(2, "0")} · ${receipt.wardName ?? ""}`
                  : "—"}
              </div>
            </div>
            <div className="row">
              <div className="lbl">Assessment Year</div>
              <div className="val">{receipt.assessmentYear || "—"}</div>
            </div>
            <div className="row">
              <div className="lbl">Payer Mobile</div>
              <div className="val">{receipt.payerMobileMasked}</div>
            </div>
          </div>
        </div>

        {receipt.taxBreakdown ? (
          <div className="breakdown">
            <div className="col-head">Tax components (at payment)</div>
            <table>
              <tbody>
                <tr>
                  <td>Property tax</td>
                  <td className="num">
                    ₹{money(receipt.taxBreakdown.propertyTax)}
                  </td>
                </tr>
                <tr>
                  <td>Water tax</td>
                  <td className="num">
                    ₹{money(receipt.taxBreakdown.waterTax)}
                  </td>
                </tr>
                <tr>
                  <td>Drainage tax</td>
                  <td className="num">
                    ₹{money(receipt.taxBreakdown.drainageTax)}
                  </td>
                </tr>
                <tr>
                  <td>Penalty</td>
                  <td className="num">
                    ₹{money(receipt.taxBreakdown.penalty)}
                  </td>
                </tr>
                <tr className="total">
                  <td>Total demand</td>
                  <td className="num">
                    ₹{money(receipt.taxBreakdown.totalDemand)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="footer">
          This is a computer-generated receipt for online property tax payment
          to Nagar Panchayat Chhata. Retain for your records.
        </footer>
      </article>
    </div>
  )
}

const RECEIPT_CSS = `
.receipt-root { color: #0f172a; }
.receipt-root .page {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px 32px 36px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.06);
}
.receipt-root .header {
  display: grid;
  grid-template-columns: 72px 1fr 72px;
  gap: 12px;
  align-items: center;
  border-bottom: 3px solid #ea580c;
  padding-bottom: 16px;
}
.receipt-root .logo {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.receipt-root .logo img {
  max-width: 64px;
  max-height: 64px;
  object-fit: contain;
}
.receipt-root .header-center { text-align: center; }
.receipt-root .office-en {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.receipt-root .office-loc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.receipt-root .title-en {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 800;
  color: #c2410c;
}
.receipt-root .title-hi {
  font-size: 13px;
  color: #9a3412;
  margin-top: 2px;
}
.receipt-root .status-banner {
  margin: 18px 0 14px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 8px 14px;
}
.receipt-root .meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.receipt-root .meta-cell {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fafc;
}
.receipt-root .meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}
.receipt-root .meta-value {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  word-break: break-all;
}
.receipt-root .meta-value.amount {
  color: #c2410c;
  font-size: 18px;
}
.receipt-root .cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.receipt-root .col {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.receipt-root .col-head {
  background: #fff7ed;
  color: #9a3412;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 12px;
  border-bottom: 1px solid #fed7aa;
}
.receipt-root .row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
}
.receipt-root .row:last-child { border-bottom: 0; }
.receipt-root .lbl { color: #64748b; font-weight: 600; }
.receipt-root .val { font-weight: 700; word-break: break-word; }
.receipt-root .breakdown {
  margin-top: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.receipt-root .breakdown table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.receipt-root .breakdown td {
  padding: 8px 12px;
  border-top: 1px solid #f1f5f9;
}
.receipt-root .breakdown .num {
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.receipt-root .breakdown tr.total td {
  background: #fff7ed;
  font-weight: 800;
  color: #9a3412;
}
.receipt-root .footer {
  margin-top: 18px;
  font-size: 11px;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
}
@media (max-width: 720px) {
  .receipt-root .meta { grid-template-columns: 1fr; }
  .receipt-root .cols { grid-template-columns: 1fr; }
  .receipt-root .row { grid-template-columns: 1fr; }
}
@media print {
  .no-print { display: none !important; }
  .receipt-root .page {
    border: 0;
    box-shadow: none;
    border-radius: 0;
    max-width: none;
    padding: 0;
  }
}
`
