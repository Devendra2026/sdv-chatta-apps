import Services from "@/components/services/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Services ",
  description:
    "Services page for Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Discover the various services we offer to support our community and enhance the quality of life in our town.",
}

export default function () {
  return (
    <div>
      <Services />
    </div>
  )
}
