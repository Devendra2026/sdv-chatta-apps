"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

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
import { Textarea } from "@workspace/ui/components/textarea"
import {
  buildSelectItems,
  buildStringSelectItems,
} from "@workspace/ui/lib/select-items"

import { api } from "@/lib/api"
import {
  CITIES,
  COMMERCIAL_USES,
  PROPERTY_OWNERSHIPS,
  PROPERTY_USES,
  RESPONDENT_RELATIONSHIPS,
  ROAD_TYPES,
  SITUATIONS,
  TAX_RATE_ZONES,
  TOILET_TYPES,
  WATER_SOURCES,
  YEARS_OF_CONSTRUCTION,
  YES_NO,
  withCurrentOption,
} from "@/lib/ward1-catalog"

type FormValues = {
  surveyId: string
  wardId: string
  surveyedAt: string
  ownerName: string
  ownerFatherName: string
  mobile: string
  isSlum: string
  parcelNo: string
  propertyNo: string
  respondentName: string
  respondentRelationship: string
  city: string
  pincode: string
  houseNo: string
  streetName: string
  locality: string
  colony: string
  taxRateZone: string
  propertyOwnership: string
  propertyUse: string
  commercial: string
  yearOfConstruction: string
  situation: string
  roadType: string
  floorsRaw: string
  plotAreaSqFt: string
  plotAreaSqMeter: string
  plinthAreaSqFt: string
  plinthAreaSqMeter: string
  totalBuiltUpAreaSqFt: string
  totalBuiltUpAreaSqMeter: string
  hasMunicipalWaterSupply: string
  totalWaterConnections: string
  waterConnectionIdType: string
  toiletType: string
  hasMunicipalWasteService: string
  hasAlternateWater: string
  waterSourceType: string
  ownerAadhaar: string
  electricityId: string
  khasraNo: string
  registryNo: string
  constructedDate: string
  presentHouseNo: string
  presentStreetName: string
  presentLocality: string
  presentColony: string
  presentCity: string
  presentPincode: string
  isSameAsProperty: string
  exemptionType: string
  exemptionApplicable: string
  remark: string
}

type Ward = { id: string; number: number; name: string }

type SurveyRecord = {
  id: string
  surveyId: string
  wardId: string
  surveyedAt?: string | null
  ownerName?: string | null
  ownerFatherName?: string | null
  mobile?: string | null
  ownerAadhaar?: string | null
  isSlum?: boolean | null
  parcelNo?: string | null
  propertyNo?: string | null
  electricityId?: string | null
  khasraNo?: string | null
  registryNo?: string | null
  constructedDate?: string | null
  respondentName?: string | null
  respondentRelationship?: string | null
  city?: string | null
  pincode?: string | null
  houseNo?: string | null
  streetName?: string | null
  locality?: string | null
  colony?: string | null
  presentHouseNo?: string | null
  presentStreetName?: string | null
  presentLocality?: string | null
  presentColony?: string | null
  presentCity?: string | null
  presentPincode?: string | null
  isSameAsProperty?: boolean | null
  taxRateZone?: string | null
  propertyOwnership?: string | null
  propertyUse?: string | null
  commercial?: string | null
  yearOfConstruction?: string | null
  exemptionType?: string | null
  exemptionApplicable?: boolean | null
  situation?: string | null
  roadType?: string | null
  floorsRaw?: string | null
  plotAreaSqFt?: string | number | null
  plotAreaSqMeter?: string | number | null
  plinthAreaSqFt?: string | number | null
  plinthAreaSqMeter?: string | number | null
  totalBuiltUpAreaSqFt?: string | number | null
  totalBuiltUpAreaSqMeter?: string | number | null
  hasMunicipalWaterSupply?: boolean | null
  hasAlternateWater?: boolean | null
  waterSourceType?: string | null
  totalWaterConnections?: number | null
  waterConnectionIdType?: string | null
  toiletType?: string | null
  hasMunicipalWasteService?: boolean | null
  remark?: string | null
}

const emptyForm: FormValues = {
  surveyId: "",
  wardId: "",
  surveyedAt: "",
  ownerName: "",
  ownerFatherName: "",
  mobile: "",
  isSlum: "No",
  parcelNo: "",
  propertyNo: "",
  respondentName: "",
  respondentRelationship: "",
  city: "Chhata",
  pincode: "281401",
  houseNo: "",
  streetName: "",
  locality: "",
  colony: "",
  taxRateZone: "",
  propertyOwnership: "",
  propertyUse: "",
  commercial: "",
  yearOfConstruction: "",
  situation: "Interior",
  roadType: "rcc road",
  floorsRaw: "",
  plotAreaSqFt: "",
  plotAreaSqMeter: "",
  plinthAreaSqFt: "",
  plinthAreaSqMeter: "",
  totalBuiltUpAreaSqFt: "",
  totalBuiltUpAreaSqMeter: "",
  hasMunicipalWaterSupply: "No",
  totalWaterConnections: "",
  waterConnectionIdType: "",
  toiletType: "",
  hasMunicipalWasteService: "No",
  hasAlternateWater: "",
  waterSourceType: "",
  ownerAadhaar: "",
  electricityId: "",
  khasraNo: "",
  registryNo: "",
  constructedDate: "",
  presentHouseNo: "",
  presentStreetName: "",
  presentLocality: "",
  presentColony: "",
  presentCity: "",
  presentPincode: "",
  isSameAsProperty: "",
  exemptionType: "",
  exemptionApplicable: "",
  remark: "",
}

export default function SurveyFormPage() {
  const params = useParams<{ id?: string }>()
  const isEdit = Boolean(params.id) && params.id !== "new"
  const router = useRouter()
  const qc = useQueryClient()

  const wards = useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await api.get<Ward[]>("/api/v1/wards")).data,
  })

  const existing = useQuery({
    queryKey: ["survey", params.id],
    enabled: isEdit,
    queryFn: async () =>
      (await api.get<SurveyRecord>(`/api/v1/surveys/${params.id}`)).data,
  })

  const form = useForm<FormValues>({ defaultValues: emptyForm })

  React.useEffect(() => {
    if (!existing.data) return
    form.reset(recordToForm(existing.data))
  }, [existing.data, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!values.wardId) {
        throw new Error("Select Ward Name")
      }
      const body = toPayload(values)
      if (isEdit) {
        return api.patch<{ id: string }>(`/api/v1/surveys/${params.id}`, body)
      }
      return api.post<{ id: string }>("/api/v1/surveys", body)
    },
    onSuccess: async (res) => {
      toast.success(isEdit ? "Survey updated" : "Survey created")
      await qc.invalidateQueries({ queryKey: ["surveys"] })
      const id = isEdit ? params.id! : res.data.id
      await qc.invalidateQueries({ queryKey: ["survey", id] })
      router.push(`/surveys/${id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const control = form.control

  return (
    <form
      className="space-y-4 pb-20"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit Survey" : "Create Survey"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Fields follow Ward 1.xlsx column order and pick-lists.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            render={
              <Link href={isEdit ? `/surveys/${params.id}` : "/surveys"} />
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <FormSection
        title="Survey & Owner"
        description="Survey Id → Date of Survey → Owner Name → Owner Father Name → Mobile No → Ward Name → Is Slum."
      >
        <TextField
          id="surveyId"
          label="Survey Id"
          required
          disabled={isEdit}
          register={form.register("surveyId", { required: true })}
        />
        <TextField
          id="surveyedAt"
          label="Date of Survey"
          type="datetime-local"
          register={form.register("surveyedAt")}
        />
        <TextField
          id="ownerName"
          label="Owner Name"
          register={form.register("ownerName")}
        />
        <TextField
          id="ownerFatherName"
          label="Owner Father Name"
          register={form.register("ownerFatherName")}
        />
        <TextField
          id="mobile"
          label="Mobile No"
          inputMode="numeric"
          register={form.register("mobile")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="wardId">Ward Name</Label>
          <Controller
            name="wardId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select
                value={toSelectValue(field.value)}
                items={buildSelectItems(
                  wards.data ?? [],
                  (ward) => ward.id,
                  (ward) => `Ward ${ward.number} — ${ward.name}`
                )}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <SelectTrigger id="wardId" className="cursor-pointer">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {(wards.data ?? []).map((ward) => (
                    <SelectItem
                      key={ward.id}
                      value={ward.id}
                      label={`Ward ${ward.number} — ${ward.name}`}
                    >
                      Ward {ward.number} — {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <CatalogField
          id="isSlum"
          label="Is Slum"
          control={control}
          name="isSlum"
          options={YES_NO}
        />
      </FormSection>

      <FormSection title="Parcel" description="Parcel No → Property No.">
        <TextField
          id="parcelNo"
          label="Parcel No"
          register={form.register("parcelNo")}
        />
        <TextField
          id="propertyNo"
          label="Property No"
          register={form.register("propertyNo")}
        />
      </FormSection>

      <FormSection
        title="Respondent"
        description="Respondent Name → Respondent Relationship."
      >
        <TextField
          id="respondentName"
          label="Respondent Name"
          register={form.register("respondentName")}
        />
        <CatalogField
          id="respondentRelationship"
          label="Respondent Relationship"
          control={control}
          name="respondentRelationship"
          options={RESPONDENT_RELATIONSHIPS}
        />
      </FormSection>

      <FormSection
        title="Address"
        description="City → Pincode → House No → Street Name → Locality → Colony."
      >
        <CatalogField
          id="city"
          label="City"
          control={control}
          name="city"
          options={CITIES}
        />
        <TextField
          id="pincode"
          label="Pincode"
          inputMode="numeric"
          register={form.register("pincode")}
        />
        <TextField
          id="houseNo"
          label="House No"
          register={form.register("houseNo")}
        />
        <TextField
          id="streetName"
          label="Street Name"
          register={form.register("streetName")}
        />
        <TextField
          id="locality"
          label="Locality"
          register={form.register("locality")}
        />
        <TextField
          id="colony"
          label="Colony"
          register={form.register("colony")}
        />
      </FormSection>

      <FormSection
        title="Classification"
        description="Tax Rate Zone → Property Ownership → Property Use → Commercial → Year of Construction → Situation → Road Type."
      >
        <CatalogField
          id="taxRateZone"
          label="Tax Rate Zone"
          control={control}
          name="taxRateZone"
          options={TAX_RATE_ZONES}
        />
        <CatalogField
          id="propertyOwnership"
          label="Property Ownership"
          control={control}
          name="propertyOwnership"
          options={PROPERTY_OWNERSHIPS}
        />
        <CatalogField
          id="propertyUse"
          label="Property Use"
          control={control}
          name="propertyUse"
          options={PROPERTY_USES}
        />
        <CatalogField
          id="commercial"
          label="Commercial"
          control={control}
          name="commercial"
          options={COMMERCIAL_USES}
        />
        <CatalogField
          id="yearOfConstruction"
          label="Year of Construction"
          control={control}
          name="yearOfConstruction"
          options={YEARS_OF_CONSTRUCTION}
        />
        <CatalogField
          id="situation"
          label="Situation"
          control={control}
          name="situation"
          options={SITUATIONS}
        />
        <CatalogField
          id="roadType"
          label="Road Type"
          control={control}
          name="roadType"
          options={ROAD_TYPES}
        />
      </FormSection>

      <FormSection
        title="Floors & Area"
        description="Floors → Plot Area SqFt/SqMeter → Plinth Area SqFt/SqMeter → Total Built Up Area SqFt/SqMeter."
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="space-y-1.5">
            <Label htmlFor="floorsRaw">Floors</Label>
            <Textarea
              id="floorsRaw"
              rows={5}
              placeholder="Ground Floor - 408 SqFt - 37.90 SqMt || Usage Type - Residential || Usage Factor - Self Occupied || Usage Type - Pakka Building with R.C.C Roof or R.B. Roof"
              {...form.register("floorsRaw")}
            />
          </div>
        </div>
        <TextField
          id="plotAreaSqFt"
          label="Plot Area SqFt"
          inputMode="decimal"
          register={form.register("plotAreaSqFt")}
        />
        <TextField
          id="plotAreaSqMeter"
          label="Plot Area SqMeter"
          inputMode="decimal"
          register={form.register("plotAreaSqMeter")}
        />
        <TextField
          id="plinthAreaSqFt"
          label="Plinth Area SqFt"
          inputMode="decimal"
          register={form.register("plinthAreaSqFt")}
        />
        <TextField
          id="plinthAreaSqMeter"
          label="Plinth Area SqMeter"
          inputMode="decimal"
          register={form.register("plinthAreaSqMeter")}
        />
        <TextField
          id="totalBuiltUpAreaSqFt"
          label="Total Built Up Area SqFt"
          inputMode="decimal"
          register={form.register("totalBuiltUpAreaSqFt")}
        />
        <TextField
          id="totalBuiltUpAreaSqMeter"
          label="Total Built Up Area SqMeter"
          inputMode="decimal"
          register={form.register("totalBuiltUpAreaSqMeter")}
        />
      </FormSection>

      <FormSection
        title="Municipal Services"
        description="Is Muncipal Water Supply → Total Water Connection → Water Connection Id/Type → Toilet Type → Is Muncipal Waste Service → Alternate Water → Water Source."
      >
        <CatalogField
          id="hasMunicipalWaterSupply"
          label="Is Muncipal Water Supply"
          control={control}
          name="hasMunicipalWaterSupply"
          options={YES_NO}
        />
        <TextField
          id="totalWaterConnections"
          label="Total Water Connection"
          inputMode="numeric"
          register={form.register("totalWaterConnections")}
        />
        <TextField
          id="waterConnectionIdType"
          label="Water Connection Id/Type"
          register={form.register("waterConnectionIdType")}
        />
        <CatalogField
          id="toiletType"
          label="Toilet Type"
          control={control}
          name="toiletType"
          options={TOILET_TYPES}
        />
        <CatalogField
          id="hasMunicipalWasteService"
          label="Is Muncipal Waste Service"
          control={control}
          name="hasMunicipalWasteService"
          options={YES_NO}
        />
        <CatalogField
          id="hasAlternateWater"
          label="Alternate Water"
          control={control}
          name="hasAlternateWater"
          options={YES_NO}
        />
        <CatalogField
          id="waterSourceType"
          label="Water Source"
          control={control}
          name="waterSourceType"
          options={WATER_SOURCES}
        />
      </FormSection>

      <details className="group rounded-2xl border bg-card p-4 shadow-(--shadow-premium) ring-1 ring-foreground/8">
        <summary className="cursor-pointer text-sm font-medium">
          Additional columns (Ward 2+ workbooks)
        </summary>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Not in Ward 1.xlsx. Kept so Ward 2+ records can still be edited.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            id="remark"
            label="Remark"
            register={form.register("remark")}
          />
          <TextField
            id="electricityId"
            label="Electricity ID"
            register={form.register("electricityId")}
          />
          <TextField
            id="khasraNo"
            label="Khasra No"
            register={form.register("khasraNo")}
          />
          <TextField
            id="registryNo"
            label="Registry No"
            register={form.register("registryNo")}
          />
          <TextField
            id="constructedDate"
            label="Constructed Date"
            register={form.register("constructedDate")}
          />
          <TextField
            id="ownerAadhaar"
            label="Owner Aadhaar"
            register={form.register("ownerAadhaar")}
          />
          <CatalogField
            id="isSameAsProperty"
            label="Same as property"
            control={control}
            name="isSameAsProperty"
            options={YES_NO}
          />
          <TextField
            id="presentHouseNo"
            label="Present House No"
            register={form.register("presentHouseNo")}
          />
          <TextField
            id="presentStreetName"
            label="Present Street Name"
            register={form.register("presentStreetName")}
          />
          <TextField
            id="presentLocality"
            label="Present Locality"
            register={form.register("presentLocality")}
          />
          <TextField
            id="presentColony"
            label="Present Colony"
            register={form.register("presentColony")}
          />
          <TextField
            id="presentCity"
            label="Present City"
            register={form.register("presentCity")}
          />
          <TextField
            id="presentPincode"
            label="Present Pincode"
            register={form.register("presentPincode")}
          />
          <TextField
            id="exemptionType"
            label="Exemption Type"
            register={form.register("exemptionType")}
          />
          <CatalogField
            id="exemptionApplicable"
            label="Exemption Applicable"
            control={control}
            name="exemptionApplicable"
            options={YES_NO}
          />
        </div>
      </details>

      <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-background/90 py-3 backdrop-blur-sm">
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save survey"}
        </Button>
      </div>
    </form>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  )
}

function TextField({
  id,
  label,
  register,
  type = "text",
  inputMode,
  required,
  disabled,
}: {
  id: string
  label: string
  register: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>
  type?: React.ComponentProps<typeof Input>["type"]
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        required={required}
        disabled={disabled}
        {...register}
      />
    </div>
  )
}

function CatalogField({
  id,
  label,
  control,
  name,
  options,
}: {
  id: string
  label: string
  control: ReturnType<typeof useForm<FormValues>>["control"]
  name: keyof FormValues
  options: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const optionList = withCurrentOption(options, field.value)
          return (
            <Select
              value={toSelectValue(field.value)}
              items={buildStringSelectItems(optionList)}
              onValueChange={(value) => field.onChange(value ?? "")}
            >
              <SelectTrigger id={id} className="cursor-pointer">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {optionList.map((option) => (
                  <SelectItem key={option} value={option} label={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }}
      />
    </div>
  )
}

function toSelectValue(value: string): string | null {
  return value === "" ? null : value
}

function recordToForm(row: SurveyRecord): FormValues {
  return {
    ...emptyForm,
    surveyId: row.surveyId ?? "",
    wardId: row.wardId ?? "",
    surveyedAt: toLocalInput(row.surveyedAt),
    ownerName: row.ownerName ?? "",
    ownerFatherName: row.ownerFatherName ?? "",
    mobile: row.mobile ?? "",
    isSlum: toYesNo(row.isSlum) || "No",
    parcelNo: row.parcelNo ?? "",
    propertyNo: row.propertyNo ?? "",
    respondentName: row.respondentName ?? "",
    respondentRelationship: row.respondentRelationship ?? "",
    city: row.city ?? "",
    pincode: row.pincode ?? "",
    houseNo: row.houseNo ?? "",
    streetName: row.streetName ?? "",
    locality: row.locality ?? "",
    colony: row.colony ?? "",
    taxRateZone: row.taxRateZone ?? "",
    propertyOwnership: row.propertyOwnership ?? "",
    propertyUse: row.propertyUse ?? "",
    commercial: row.commercial ?? "",
    yearOfConstruction: row.yearOfConstruction ?? "",
    situation: row.situation ?? "",
    roadType: row.roadType ?? "",
    floorsRaw: row.floorsRaw ?? "",
    plotAreaSqFt: str(row.plotAreaSqFt),
    plotAreaSqMeter: str(row.plotAreaSqMeter),
    plinthAreaSqFt: str(row.plinthAreaSqFt),
    plinthAreaSqMeter: str(row.plinthAreaSqMeter),
    totalBuiltUpAreaSqFt: str(row.totalBuiltUpAreaSqFt),
    totalBuiltUpAreaSqMeter: str(row.totalBuiltUpAreaSqMeter),
    hasMunicipalWaterSupply: toYesNo(row.hasMunicipalWaterSupply),
    totalWaterConnections: str(row.totalWaterConnections),
    waterConnectionIdType: row.waterConnectionIdType ?? "",
    toiletType: row.toiletType ?? "",
    hasMunicipalWasteService: toYesNo(row.hasMunicipalWasteService),
    hasAlternateWater: toYesNo(row.hasAlternateWater),
    waterSourceType: row.waterSourceType ?? "",
    ownerAadhaar: row.ownerAadhaar ?? "",
    electricityId: row.electricityId ?? "",
    khasraNo: row.khasraNo ?? "",
    registryNo: row.registryNo ?? "",
    constructedDate: row.constructedDate ?? "",
    presentHouseNo: row.presentHouseNo ?? "",
    presentStreetName: row.presentStreetName ?? "",
    presentLocality: row.presentLocality ?? "",
    presentColony: row.presentColony ?? "",
    presentCity: row.presentCity ?? "",
    presentPincode: row.presentPincode ?? "",
    isSameAsProperty: toYesNo(row.isSameAsProperty),
    exemptionType: row.exemptionType ?? "",
    exemptionApplicable: toYesNo(row.exemptionApplicable),
    remark: row.remark ?? "",
  }
}

function toYesNo(value?: boolean | null) {
  if (value == null) return ""
  return value ? "Yes" : "No"
}

function fromYesNo(value: string): boolean | undefined {
  if (value === "Yes") return true
  if (value === "No") return false
  return undefined
}

function str(value?: string | number | null) {
  if (value == null || value === "") return ""
  return String(value)
}

function num(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function toLocalInput(iso?: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function emptyToUndef(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toPayload(values: FormValues) {
  return {
    surveyId: values.surveyId.trim(),
    wardId: values.wardId,
    surveyedAt: values.surveyedAt
      ? new Date(values.surveyedAt).toISOString()
      : undefined,
    ownerName: emptyToUndef(values.ownerName),
    ownerFatherName: emptyToUndef(values.ownerFatherName),
    mobile: emptyToUndef(values.mobile),
    isSlum: fromYesNo(values.isSlum),
    parcelNo: emptyToUndef(values.parcelNo),
    propertyNo: emptyToUndef(values.propertyNo),
    respondentName: emptyToUndef(values.respondentName),
    respondentRelationship: emptyToUndef(values.respondentRelationship),
    city: emptyToUndef(values.city),
    pincode: emptyToUndef(values.pincode),
    houseNo: emptyToUndef(values.houseNo),
    streetName: emptyToUndef(values.streetName),
    locality: emptyToUndef(values.locality),
    colony: emptyToUndef(values.colony),
    taxRateZone: emptyToUndef(values.taxRateZone),
    propertyOwnership: emptyToUndef(values.propertyOwnership),
    propertyUse: emptyToUndef(values.propertyUse),
    commercial: emptyToUndef(values.commercial),
    yearOfConstruction: emptyToUndef(values.yearOfConstruction),
    situation: emptyToUndef(values.situation),
    roadType: emptyToUndef(values.roadType),
    floorsRaw: emptyToUndef(values.floorsRaw),
    plotAreaSqFt: num(values.plotAreaSqFt),
    plotAreaSqMeter: num(values.plotAreaSqMeter),
    plinthAreaSqFt: num(values.plinthAreaSqFt),
    plinthAreaSqMeter: num(values.plinthAreaSqMeter),
    totalBuiltUpAreaSqFt: num(values.totalBuiltUpAreaSqFt),
    totalBuiltUpAreaSqMeter: num(values.totalBuiltUpAreaSqMeter),
    hasMunicipalWaterSupply: fromYesNo(values.hasMunicipalWaterSupply),
    totalWaterConnections: num(values.totalWaterConnections),
    waterConnectionIdType: emptyToUndef(values.waterConnectionIdType),
    toiletType: emptyToUndef(values.toiletType),
    hasMunicipalWasteService: fromYesNo(values.hasMunicipalWasteService),
    hasAlternateWater: fromYesNo(values.hasAlternateWater),
    waterSourceType: emptyToUndef(values.waterSourceType),
    ownerAadhaar: emptyToUndef(values.ownerAadhaar),
    electricityId: emptyToUndef(values.electricityId),
    khasraNo: emptyToUndef(values.khasraNo),
    registryNo: emptyToUndef(values.registryNo),
    constructedDate: emptyToUndef(values.constructedDate),
    presentHouseNo: emptyToUndef(values.presentHouseNo),
    presentStreetName: emptyToUndef(values.presentStreetName),
    presentLocality: emptyToUndef(values.presentLocality),
    presentColony: emptyToUndef(values.presentColony),
    presentCity: emptyToUndef(values.presentCity),
    presentPincode: emptyToUndef(values.presentPincode),
    isSameAsProperty: fromYesNo(values.isSameAsProperty),
    exemptionType: emptyToUndef(values.exemptionType),
    exemptionApplicable: fromYesNo(values.exemptionApplicable),
    remark: emptyToUndef(values.remark),
  }
}
