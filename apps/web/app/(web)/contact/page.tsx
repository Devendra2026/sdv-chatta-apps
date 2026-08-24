import ContactUs from "@/components/contact/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Get in touch with us for inquiries, feedback, or assistance regarding our services and community initiatives.",
}
export default function Contact() {
  return (
    <div>
      <ContactUs />
    </div>
  )
}
