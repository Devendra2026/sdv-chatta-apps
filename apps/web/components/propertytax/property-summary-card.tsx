import type { PublicPropertyTaxDues } from "@workspace/types"

import { buildHouseTaxAddress } from "@/lib/property-tax-format"

type PropertySummaryCardProps = {
  dues: PublicPropertyTaxDues
  className?: string
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(8rem,11rem)_1fr] sm:gap-3">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  )
}

export function PropertySummaryCard({
  dues,
  className = "",
}: PropertySummaryCardProps) {
  const wardLabel = `${String(dues.wardNumber).padStart(2, "0")} · ${dues.wardName}`
  const roadZone = dues.taxRateZone || dues.roadType || "—"

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby="property-summary-heading"
    >
      <h2
        id="property-summary-heading"
        className="text-gov-blue-dark text-base font-bold tracking-tight"
      >
        Property / Assessment Summary
      </h2>
      <dl className="mt-4 space-y-3">
        <Row label="Assessment Year" value={dues.assessmentYear.name} />
        <Row label="Survey / Property ID" value={dues.surveyId} />
        <Row label="Ward" value={wardLabel} />
        <Row label="Property No." value={dues.propertyNo || "—"} />
        <Row label="Owner" value={dues.ownerName || "—"} />
        <Row label="Address" value={buildHouseTaxAddress(dues)} />
        <Row label="Property Use" value={dues.propertyUse || "—"} />
        <Row label="Road Width Zone" value={roadZone} />
      </dl>
    </section>
  )
}
