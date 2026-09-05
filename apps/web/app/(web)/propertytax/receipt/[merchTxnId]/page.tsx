"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { PaymentProcessSteps } from "@/components/propertytax/payment-process-steps"
import { PaymentReceiptView } from "@/components/propertytax/payment-receipt"
import { fetchPublicPaymentReceipt } from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

export default function PropertyTaxReceiptPage() {
  const params = useParams<{ merchTxnId: string }>()
  const merchTxnId =
    typeof params.merchTxnId === "string"
      ? decodeURIComponent(params.merchTxnId)
      : ""

  const receiptQuery = useQuery({
    queryKey: ["public-property-tax-receipt", merchTxnId],
    queryFn: () => fetchPublicPaymentReceipt(merchTxnId),
    enabled: Boolean(merchTxnId),
    retry: false,
  })

  const errorMessage =
    receiptQuery.error instanceof PublicApiError
      ? receiptQuery.error.message
      : receiptQuery.isError
        ? "Receipt is not available for this transaction."
        : null

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="no-print mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <PaymentProcessSteps current={4} className="mb-6" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wide text-orange-700 uppercase">
              House Tax · Receipt
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Payment receipt
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Official online house tax payment receipt for Nagar Panchayat
              Chhata.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/propertytax"
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!receiptQuery.data}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-linear-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(234,88,12,0.25)] transition-all duration-200 hover:from-orange-700 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {receiptQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white py-20 text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            <span className="text-sm font-medium">Loading receipt…</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
          >
            <p className="text-sm font-semibold text-red-900">{errorMessage}</p>
            {merchTxnId ? (
              <Link
                href={`/propertytax/payment/return?merchTxnId=${encodeURIComponent(merchTxnId)}`}
                className="mt-4 inline-flex cursor-pointer text-sm font-bold text-orange-700 hover:underline"
              >
                Check payment status
              </Link>
            ) : null}
          </div>
        ) : null}

        {receiptQuery.data ? (
          <PaymentReceiptView receipt={receiptQuery.data} />
        ) : null}
      </div>
    </div>
  )
}
