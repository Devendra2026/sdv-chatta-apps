"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { api } from "@/lib/api"
import { useCan } from "@/hooks/use-permission"

type SurveyRow = {
  id: string
  surveyId: string
  ownerName: string | null
  mobile: string | null
  parcelNo: string | null
  propertyNo: string | null
  propertyUse: string | null
  locality: string | null
  surveyedAt: string | null
  status: string
  ward: { number: number; name: string }
  createdBy?: { name: string } | null
}

export default function SurveysClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { allowed: canCreate } = useCan("survey:create")
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "")
  const [debounced, setDebounced] = React.useState(search)
  const page = Number(searchParams.get("page") ?? "1")

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const query = useQuery({
    queryKey: ["surveys", debounced, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      })
      if (debounced.trim()) params.set("search", debounced.trim())
      const res = await api.get<SurveyRow[]>(`/api/v1/surveys?${params}`)
      return {
        items: res.data,
        meta: res.meta as { page: number; totalPages: number; total: number },
      }
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground text-sm">
            Search and filter property survey records
          </p>
        </div>
        {canCreate ? (
          <Button className="cursor-pointer" render={<Link href="/surveys/new" />}>
            <Plus className="size-4" />
            Create Survey
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
        <Input
          className="pl-8"
          placeholder="Survey ID, owner, mobile, parcel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0">
            <TableRow>
              <TableHead>Survey ID</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Use</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : query.data?.items.length ? (
              query.data.items.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/surveys/${row.id}`)}
                >
                  <TableCell className="font-medium">{row.surveyId}</TableCell>
                  <TableCell>{row.ownerName ?? "—"}</TableCell>
                  <TableCell>{row.mobile ?? "—"}</TableCell>
                  <TableCell>W{row.ward.number}</TableCell>
                  <TableCell>{row.parcelNo ?? "—"}</TableCell>
                  <TableCell>{row.propertyNo ?? "—"}</TableCell>
                  <TableCell>{row.propertyUse ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  No surveys found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {query.data?.meta ? (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>{query.data.meta.total} records</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page <= 1}
              onClick={() => router.push(`/surveys?page=${page - 1}`)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page >= (query.data.meta.totalPages ?? 1)}
              onClick={() => router.push(`/surveys?page=${page + 1}`)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
