"use client"

import { Button } from "@workspace/ui/components/button"
import { AnimatePresence, m } from "framer-motion"
import { X, ZoomIn } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

interface GalleryItem {
  id: number
  category: "Development" | "Cleanliness" | "Events"
  imageUrl: string
}

export default function Gallery() {
  const [filter, setFilter] = useState<
    "All" | "Development" | "Cleanliness" | "Events"
  >("All")
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null)

  const galleryItems: GalleryItem[] = [
    // {
    //   id: 1,
    //   category: 'Events',
    //   imageUrl: '/aminagarsarai.jpg',
    // },
    // {
    //   id: 2,
    //   category: 'Cleanliness',
    //   imageUrl: '/dustbinphoto.jpg',
    // },
    // {
    //   id: 3,
    //   category: 'Development',
    //   imageUrl: '/cakecutting.jpg',
    // },
    // {
    //   id: 4,
    //   category: 'Development',
    //   imageUrl: '/giftceremony.jpg',
    // },
    // {
    //   id: 5,
    //   category: 'Cleanliness',
    //   imageUrl: '/inaugration.jpg',
    // },
    // {
    //   id: 6,
    //   category: 'Events',
    //   imageUrl: '/independenceday.jpg',
    // },
    // {
    //   id: 7,
    //   category: 'Development',
    //   imageUrl: '/intercollege.jpg',
    // },
    // {
    //   id: 8,
    //   category: 'Events',
    //   imageUrl: '/krishnagod.jpg',
    // },
    // {
    //   id: 9,
    //   category: 'Cleanliness',
    //   imageUrl: '/officephoto.jpg',
    // },
    // {
    //   id: 10,
    //   category: 'Events',
    //   imageUrl: '/prozeceremony.jpg',
    // },
    // {
    //   id: 11,
    //   category: 'Events',
    //   imageUrl: '/ratyatra.jpg',
    // },
    // {
    //   id: 12,
    //   category: 'Events',
    //   imageUrl: '/ribbioncutting.jpg',
    // },
    // {
    //   id: 13,
    //   category: 'Events',
    //   imageUrl: '/sammanphoto.jpg',
    // },
    // {
    //   id: 14,
    //   category: 'Events',
    //   imageUrl: '/saraswatipuja.jpg',
    // },
    // {
    //   id: 15,
    //   category: 'Events',
    //   imageUrl: '/swachtaphoto.jpg',
    // },
    // {
    //   id: 16,
    //   category: 'Events',
    //   imageUrl: '/temple.jpg',
    // },
    // {
    //   id: 17,
    //   category: 'Events',
    //   imageUrl: '/cappp.jpeg',
    // },
    // {
    //   id: 18,
    //   category: 'Events',
    //   imageUrl: '/copyyy.jpeg',
    // },
    // {
    //   id: 19,
    //   category: 'Events',
    //   imageUrl: '/giftt.jpeg',
    // },
    // {
    //   id: 20,
    //   category: 'Events',
    //   imageUrl: '/kalashhh.jpeg',
    // },
    // {
    //   id: 21,
    //   category: 'Events',
    //   imageUrl: '/ladies.jpeg',
    // },
    // {
    //   id: 22,
    //   category: 'Events',
    //   imageUrl: '/scissors.jpeg',
    // },
    // {
    //   id: 23,
    //   category: 'Cleanliness',
    //   imageUrl: '/soill.jpeg',
    // },
  ]

  const filteredItems =
    filter === "All"
      ? galleryItems
      : galleryItems.filter((item) => item.category === filter)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 md:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Page Title */}
        <div className="space-y-3 text-center">
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold tracking-wider text-amber-600 uppercase">
            Nagar Panchayat , Chhata , Mathura Media
          </span>
          <h1 className="font-serif text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Gallery Photos
          </h1>
          <p className="mx-auto max-w-2xl text-sm font-medium text-slate-500 md:text-base">
            Visual highlights of developmental works, sanitation campaigns, and
            official events in Nagar Panchayat , Chhata , Mathura.
          </p>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-amber-500"></div>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-6">
          {(["All", "Development", "Cleanliness", "Events"] as const).map(
            (cat) => (
              <Button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all ${
                  filter === cat
                    ? "scale-102 bg-blue-600 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat === "Cleanliness" ? "Sanitation & Swachhta" : cat}
              </Button>
            )
          )}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <m.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                onClick={() => setActivePhoto(item)}
                className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md hover:shadow-2xl"
              >
                {/* Only Photo Frame */}
                <Image
                  src={item.imageUrl}
                  alt="Gallery Image"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />

                {/* Zoom Badge overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="scale-75 transform rounded-full bg-white/95 p-3 text-slate-900 shadow-lg transition-transform duration-300 group-hover:scale-100">
                    <ZoomIn className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox Overlay Viewer */}
      <AnimatePresence>
        {activePhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
            onClick={() => setActivePhoto(null)}
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-3xl bg-transparent shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Only Photo Viewport */}
              <Image
                fill
                src={activePhoto.imageUrl}
                alt="Enlarged Gallery Image"
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1200px"
              />

              {/* Close button top right */}
              <button
                onClick={() => setActivePhoto(null)}
                className="absolute top-4 right-4 z-10 rounded-full border border-white/20 bg-black/60 p-2 text-white transition-colors hover:bg-amber-500"
              >
                <X className="h-5 w-5" />
              </button>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
