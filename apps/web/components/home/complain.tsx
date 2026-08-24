"use client"

import { m } from "framer-motion"
import {
  MessageSquarePlus,
  PhoneCall,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

export default function GrievanceBanner() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-50 px-4 py-16 font-sans md:px-8">
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-75 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-blue-500/30 bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 p-8 text-white shadow-2xl shadow-blue-900/20 md:p-12"
        >
          {/* Subtle background pattern elements */}
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute top-0 right-1/4 h-32 w-32 rounded-full bg-amber-400/10 blur-xl" />

          <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
            {/* Left Content */}
            <div className="max-w-2xl space-y-4 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-300 uppercase shadow-sm backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 text-amber-300" /> जन शिकायत
                निवारण • Public Grievance
              </span>

              <h2 className="font-serif text-2xl leading-tight font-extrabold tracking-tight md:text-4xl">
                नगर पंचायत से संबंधित कोई शिकायत या{" "}
                <span className="text-amber-300">सुझाव है?</span>
              </h2>

              <p className="max-w-xl text-xs leading-relaxed font-medium text-blue-100 md:text-sm">
                अपनी समस्या या सुझाव ऑनलाइन दर्ज कराएं। नगर पंचायत छाता, मथुरा
                पारदर्शी और त्वरित समाधान के लिए सदैव तत्पर है।
              </p>
            </div>

            {/* Right Action Buttons */}
            <div className="flex w-full shrink-0 flex-col items-center gap-3.5 sm:flex-row lg:w-auto">
              <Link
                href="/public-grievance"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-xs font-extrabold text-slate-950 no-underline shadow-lg shadow-amber-500/20 transition-all duration-300 hover:scale-105 hover:bg-amber-600 sm:w-auto"
              >
                <MessageSquarePlus className="h-4 w-4 text-slate-950" />
                <span>शिकायत दर्ज करें</span>
                <Sparkles className="ml-1 h-3.5 w-3.5 text-slate-900" />
              </Link>

              <Link
                href="/contact"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold text-white no-underline backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/25 sm:w-auto"
              >
                <PhoneCall className="h-4 w-4 text-blue-200" />
                <span>संपर्क कार्यालय</span>
              </Link>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  )
}
