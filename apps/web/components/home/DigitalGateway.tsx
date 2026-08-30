"use client"

import { m } from "framer-motion"
import {
  ArrowRight,
  Coins,
  Droplet,
  Hammer,
  HardHat,
  HeartPulse,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import React from "react"

import { CITIZEN_ONLINE_ROUTES } from "@/lib/citizen-service-routes"

interface DepartmentCard {
  name: string
  nameHi: string
  desc: string
  icon: React.ReactNode
  color: string
  badgeColor: string
  glowColor: string
  services: string[]
  href?: string
}

export default function DigitalGateway() {
  const router = useRouter()

  const departments: DepartmentCard[] = [
    {
      name: "Public Works Department",
      nameHi: "लोक निर्माण विभाग",
      desc: "Manages urban roads, link paths, administrative buildings, storm drains, street signages, and civic safety infrastructure in Chhata.",
      icon: <HardHat className="h-7 w-7" />,
      color: "from-orange-500 via-amber-600 to-orange-700",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200/60",
      glowColor:
        "group-hover:shadow-orange-500/20 group-hover:border-orange-400/50",
      services: [
        "Road Damage Reporting",
        "Trenching Permissions",
        "NOC for Road Cut",
      ],
    },
    {
      name: "Revenue Department",
      nameHi: "राजस्व विभाग",
      desc: "Responsible for property tax registry audits, commercial advertisement licenses, vending fees, and local tax collections in Mathura district.",
      icon: <Coins className="h-7 w-7" />,
      color: "from-blue-600 via-indigo-600 to-blue-800",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200/60",
      glowColor:
        "group-hover:shadow-blue-500/20 group-hover:border-blue-400/50",
      services: [
        "Property Tax Self-Assessment",
        "Mutation of Property",
        "NOC Certification",
      ],
      href: CITIZEN_ONLINE_ROUTES.propertyTax,
    },
    {
      name: "Water Supply Department",
      nameHi: "जल आपूर्ति विभाग",
      desc: "Oversees drinking water pipelines, testing centers, tanker reservations, sewer connections, and pipe repair services across Chhata wards.",
      icon: <Droplet className="h-7 w-7" />,
      color: "from-sky-500 via-blue-600 to-indigo-700",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200/60",
      glowColor: "group-hover:shadow-sky-500/20 group-hover:border-sky-400/50",
      services: [
        "New Connection Request",
        "Disconnection Report",
        "Water Bill Dispute",
      ],
    },
    {
      name: "Sanitation Department",
      nameHi: "स्वास्थ्य एवं स्वच्छता विभाग",
      desc: "Executes garbage door collection, solid-waste segregation, anti-larval chemical sprays, and bio-medical cleanliness drives in Nagar Panchayat.",
      icon: <Trash2 className="h-7 w-7" />,
      color: "from-emerald-500 via-green-600 to-teal-700",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      glowColor:
        "group-hover:shadow-emerald-500/20 group-hover:border-emerald-400/50",
      services: [
        "Garbage Dump Reporting",
        "Request Mosquito Spraying",
        "Community Bin Request",
      ],
    },
    {
      name: "Health Department",
      nameHi: "लोक स्वास्थ्य विभाग",
      desc: "Registers life records (births, deaths), manages vaccination databases, food safety hygiene checks, and community health facilitation.",
      icon: <HeartPulse className="h-7 w-7" />,
      color: "from-rose-500 via-red-600 to-pink-700",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200/60",
      glowColor:
        "group-hover:shadow-rose-500/20 group-hover:border-rose-400/50",
      services: [
        "Birth Registration",
        "Death Registration",
        "Food License NOC",
      ],
    },
    {
      name: "Engineering & Town Planning",
      nameHi: "अभियांत्रिकी एवं नगर नियोजन",
      desc: "Approves building layout blueprints, regulates zoning rules, manages commercial building permits, and inspects construction sites in Chhata.",
      icon: <Hammer className="h-7 w-7" />,
      color: "from-violet-600 via-purple-600 to-indigo-800",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200/60",
      glowColor:
        "group-hover:shadow-violet-500/20 group-hover:border-violet-400/50",
      services: [
        "Building Plan Blueprint NOC",
        "Encroachment Clearance",
        "Zoning Regulation NOC",
      ],
    },
  ]

  return (
    <section
      id="digital-gateway"
      className="relative overflow-hidden bg-linear-to-b from-sky-50/60 via-slate-50 to-orange-50/40 px-4 py-24 font-sans md:px-8"
    >
      {/* Immersive Light Mesh / Architectural Ambient Glows */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-150 w-150 rounded-full bg-orange-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-150 w-150 rounded-full bg-sky-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 left-[-5%] h-100 w-100 rounded-full bg-emerald-400/5 blur-[120px]" />

      {/* Subtle Grid Pattern Overlay for Official Administrative Aesthetic */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[4rem_4rem] opacity-30" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-orange-600 uppercase shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-orange-500" />
            <span>Nagar Panchayat Chhata • Mathura Portal</span>
          </m.div>

          <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Digital Service Gateway
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            Access specific departmental portals to download applications, file
            reports, and track permissions directly in real-time for Chhata.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-1.5 w-12 rounded-full bg-orange-500 shadow-xs" />
            <span className="h-1.5 w-3 rounded-full bg-sky-600 shadow-xs" />
            <span className="h-1.5 w-6 rounded-full bg-emerald-500 shadow-xs" />
          </div>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept, index) => (
            <m.div
              key={dept.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                ease: "easeOut",
              }}
              onClick={() => {
                if (dept.href) router.push(dept.href)
              }}
              className={`rounded-3xl border border-slate-200/90 bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-xl ${dept.glowColor} group relative flex flex-col justify-between overflow-hidden p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${dept.href ? "cursor-pointer" : ""}`}
            >
              {/* Top ambient color highlight strip inside card */}
              <div
                className={`absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r ${dept.color} opacity-90 transition-opacity group-hover:opacity-100`}
              />

              <div>
                {/* Header Icon Card with Glow */}
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-linear-to-br ${dept.color} flex items-center justify-center text-white shadow-lg shadow-slate-400/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    {dept.icon}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase ${dept.badgeColor} shadow-2xs`}
                  >
                    Active Portal
                  </span>
                </div>

                {/* Titles */}
                <div>
                  <span className="block text-[11px] font-bold tracking-wider text-orange-600 uppercase">
                    {dept.nameHi}
                  </span>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-orange-600">
                    {dept.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs leading-relaxed font-medium text-slate-600">
                  {dept.desc}
                </p>

                {/* Services Bullets List */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    Key Services Offered:
                  </p>
                  {dept.services.map((serv) => (
                    <div
                      key={serv}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 transition-transform group-hover:scale-125" />
                      <span>{serv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Interactive Callout Footer */}
              <div className="mt-7 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs font-bold text-orange-600 transition-colors group-hover:text-slate-900">
                  <span className="text-[11px] tracking-wider uppercase">
                    Nagar Panchayat Chhata
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
