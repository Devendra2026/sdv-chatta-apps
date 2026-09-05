"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, type FormEvent } from "react"

import { PaymentProcessSteps } from "@/components/propertytax/payment-process-steps"
import { openAtomAipayCheckout } from "@/lib/atom-checkout"
import {
  createPublicPropertyTaxPayment,
  fetchPublicPropertyDues,
} from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PropertyTaxPayPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""

  const [mobile, setMobile] = useState("")
  const [email, setEmail] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  const duesQuery = useQuery({
    queryKey: ["public-property-tax-dues", id],
    queryFn: () => fetchPublicPropertyDues(id),
    enabled: Boolean(id),
    retry: false,
  })

  const payMutation = useMutation({
    mutationFn: () =>
      createPublicPropertyTaxPayment({
        surveyId: id,
        payerMobile: mobile,
        payerEmail: email.trim() || undefined,
      }),
    onSuccess: async (data) => {
      try {
        if (data.checkout?.mode === "aipay") {
          await openAtomAipayCheckout(data.checkout)
          return
        }
        if (data.redirectUrl) {
          window.location.assign(data.redirectUrl)
          return
        }
        throw new Error("Payment gateway did not return checkout details.")
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to open payment gateway. Please try again."
        setFieldError(message)
      }
    },
  })

  const dues = duesQuery.data
  const alreadyPaid = dues?.paidForAssessmentYear === true
  const payable =
    dues != null && dues.tax.totalDemand > 0 && !alreadyPaid
  const loadError =
    duesQuery.error instanceof PublicApiError
      ? duesQuery.error.message
      : duesQuery.isError
        ? "Unable to load tax dues for this property."
        : null
  const payError =
    payMutation.error instanceof PublicApiError
      ? payMutation.error.message
      : payMutation.isError
        ? "Unable to start payment. Please try again."
        : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldError(null)
    if (!/^\d{10}$/.test(mobile)) {
      setFieldError("Enter a valid 10-digit mobile number.")
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Enter a valid email address or leave it blank.")
      return
    }
    if (!payable || payMutation.isPending) return
    payMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        <PaymentProcessSteps current={3} className="mb-6" />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wide text-orange-700 uppercase">
              House Tax · Online Payment
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Online House Tax Payment
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Confirm the amount fixed by published municipal rates, then
              continue to the secure payment gateway.
            </p>
          </div>
          <Link
            href={id ? `/propertytax/dues/${id}` : "/propertytax"}
            className="inline-flex cursor-pointer items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dues
          </Link>
        </div>

        {duesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white py-20 text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            <span className="text-sm font-medium">Loading payable amount…</span>
          </div>
        ) : null}

        {loadError ? (
          <div
            role="alert"
            className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
          >
            <p className="text-sm font-semibold text-red-900">{loadError}</p>
            <Link
              href="/propertytax"
              className="mt-4 inline-flex cursor-pointer text-sm font-bold text-orange-700 hover:underline"
            >
              Return to property search
            </Link>
          </div>
        ) : null}

        {dues ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-100 bg-linear-to-r from-orange-600 to-amber-600 px-6 py-8 text-white sm:px-8">
                <p className="text-xs font-bold tracking-wider uppercase opacity-90">
                  Amount payable
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
                  ₹{money(dues.tax.totalDemand)}
                </p>
                <p className="mt-2 text-sm text-orange-50">
                  Assessment year {dues.assessmentYear.name} · Ward{" "}
                  {String(dues.wardNumber).padStart(2, "0")}
                </p>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
                <Info label="Survey / Property ID" value={dues.surveyId} />
                <Info label="Property No." value={dues.propertyNo || "—"} />
                <Info label="Owner" value={dues.ownerName || "—"} />
                <Info label="Ward" value={dues.wardName} />
              </div>

              <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
                <p className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  Tax breakdown
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <BreakdownRow
                    label="House / property tax"
                    value={dues.tax.propertyTax}
                  />
                  <BreakdownRow label="Water tax" value={dues.tax.waterTax} />
                  <BreakdownRow
                    label="Drainage tax"
                    value={dues.tax.drainageTax}
                  />
                  <BreakdownRow label="Penalty" value={dues.tax.penalty} />
                  <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 font-bold text-slate-950">
                    <span>Total demand</span>
                    <span className="tabular-nums">
                      ₹{money(dues.tax.totalDemand)}
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {!payable ? (
              <div
                role="alert"
                className={`rounded-[28px] border px-6 py-6 text-sm shadow-sm ${
                  alreadyPaid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                {alreadyPaid && dues ? (
                  <>
                    <p className="font-semibold">
                      No dues for assessment year {dues.assessmentYear.name}.
                    </p>
                    <p className="mt-1 opacity-80">
                      Property tax for this assessment year has already been
                      paid. You can download your receipt from the payment
                      success page if you have the transaction id.
                    </p>
                    <Link
                      href="/propertytax"
                      className="mt-4 inline-flex cursor-pointer text-sm font-bold text-emerald-800 underline-offset-2 hover:underline"
                    >
                      Return to property search
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">
                      Online payment is not available for this property yet.
                    </p>
                    <p className="mt-1 text-amber-900/80">
                      Published tax rates may be missing or set to zero. Please
                      contact Nagar Panchayat Chhata or try again after rates are
                      updated.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
                  Payer details
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter a mobile number for payment confirmation. Email is
                  optional.
                </p>

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <p>
                    This is an official Nagar Panchayat Chhata house tax
                    payment. The amount is fixed by published rates and cannot
                    be changed.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="payer-mobile"
                      className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                    >
                      <Phone className="h-3.5 w-3.5 text-orange-500" />
                      Mobile number (required)
                    </label>
                    <input
                      id="payer-mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="10-digit mobile number"
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={
                        fieldError || payError ? "pay-form-error" : undefined
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="payer-email"
                      className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                    >
                      <Mail className="h-3.5 w-3.5 text-orange-500" />
                      Email (optional)
                    </label>
                    <input
                      id="payer-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                    />
                  </div>
                </div>

                {fieldError || payError ? (
                  <p
                    id="pay-form-error"
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    {fieldError || payError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-orange-600 to-amber-600 px-8 py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(234,88,12,0.3)] transition-all duration-200 hover:from-orange-700 hover:to-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:active:scale-100"
                >
                  {payMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>
                    {payMutation.isPending
                      ? "Redirecting to payment…"
                      : "Proceed to secure payment"}
                  </span>
                </button>

                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  You will be redirected to the payment gateway
                </p>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">₹{money(value)}</span>
    </li>
  )
}
