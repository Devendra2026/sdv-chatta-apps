import AboutUs from "@/components/about/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About",
  description:
    "About Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Learn about our mission, vision, and the services we provide to the community.",
}

export default function About() {
  return (
    <div>
      <AboutUs />
    </div>
  )
}
