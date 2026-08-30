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
import {
  buildSelectItems,
  buildStringSelectItems,
} from "@workspace/ui/lib/select-items"

import { api } from "@/lib/api"
import {
  generateSurveyId,
  parseGisSurveyId,
} from "@/lib/survey-format"
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

import { FloorsEditor } from "../_components/floors-editor"

type FormValues = {
  surveyId: string
  gisUseCode: string
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
  gisUseCode: "R",
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
      const body = toPayload(values, isEdit)
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
      await qc.invalidateQueries({ queryKey: ["audit-logs", "Survey", id] })
      router.push(`/surveys/${id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const control = form.control
  const plotAreaSqFt = form.watch("plotAreaSqFt")
  const plinthAreaSqFt = form.watch("plinthAreaSqFt")
  const wardId = form.watch("wardId")
  const parcelNo = form.watch("parcelNo")
  const propertyNo = form.watch("propertyNo")
  const gisUseCode = form.watch("gisUseCode")

  const previewSurveyId = React.useMemo(() => {
    const ward = wards.data?.find((w) => w.id === wardId)
    if (!ward || !parcelNo.trim() || !propertyNo.trim() || !gisUseCode.trim()) {
      return isEdit ? form.getValues("surveyId") || "—" : "—"
    }
    try {
      return generateSurveyId({
        ulbCode: "249044",
        wardNo: ward.number,
        parcelNo: parcelNo.trim(),
        propertyNo: propertyNo.trim(),
        gisUseCode: gisUseCode.trim(),
      })
    } catch {
      return "—"
    }
  }, [
    wardId,
    parcelNo,
    propertyNo,
    gisUseCode,
    wards.data,
    isEdit,
    form,
  ])

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
            {isEdit
              ? "Update survey details for this property."
              : "Enter survey details for this property."}
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
        description="Owner identity and survey metadata."
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="surveyIdPreview">Survey Id</Label>
          <Input
            id="surveyIdPreview"
            readOnly
            disabled
            value={previewSurveyId}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Generated automatically from ward, parcel, property, and GIS use
            code.
          </p>
        </div>
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

      <FormSection
        title="Parcel"
        description="Parcel and property identifiers."
      >
        <TextField
          id="parcelNo"
          label="Parcel No"
          required={!isEdit}
          register={form.register("parcelNo", { required: !isEdit })}
        />
        <TextField
          id="propertyNo"
          label="Property No"
          register={form.register("propertyNo", { required: !isEdit })}
        />
        <TextField
          id="gisUseCode"
          label="GIS Use Code"
          required
          register={form.register("gisUseCode", {
            required: true,
            maxLength: 1,
            pattern: /^[A-Za-z]$/,
          })}
        />
      </FormSection>

      <FormSection
        title="Respondent"
        description="Person who provided survey answers."
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

      <FormSection title="Address" description="Property location details.">
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
        description="Tax and property classification."
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
        description="Floor summary and area measurements."
      >
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
        <Controller
          name="floorsRaw"
          control={control}
          render={({ field }) => (
            <FloorsEditor
              value={field.value}
              onChange={field.onChange}
              plotAreaSqFt={plotAreaSqFt}
              plinthAreaSqFt={plinthAreaSqFt}
              onBuiltUpChange={(sqFt, sqM) => {
                form.setValue("totalBuiltUpAreaSqFt", sqFt, {
                  shouldDirty: true,
                })
                form.setValue("totalBuiltUpAreaSqMeter", sqM, {
                  shouldDirty: true,
                })
              }}
            />
          )}
        />
      </FormSection>

      <FormSection
        title="Municipal Services"
        description="Utilities and municipal service connections."
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
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
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
  const parsed = parseGisSurveyId(row.surveyId)
  return {
    ...emptyForm,
    surveyId: row.surveyId ?? "",
    gisUseCode: parsed?.useLetter ?? "R",
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

function toPayload(values: FormValues, isEdit: boolean) {
  const base = {
    wardId: values.wardId,
    gisUseCode: emptyToUndef(values.gisUseCode),
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

  if (isEdit) return base

  return base
}
