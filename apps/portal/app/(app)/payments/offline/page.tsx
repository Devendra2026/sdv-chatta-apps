"use client"

import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { api } from "@/lib/api"

type FormValues = {
  amount: string
  paymentMode: "CASH" | "CHEQUE" | "DD" | "UPI_MANUAL" | "OTHER"
  payerName?: string
  payerMobile?: string
  receiptNumber?: string
  remarks?: string
}

export default function OfflinePaymentPage() {
  const router = useRouter()
  const form = useForm<FormValues>({
    defaultValues: { paymentMode: "CASH", amount: "" },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      api.post("/api/v1/payments/offline", {
        ...values,
        amount: Number(values.amount),
      }),
    onSuccess: () => {
      toast.success("Offline payment recorded")
      router.push("/payments")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Offline Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" step="0.01" {...form.register("amount", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select
              value={form.watch("paymentMode")}
              onValueChange={(v) =>
                form.setValue("paymentMode", (v as FormValues["paymentMode"]) ?? "CASH")
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["CASH", "CHEQUE", "DD", "UPI_MANUAL", "OTHER"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payer name</Label>
            <Input {...form.register("payerName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input {...form.register("payerMobile")} />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt number</Label>
            <Input {...form.register("receiptNumber")} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input {...form.register("remarks")} />
          </div>
          <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
            Save collection
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
