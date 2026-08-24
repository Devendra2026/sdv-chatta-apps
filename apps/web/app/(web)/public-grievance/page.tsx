import PublicGrievance from "@/components/public-grievance/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PublicGrievance",
  description:
    "PublicGrievance page for Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Submit your grievances and feedback to help us improve our services and community initiatives.",
}

export default function () {
  return (
    <div>
      <PublicGrievance />
    </div>
  )
}
