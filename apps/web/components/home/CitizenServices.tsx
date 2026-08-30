"use client"

import { AnimatePresence, motion as m } from "framer-motion"
import {
  AlertOctagon,
  Award,
  CheckCircle,
  Construction,
  CreditCard,
  Download,
  Droplet,
  FileCheck2,
  FileText,
  HelpCircle,
  Sparkles,
  Store,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState } from "react"

import { CITIZEN_ONLINE_ROUTES } from "@/lib/citizen-service-routes"

interface ServiceItem {
  id: string
  name: string
  nameHi: string
  desc: string
  icon: React.ReactNode
  color: string
  badgeColor: string
  glowColor: string
  pdfName: string
  href?: string
}

export default function CitizenServices() {
  const router = useRouter()
  const [activeService, setActiveService] = useState<ServiceItem | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const services: ServiceItem[] = [
    {
      id: "prop-tax",
      name: "Property Tax",
      nameHi: "संपत्ति कर भुगतान",
      desc: "Pay yearly house or land tax and generate official municipal receipts online.",
      icon: <CreditCard className="h-6 w-6" />,
      color: "from-orange-500 via-amber-600 to-orange-700",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200/60",
      glowColor:
        "group-hover:shadow-orange-500/20 group-hover:border-orange-400/50",
      pdfName: "Chhata_Property_Tax_Assessment.pdf",
      href: CITIZEN_ONLINE_ROUTES.propertyTax,
    },
    {
      id: "water-tax",
      name: "Water Tax",
      nameHi: "जल कर भुगतान",
      desc: "Check outstanding water supply billing rates and settle municipal dues.",
      icon: <Droplet className="h-6 w-6" />,
      color: "from-sky-500 via-blue-600 to-indigo-700",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200/60",
      glowColor: "group-hover:shadow-sky-500/20 group-hover:border-sky-400/50",
      pdfName: "Chhata_Water_Connection_Form.pdf",
    },
    {
      id: "birth-cert",
      name: "Birth Certificate",
      nameHi: "जन्म प्रमाण पत्र",
      desc: "Apply for new registrations or download verified birth certificates.",
      icon: <Award className="h-6 w-6" />,
      color: "from-emerald-500 via-green-600 to-teal-700",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      glowColor:
        "group-hover:shadow-emerald-500/20 group-hover:border-emerald-400/50",
      pdfName: "Birth_Registration_Chhata.pdf",
    },
    {
      id: "death-cert",
      name: "Death Certificate",
      nameHi: "मृत्यु प्रमाण पत्र",
      desc: "Register a demise record or apply for official death documentation.",
      icon: <FileCheck2 className="h-6 w-6" />,
      color: "from-slate-700 via-zinc-800 to-slate-900",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200/60",
      glowColor:
        "group-hover:shadow-slate-500/20 group-hover:border-slate-400/50",
      pdfName: "Death_Registration_Chhata.pdf",
    },
    {
      id: "trade-lic",
      name: "Trade License",
      nameHi: "व्यापार लाइसेंस",
      desc: "Obtain dynamic shop licenses or renew existing commercial permits in Chhata.",
      icon: <Store className="h-6 w-6" />,
      color: "from-amber-500 via-yellow-600 to-orange-600",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60",
      glowColor:
        "group-hover:shadow-amber-500/20 group-hover:border-amber-400/50",
      pdfName: "Trade_License_Application_Chhata.pdf",
    },
    {
      id: "build-perm",
      name: "Building Permission",
      nameHi: "भवन निर्माण अनुमति",
      desc: "Submit architectural site plan blueprints for urban clearances and maps.",
      icon: <Construction className="h-6 w-6" />,
      color: "from-violet-600 via-purple-600 to-indigo-800",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200/60",
      glowColor:
        "group-hover:shadow-violet-500/20 group-hover:border-violet-400/50",
      pdfName: "Building_Permission_Blueprint.pdf",
    },
    {
      id: "rti",
      name: "RTI Application",
      nameHi: "सूचना का अधिकार (RTI)",
      desc: "File formal requests under the Right to Information Act to municipal office.",
      icon: <HelpCircle className="h-6 w-6" />,
      color: "from-teal-500 via-cyan-600 to-blue-600",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200/60",
      glowColor:
        "group-hover:shadow-teal-500/20 group-hover:border-teal-400/50",
      pdfName: "RTI_Application_Form_Chhata.pdf",
    },
    {
      id: "grievance",
      name: "Complaint Registry",
      nameHi: "शिकायत पंजीकरण",
      desc: "Register civic problems like streetlights or sanitation and track resolution.",
      icon: <AlertOctagon className="h-6 w-6" />,
      color: "from-red-600 via-rose-600 to-pink-800",
      badgeColor: "bg-red-50 text-red-700 border-red-200/60",
      glowColor: "group-hover:shadow-red-500/20 group-hover:border-red-400/50",
      pdfName: "Civic_Grievance_Form_Chhata.pdf",
      href: CITIZEN_ONLINE_ROUTES.publicGrievance,
    },
  ]

  const handleCardClick = (service: ServiceItem) => {
    if (service.href) {
      router.push(service.href)
      return
    }
    setActiveService(service)
    setDownloading(false)
    setDownloaded(false)
  }

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      setDownloaded(true)
      setTimeout(() => {
        setActiveService(null)
        setDownloaded(false)
      }, 1500)
    }, 1500)
  }

  return (
    <section
      id="citizen-services"
      className="relative overflow-hidden bg-linear-to-b from-white via-slate-50 to-slate-100 px-4 py-24 font-sans md:px-8"
    >
      {/* Dynamic Background ambient decorative glows */}
      <div className="pointer-events-none absolute top-1/4 left-[-5%] h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-5%] bottom-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Title */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-orange-600 uppercase shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-orange-500" />
            <span>Nagar Panchayat Chhata • Mathura</span>
          </m.div>

          <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Unified Public Service Forms
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            Search property tax records, pay dues online, and download
            application forms for other municipal services at Nagar Panchayat
            Chhata, Mathura.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-1.5 w-12 rounded-full bg-orange-500" />
            <span className="h-1.5 w-3 rounded-full bg-slate-300" />
            <span className="h-1.5 w-6 rounded-full bg-emerald-600" />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            return (
              <m.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                onClick={() => handleCardClick(service)}
                className={`group relative flex h-64 cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${service.glowColor}`}
              >
                {/* Top ambient color highlight strip inside card */}
                <div
                  className={`absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r ${service.color} opacity-90 transition-opacity group-hover:opacity-100`}
                />

                <div>
                  {/* Icon Frame & Badge */}
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className={`h-12 w-12 rounded-2xl bg-linear-to-br ${service.color} flex shrink-0 items-center justify-center text-white shadow-md shadow-slate-400/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                    >
                      {service.icon}
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase ${service.badgeColor} shadow-2xs`}
                    >
                      {service.href ? "Online" : "PDF Form"}
                    </span>
                  </div>

                  {/* Titles */}
                  <div>
                    <span className="block text-[11px] font-bold tracking-widest text-orange-600 uppercase">
                      {service.nameHi}
                    </span>
                    <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 transition-colors group-hover:text-orange-600">
                      {service.name}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed font-medium text-slate-600">
                  {service.desc}
                </p>
              </m.div>
            )
          })}
        </div>
      </div>

      {/* ================================================= */}
      {/* DOWNLOAD SIMULATION MODAL SHEET                 */}
      {/* ================================================= */}

      <AnimatePresence>
        {activeService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between bg-linear-to-r from-slate-900 to-slate-950 px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/20 p-2 text-orange-400">
                    {activeService.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider uppercase">
                      {activeService.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-orange-400">
                      {activeService.nameHi}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveService(null)}
                  className="cursor-pointer rounded-full bg-slate-800 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 p-6 text-center">
                {downloaded ? (
                  <div className="flex flex-col items-center space-y-3 py-6">
                    <CheckCircle className="h-14 w-14 animate-bounce text-emerald-500" />
                    <h4 className="text-base font-black text-slate-800">
                      Download Complete!
                    </h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Your official form{" "}
                      <span className="font-mono font-bold text-orange-600">
                        {activeService.pdfName}
                      </span>{" "}
                      has been downloaded successfully.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600 shadow-inner">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        Official Document Ready
                      </h4>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Click below to download the official PDF application
                        format for {activeService.name} from Nagar Panchayat
                        Chhata.
                      </p>
                      <div className="mt-3 inline-block rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs">
                        {activeService.pdfName} (PDF)
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() => setActiveService(null)}
                        className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 disabled:opacity-50"
                      >
                        {downloading ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
