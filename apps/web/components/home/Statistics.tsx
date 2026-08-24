"use client"

import { m, useInView } from "framer-motion"
import {
  GlassWater,
  Landmark,
  MessageSquare,
  Users,
  Wrench,
} from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

interface StatItem {
  label: string
  labelHi: string
  targetValue: number
  suffix: string
  icon: React.ReactNode
  color: string
}

function CountUp({
  value,
  suffix,
  duration = 1500,
}: {
  value: number
  suffix: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const elementRef = useRef(null)
  const isInView = useInView(elementRef, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const end = value
    if (start === end) return

    const totalMiliseconds = duration
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 10)

    // For large numbers, increase step size to prevent lagging
    const stepSize = Math.max(Math.floor(end / (totalMiliseconds / 16)), 1)

    const timer = setInterval(() => {
      start += stepSize
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [isInView, value, duration])

  // Format decimal values manually for special stats (e.g. 98.4%)
  const displayValue = value === 98.4 ? "98.4" : count.toLocaleString()

  return (
    <span
      ref={elementRef}
      className="font-sans text-3xl font-black tracking-tight md:text-5xl"
    >
      {displayValue}
      {suffix}
    </span>
  )
}

export default function Statistics() {
  const stats: StatItem[] = [
    {
      label: "Total Population",
      labelHi: "कुल जनसंख्या",
      targetValue: 35000,
      suffix: "+",
      icon: <Users className="text-gov-saffron h-6 w-6" />,
      color: "border-gov-saffron/20 bg-gov-saffron/5",
    },
    {
      label: "Town Panchayat Wards",
      labelHi: "नगर पंचायत वार्ड",
      targetValue: 15,
      suffix: "",
      icon: <Landmark className="text-gov-blue-medium h-6 w-6" />,
      color: "border-gov-blue-medium/20 bg-gov-blue-medium/5",
    },
    {
      label: "Development Projects",
      labelHi: "विकास परियोजनाएं",
      targetValue: 120,
      suffix: "+",
      icon: <Wrench className="h-6 w-6 text-emerald-600" />,
      color: "border-emerald-500/20 bg-emerald-500/5",
    },
    {
      label: "Water Connections",
      labelHi: "पेयजल कनेक्शन",
      targetValue: 12500,
      suffix: "+",
      icon: <GlassWater className="h-6 w-6 text-sky-600" />,
      color: "border-sky-500/20 bg-sky-500/5",
    },
    {
      label: "Complaints Resolved",
      labelHi: "निवारित शिकायतें",
      targetValue: 98.4, // Custom handled in CountUp
      suffix: "%",
      icon: <MessageSquare className="h-6 w-6 text-red-600" />,
      color: "border-red-500/20 bg-red-500/5",
    },
  ]

  return (
    <section className="bg-gov-blue-dark relative overflow-hidden py-16 text-white">
      {/* Dynamic graphic lines */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 0 100 Q 300 200 600 50 T 1200 150"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="10 5"
          />
          <path
            d="M 0 150 Q 400 50 800 120 T 1200 80"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeDasharray="5 5"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
          {stats.map((stat, idx) => (
            <m.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="group flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-md transition-all hover:scale-105 hover:bg-white/10"
            >
              {/* Icon Holder */}
              <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-md transition-transform group-hover:rotate-6">
                {stat.icon}
              </div>

              {/* Stats Numbers */}
              <div>
                <CountUp value={stat.targetValue} suffix={stat.suffix} />
              </div>

              {/* Labels */}
              <div className="mt-2">
                <span className="text-gov-saffron block text-[9px] font-bold tracking-widest uppercase">
                  {stat.labelHi}
                </span>
                <p className="mt-0.5 text-xs font-bold tracking-tight text-slate-300 transition-colors group-hover:text-white">
                  {stat.label}
                </p>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
