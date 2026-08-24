"use client"

import { m } from "framer-motion"
import { ExternalLink, ShieldCheck, Sparkles } from "lucide-react"
import React from "react"

interface GovernmentPortal {
  imgUrl: string
  siteUrl: string
  title: string
  tagline: string
  bgClass: string
  badgeColor: string
  glowColor: string
}

export default function GovernmentPortalsGrid() {
  const governmentPortals: GovernmentPortal[] = [
    {
      imgUrl:
        "https://tse4.mm.bing.net/th/id/OIP.cmWC0sWBy4tCsvptDLv6mwHaE8?r=0&pid=Api&h=220&P=0",
      siteUrl: "https://gem.gov.in/",
      title: "GeM Portal",
      tagline: "Govt e-Marketplace",
      bgClass:
        "from-amber-500/10 via-yellow-500/5 to-transparent border-amber-200/80 hover:border-amber-400",
      badgeColor: "bg-amber-600 text-white",
      glowColor: "group-hover:shadow-amber-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl:
        "https://d16kg6xo62zbe.cloudfront.net/site-picture/463x256/e/etender.up.nic.in.png",
      siteUrl: "https://etender.up.nic.in/nicgep/app",
      title: "eTender UP",
      tagline: "e-Procurement System",
      bgClass:
        "from-teal-500/10 via-cyan-500/5 to-transparent border-teal-200/80 hover:border-teal-400",
      badgeColor: "bg-teal-600 text-white",
      glowColor: "group-hover:shadow-teal-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017053014.png",
      siteUrl: "https://data.gov.in/",
      title: "Data Gov India",
      tagline: "Open Data Platform",
      bgClass:
        "from-orange-500/10 via-amber-500/5 to-transparent border-orange-200/80 hover:border-orange-400",
      badgeColor: "bg-orange-600 text-white",
      glowColor: "group-hover:shadow-orange-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017053094.png",
      siteUrl: "https://www.incredibleindia.org/",
      title: "Incredible India",
      tagline: "Ministry of Tourism",
      bgClass:
        "from-rose-500/10 via-pink-500/5 to-transparent border-rose-200/80 hover:border-rose-400",
      badgeColor: "bg-rose-600 text-white",
      glowColor: "group-hover:shadow-rose-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017053017.png",
      siteUrl: "https://www.mygov.in/",
      title: "MyGov Portal",
      tagline: "Citizen Engagement",
      bgClass:
        "from-amber-600/10 via-orange-600/5 to-transparent border-amber-300/80 hover:border-amber-500",
      badgeColor: "bg-amber-700 text-white",
      glowColor: "group-hover:shadow-amber-600/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017053039.png",
      siteUrl: "https://pmnrf.gov.in/",
      title: "PMNRF Fund",
      tagline: "National Relief Fund",
      bgClass:
        "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-200/80 hover:border-emerald-400",
      badgeColor: "bg-emerald-600 text-white",
      glowColor: "group-hover:shadow-emerald-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017110781.png",
      siteUrl: "https://www.pmindia.gov.in/",
      title: "PMINDIA Office",
      tagline: "Prime Minister's Office",
      bgClass:
        "from-blue-500/10 via-indigo-500/5 to-transparent border-blue-200/80 hover:border-blue-400",
      badgeColor: "bg-blue-600 text-white",
      glowColor: "group-hover:shadow-blue-500/15 group-hover:shadow-xl",
    },
    {
      imgUrl: "https://cdn.s3waas.gov.in/master/uploads/2017/04/2017053023.png",
      siteUrl: "https://www.india.gov.in/",
      title: "National Portal",
      tagline: "Gateway to Government",
      bgClass:
        "from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-200/80 hover:border-indigo-400",
      badgeColor: "bg-indigo-600 text-white",
      glowColor: "group-hover:shadow-indigo-500/15 group-hover:shadow-xl",
    },
  ]

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-sky-50/40 px-4 py-24 font-sans md:px-8">
      {/* Background Decorative Ambient Light Blobs */}
      <div className="pointer-events-none absolute top-12 left-1/2 h-87.5 w-175 -translate-x-1/2 rounded-full bg-sky-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-10 bottom-10 h-100 w-100 rounded-full bg-amber-400/10 blur-[120px]" />

      {/* Subtle Grid Pattern Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[3.5rem_3.5rem] opacity-25" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <m.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-sky-700 uppercase shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-sky-600" />
            National Digital Systems
          </m.div>

          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Important Government Portals
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            Direct single-click live connection with verified official
            frameworks and national administration portals.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-orange-500" />
            <span className="h-1.5 w-2.5 rounded-full border border-slate-300 bg-white" />
            <span className="h-1.5 w-10 rounded-full bg-emerald-600" />
          </div>
        </div>

        {/* Portals Responsive Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {governmentPortals.map((portal, index) => (
            <m.a
              key={portal.title}
              href={portal.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: index * 0.06,
                duration: 0.4,
                ease: "easeOut",
              }}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white/90 bg-linear-to-b p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 ${portal.bgClass} ${portal.glowColor}`}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 transition-colors group-hover:from-sky-500 group-hover:to-blue-600" />

              <div>
                {/* Header row: Badge & External Link Icon */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${portal.badgeColor} flex items-center gap-1 shadow-2xs`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-2xs transition-all duration-300 group-hover:bg-sky-600 group-hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  </div>
                </div>

                {/* Portal Preview Logo Box */}
                <div className="mb-4 flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-inner transition-colors group-hover:border-slate-200">
                  <img
                    src={portal.imgUrl}
                    alt={portal.title}
                    className="max-h-full max-w-full object-contain filter transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Title and Tagline */}
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-sky-600">
                    {portal.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {portal.tagline}
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100/80 pt-3 text-[11px] font-bold text-slate-700 transition-colors group-hover:text-sky-600">
                <span>Access Live Portal</span>
                <span className="transform transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </m.a>
          ))}
        </div>
      </div>
    </section>
  )
}
