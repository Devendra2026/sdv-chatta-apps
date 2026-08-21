"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { api } from "@/lib/api"

type ImportJob = {
  id: string
  fileName: string
  status: string
  successRows: number
  failedRows: number
  createdAt: string
}

export default function ImportHistoryPage() {
  const query = useQuery({
    queryKey: ["imports"],
    queryFn: async () => (await api.get<ImportJob[]>("/api/v1/imports")).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Import History</h1>
        <Button className="cursor-pointer" render={<Link href="/surveys/import" />}>
          New import
        </Button>
      </div>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">File</th>
              <th className="p-2">Status</th>
              <th className="p-2">Success</th>
              <th className="p-2">Failed</th>
              <th className="p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((j) => (
              <tr key={j.id} className="border-b">
                <td className="p-2">
                  <Link className="text-primary underline" href={`/surveys/import?job=${j.id}`}>
                    {j.fileName}
                  </Link>
                </td>
                <td className="p-2">
                  <Badge variant="secondary">{j.status}</Badge>
                </td>
                <td className="p-2">{j.successRows}</td>
                <td className="p-2">{j.failedRows}</td>
                <td className="p-2">{new Date(j.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
