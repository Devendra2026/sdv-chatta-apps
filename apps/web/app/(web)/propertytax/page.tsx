import PropertyTax from "@/components/propertytax/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Online House Tax Payment",
  description:
    "Search property records, review house tax dues, and pay online for Nagar Panchayat Chhata, Mathura, Uttar Pradesh.",
}

export default function PropertyTaxPage() {
  return (
    <div>
      <PropertyTax />
    </div>
  )
}
