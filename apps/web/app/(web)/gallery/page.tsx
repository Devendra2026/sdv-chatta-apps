import Gallery from "@/components/gallery/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore the photo and video gallery of Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. View images and videos showcasing our community events, initiatives, and the vibrant life of our town.",
}

export default function () {
  return (
    <div>
      <Gallery />
    </div>
  )
}
