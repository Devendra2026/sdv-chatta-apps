import { Geist, Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { cn } from "@workspace/ui/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const notoDevanagari = localFont({
  src: "../fonts/NotoSansDevanagari-Variable.ttf",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-deva",
})

export const metadata = {
  title: "Nagar Panchayat Chhata",
  description: "Survey, property data and payment management platform",
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
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        notoDevanagari.variable
      )}
    >
      <body>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors closeButton />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
