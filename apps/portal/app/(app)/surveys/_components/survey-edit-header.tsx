"use client"

import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { qualityLabel } from "@/lib/survey-format"

type SurveyEditHeaderProps = {
  surveyId: string
  status?: string | null
  dataQualityStatus?: string | null
  updatedAt?: string | null
  updatedByName?: string | null
  detailHref: string
  canAudit?: boolean
}

export function SurveyEditHeader({
  surveyId,
  status,
  dataQualityStatus,
  updatedAt,
  updatedByName,
  detailHref,
  canAudit,
}: SurveyEditHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold tracking-tight">
            {surveyId || "—"}
          </p>
          {status ? (
            <Badge variant="outline" className="font-normal">
              {status}
            </Badge>
          ) : null}
          {dataQualityStatus ? (
            <Badge variant="secondary" className="font-normal">
              {qualityLabel(dataQualityStatus)}
            </Badge>
          ) : null}
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {updatedAt ? (
            <div>
              <dt className="inline">Last updated: </dt>
              <dd className="inline">
                {new Date(updatedAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
          {updatedByName ? (
            <div>
              <dt className="inline">Updated by: </dt>
              <dd className="inline">{updatedByName}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      {canAudit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          render={<Link href={`${detailHref}#audit-history`} />}
        >
          View Audit History
        </Button>
      ) : null}
    </div>
  )
}
