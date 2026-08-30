import { EB_Garamond, Lato } from "next/font/google"

import { cn } from "@workspace/ui/lib/utils"

const display = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-auth-display",
  weight: ["400", "500", "600", "700"],
})

const body = Lato({
  subsets: ["latin"],
  variable: "--font-auth-body",
  weight: ["300", "400", "700"],
})

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        display.variable,
        body.variable,
        "min-h-svh font-[family-name:var(--font-auth-body)]"
      )}
    >
      {children}
    </div>
  )
}
