import Schemes from "@/components/schemes/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Schemes",
  description:
    " Schemes page for Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Discover the various government schemes and initiatives available for our community.",
}

export default function () {
  return (
    <div>
      <Schemes />
    </div>
  )
}
