"use client"

import { AnimatePresence, m } from "framer-motion"
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trees,
} from "lucide-react"
import React, { useCallback, useEffect, useState } from "react"

interface Slide {
  id: number
  headline: string
  tagline: string
  badgeText: string
  icon: React.ReactNode
  bgImage: string
  primaryAction: string
  primaryTarget: string
  secondaryAction: string
}

export default function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0)

  const carouselSlides: Slide[] = [
    {
      id: 1,
      headline: "Empowering Citizens Through Digital Governance",
      tagline:
        "Access fast-track municipal permissions, clear utility dues, and download verified civic certificates.",
      badgeText: "Digital Portal 2.0",
      icon: <Activity className="h-4 w-4 text-amber-300" />,
      bgImage:
        "https://cbpssubscriber.mygov.in/assets/uploads/juGajmc1gOVBUtt5",
      primaryAction: "Explore Services",
      primaryTarget: "#citizen-services",
      secondaryAction: "Get Mobile App",
    },
    {
      id: 2,
      headline: "Sustainable Urban Ecosystem Development",
      tagline:
        "Witness our ongoing transformation featuring oxygen-rich urban parks and green highway corridor plantation drives.",
      badgeText: "Eco Initiative",
      icon: <Trees className="h-4 w-4 text-emerald-300" />,
      bgImage:
        "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1920&q=80",
      primaryAction: "Join Tree Plantation",
      primaryTarget: "/contact-us",
      secondaryAction: "View Green Report",
    },
    {
      id: 3,
      headline: "Modern Infrastructure & Civic Utilities",
      tagline:
        "Accelerating city growth with high-capacity road networks, automated smart-lighting layouts, and modern public amenities.",
      badgeText: "Civic Infrastructure",
      icon: <Building2 className="h-4 w-4 text-cyan-300" />,
      bgImage:
        "https://images.unsplash.com/photo-1541336032412-2048a678540d?auto=format&fit=crop&w=1920&q=80",
      primaryAction: "Check Active Tenders",
      primaryTarget: "#news-notices",
      secondaryAction: "Project Milestones",
    },
  ]

  const handleNextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % carouselSlides.length)
  }, [carouselSlides.length])

  const handlePrevSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length
    )
  }

  useEffect(() => {
    const intervalTimer = setInterval(() => {
      handleNextSlide()
    }, 7000)
    return () => clearInterval(intervalTimer)
  }, [handleNextSlide])

  // Current slide ko safely access karne ke liye
  const currentSlide = carouselSlides[activeSlide] || carouselSlides[0]

  return (
    <section
      className="relative h-131.25 w-full overflow-hidden bg-slate-950 font-sans select-none md:h-156.25"
      aria-label="Featured Highlights"
    >
      {/* Background Slides with Fade Cross-fade */}
      <div className="absolute inset-0 h-full w-full">
        <AnimatePresence mode="wait">
          <m.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <div
              className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat brightness-90 filter"
              style={{
                backgroundImage: `url(${currentSlide?.bgImage})`,
              }}
            />

            <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 bg-black/20" />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Main Grid Content Wrapper */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 md:px-12">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <m.div
              key={`badge-${activeSlide}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-white uppercase shadow-lg backdrop-blur-md"
            >
              <div className="rounded-full bg-white/10 p-0.5">
                {currentSlide?.icon}
              </div>
              <span className="font-bold text-amber-300">
                {currentSlide?.badgeText}
              </span>
            </m.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <m.h1
              key={`head-${activeSlide}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-3 text-3xl leading-tight font-black tracking-tight text-white uppercase drop-shadow-lg md:text-5xl"
            >
              {currentSlide?.headline}
            </m.h1>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <m.p
              key={`desc-${activeSlide}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="mb-6 max-w-xl text-sm leading-relaxed font-normal text-slate-200 drop-shadow-sm md:text-base"
            >
              {currentSlide?.tagline}
            </m.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <m.div
              key={`cta-${activeSlide}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-wrap items-center gap-3.5"
            >
              <a
                href={currentSlide?.primaryTarget}
                className="group inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-extrabold tracking-wider text-slate-950 uppercase shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 active:scale-95 md:text-sm"
              >
                <span>{currentSlide?.primaryAction}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="#about-us"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900/70 px-5 py-2.5 text-xs font-bold tracking-wider text-white uppercase backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-slate-900 md:text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <span>{currentSlide?.secondaryAction}</span>
              </a>
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Control Arrows */}
      <div className="absolute right-4 bottom-6 z-20 flex items-center gap-2.5 md:right-8">
        <button
          onClick={handlePrevSlide}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-slate-900/70 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-amber-500 hover:text-slate-950"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={handleNextSlide}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-slate-900/70 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-amber-500 hover:text-slate-950"
          aria-label="Next Slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Modern Line Progress Indicators */}
      <div className="absolute bottom-6 left-6 z-20 hidden items-center gap-2 sm:flex md:left-12">
        {carouselSlides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setActiveSlide(idx)}
            className={`h-1.5 cursor-pointer rounded-full transition-all duration-500 ${
              idx === activeSlide
                ? "w-10 bg-amber-400 shadow-md"
                : "w-3 bg-white/30 hover:bg-white/60"
            }`}
            aria-label={`Jump to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
