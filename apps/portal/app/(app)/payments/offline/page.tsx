"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import type { StaffPaymentReceipt } from "@workspace/types"
import { Download, Loader2, Printer, Search } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  buildSelectItems,
  buildStringSelectItems,
} from "@workspace/ui/lib/select-items"

import { usePermission } from "@/hooks/use-permission"
import { api } from "@/lib/api"

import {
  downloadStaffReceiptPdf,
  printStaffReceiptPdf,
} from "./_lib/receipt-template"

const PAYMENT_MODES = ["CASH", "CHEQUE", "DD", "UPI_MANUAL", "OTHER"] as const
const MODES_NEEDING_REF = new Set(["CHEQUE", "DD", "UPI_MANUAL"])
const STEPS = [
  "Find property",
  "Confirm dues",
  "Enter payment",
  "Review",
  "Receipt",
] as const

const paymentModeItems = buildStringSelectItems(PAYMENT_MODES)

type Ward = { id: string; name: string; number: number }

type SurveyRow = {
  id: string
  surveyId: string
  ownerName: string | null
  mobile?: string | null
  ward: { id?: string; name: string; number: number } | null
  propertyNo: string | null
  parcelNo?: string | null
  houseNo?: string | null
  propertyUse: string | null
}

type SurveyDetail = SurveyRow & {
  ownerFatherName: string | null
  mobile: string | null
  wardId: string
  streetName: string | null
  locality: string | null
  colony: string | null
  city: string | null
  pincode: string | null
  taxRateZone: string | null
  roadType: string | null
  ward: { id: string; name: string; number: number } | null
}

type SurveyListMeta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type PublishedDemand = {
  id: string
  status: string
  verified: boolean
  propertyTax: number
  waterTax: number
  drainageTax: number
  penalty: number
  rebate: number
  arrears: number
  currentDemand: number
  totalPayable: number
  amountPaid: number
  outstanding: number
  assessmentYearId: string
  assessmentYear?: { id: string; code: string; name: string } | null
  demandArrears?: Array<{
    amount: number
    sourceAssessmentYear?: { name: string } | null
  }>
}

type FormValues = {
  amount: string
  paymentMode: (typeof PAYMENT_MODES)[number]
  payerName: string
  payerMobile: string
  receiptNumber: string
  chequeDdReference: string
  collectionDate: string
  remarks: string
}

function todayInputValue(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function buildAddress(s: SurveyDetail): string {
  const parts = [
    s.houseNo,
    s.streetName,
    s.locality,
    s.colony,
    s.city ?? "Nagar Panchayat Chhata",
    s.pincode,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "—"
}

function money(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function OfflinePaymentPage() {
  const { can } = usePermission()
  const canPublishRates = can("settings:update")

  const [step, setStep] = React.useState(0)
  const [wardId, setWardId] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [lastReceipt, setLastReceipt] =
    React.useState<StaffPaymentReceipt | null>(null)
  const idempotencyKeyRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search])

  const form = useForm<FormValues>({
    defaultValues: {
      paymentMode: "CASH",
      amount: "",
      payerName: "",
      payerMobile: "",
      receiptNumber: "",
      chequeDdReference: "",
      collectionDate: todayInputValue(),
      remarks: "",
    },
  })

  const paymentMode = form.watch("paymentMode")
  const amountValue = form.watch("amount")

  const wardsQuery = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const wardSelectItems = React.useMemo(
    () => [
      { value: "__all__", label: "All wards" },
      ...buildSelectItems(
        wardsQuery.data ?? [],
        (w) => w.id,
        (w) => `${String(w.number).padStart(2, "0")} · ${w.name}`
      ),
    ],
    [wardsQuery.data]
  )

  const surveysQuery = useQuery({
    queryKey: ["offline-surveys", wardId, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", "15")
      if (wardId) params.set("wardId", wardId)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await api.get<SurveyRow[]>(`/api/v1/surveys?${params}`)
      return {
        items: res.data,
        meta: res.meta as SurveyListMeta | undefined,
      }
    },
  })

  const surveyRows = surveysQuery.data?.items ?? []
  const surveyMeta = surveysQuery.data?.meta

  const surveyDetailQuery = useQuery({
    queryKey: ["offline-survey", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () =>
      (await api.get<SurveyDetail>(`/api/v1/surveys/${selectedId}`)).data,
  })

  const survey = surveyDetailQuery.data

  const demandQuery = useQuery({
    queryKey: ["offline-demand", selectedId],
    enabled: Boolean(selectedId) && step >= 1,
    queryFn: async () => {
      const res = await api.get<PublishedDemand | null>(
        `/api/v1/demands/published?surveyId=${encodeURIComponent(selectedId!)}`
      )
      return res.data
    },
  })

  const demand = demandQuery.data
  const demandPublished = demand?.status === "PUBLISHED"
  const outstanding = demandPublished ? Number(demand.outstanding) : 0

  React.useEffect(() => {
    if (!survey) return
    form.setValue("payerName", survey.ownerName ?? "")
    form.setValue("payerMobile", survey.mobile ?? "")
  }, [survey, form])

  React.useEffect(() => {
    if (!demandPublished) return
    form.setValue("amount", outstanding > 0 ? String(outstanding) : "")
  }, [demandPublished, outstanding, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!survey) {
        throw new Error("Select a property before recording payment")
      }
      if (!demandPublished || !demand) {
        throw new Error("Published demand is required before collection")
      }
      if (
        MODES_NEEDING_REF.has(values.paymentMode) &&
        !values.chequeDdReference.trim()
      ) {
        throw new Error("Enter cheque / DD / UPI reference for this mode")
      }
      const amount = Number(values.amount)
      if (!(amount > 0) || amount > outstanding) {
        throw new Error(
          `Amount must be greater than 0 and at most ₹${money(outstanding)}`
        )
      }
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID()
      }
      const collectionDateIso = values.collectionDate
        ? new Date(`${values.collectionDate}T12:00:00`).toISOString()
        : undefined
      const res = await api.post<StaffPaymentReceipt>(
        "/api/v1/payments/offline",
        {
          amount,
          paymentMode: values.paymentMode,
          surveyId: survey.id,
          wardId: survey.wardId || survey.ward?.id,
          assessmentYearId: demand.assessmentYearId,
          payerName: values.payerName.trim() || undefined,
          payerMobile: values.payerMobile.trim() || undefined,
          receiptNumber: values.receiptNumber.trim() || undefined,
          chequeDdReference: values.chequeDdReference.trim() || undefined,
          collectionDate: collectionDateIso,
          remarks: values.remarks.trim() || undefined,
          clientIdempotencyKey: idempotencyKeyRef.current,
        }
      )
      return res.data
    },
    onSuccess: (receipt) => {
      setLastReceipt(receipt)
      setStep(4)
      toast.success("Payment received")
      idempotencyKeyRef.current = null
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const fetchReceiptBlob = (path: string) => api.getBlob(path)

  const handleDownloadPdf = async () => {
    if (!lastReceipt) return
    const result = await downloadStaffReceiptPdf(
      lastReceipt.paymentId,
      fetchReceiptBlob
    )
    if (!result.ok) toast.error(result.error)
  }

  const handlePrintPdf = async () => {
    if (!lastReceipt) return
    const result = await printStaffReceiptPdf(
      lastReceipt.paymentId,
      fetchReceiptBlob
    )
    if (!result.ok) toast.error(result.error)
  }

  const taxRatesHref = canPublishRates
    ? "/tax-admin/tax-rates"
    : "/reports/tax-rates"

  const goNextFromFind = () => {
    if (!selectedId || !survey) {
      toast.error("Select a property first")
      return
    }
    setStep(1)
  }

  const goNextFromDues = () => {
    if (!demandPublished) {
      toast.error("Publish the property demand before collecting payment")
      return
    }
    setStep(2)
  }

  const goNextFromPayment = form.handleSubmit(() => {
    const amount = Number(form.getValues("amount"))
    if (!(amount > 0) || amount > outstanding) {
      toast.error(
        `Amount must be greater than 0 and at most ₹${money(outstanding)}`
      )
      return
    }
    if (
      MODES_NEEDING_REF.has(form.getValues("paymentMode")) &&
      !form.getValues("chequeDdReference").trim()
    ) {
      toast.error("Enter cheque / DD / UPI reference for this mode")
      return
    }
    setStep(3)
  })

  const startNew = () => {
    setStep(0)
    setSelectedId(null)
    setLastReceipt(null)
    idempotencyKeyRef.current = null
    form.reset({
      paymentMode: "CASH",
      amount: "",
      payerName: "",
      payerMobile: "",
      receiptNumber: "",
      chequeDdReference: "",
      collectionDate: todayInputValue(),
      remarks: "",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Offline Collection
          </h1>
          <p className="text-sm text-muted-foreground">
            Five-step counter collection against a published demand
          </p>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <Badge
              variant={i === step ? "default" : i < step ? "secondary" : "outline"}
            >
              {i + 1}. {label}
            </Badge>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Find property</CardTitle>
            <CardDescription>
              Search by survey ID, owner, mobile, property, parcel, house, or
              ward
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="w-48 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ward</Label>
                <Select
                  value={wardId || "__all__"}
                  items={wardSelectItems}
                  onValueChange={(v) => {
                    setWardId(v === "__all__" || !v ? "" : v)
                    setSelectedId(null)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="All wards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__all__"
                      label="All wards"
                      className="cursor-pointer"
                    >
                      All wards
                    </SelectItem>
                    {(wardsQuery.data ?? []).map((w) => (
                      <SelectItem
                        key={w.id}
                        value={w.id}
                        label={`${String(w.number).padStart(2, "0")} · ${w.name}`}
                        className="cursor-pointer"
                      >
                        {String(w.number).padStart(2, "0")} · {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Owner, survey ID, property no, parcel, house…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setSelectedId(null)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Survey ID</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Ward</th>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">House</th>
                  </tr>
                </thead>
                <tbody>
                  {surveysQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        <Loader2 className="mx-auto size-5 animate-spin" />
                      </td>
                    </tr>
                  ) : surveyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No properties found
                      </td>
                    </tr>
                  ) : (
                    surveyRows.map((row) => {
                      const active = selectedId === row.id
                      return (
                        <tr
                          key={row.id}
                          className={`cursor-pointer border-b transition-colors ${
                            active ? "bg-primary/10" : "hover:bg-muted/40"
                          }`}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td className="px-3 py-2 font-medium">
                            {row.surveyId}
                          </td>
                          <td className="px-3 py-2">{row.ownerName ?? "—"}</td>
                          <td className="px-3 py-2">
                            {row.ward
                              ? `${String(row.ward.number).padStart(2, "0")} · ${row.ward.name}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{row.propertyNo ?? "—"}</td>
                          <td className="px-3 py-2">{row.houseNo ?? "—"}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {surveyMeta && surveyMeta.totalPages > 1 ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {surveyMeta.page} of {surveyMeta.totalPages} (
                  {surveyMeta.total} records)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={page <= 1 || surveysQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={
                      page >= surveyMeta.totalPages || surveysQuery.isFetching
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {survey ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="mb-2 font-semibold">
                  Selected · {survey.surveyId}
                </div>
                <p>
                  {survey.ownerName ?? "—"} · {buildAddress(survey)}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={!survey}
                onClick={goNextFromFind}
              >
                Continue to dues
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Confirm dues</CardTitle>
            <CardDescription>
              Published demand breakdown for {survey?.surveyId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {demandQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading demand…
              </div>
            ) : demandPublished && demand ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>{demand.assessmentYear?.name ?? "Year"}</Badge>
                  <Badge variant="secondary">Published</Badge>
                  {!demand.verified ? (
                    <Badge variant="destructive">Unverified history</Badge>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["Property tax", demand.propertyTax],
                      ["Water tax", demand.waterTax],
                      ["Drainage tax", demand.drainageTax],
                      ["Penalty", demand.penalty],
                      ["Rebate", demand.rebate],
                      ["Arrears", demand.arrears],
                      ["Current demand", demand.currentDemand],
                      ["Total payable", demand.totalPayable],
                      ["Amount paid", demand.amountPaid],
                      ["Outstanding", demand.outstanding],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-md border p-2">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-semibold">₹{money(Number(value))}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Demand not published</p>
                <p className="mt-1">
                  Offline collection cannot post a SUCCESS payment until a
                  published PropertyDemand exists for this survey.
                </p>
                <p className="mt-2">
                  <Link
                    href={taxRatesHref}
                    className="font-medium underline underline-offset-2"
                  >
                    Open tax rates / publish demand
                  </Link>
                </p>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={!demandPublished || outstanding <= 0}
                onClick={goNextFromDues}
              >
                Continue to payment
              </Button>
            </div>
            {demandPublished && outstanding <= 0 ? (
              <p className="text-xs text-muted-foreground">
                Outstanding is zero — nothing to collect.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Enter payment</CardTitle>
            <CardDescription>
              Amount defaults to outstanding (max ₹{money(outstanding)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!demandPublished ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Payment entry is disabled until a published demand is loaded.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setStep(1)}
                >
                  Back to dues
                </Button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={goNextFromPayment}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={outstanding}
                      {...form.register("amount", { required: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mode</Label>
                    <Select
                      value={paymentMode}
                      items={paymentModeItems}
                      onValueChange={(v) =>
                        form.setValue(
                          "paymentMode",
                          (v as FormValues["paymentMode"]) ?? "CASH"
                        )
                      }
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => (
                          <SelectItem key={m} value={m} label={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {MODES_NEEDING_REF.has(paymentMode) ? (
                  <div className="space-y-1.5">
                    <Label>Cheque / DD / UPI reference</Label>
                    <Input
                      {...form.register("chequeDdReference")}
                      placeholder="Instrument or UPI reference"
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Receipt book number</Label>
                    <Input
                      {...form.register("receiptNumber")}
                      placeholder="Optional — auto if blank"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Collection date</Label>
                    <Input type="date" {...form.register("collectionDate")} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Payer name</Label>
                    <Input {...form.register("payerName")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input {...form.register("payerMobile")} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Remarks</Label>
                  <Input {...form.register("remarks")} />
                </div>

                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="cursor-pointer">
                    Review payment
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Review</CardTitle>
            <CardDescription>
              Confirm before posting a SUCCESS payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Property</dt>
                <dd className="font-medium">{survey?.surveyId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Owner</dt>
                <dd className="font-medium">{survey?.ownerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="font-medium">
                  ₹{money(Number(amountValue) || 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mode</dt>
                <dd className="font-medium">{paymentMode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Outstanding now</dt>
                <dd className="font-medium">₹{money(outstanding)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Outstanding after
                </dt>
                <dd className="font-medium">
                  ₹{money(Math.max(0, outstanding - (Number(amountValue) || 0)))}
                </dd>
              </div>
            </dl>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(form.getValues())}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Confirm & receive"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && lastReceipt ? (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">5. Receipt</CardTitle>
            <CardDescription>
              One A4 PDF with office and consumer copies. Reprint does not create
              a new payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">
                Receipt {lastReceipt.receiptNumber}
              </p>
              <p className="text-muted-foreground">
                ₹{money(lastReceipt.amount)} · {lastReceipt.paymentMode} ·{" "}
                {lastReceipt.paymentReference}
              </p>
              {lastReceipt.receiptSnapshot ? (
                <p className="mt-1 text-muted-foreground">
                  Outstanding after: ₹
                  {money(lastReceipt.receiptSnapshot.outstandingAfter)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => void handleDownloadPdf()}
              >
                <Download className="size-4" />
                Download PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => void handlePrintPdf()}
              >
                <Printer className="size-4" />
                Print PDF
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="cursor-pointer"
                onClick={startNew}
              >
                New collection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
