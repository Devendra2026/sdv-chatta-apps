"use client"

import type { LucideIcon } from "lucide-react"
import { Check, CreditCard, FileSearch, Receipt, Search } from "lucide-react"

const STEPS: ReadonlyArray<{
  id: 1 | 2 | 3 | 4
  label: string
  hint: string
  Icon: LucideIcon
}> = [
  { id: 1, label: "Search", hint: "Find property", Icon: Search },
  { id: 2, label: "Review dues", hint: "Check tax bill", Icon: FileSearch },
  { id: 3, label: "Pay", hint: "Secure gateway", Icon: CreditCard },
  { id: 4, label: "Receipt", hint: "Official proof", Icon: Receipt },
]

export type PaymentProcessStep = 1 | 2 | 3 | 4

type PaymentProcessStepsProps = {
  current: PaymentProcessStep
  className?: string
}

export function PaymentProcessSteps({
  current,
  className = "",
}: PaymentProcessStepsProps) {
  const progressPct = ((current - 1) / (STEPS.length - 1)) * 100

  return (
    <nav
      aria-label="Payment process"
      className={`no-print overflow-hidden rounded-2xl border border-orange-200/80 bg-linear-to-br from-orange-50 via-white to-amber-50 shadow-[0_12px_40px_rgba(234,88,12,0.08)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 px-4 py-3 sm:px-6">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-orange-700 uppercase">
            Payment process
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            Step {current} of {STEPS.length}
            <span className="font-normal text-slate-500">
              {" "}
              · {STEPS[current - 1]?.label}
            </span>
          </p>
        </div>
        <p className="hidden text-xs font-medium text-slate-500 sm:block">
          Search → Review → Pay → Receipt
        </p>
      </div>

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Desktop progress track */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[2.65rem] right-10 left-10 hidden h-1.5 rounded-full bg-slate-200/90 sm:block"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-orange-500 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
          {STEPS.map((step) => {
            const isComplete = step.id < current
            const isCurrent = step.id === current
            const Icon = step.Icon

            return (
              <li
                key={step.id}
                className={`relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors duration-200 motion-reduce:transition-none sm:flex-col sm:items-center sm:gap-2.5 sm:px-3 sm:py-4 sm:text-center ${
                  isCurrent
                    ? "border-orange-300 bg-white shadow-[0_8px_24px_rgba(234,88,12,0.12)] ring-2 ring-orange-500/15"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200/80 bg-white/70"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-200 motion-reduce:transition-none ${
                    isComplete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isCurrent
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1 sm:flex-none">
                  <p
                    className={`text-sm font-bold ${
                      isCurrent
                        ? "text-orange-800"
                        : isComplete
                          ? "text-emerald-900"
                          : "text-slate-600"
                    }`}
                  >
                    {step.label}
                    {isComplete ? (
                      <span className="sr-only"> (completed)</span>
                    ) : null}
                    {isCurrent ? (
                      <span className="sr-only"> (current)</span>
                    ) : null}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isCurrent
                        ? "text-orange-700/80"
                        : isComplete
                          ? "text-emerald-800/70"
                          : "text-slate-500"
                    }`}
                  >
                    {isCurrent
                      ? "In progress"
                      : isComplete
                        ? "Completed"
                        : step.hint}
                  </p>
                </div>

                {isCurrent ? (
                  <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase sm:absolute sm:-top-2 sm:right-2">
                    Current
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
