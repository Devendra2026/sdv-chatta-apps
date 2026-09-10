"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { PaymentProcessSteps } from "@/components/propertytax/payment-process-steps"
import { fetchPublicPaymentStatus } from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

type StatusKind =
  | "success"
  | "failed"
  | "cancelled"
  | "confirming"
  | "loading"

function resolveStatusKind(
  status: string | undefined,
  isLoading: boolean
): StatusKind {
  if (isLoading && !status) return "loading"
  if (status === "SUCCESS") return "success"
  if (status === "CANCELLED") return "cancelled"
  if (status === "FAILED" || status === "REFUNDED") return "failed"
  // PENDING, INITIATED, PARTIALLY_REFUNDED, unknown — do not say failed
  return "confirming"
}

function PaymentReturnContent() {
  const searchParams = useSearchParams()
  const merchTxnId = searchParams.get("merchTxnId")?.trim() ?? ""

  const statusQuery = useQuery({
    queryKey: ["public-property-tax-payment", merchTxnId],
    queryFn: () => fetchPublicPaymentStatus(merchTxnId, true),
    enabled: Boolean(merchTxnId),
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "PENDING" || status === "INITIATED") return 3000
      return false
    },
  })

  const errorMessage = !merchTxnId
    ? "Missing payment reference. If you completed payment, use the link from your bank SMS or contact the municipal office."
    : statusQuery.error instanceof PublicApiError
      ? statusQuery.error.message
      : statusQuery.isError
        ? "Unable to load payment status."
        : null

  const payment = statusQuery.data
  const kind = resolveStatusKind(payment?.status, statusQuery.isLoading)

  const title =
    kind === "success"
      ? "Payment successful"
      : kind === "failed"
        ? "Payment not completed"
        : kind === "cancelled"
          ? "Payment was cancelled"
          : "Payment status is being confirmed."

  const description =
    kind === "success"
      ? "Your house tax payment has been recorded. You can download or print the official receipt."
      : kind === "failed"
        ? "The payment gateway reported that this payment did not succeed. You may try again from the dues page."
        : kind === "cancelled"
          ? "This payment was cancelled. No amount was collected. You may start again from the dues page."
          : "We are confirming the payment with the gateway. This page updates automatically. Please do not close this window."

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        <PaymentProcessSteps current={4} className="mb-6" />

        <div className="mb-8">
          <p className="text-gov-saffron-dark text-xs font-bold tracking-wide uppercase">
            Online House Tax · Payment Status
          </p>
          <h1 className="text-gov-blue-dark mt-1 text-2xl font-extrabold tracking-tight">
            Payment return
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirming your house tax transaction with the municipal payment
            system.
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
          >
            <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-red-900">
              {errorMessage}
            </p>
            <Link
              href="/propertytax"
              className="text-gov-saffron-dark mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-bold hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to property search
            </Link>
          </div>
        ) : null}

        {!errorMessage && payment ? (
          <section
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex flex-col items-center text-center">
              {kind === "success" ? (
                <CheckCircle2
                  className="text-gov-green h-12 w-12"
                  aria-hidden
                />
              ) : kind === "failed" || kind === "cancelled" ? (
                <XCircle className="h-12 w-12 text-red-500" aria-hidden />
              ) : (
                <Clock3 className="h-12 w-12 text-amber-500" aria-hidden />
              )}
              <h2 className="text-gov-blue-dark mt-4 text-xl font-extrabold">
                {title}
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                {description}
              </p>
            </div>

            <dl className="mt-8 space-y-3 border-t border-slate-100 pt-6 text-sm">
              <Row label="Transaction ID" value={payment.merchTxnId || "—"} />
              <Row
                label="Receipt number"
                value={payment.receiptNumber || "—"}
              />
              <Row
                label="Amount"
                value={`₹${money(payment.amount)} ${payment.currency}`}
              />
              <Row label="Status" value={payment.status} />
              <Row label="Property ID" value={payment.surveyId || "—"} />
              <Row label="Property No." value={payment.propertyNo || "—"} />
              <Row
                label="Ward"
                value={
                  payment.wardNumber != null
                    ? `${String(payment.wardNumber).padStart(2, "0")} · ${payment.wardName ?? ""}`
                    : "—"
                }
              />
              <Row label="Mobile" value={payment.payerMobileMasked} />
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {kind === "success" && merchTxnId ? (
                <Link
                  href={`/propertytax/receipt/${encodeURIComponent(merchTxnId)}`}
                  className="bg-gov-saffron hover:bg-gov-saffron-dark focus-visible:ring-gov-saffron inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <Receipt className="h-4 w-4" aria-hidden />
                  View receipt
                </Link>
              ) : null}
              {kind !== "success" && payment.id ? (
                <Link
                  href={`/propertytax/dues/${payment.id}`}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Return to dues
                </Link>
              ) : null}
              <Link
                href="/propertytax"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Property search
              </Link>
            </div>

            {kind === "confirming" || kind === "loading" ? (
              <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="text-gov-saffron h-3.5 w-3.5 animate-spin" />
                Checking gateway status…
              </p>
            ) : null}
          </section>
        ) : null}

        {!errorMessage && !payment && statusQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-20 text-slate-600 shadow-sm">
            <Loader2 className="text-gov-saffron h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Confirming payment…</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="font-semibold break-all text-slate-900">{value}</dd>
    </div>
  )
}

export default function PropertyTaxPaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f8fafc] text-slate-600">
          <Loader2 className="text-gov-saffron h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading payment status…</span>
        </div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  )
}
