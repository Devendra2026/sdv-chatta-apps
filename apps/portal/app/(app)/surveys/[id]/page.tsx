"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { api } from "@/lib/api"
import {
  ULB_NAME,
  floorUsageChecks,
  formatArea,
  formatParcelNo,
  formatPropertyNo,
  parseGisSurveyId,
  qualityLabel,
  toNumber,
} from "@/lib/survey-format"
import { useCan } from "@/hooks/use-permission"

type Neighbor = { id: string; surveyId: string }

type Attachment = {
  id: string
  originalFileName: string
  mimeType?: string
  url?: string | null
  uploadedBy?: { name: string } | null
}

type FloorRow = {
  id: string
  floorLabel: string
  areaSqFt: string | null
  areaSqMeter: string | null
  usageType: string | null
  usageFactor: string | null
  buildingType: string | null
}

type SurveyDetail = {
  id: string
  wardId: string
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
  electricityId: string | null
  khasraNo: string | null
  registryNo: string | null
  constructedDate: string | null
  remark: string | null
  city: string | null
  presentHouseNo: string | null
  presentStreetName: string | null
  presentLocality: string | null
  presentColony: string | null
  presentCity: string | null
  presentPincode: string | null
  isSameAsProperty: boolean | null
  exemptionType: string | null
  exemptionApplicable: boolean | null
  plotAreaSqMeter: string | null
  plinthAreaSqMeter: string | null
  totalBuiltUpAreaSqMeter: string | null
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
  floors: FloorRow[]
  attachments: Attachment[]
  createdBy?: { name: string } | null
  updatedBy?: { name: string } | null
  createdAt?: string
  updatedAt?: string
  neighbors?: { previous: Neighbor | null; next: Neighbor | null }
}

type AuditLog = {
  id: string
  action: string
  entity: string
  entityId: string | null
  createdAt: string
  actor?: { name: string; email: string } | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
}

type SurveySearchRow = { id: string; surveyId: string }

const PHOTO_FALLBACK = ["Front View", "Side View", "Interior", "Document"]

export default function SurveyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { allowed: canEdit } = useCan("survey:update")
  const { allowed: canDelete } = useCan("survey:delete")
  const { allowed: canAudit } = useCan("audit:read")
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [parcelQuery, setParcelQuery] = React.useState("")
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const query = useQuery({
    queryKey: ["survey", params.id],
    queryFn: async () =>
      (await api.get<SurveyDetail>(`/api/v1/surveys/${params.id}`)).data,
  })

  const auditQuery = useQuery({
    queryKey: ["audit-logs", "Survey", query.data?.id],
    enabled: canAudit && Boolean(query.data?.id),
    queryFn: async () => {
      const qs = new URLSearchParams({
        entity: "Survey",
        entityId: query.data!.id,
        pageSize: "50",
      })
      return (await api.get<AuditLog[]>(`/api/v1/audit-logs?${qs}`)).data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return api.postForm(`/api/v1/surveys/${params.id}/attachments`, form)
    },
    onSuccess: async () => {
      toast.success("Photo uploaded")
      await queryClient.invalidateQueries({ queryKey: ["survey", params.id] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed"),
  })

  const removePhotoMutation = useMutation({
    mutationFn: async (attachmentId: string) =>
      api.delete(`/api/v1/surveys/${params.id}/attachments/${attachmentId}`),
    onSuccess: async () => {
      toast.success("Photo removed")
      await queryClient.invalidateQueries({ queryKey: ["survey", params.id] })
    },
    onError: (err: Error) => toast.error(err.message || "Remove failed"),
  })

  const statusMutation = useMutation({
    mutationFn: async (status: "ACTIVE" | "ARCHIVED") =>
      api.patch(`/api/v1/surveys/${params.id}`, { status }),
    onSuccess: async (_res, status) => {
      toast.success(status === "ARCHIVED" ? "Survey archived" : "Survey restored")
      await queryClient.invalidateQueries({ queryKey: ["survey", params.id] })
      await queryClient.invalidateQueries({ queryKey: ["surveys"] })
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/api/v1/surveys/${params.id}`),
    onSuccess: async () => {
      toast.success("Survey deleted")
      await queryClient.invalidateQueries({ queryKey: ["surveys"] })
      router.push("/surveys")
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  })

  const goToParcel = React.useCallback(async () => {
    const q = parcelQuery.trim()
    if (!q) {
      toast.error("Enter a parcel number or survey ID")
      return
    }
    const paramsQs = new URLSearchParams({
      search: q,
      pageSize: "5",
      sortBy: "parcelNo",
      sortOrder: "asc",
    })
    if (query.data?.wardId) paramsQs.set("wardId", query.data.wardId)
    try {
      const res = await api.get<SurveySearchRow[]>(`/api/v1/surveys?${paramsQs}`)
      const match = res.data[0]
      if (!match) {
        toast.error("No parcel found in this ward")
        return
      }
      if (match.id === query.data?.id) {
        toast.message("Already viewing this parcel")
        return
      }
      router.push(`/surveys/${match.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed")
    }
  }, [parcelQuery, query.data?.id, query.data?.wardId, router])

  if (query.isLoading) return <DetailSkeleton />
  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href="/surveys" />}
        >
          <ChevronLeft />
          Back to registry
        </Button>
        <p className="text-muted-foreground">Survey not found.</p>
      </div>
    )
  }

  const s = query.data
  const gis = parseGisSurveyId(s.surveyId)
  const parcel = formatParcelNo(s.parcelNo, s.surveyId)
  const unit = formatPropertyNo(s.propertyNo, s.surveyId)
  const checks = floorUsageChecks({
    plotAreaSqFt: s.plotAreaSqFt,
    plinthAreaSqFt: s.plinthAreaSqFt,
    totalBuiltUpAreaSqFt: s.totalBuiltUpAreaSqFt,
    floors: s.floors,
  })
  const floorTotals = derivedFloorTotals(s.floors)
  const images = s.attachments.filter((a) => a.mimeType?.startsWith("image/"))
  const files = s.attachments.filter((a) => !a.mimeType?.startsWith("image/"))
  const previous = s.neighbors?.previous
  const next = s.neighbors?.next

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            render={<Link href="/surveys" />}
          >
            <ChevronLeft />
            Back to registry
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={!previous}
            onClick={() => previous && router.push(`/surveys/${previous.id}`)}
          >
            <ChevronLeft />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={!next}
            onClick={() => next && router.push(`/surveys/${next.id}`)}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              render={<Link href={`/surveys/${s.id}/edit`} />}
            >
              <Pencil />
              Edit
            </Button>
          ) : null}
          {canEdit && s.status !== "ARCHIVED" ? (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("ARCHIVED")}
            >
              <Archive />
              Archive
            </Button>
          ) : null}
          {canEdit && s.status === "ARCHIVED" ? (
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("ACTIVE")}
            >
              <RotateCcw />
              Restore
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Active ward
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {ULB_NAME} — Ward {s.ward.number}
            <span className="text-muted-foreground ml-2 text-base font-normal">
              {s.ward.name}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={qualityBadgeClass(s.dataQualityStatus)}>
            {qualityLabel(s.dataQualityStatus)}
          </Badge>
          <Badge className={statusBadgeClass(s.status)}>{s.status}</Badge>
        </div>
      </div>

      <form
        className="flex max-w-md items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void goToParcel()
        }}
      >
        <label htmlFor="go-parcel" className="sr-only">
          Go to parcel
        </label>
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="go-parcel"
            value={parcelQuery}
            onChange={(e) => setParcelQuery(e.target.value)}
            placeholder="Go to parcel or survey ID"
            className="pl-8"
          />
        </div>
        <Button type="submit" size="sm" className="cursor-pointer">
          Go
        </Button>
      </form>

      <Card>
        <CardContent className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCell label="Survey ID" value={s.surveyId} mono />
          <SummaryCell label="ULB Name" value={ULB_NAME} />
          <SummaryCell label="Ward No" value={String(s.ward.number)} />
          <SummaryCell label="Parcel No" value={parcel} />
          <SummaryCell label="Owner Name" value={s.ownerName} />
        </CardContent>
      </Card>

      <SectionCard
        title="Survey & Owner"
        description="Survey Id → Date of Survey → Owner Name → Owner Father Name → Mobile No → Ward Name → Is Slum."
      >
        <FieldGrid>
          <Field label="Survey Id" value={s.surveyId} />
          <Field
            label="Date of Survey"
            value={s.surveyedAt ? new Date(s.surveyedAt).toLocaleString() : "—"}
          />
          <Field label="Owner Name" value={s.ownerName} />
          <Field label="Owner Father Name" value={s.ownerFatherName} />
          <Field label="Mobile No" value={s.mobile} />
          <Field label="Ward Name" value={`Ward ${s.ward.number} — ${s.ward.name}`} />
          <Field label="Is Slum" value={yn(s.isSlum)} />
        </FieldGrid>
      </SectionCard>

      <SectionCard title="Parcel" description="Parcel No → Property No.">
        <FieldGrid>
          <Field label="Parcel No" value={parcel} />
          <Field label="Property No" value={unit} />
          <Field label="GIS Use Code" value={gis?.useLetter ?? "—"} />
        </FieldGrid>
      </SectionCard>

      <SectionCard
        title="Respondent"
        description="Respondent Name → Respondent Relationship."
      >
        <FieldGrid>
          <Field label="Respondent Name" value={s.respondentName} />
          <Field label="Respondent Relationship" value={s.respondentRelationship} />
        </FieldGrid>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Address"
          description="City → Pincode → House No → Street Name → Locality → Colony."
        >
          <FieldGrid cols="2">
            <Field label="City" value={s.city} />
            <Field label="Pincode" value={s.pincode} />
            <Field label="House No" value={s.houseNo} />
            <Field label="Street Name" value={s.streetName} />
            <Field label="Locality" value={s.locality} />
            <Field label="Colony" value={s.colony} />
          </FieldGrid>
        </SectionCard>

        <SectionCard
          title="GIS Mapping"
          description="Field location coordinates."
        >
          <div className="bg-muted/40 flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
            <MapPin className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">Coordinates not captured</p>
            <p className="text-muted-foreground max-w-sm text-xs">
              Ward Excel imports do not include latitude or longitude. A map pin
              will appear here when field GPS is stored on the survey record.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Classification"
        description="Tax Rate Zone → Property Ownership → Property Use → Commercial → Year of Construction → Situation → Road Type."
      >
        <FieldGrid>
          <Field label="Tax Rate Zone" value={s.taxRateZone} />
          <Field label="Property Ownership" value={s.propertyOwnership} />
          <Field label="Property Use" value={s.propertyUse} />
          <Field label="Commercial" value={s.commercial} />
          <Field label="Year of Construction" value={s.yearOfConstruction} />
          <Field label="Situation" value={s.situation} />
          <Field label="Road Type" value={s.roadType} />
        </FieldGrid>
      </SectionCard>

      <SectionCard
        title="Floors & Area"
        description="Floors → Plot Area SqFt/SqMeter → Plinth Area SqFt/SqMeter → Total Built Up Area SqFt/SqMeter."
      >
        {checks.length ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
              <TriangleAlert className="size-4" />
              Floor usage checks ({checks.length})
            </div>
            <ul className="text-amber-800 list-disc space-y-1 pl-5 text-sm dark:text-amber-200/90">
              {checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <FieldGrid>
          <Field
            label="Plot Area SqFt"
            value={formatArea(s.plotAreaSqFt, s.plotAreaSqMeter)}
          />
          <Field
            label="Plinth Area SqFt"
            value={formatArea(s.plinthAreaSqFt, s.plinthAreaSqMeter)}
          />
          <Field
            label="Total Built Up Area SqFt"
            value={formatArea(s.totalBuiltUpAreaSqFt, s.totalBuiltUpAreaSqMeter)}
          />
        </FieldGrid>

        <p className="text-muted-foreground mt-4 mb-2 text-sm">
          Derived floor totals:{" "}
          {floorTotals.length
            ? floorTotals
                .map((row) => `${row.label.toUpperCase()} ${row.area} sq ft`)
                .join(" — ")
            : "—"}
        </p>

        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S. No.</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Usage Type</TableHead>
                <TableHead>Usage Factor</TableHead>
                <TableHead>Construction</TableHead>
                <TableHead className="text-right">Area (Sq Ft)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.floors.length ? (
                s.floors.map((floor, index) => (
                  <TableRow key={floor.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{floor.floorLabel}</TableCell>
                    <TableCell>{dash(floor.usageType)}</TableCell>
                    <TableCell>{dash(floor.usageFactor)}</TableCell>
                    <TableCell>{dash(floor.buildingType)}</TableCell>
                    <TableCell className="text-right">
                      {dash(floor.areaSqFt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No floor breakdown parsed from Excel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-semibold">
                  Total built-up area
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatArea(s.totalBuiltUpAreaSqFt, s.totalBuiltUpAreaSqMeter)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Municipal Services & Photo Documentation"
        description="Is Muncipal Water Supply → Total Water Connection → Water Connection Id/Type → Toilet Type → Is Muncipal Waste Service → Alternate Water → Water Source."
      >
        <FieldGrid>
          <Field
            label="Is Muncipal Water Supply"
            value={yn(s.hasMunicipalWaterSupply)}
          />
          <Field label="Total Water Connection" value={s.totalWaterConnections} />
          <Field
            label="Water Connection Id/Type"
            value={s.waterConnectionIdType}
          />
          <Field label="Toilet Type" value={s.toiletType} />
          <Field
            label="Is Muncipal Waste Service"
            value={yn(s.hasMunicipalWasteService)}
          />
          <Field label="Alternate Water" value={yn(s.hasAlternateWater)} />
          <Field label="Water Source" value={s.waterSourceType} />
        </FieldGrid>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Photos uploaded {images.length}
            {files.length ? ` · ${files.length} other file(s)` : ""}
          </p>
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
                variant="outline"
                className="cursor-pointer"
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload />
                {uploadMutation.isPending ? "Uploading…" : "Upload photo"}
              </Button>
            </>
          ) : null}
        </div>

        {s.attachments.length ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {s.attachments.map((attachment, index) => (
              <figure
                key={attachment.id}
                className="overflow-hidden rounded-xl border"
              >
                {attachment.url && attachment.mimeType?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.url}
                    alt={photoCaption(attachment.originalFileName, index)}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center text-xs">
                    {attachment.mimeType ?? "file"}
                  </div>
                )}
                <figcaption className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {photoCaption(attachment.originalFileName, index)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {attachment.uploadedBy?.name ?? s.createdBy?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attachment.url ? (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary cursor-pointer text-xs underline-offset-2 hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                    {canEdit ? (
                      <Button
                        size="xs"
                        variant="destructive"
                        className="cursor-pointer"
                        disabled={removePhotoMutation.isPending}
                        onClick={() =>
                          removePhotoMutation.mutate(attachment.id)
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            No photos yet
            {canEdit ? " — upload a field photo to store it in MinIO." : "."}
          </p>
        )}
      </SectionCard>

      {hasExtraColumns(s) ? (
        <SectionCard
          title="Additional columns"
          description="Present on Ward 2+ workbooks. Hidden when empty."
        >
          <FieldGrid>
            <Field label="Remark" value={s.remark} />
            <Field label="Electricity ID" value={s.electricityId} />
            <Field label="Khasra No" value={s.khasraNo} />
            <Field label="Registry No" value={s.registryNo} />
            <Field label="Constructed Date" value={s.constructedDate} />
            <Field label="Owner Aadhaar" value={s.ownerAadhaar} />
            <Field label="Same as property" value={yn(s.isSameAsProperty)} />
            <Field label="Present House No" value={s.presentHouseNo} />
            <Field label="Present Street Name" value={s.presentStreetName} />
            <Field label="Present Locality" value={s.presentLocality} />
            <Field label="Present Colony" value={s.presentColony} />
            <Field label="Present City" value={s.presentCity} />
            <Field label="Present Pincode" value={s.presentPincode} />
            <Field label="Exemption Type" value={s.exemptionType} />
            <Field label="Exemption Applicable" value={yn(s.exemptionApplicable)} />
          </FieldGrid>
        </SectionCard>
      ) : null}

      {canAudit ? (
        <SectionCard
          title="Audit History"
          description="Survey create, update, and attachment timeline."
        >
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (auditQuery.data ?? []).length ? (
                  (auditQuery.data ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.actor?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {auditDetails(log)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No audit entries for this survey yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this survey?</DialogTitle>
            <DialogDescription>
              {s.surveyId} will be marked deleted and removed from the registry.
              This cannot be undone from the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionCard({
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
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function FieldGrid({
  children,
  cols = "4",
}: {
  children: React.ReactNode
  cols?: "2" | "4"
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === "2" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {children}
    </div>
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
    <div className="min-w-0">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold wrap-break-word text-foreground">
        {dash(value)}
      </p>
    </div>
  )
}

function SummaryCell({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          mono && "font-mono text-xs sm:text-sm"
        )}
      >
        {dash(value)}
      </p>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function hasExtraColumns(s: SurveyDetail) {
  return Boolean(
    s.remark ||
      s.electricityId ||
      s.khasraNo ||
      s.registryNo ||
      s.constructedDate ||
      s.ownerAadhaar ||
      s.presentHouseNo ||
      s.presentStreetName ||
      s.presentLocality ||
      s.presentColony ||
      s.presentCity ||
      s.presentPincode ||
      s.exemptionType ||
      s.isSameAsProperty != null ||
      s.exemptionApplicable != null
  )
}

function dash(value?: string | number | null) {
  if (value == null || value === "") return "—"
  return String(value)
}

function yn(value?: boolean | null) {
  if (value == null) return "—"
  return value ? "Yes" : "No"
}

function statusBadgeClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-violet-600/15 text-violet-800 hover:bg-violet-600/15 dark:text-violet-300"
  }
  if (status === "DRAFT") {
    return "bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
  }
  if (status === "ARCHIVED") {
    return "bg-muted text-muted-foreground hover:bg-muted"
  }
  return ""
}

function qualityBadgeClass(status: string) {
  if (status === "COMPLETE") {
    return "bg-teal-600/15 text-teal-800 hover:bg-teal-600/15 dark:text-teal-300"
  }
  if (status === "NEEDS_REVIEW") {
    return "bg-sky-600/15 text-sky-800 hover:bg-sky-600/15 dark:text-sky-300"
  }
  return "bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
}

function photoCaption(fileName: string, index: number) {
  const lower = fileName.toLowerCase()
  if (lower.includes("front")) return "Front View"
  if (lower.includes("side")) return "Side View"
  if (lower.includes("back")) return "Back View"
  return PHOTO_FALLBACK[index] ?? `Photo ${index + 1}`
}

function derivedFloorTotals(floors: FloorRow[]) {
  const map = new Map<string, number>()
  for (const floor of floors) {
    const area = toNumber(floor.areaSqFt) ?? 0
    map.set(floor.floorLabel, (map.get(floor.floorLabel) ?? 0) + area)
  }
  return [...map.entries()].map(([label, area]) => ({ label, area }))
}

function auditDetails(log: AuditLog) {
  const payload = log.newValue ?? log.oldValue
  if (!payload) return "—"
  return Object.entries(payload)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ")
}
