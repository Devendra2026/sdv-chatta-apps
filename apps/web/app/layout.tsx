import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import QueryProvider from "@/components/providers/query-providers"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "CHHATA, MATHURA",
  description:
    "Official portal of Nagar Panchayat Chhata, Mathura, Uttar Pradesh. Settle property tax, pay water tax, apply for birth/death certificates, browse active tenders, and submit grievances online.",
  keywords:
    "Nagar Panchayat Chhata, Mathura, Uttar Pradesh, Property Tax, Water Tax, Birth Certificate, Death Certificate, Tenders, Grievances",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <html
        lang="en"
        suppressHydrationWarning
        className={cn("font-sans", geist.variable)}
      >
        <body className="flex min-h-screen flex-col bg-white text-slate-800">
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
  )
}
