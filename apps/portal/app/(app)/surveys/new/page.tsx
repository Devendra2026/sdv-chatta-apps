"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { api } from "@/lib/api"

type FormValues = {
  surveyId: string
  wardId: string
  ownerName?: string
  ownerFatherName?: string
  mobile?: string
  parcelNo?: string
  propertyNo?: string
  locality?: string
  colony?: string
  propertyUse?: string
  propertyOwnership?: string
  taxRateZone?: string
  floorsRaw?: string
  plotAreaSqFt?: string
  toiletType?: string
}

type Ward = { id: string; number: number; name: string }

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
    queryFn: async () => (await api.get<FormValues & { id: string }>(`/api/v1/surveys/${params.id}`)).data,
  })

  const form = useForm<FormValues>({
    defaultValues: {
      surveyId: "",
      wardId: "",
    },
  })

  React.useEffect(() => {
    if (existing.data) {
      form.reset({
        surveyId: existing.data.surveyId,
        wardId: (existing.data as { wardId?: string }).wardId ?? "",
        ownerName: existing.data.ownerName,
        ownerFatherName: existing.data.ownerFatherName,
        mobile: existing.data.mobile,
        parcelNo: existing.data.parcelNo,
        propertyNo: existing.data.propertyNo,
        locality: existing.data.locality,
        colony: existing.data.colony,
        propertyUse: existing.data.propertyUse,
        propertyOwnership: existing.data.propertyOwnership,
        taxRateZone: existing.data.taxRateZone,
        floorsRaw: existing.data.floorsRaw,
        plotAreaSqFt: existing.data.plotAreaSqFt?.toString(),
        toiletType: existing.data.toiletType,
      })
    }
  }, [existing.data, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        ...values,
        plotAreaSqFt: values.plotAreaSqFt ? Number(values.plotAreaSqFt) : undefined,
      }
      if (isEdit) {
        return api.patch(`/api/v1/surveys/${params.id}`, body)
      }
      return api.post<{ id: string }>("/api/v1/surveys", body)
    },
    onSuccess: async (res) => {
      toast.success(isEdit ? "Survey updated" : "Survey created")
      await qc.invalidateQueries({ queryKey: ["surveys"] })
      const id = isEdit ? params.id! : (res.data as { id: string }).id
      router.push(`/surveys/${id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <form
      className="mx-auto max-w-4xl space-y-4"
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit Survey" : "Create Survey"}
        </h1>
        <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Survey ID">
            <Input {...form.register("surveyId", { required: true })} disabled={isEdit} />
          </Field>
          <Field label="Ward">
            <Select
              value={form.watch("wardId")}
              onValueChange={(v) => form.setValue("wardId", v ?? "")}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent>
                {(wards.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    Ward {w.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner Name">
            <Input {...form.register("ownerName")} />
          </Field>
          <Field label="Father Name">
            <Input {...form.register("ownerFatherName")} />
          </Field>
          <Field label="Mobile">
            <Input {...form.register("mobile")} />
          </Field>
          <Field label="Ownership">
            <Input {...form.register("propertyOwnership")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Parcel No">
            <Input {...form.register("parcelNo")} />
          </Field>
          <Field label="Property No">
            <Input {...form.register("propertyNo")} />
          </Field>
          <Field label="Locality">
            <Input {...form.register("locality")} />
          </Field>
          <Field label="Colony">
            <Input {...form.register("colony")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification & Measurements</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Property Use">
            <Input {...form.register("propertyUse")} />
          </Field>
          <Field label="Tax Rate Zone">
            <Input {...form.register("taxRateZone")} />
          </Field>
          <Field label="Plot Area SqFt">
            <Input {...form.register("plotAreaSqFt")} />
          </Field>
          <Field label="Toilet Type">
            <Input {...form.register("toiletType")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Floors (raw)">
              <Textarea rows={4} {...form.register("floorsRaw")} />
            </Field>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
