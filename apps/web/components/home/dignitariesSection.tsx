"use client"

import { m } from "framer-motion"
import { Award, ShieldCheck } from "lucide-react"

interface Dignitary {
  id: string
  name: string
  designation: string
  image: string
}

export default function DignitariesSection() {
  // केवल शीर्ष 3 नेतृत्व के सदस्य
  const dignitariesList: Dignitary[] = [
    {
      id: "1",
      name: "Hon. Shri Yogi Adityanath",
      designation: "Chief Minister, Uttar Pradesh",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFm8hmbwanzZMT0OGeYJT-fyKujZoRGsGHGjsdCqSQfg&s=10",
    },
    {
      id: "2",
      name: "Shri Arvind Kumar Sharma",
      designation: "Minister of Urban Development, UP",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGnVLNIphcD463NPf9HTUAQsytvLyQR9lcEfQnUqxUGw&s=10",
    },
    {
      id: "3",
      name: "Shri Rakesh Rathore Guru",
      designation: "State Minister of Urban Development, UP",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSccuweW9do7mqLcHMMcW3eRvoX65bVC3oWdKmQ-xqRjA&s=10",
    },
  ]

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-50 px-4 py-16 font-sans md:px-8">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-87.5 w-225 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/5 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Mini Heading */}
        <div className="mb-8 flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-500/10 p-2 text-orange-600">
              <Award className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">
             Patronage and Executive Leadership{" "}
              <span className="text-xs font-semibold text-orange-600">
                (Leadership Board)
              </span>
            </h2>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 sm:inline-block">
            Nagar Panchayat Chhata • Official Desk
          </span>
        </div>

        {/* Main Strip Container - 3 Columns Layout */}
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/50 lg:grid-cols-3">
          {dignitariesList.map((item, index) => (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className={`group relative flex flex-col items-center p-6 text-center transition-all duration-300 hover:bg-linear-to-b hover:from-orange-50/40 hover:to-transparent sm:flex-row sm:text-left ${
                index !== dignitariesList.length - 1
                  ? "border-b border-slate-100 lg:border-r lg:border-b-0"
                  : ""
              }`}
            >
              {/* Bounded & Bigger Image Box */}
              <div className="relative mb-4 h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 shadow-md transition-transform duration-300 group-hover:scale-105 sm:mb-0 sm:mr-5 sm:h-28 sm:w-28">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/25 via-transparent to-transparent" />
                
                {/* Official Icon Badge */}
                <div className="absolute right-1.5 bottom-1.5 rounded-full bg-orange-600 p-1 text-white shadow-md">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              {/* Text Details with more space */}
              <div className="flex flex-1 flex-col justify-center space-y-1.5">
                <h3 className="text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600 sm:text-base">
                  {item.name}
                </h3>
                <p className="text-xs leading-relaxed font-medium text-slate-500 sm:text-sm">
                  {item.designation}
                </p>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
