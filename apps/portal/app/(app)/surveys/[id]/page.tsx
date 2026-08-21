"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { api } from "@/lib/api"
import { useCan } from "@/hooks/use-permission"

type Attachment = {
  id: string
  originalFileName: string
  mimeType?: string
  url?: string | null
}

type SurveyDetail = {
  id: string
  surveyId: string
  surveyedAt: string | null
  status: string
  dataQualityStatus: string
  ownerName: string | null
  ownerFatherName: string | null
  mobile: string | null
  ownerAadhaar: string | null
  propertyOwnership: string | null
  respondentName: string | null
  respondentRelationship: string | null
  parcelNo: string | null
  propertyNo: string | null
  houseNo: string | null
  streetName: string | null
  locality: string | null
  colony: string | null
  pincode: string | null
  propertyUse: string | null
  commercial: string | null
  taxRateZone: string | null
  yearOfConstruction: string | null
  situation: string | null
  roadType: string | null
  isSlum: boolean
  plotAreaSqFt: string | null
  plinthAreaSqFt: string | null
  totalBuiltUpAreaSqFt: string | null
  floorsRaw: string | null
  hasMunicipalWaterSupply: boolean | null
  hasAlternateWater: boolean | null
  waterSourceType: string | null
  totalWaterConnections: number | null
  waterConnectionIdType: string | null
  toiletType: string | null
  hasMunicipalWasteService: boolean | null
  ward: { number: number; name: string }
  floors: Array<{
    id: string
    floorLabel: string
    areaSqFt: string | null
    usageType: string | null
  }>
  attachments: Attachment[]
  createdBy?: { name: string } | null
}

export default function SurveyDetailPage() {
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { allowed: canEdit } = useCan("survey:update")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const query = useQuery({
    queryKey: ["survey", params.id],
    queryFn: async () =>
      (await api.get<SurveyDetail>(`/api/v1/surveys/${params.id}`)).data,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return api.postForm(`/api/v1/surveys/${params.id}/attachments`, form)
    },
    onSuccess: async () => {
      toast.success("File uploaded")
      await queryClient.invalidateQueries({ queryKey: ["survey", params.id] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed"),
  })

  if (query.isLoading) return <Skeleton className="h-96 w-full" />
  if (query.isError || !query.data) {
    return <p className="text-muted-foreground">Survey not found</p>
  }

  const s = query.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{s.surveyId}</h1>
          <p className="text-muted-foreground font-[family-name:var(--font-deva)] text-sm">
            Ward {s.ward.number} — {s.ward.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{s.status}</Badge>
          <Badge variant="outline">{s.dataQualityStatus}</Badge>
          {canEdit ? (
            <Button
              variant="outline"
              className="cursor-pointer"
              render={<Link href={`/surveys/${s.id}/edit`} />}
            >
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      <Section title="Survey Information">
        <Field
          label="Survey Date"
          value={s.surveyedAt ? new Date(s.surveyedAt).toLocaleString() : "—"}
        />
        <Field label="Surveyor" value={s.createdBy?.name ?? "—"} />
        <Field label="Ward" value={`W${s.ward.number}`} />
      </Section>

      <Section title="Owner Information">
        <Field label="Owner Name" value={s.ownerName} />
        <Field label="Father Name" value={s.ownerFatherName} />
        <Field label="Mobile" value={s.mobile} />
        <Field label="Ownership" value={s.propertyOwnership} />
        <Field label="Aadhaar" value={s.ownerAadhaar} />
      </Section>

      <Section title="Respondent">
        <Field label="Name" value={s.respondentName} />
        <Field label="Relationship" value={s.respondentRelationship} />
      </Section>

      <Section title="Property Identification">
        <Field label="Parcel No" value={s.parcelNo} />
        <Field label="Property No" value={s.propertyNo} />
        <Field label="House No" value={s.houseNo} />
        <Field label="Street" value={s.streetName} />
        <Field label="Locality" value={s.locality} />
        <Field label="Colony" value={s.colony} />
        <Field label="Pincode" value={s.pincode} />
      </Section>

      <Section title="Property Classification">
        <Field label="Property Use" value={s.propertyUse} />
        <Field label="Commercial" value={s.commercial} />
        <Field label="Tax Rate Zone" value={s.taxRateZone} />
        <Field label="Year of Construction" value={s.yearOfConstruction} />
        <Field label="Situation" value={s.situation} />
        <Field label="Road Type" value={s.roadType} />
        <Field label="Slum" value={s.isSlum ? "Yes" : "No"} />
      </Section>

      <Section title="Property Measurements">
        <Field label="Plot Area (SqFt)" value={s.plotAreaSqFt} />
        <Field label="Plinth Area (SqFt)" value={s.plinthAreaSqFt} />
        <Field label="Built-up Area (SqFt)" value={s.totalBuiltUpAreaSqFt} />
        <Field label="Floors (raw)" value={s.floorsRaw} />
      </Section>

      {s.floors.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Floor breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {s.floors.map((f) => (
              <div
                key={f.id}
                className="flex justify-between border-b py-1 last:border-0"
              >
                <span>{f.floorLabel}</span>
                <span>
                  {f.areaSqFt ?? "—"} SqFt · {f.usageType ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Section title="Utilities">
        <Field label="Municipal Water" value={yn(s.hasMunicipalWaterSupply)} />
        <Field label="Alternate Water" value={yn(s.hasAlternateWater)} />
        <Field label="Water Source" value={s.waterSourceType} />
        <Field label="Connections" value={s.totalWaterConnections} />
        <Field label="Connection Type" value={s.waterConnectionIdType} />
        <Field label="Toilet Type" value={s.toiletType} />
        <Field label="Municipal Waste" value={yn(s.hasMunicipalWasteService)} />
      </Section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Files / Images</CardTitle>
          {canEdit ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ""
                }}
              />
              <Button
                size="sm"
                className="cursor-pointer"
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadMutation.isPending ? "Uploading…" : "Upload image"}
              </Button>
            </>
          ) : null}
        </CardHeader>
        <CardContent>
          {s.attachments.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.attachments.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-lg border">
                  {a.url && a.mimeType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={a.originalFileName}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center text-xs">
                      {a.mimeType ?? "file"}
                    </div>
                  )}
                  <div className="space-y-1 p-2">
                    <p className="truncate text-xs font-medium">
                      {a.originalFileName}
                    </p>
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 text-xs underline-offset-2 hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No attachments yet
              {canEdit ? " — upload a photo to store it in MinIO." : "."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium break-words">{value ?? "—"}</p>
    </div>
  )
}

function yn(v?: boolean | null) {
  if (v == null) return "—"
  return v ? "Yes" : "No"
}
