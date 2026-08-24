"use client"

import { Button } from "@workspace/ui/components/button"
import { m, AnimatePresence } from "framer-motion"
import { ArrowRight, CheckCircle2, Sparkles, X, MapPin } from "lucide-react"
import Link from "next/link"
import React, { useState } from "react"

interface SchemeItem {
  title: string
  titleHi: string
  desc: string
  logoSvg: React.ReactNode
  objectives: string[]
  badge: string
  theme: string
}

export default function Schemes() {
  const [selectedScheme, setSelectedScheme] = useState<SchemeItem | null>(null)

  const schemes: SchemeItem[] = [
    {
      title: "Pradhan Mantri Awas Yojana (Urban)",
      titleHi: "प्रधानमंत्री आवास योजना (शहरी - छाता)",
      desc: "Providing secure and affordable pucca houses to eligible EWS/LIG households across all wards of Nagar Panchayat Chhata.",
      badge: "आवास योजना",
      theme: "from-orange-500 to-amber-600",
      objectives: [
        "Financial assistance up to ₹2.5 Lakhs for construction",
        "Direct Benefit Transfer (DBT) to beneficiary accounts",
        "Priority for women co-ownership and specially-abled citizens",
      ],
      logoSvg: (
        <svg
          className="h-16 w-16"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#CBD5E1"
            strokeWidth="2"
            fill="#F8FAFC"
          />
          <rect x="36" y="52" width="28" height="22" fill="#134074" rx="2" />
          <polygon points="32,52 68,52 50,34" fill="#FF9933" />
          <rect x="46" y="60" width="8" height="14" fill="#FFFFFF" />
          <circle cx="50" cy="24" r="5" fill="#F59E0B" />
        </svg>
      ),
    },
    {
      title: "Swachh Bharat Mission (Urban)",
      titleHi: "स्वच्छ भारत मिशन (छाता नगर पंचायत)",
      desc: "Ensuring 100% door-to-door garbage collection, wet/dry waste segregation, and a cleaner Mathura highway corridor.",
      badge: "स्वच्छता",
      theme: "from-emerald-500 to-teal-700",
      objectives: [
        "Daily door-to-door solid waste collection vehicles",
        "Plastic-free market campaigns across Chhata bazars",
        "Community composting and sanitation awareness drives",
      ],
      logoSvg: (
        <svg
          className="h-16 w-16"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#CBD5E1"
            strokeWidth="2"
            fill="#F8FAFC"
          />
          <circle cx="36" cy="50" r="12" stroke="#475569" strokeWidth="3" />
          <circle cx="64" cy="50" r="12" stroke="#475569" strokeWidth="3" />
          <path d="M48 50 L52 50" stroke="#475569" strokeWidth="3" />
          <path
            d="M26 68 C 38 72, 62 72, 74 68"
            stroke="#FF9933"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      ),
    },
    {
      title: "Deendayal Antyodaya Yojana - NULM",
      titleHi: "राष्ट्रीय शहरी आजीविका मिशन (DAY-NULM)",
      desc: "Empowering urban poor women in Chhata through Self-Help Groups (SHGs), skill training, and easy micro-enterprise loans.",
      badge: "आजीविका",
      theme: "from-blue-600 to-indigo-700",
      objectives: [
        "Formation and revolving fund support for Mahila SHGs",
        "Free certified skill development training for youth",
        "Subsidized bank credit linkages for small businesses",
      ],
      logoSvg: (
        <svg
          className="h-16 w-16"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#CBD5E1"
            strokeWidth="2"
            fill="#F8FAFC"
          />
          <circle cx="50" cy="50" r="40" stroke="#E07A1D" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="10" fill="#134074" />
          <circle cx="50" cy="50" r="6" fill="#FF9933" />
        </svg>
      ),
    },
    {
      title: "Jal Jeevan & Urban Water Supply",
      titleHi: "अमृत योजना एवं शहरी पेयजल वितरण",
      desc: "Upgrading pipeline networks and overhead water tanks to guarantee safe drinking water access to every household in Chhata.",
      badge: "पेयजल",
      theme: "from-sky-500 to-blue-600",
      objectives: [
        "Functional household tap connections in all wards",
        "Regular water quality testing and chlorination",
        "Overhead tank boost pumps for tail-end localities",
      ],
      logoSvg: (
        <svg
          className="h-16 w-16"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#CBD5E1"
            strokeWidth="2"
            fill="#F8FAFC"
          />
          <path
            d="M50 25 C50 25, 66 43, 66 57 C66 67, 58 75, 50 75 C42 75, 34 67, 34 57 C34 43, 50 25, 50 25 Z"
            fill="#0EA5E9"
          />
        </svg>
      ),
    },
  ]

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-24 font-sans text-slate-900 md:px-8">
      {/* Background Glow Accents */}
      <div className="pointer-events-none absolute top-1/3 left-1/4 h-125 w-125 -translate-x-1/2 rounded-full bg-orange-500/5 blur-[150px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-10 h-125 w-125 translate-x-1/2 rounded-full bg-blue-500/5 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-16">
        {/* Page Header */}
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-orange-600 uppercase shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 animate-pulse text-orange-600" />
            <span>Nagar Panchayat Chhata • Mathura</span>
          </div>

          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Major Government Schemes in Chhata, Mathura
          </h1>

          <p className="text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            क्षेत्र के नागरिकों के विकास, आवास, स्वच्छता और आजीविका सशक्तिकरण के
            लिए संचालित केंद्रीय एवं राज्य योजनाएं।
          </p>
          <div className="mx-auto mt-4 h-1.5 w-24 rounded-full bg-linear-to-r from-orange-500 to-blue-600"></div>
        </div>

        {/* Schemes Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {schemes.map((scheme, idx) => (
            <m.div
              key={scheme.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-orange-500/50 hover:shadow-2xl"
            >
              {/* Top Accent Gradient Line */}
              <div
                className={`absolute top-0 right-0 left-0 h-1 bg-linear-to-r ${scheme.theme} opacity-80 transition-opacity group-hover:opacity-100`}
              />

              <div>
                {/* Header Icon & Badge */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    {scheme.logoSvg}
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-extrabold text-slate-700 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-700">
                    {scheme.badge}
                  </span>
                </div>

                {/* Titles */}
                <div>
                  <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-orange-600 uppercase">
                    {scheme.titleHi}
                  </span>
                  <h3 className="font-serif text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600">
                    {scheme.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 line-clamp-3 text-xs leading-relaxed font-medium text-slate-600">
                  {scheme.desc}
                </p>

                {/* Mandates Preview List */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    मुख्य विशेषताएँ:
                  </p>
                  {scheme.objectives.map((obj) => (
                    <div
                      key={obj}
                      className="flex items-start gap-1.5 text-[11px] leading-normal font-medium text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="line-clamp-1">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <Button
                  onClick={() => setSelectedScheme(scheme)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800 shadow-none transition-all duration-300 hover:bg-orange-600 hover:text-white"
                >
                  <span>विस्तृत जानकारी</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </m.div>
          ))}
        </div>

        {/* Informative Help Card */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-orange-500/30 bg-linear-to-r from-orange-500/10 via-white to-blue-500/10 p-6 text-slate-900 shadow-2xl backdrop-blur-xl md:flex-row md:p-8">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="shrink-0 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-600 backdrop-blur-md">
              <MapPin className="h-8 w-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base font-bold text-slate-900">
                छाता नगर पंचायत कार्यालय में सहायता केंद्र
              </h4>
              <p className="max-w-xl text-xs leading-relaxed font-medium text-slate-600">
                यदि आप पात्र हैं (EWS/LIG श्रेणी) और पीएम आवास, स्वच्छता अनुदान
                या आजीविका मिशन के लिए पंजीकरण में मार्गदर्शन चाहते हैं, तो छाता
                टाउन हॉल हेल्पडेस्क पर संपर्क करें।
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="shrink-0 cursor-pointer rounded-2xl bg-linear-to-r from-orange-500 to-amber-600 px-6 py-3 text-center text-xs font-extrabold tracking-wider text-white uppercase shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-105 hover:brightness-110"
          >
            हेल्पडेस्क से संपर्क करें
          </Link>
        </div>
      </div>

      {/* Scheme Detail Modal */}
      <AnimatePresence>
        {selectedScheme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedScheme(null)}
                className="absolute top-6 right-6 cursor-pointer rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                  {selectedScheme.logoSvg}
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold tracking-widest text-orange-600 uppercase">
                    {selectedScheme.titleHi}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {selectedScheme.title}
                  </h3>
                </div>
              </div>

              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed font-medium text-slate-700">
                {selectedScheme.desc}
              </p>

              <div className="space-y-3">
                <h4 className="text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                  योजना की मुख्य विशेषताएं:
                </h4>
                <div className="space-y-2">
                  {selectedScheme.objectives.map((obj) => (
                    <div
                      key={obj}
                      className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs font-medium text-slate-800"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-600" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="flex-1 cursor-pointer rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-orange-700"
                >
                  बंद करें (Close)
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
