import Staff from "@/components/staff/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Staff ",
  description:
    "Staff page for Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Learn about the dedicated professionals who work to serve our community and drive the development of our town.",
}

export default function () {
  return (
    <div>
      <Staff />
    </div>
  )
}
