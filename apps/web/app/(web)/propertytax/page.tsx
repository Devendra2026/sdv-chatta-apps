import PropertyTax from '@/components/propertytax/page';
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Property Tax",
  description:
    "Calculate and pay property tax for your building or plot in Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Access information about tax rates, due dates, and payment methods.",
}

export default function PropertyTaxPage() {
  return (
    <div>
      <PropertyTax/>
    </div>
  )
}
