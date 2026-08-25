"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { DemandNoticeView } from "@/components/propertytax/demand-notice"
import { fetchPublicPropertyDues } from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

export default function PropertyTaxDuesPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""

  const duesQuery = useQuery({
    queryKey: ["public-property-tax-dues", id],
    queryFn: () => fetchPublicPropertyDues(id),
    enabled: Boolean(id),
    retry: false,
  })

  const errorMessage =
    duesQuery.error instanceof PublicApiError
      ? duesQuery.error.message
      : duesQuery.isError
        ? "Unable to load tax dues for this property."
        : null

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="no-print mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wide text-orange-700 uppercase">
              Property Tax · Demand Notice
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Tax Dues
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review the municipal demand notice computed from published tax
              rates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/propertytax"
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!duesQuery.data}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <Link
              href={id ? `/propertytax/pay/${id}` : "/propertytax"}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-linear-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(234,88,12,0.25)] transition-all duration-200 hover:from-orange-700 hover:to-amber-700"
            >
              Pay Online
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {duesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white py-20 text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            <span className="text-sm font-medium">Calculating tax dues…</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
          >
            <p className="text-sm font-semibold text-red-900">{errorMessage}</p>
            <Link
              href="/propertytax"
              className="mt-4 inline-flex cursor-pointer text-sm font-bold text-orange-700 hover:underline"
            >
              Return to property search
            </Link>
          </div>
        ) : null}

        {duesQuery.data ? <DemandNoticeView dues={duesQuery.data} /> : null}
      </div>
    </div>
  )
}
