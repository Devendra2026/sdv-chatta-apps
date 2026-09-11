import type { PublicPropertyTaxDues } from "@workspace/types"
import type { ReactNode } from "react"

import { formatHouseTaxMoney } from "@/lib/property-tax-format"

type TaxFloorTableProps = {
  dues: PublicPropertyTaxDues
  className?: string
}

function HeaderCell({
  children,
  align = "center",
}: {
  children: ReactNode
  align?: "center" | "right" | "left"
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "left"
        ? "text-left"
        : "text-center"
  return (
    <th
      scope="col"
      className={`border border-slate-700 bg-gov-blue-dark px-2 py-2 text-[10px] leading-tight font-bold tracking-wide text-white uppercase sm:px-2.5 sm:text-[11px] ${alignClass}`}
    >
      {children}
    </th>
  )
}

export function TaxFloorTable({ dues, className = "" }: TaxFloorTableProps) {
  const floors = dues.floors
  const totalArea = floors.reduce((s, f) => s + f.areaSqFt, 0)
  const totalAlv = floors.reduce((s, f) => s + f.alv, 0)
  const totalTax = floors.reduce((s, f) => s + f.tax, 0)
  const taxPct = dues.tax.propertyTaxPct

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:rounded-none print:border-slate-300 print:shadow-none ${className}`}
      aria-labelledby="tax-calculation-heading"
    >
      <h2
        id="tax-calculation-heading"
        className="text-gov-blue-dark text-sm font-bold tracking-tight sm:text-base"
      >
        Assessment &amp; ALV Calculation Details / मूल्यांकन एवं वार्षिक
        मूल्यांकन विवरण
      </h2>

      {floors.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No floor-wise calculation lines are available for this property.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-4xl border-collapse text-left text-sm print:min-w-0">
            <caption className="sr-only">
              Floor-wise assessment and ALV calculation for assessment year{" "}
              {dues.assessmentYear.name}
            </caption>
            <thead>
              <tr>
                <HeaderCell>
                  S.NO
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    क्र.सं.
                  </span>
                </HeaderCell>
                <HeaderCell>
                  Floor / तल
                </HeaderCell>
                <HeaderCell align="left">
                  Usage Type
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    उपयोग का प्रकार
                  </span>
                </HeaderCell>
                <HeaderCell>
                  Usage Factor
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    उपयोगिता कारक
                  </span>
                </HeaderCell>
                <HeaderCell>
                  Construction
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    निर्माण
                  </span>
                </HeaderCell>
                <HeaderCell align="right">
                  Area (Sqft)
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    क्षेत्रफल
                  </span>
                </HeaderCell>
                <HeaderCell align="right">
                  Rate (₹)
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    दर
                  </span>
                </HeaderCell>
                <HeaderCell align="right">
                  ALV (₹)
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    वार्षिक मूल्यांकन
                  </span>
                </HeaderCell>
                <HeaderCell align="right">
                  Tax ({taxPct}%)
                  <span className="mt-0.5 block font-semibold normal-case opacity-90">
                    कर
                  </span>
                </HeaderCell>
              </tr>
            </thead>
            <tbody>
              {floors.map((floor, index) => (
                <tr
                  key={`${floor.floorLabel}-${index}`}
                  className="bg-white odd:bg-slate-50/80"
                >
                  <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums text-slate-800 sm:px-2.5">
                    {index + 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-medium text-slate-900 sm:px-2.5">
                    {floor.floorLabel || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-700 sm:px-2.5">
                    {floor.usageType || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 sm:px-2.5">
                    {floor.usageFactor || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 sm:px-2.5">
                    {floor.construction || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-slate-800 sm:px-2.5">
                    {formatHouseTaxMoney(floor.areaSqFt)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-slate-800 sm:px-2.5">
                    {floor.rate > 0
                      ? `₹${formatHouseTaxMoney(floor.rate)}`
                      : "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums text-slate-800 sm:px-2.5">
                    ₹{formatHouseTaxMoney(floor.alv)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold tabular-nums text-slate-900 sm:px-2.5">
                    ₹{formatHouseTaxMoney(floor.tax)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-500 bg-slate-100 font-extrabold text-slate-950">
                <th
                  scope="row"
                  colSpan={5}
                  className="border border-slate-300 px-2 py-2 text-right text-xs tracking-wide uppercase sm:px-2.5 sm:text-sm"
                >
                  TOTAL
                </th>
                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums sm:px-2.5">
                  {formatHouseTaxMoney(totalArea)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right sm:px-2.5">
                  —
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums sm:px-2.5">
                  ₹{formatHouseTaxMoney(totalAlv)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums sm:px-2.5">
                  ₹{formatHouseTaxMoney(totalTax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
