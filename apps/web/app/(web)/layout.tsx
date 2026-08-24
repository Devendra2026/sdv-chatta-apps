import Navbar from "@/components/navigation/Navbar"
import Footer from "@/components/navigation/Footer"
import TopUtilityBar from "@/components/navigation/TopUtilityBar"
import Header from "@/components/navigation/Header"
import { MotionProvider } from "@/components/providers/motion-providers"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <TopUtilityBar />
      <Header />
      <Navbar />
      <main id="main-content" className="flex-1 focus:outline-none">
        <MotionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionProvider>
      </main>
      <Footer />
    </>
  )
}
