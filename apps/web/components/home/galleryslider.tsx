"use client"

import React, { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Award, ExternalLink, X } from "lucide-react"

interface Certification {
  id: number
  title: string
  category: string
  image: string
  description: string
}

const certificationsData: Certification[] = [
  {
    id: 1,
    title: "MSME Certified",
    category: "Government Registration",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    description:
      "Certified under Ministry of Micro, Small and Medium Enterprises.",
  },
  {
    id: 2,
    title: "Enterprise Partner",
    category: "ISO/IEC 27001:2022",
    image:
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=800",
    description: "Information Security Management System compliance certified.",
  },
  {
    id: 3,
    title: "Technology Leader",
    category: "ISO 9001:2015",
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    description: "Quality Management System for standard service delivery.",
  },
  {
    id: 4,
    title: "Swachh Bharat Award",
    category: "Municipal Excellence",
    image:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800",
    description:
      "Recognition for outstanding cleanliness and sanitation initiatives.",
  },
  {
    id: 5,
    title: "Digital Governance",
    category: "State Innovation",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
    description: "Awarded for transparent and fast digital citizen services.",
  },
  {
    id: 6,
    title: "Green Energy Pioneer",
    category: "Sustainability",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    description:
      "Appreciation for adopting eco-friendly municipal infrastructure.",
  },
  {
    id: 7,
    title: "Financial Transparency",
    category: "Auditing Excellence",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800",
    description:
      "Certified for 100% transparent budget allocation and utilization.",
  },
]

export default function CertificationsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState<Certification | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const itemsPerPage = 3
  const maxIndex = Math.max(0, certificationsData.length - itemsPerPage)

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1))
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }

  // ऑटो-स्लाइड लॉजिक (हर 4 सेकंड में)
  useEffect(() => {
    if (isPaused || selectedImage) return // अगर माउस ऊपर है या पॉपअप खुला है तो स्लाइड न हो

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, 2000)

    return () => clearInterval(interval)
  }, [maxIndex, isPaused, selectedImage])

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-slate-50 to-slate-100/50 px-4 py-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wider text-blue-700 uppercase">
            <Award className="h-3.5 w-3.5" />
            <span>Gallery</span>
          </div>
          <h2 className="font-serif text-3xl font-extrabold tracking-tight text-emerald-500 md:text-4xl">
            Our Nagar Panchayat Achievements & Recognitions
          </h2>
          <p className="text-black-600 mt-2 text-sm font-medium md:text-base">
            Achievements and recognitions for excellence, compliance, and
            quality service delivery.
          </p>
        </div>

        {/* Slider Container (Mouse enter/leave पर ऑटो-स्लाइड रुकने और चलने के लिए) */}
        <div
          className="relative px-2 md:px-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Arrow Button */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-0 z-10 flex h-11 w-11 -translate-x-2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all duration-300 hover:bg-blue-600 hover:text-white focus:outline-none md:-translate-x-5"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Cards Viewport */}
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {certificationsData.map((cert) => (
                <div
                  key={cert.id}
                  className="min-w-full shrink-0 md:min-w-[calc(33.333%-16px)]"
                >
                  <div
                    onClick={() => setSelectedImage(cert)}
                    className="group flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md transition-all duration-300 hover:shadow-xl"
                  >
                    {/* Image Preview Box */}
                    <div className="relative mb-4 h-64 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      <img
                        src={cert.image}
                        alt={cert.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-end bg-linear-to-t from-slate-900/40 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                          Click to View <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>

                    {/* Content info */}
                    <div>
                      <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                        {cert.category}
                      </span>
                      <h3 className="mt-1 font-serif text-lg font-bold text-slate-900">
                        {cert.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {cert.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-0 z-10 flex h-11 w-11 translate-x-2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all duration-300 hover:bg-blue-600 hover:text-white focus:outline-none md:translate-x-5"
            aria-label="Next Slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                currentIndex === index ? "w-8 bg-blue-600" : "w-2 bg-slate-300"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ================================================= */}
      {/* IMAGE POPUP / LIGHTBOX MODAL                      */}
      {/* ================================================= */}
      {selectedImage && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="animate-scale-up relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                  {selectedImage.category}
                </span>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {selectedImage.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-700 transition-colors hover:bg-slate-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Image View */}
            <div className="flex max-h-[70vh] items-center justify-center bg-slate-900 p-4">
              <img
                src={selectedImage.image}
                alt={selectedImage.title}
                className="max-h-[65vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>

            {/* Modal Footer Description */}
            <div className="border-t border-slate-100 bg-white p-4">
              <p className="text-center text-sm font-medium text-slate-600">
                {selectedImage.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
