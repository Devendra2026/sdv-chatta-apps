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
  { id: 3, label: "Pay", hint: "Secure payment", Icon: CreditCard },
  { id: 4, label: "Receipt", hint: "Payment proof", Icon: Receipt },
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
  const currentStep = STEPS[current - 1]

  return (
    <nav
      aria-label="Payment process"
      className={`no-print overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {/* Mobile compact indicator */}
      <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
        <p className="text-gov-saffron-dark text-[11px] font-bold tracking-[0.14em] uppercase">
          Payment process
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          Step {current} of {STEPS.length}
          <span className="font-normal text-slate-500">
            {" "}
            · {currentStep?.label}
          </span>
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${current} of ${STEPS.length}: ${currentStep?.label ?? ""}`}
        >
          <div
            className="bg-gov-saffron h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {currentStep?.id === current
            ? current < STEPS.length
              ? `Current · next: ${STEPS[current]?.label}`
              : "Current"
            : null}
        </p>
      </div>

      {/* Desktop header + steps */}
      <div className="hidden border-b border-slate-100 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-6">
        <div>
          <p className="text-gov-saffron-dark text-[11px] font-bold tracking-[0.14em] uppercase">
            Payment process
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            Step {current} of {STEPS.length}
            <span className="font-normal text-slate-500">
              {" "}
              · {currentStep?.label}
            </span>
          </p>
        </div>
        <p className="text-xs font-medium text-slate-500">
          Search → Review → Pay → Receipt
        </p>
      </div>

      <div className="relative hidden px-4 py-5 sm:block sm:px-6 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[2.65rem] right-10 left-10 h-1.5 rounded-full bg-slate-200/90"
        >
          <div
            className="bg-gov-green h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-4 gap-4">
          {STEPS.map((step) => {
            const isComplete = step.id < current
            const isCurrent = step.id === current
            const Icon = step.Icon

            return (
              <li
                key={step.id}
                className={`relative flex flex-col items-center gap-2.5 rounded-xl border px-3 py-4 text-center transition-colors duration-200 motion-reduce:transition-none ${
                  isCurrent
                    ? "border-gov-saffron bg-gov-orange-light ring-gov-saffron/25 shadow-sm ring-2"
                    : isComplete
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50/80"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-200 motion-reduce:transition-none ${
                    isComplete
                      ? "border-gov-green bg-gov-green text-white"
                      : isCurrent
                        ? "border-gov-saffron bg-gov-saffron text-white"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </span>

                <div>
                  <p
                    className={`text-sm font-bold ${
                      isCurrent
                        ? "text-gov-saffron-dark"
                        : isComplete
                          ? "text-emerald-900"
                          : "text-slate-500"
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
                        ? "text-gov-saffron-dark/80"
                        : isComplete
                          ? "text-emerald-800/80"
                          : "text-slate-400"
                    }`}
                  >
                    {isCurrent
                      ? "Current"
                      : isComplete
                        ? "Completed"
                        : step.hint}
                  </p>
                </div>

                {isCurrent ? (
                  <span className="bg-gov-saffron absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    Current
                  </span>
                ) : null}
                {isComplete ? (
                  <span className="sr-only">Completed</span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
