import Departments from "@/components/departments/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Departments",
  description:
    " Explore the various departments of Nagar Panchayat Chhata, Mathura, Uttar Pradesh, India. Learn about their functions, services, and how they contribute to the community's development and well-being.",
}

export default function departments() {
  return (
    <div>
      <Departments />
    </div>
  )
}
