import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="shadow-soft max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          That Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India page is not available.
        </p>
        <Button className="mt-5">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
