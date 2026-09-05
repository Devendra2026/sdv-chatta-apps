"use client"

import { Button } from "@workspace/ui/components/button"
import { Search } from "lucide-react"

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 lg:flex-row">
        {/* Left Side: Logo, Brand names, Taglines */}
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row lg:text-left">
          {/* Official Circular Government Logo Image */}
          <div className="group relative shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white stroke-gov-blue-dark p-1 shadow-sm md:h-28 md:w-28">
              <img
                src="https://cdn.s3waas.gov.in/s30336dcbab05b9d5ad24f4333c7658a0e/uploads/2018/02/2018021632.png"
                alt="Uttar Pradesh Government Emblem"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <span className="bg-gov-saffron/10 text-gov-saffron border-gov-saffron/25 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase md:text-xs">
                Uttar Pradesh Government
              </span>
            </div>
            <h1 className="text-gov-blue-dark mt-1.5 font-serif text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl md:text-4xl">
              नगर पंचायत, छाता, मथुरा
            </h1>
            <p className="text-gov-blue-medium mt-1 font-sans text-base font-bold tracking-wide uppercase sm:text-lg md:text-xl">
              Nagar Panchayat, Chhata, Mathura
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm lg:justify-start">
              <span>Mathura, Uttar Pradesh, India</span>
              <span className="text-slate-300">•</span>
              <span className="text-gov-saffron font-semibold italic">
                स्वच्छ छाता, मथुरा, सुंदर छाता, मथुरा।
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions UI */}
        <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto">
          <Button
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-100 px-6 py-2.5 text-xs font-medium text-slate-500 shadow-none transition-all hover:bg-slate-200"
          >
            <Search className="h-4 w-4 text-slate-500" />
            <span>Search...</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
