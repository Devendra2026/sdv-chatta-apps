import type { PublicPropertyTaxDues } from "@workspace/types"

import { formatHouseTaxMoney } from "@/lib/property-tax-format"

type TaxFloorTableProps = {
  dues: PublicPropertyTaxDues
  className?: string
}

export function TaxFloorTable({ dues, className = "" }: TaxFloorTableProps) {
  const floors = dues.floors
  const totalArea = floors.reduce((s, f) => s + f.areaSqFt, 0)
  const totalAlv = floors.reduce((s, f) => s + f.alv, 0)
  const totalTax = floors.reduce((s, f) => s + f.tax, 0)

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby="tax-calculation-heading"
    >
      <h2
        id="tax-calculation-heading"
        className="text-gov-blue-dark text-base font-bold tracking-tight"
      >
        Tax Calculation
      </h2>

      {floors.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No floor-wise calculation lines are available for this property.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-left text-sm">
            <caption className="sr-only">
              Floor-wise house tax calculation for assessment year{" "}
              {dues.assessmentYear.name}
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th scope="col" className="px-3 py-2.5 font-bold text-slate-700">
                  Floor
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold text-slate-700">
                  Usage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-bold text-slate-700"
                >
                  Area (sq ft)
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-bold text-slate-700"
                >
                  Rate
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-bold text-slate-700"
                >
                  ALV
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-bold text-slate-700"
                >
                  Tax
                </th>
              </tr>
            </thead>
            <tbody>
              {floors.map((floor, index) => (
                <tr
                  key={`${floor.floorLabel}-${index}`}
                  className="border-b border-slate-100"
                >
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    {floor.floorLabel || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {floor.usageType || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                    {formatHouseTaxMoney(floor.areaSqFt)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                    ₹{formatHouseTaxMoney(floor.rate)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                    ₹{formatHouseTaxMoney(floor.alv)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    ₹{formatHouseTaxMoney(floor.tax)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-950">
                <td colSpan={2} className="px-3 py-2.5">
                  Total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatHouseTaxMoney(totalArea)}
                </td>
                <td className="px-3 py-2.5 text-right">—</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  ₹{formatHouseTaxMoney(totalAlv)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
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
