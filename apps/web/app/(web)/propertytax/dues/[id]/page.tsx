"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Eye, Loader2, Printer } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRef } from "react"

import { DemandNoticeView } from "@/components/propertytax/demand-notice"
import { PaymentProcessSteps } from "@/components/propertytax/payment-process-steps"
import { PropertySummaryCard } from "@/components/propertytax/property-summary-card"
import { TaxFloorTable } from "@/components/propertytax/tax-floor-table"
import { TaxSummaryCard } from "@/components/propertytax/tax-summary-card"
import { isHouseTaxPayable } from "@/lib/property-tax-format"
import { fetchPublicPropertyDues } from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

export default function PropertyTaxDuesPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""
  const statementRef = useRef<HTMLDivElement>(null)

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

  const dues = duesQuery.data
  const payable = dues ? isHouseTaxPayable(dues) : false
  const payHref = id ? `/propertytax/pay/${id}` : "/propertytax"

  function handlePrintStatement() {
    window.print()
  }

  function handleViewStatement() {
    statementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="no-print mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <PaymentProcessSteps current={2} className="mb-6" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-gov-saffron-dark text-xs font-bold tracking-wide uppercase">
              Online House Tax
            </p>
            <h1 className="text-gov-blue-dark mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Online House Tax Payment
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Review your house tax dues before continuing to secure online
              payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/propertytax"
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Search
            </Link>
            <button
              type="button"
              onClick={handlePrintStatement}
              disabled={!dues}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print Statement
            </button>
            {payable ? (
              <Link
                href={payHref}
                className="bg-gov-saffron hover:bg-gov-saffron-dark focus-visible:ring-gov-saffron inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Pay Online
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-16">
        {duesQuery.isLoading ? (
          <div className="no-print flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-20 text-slate-600 shadow-sm">
            <Loader2 className="text-gov-saffron h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Calculating tax dues…</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="no-print rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
          >
            <p className="text-sm font-semibold text-red-900">{errorMessage}</p>
            <Link
              href="/propertytax"
              className="text-gov-saffron-dark mt-4 inline-flex cursor-pointer text-sm font-bold hover:underline"
            >
              Return to property search
            </Link>
          </div>
        ) : null}

        {dues ? (
          <>
            <div className="no-print grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="order-2 space-y-6 lg:order-1">
                <PropertySummaryCard dues={dues} />
                <TaxFloorTable dues={dues} />

                <div
                  role="note"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <p className="font-semibold text-slate-900">
                    Please review your tax details and total amount before
                    proceeding to payment.
                  </p>
                  <p className="mt-1 text-slate-600">
                    By continuing, you will enter payer details and be redirected
                    to the municipal payment gateway.
                  </p>
                </div>
              </div>

              <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
                <TaxSummaryCard dues={dues} payHref={payHref} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleViewStatement}
                    className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    View Statement
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print
                  </button>
                </div>
              </aside>
            </div>

            <div
              ref={statementRef}
              className="mt-8 scroll-mt-8"
              id="house-tax-statement"
            >
              <div className="no-print mb-3 flex items-center justify-between gap-3">
                <h2 className="text-gov-blue-dark text-base font-bold tracking-tight">
                  House Tax Statement
                </h2>
                <p className="text-xs text-slate-500">
                  Official municipal statement for print
                </p>
              </div>
              <DemandNoticeView dues={dues} />
            </div>

            {payable ? (
              <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden">
                <Link
                  href={payHref}
                  className="bg-gov-saffron hover:bg-gov-saffron-dark focus-visible:ring-gov-saffron inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Pay Online · ₹
                  {dues.tax.totalDemand.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
