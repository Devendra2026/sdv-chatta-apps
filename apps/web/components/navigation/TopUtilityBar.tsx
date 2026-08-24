"use client"

import React, { useState } from "react"
import { Phone, Mail, Accessibility } from "lucide-react"

export default function TopUtilityBar() {
  const [fontSize, setFontSize] = useState("normal")

  const toggleScreenReader = () => {
    // Screen reader accessibility message helper
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(
        "Screen Reader Access enabled. Welcome to Nagar Panchayat , Chhata, Mathura , Uttar Pradesh."
      )
      speech.rate = 1.0
      window.speechSynthesis.speak(speech)
      alert("Screen Reader Announcement activated!")
    } else {
      alert("Text-to-speech not supported on this browser.")
    }
  }

  return (
    <div className="bg-gov-blue-dark border-gov-blue-medium relative z-50 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs text-slate-200 md:px-8">
      {/* Left Contact Side */}
      <div className="flex items-center space-x-4">
        <a
          href="tel:+911212222040"
          className="hover:text-gov-saffron flex items-center gap-1 transition-colors"
        >
          <Phone className="text-gov-saffron h-3.5 w-3.5" />
          <span>+91 121 222 2040</span>
        </a>
        <a
          href="mailto:npchhata@gmail.com"
          className="hover:text-gov-saffron flex items-center gap-1 transition-colors sm:flex"
        >
          <Mail className="text-gov-saffron h-3.5 w-3.5" />
          <span>npchhata@gmail.com</span>
        </a>
      </div>

      {/* Center Accessibility Shortcuts */}
      <div className="mx-auto flex items-center space-x-4 md:mx-0">
        <a
          href="#main-content"
          className="hover:text-gov-saffron focus:outline-gov-saffron border-r border-slate-700 pr-3 font-medium transition-colors last:border-0 focus:outline-2"
        >
          Skip to Main Content
        </a>
        <button
          onClick={toggleScreenReader}
          className="hover:text-gov-saffron focus:outline-gov-saffron flex cursor-pointer items-center gap-1 font-medium transition-colors focus:outline-2"
          title="Enable speech reader"
          suppressHydrationWarning
        >
          <Accessibility className="h-3.5 w-3.5" />
          <span>Screen Reader Access</span>
        </button>
        <span className="hidden h-3 border-r border-slate-700 lg:inline"></span>
        <div className="hidden items-center gap-2 lg:flex">
          <button
            onClick={() => {
              document.documentElement.style.fontSize = "14px"
              setFontSize("small")
            }}
            className="hover:text-gov-saffron px-1 font-bold"
            title="Decrease text size"
            suppressHydrationWarning
          >
            A-
          </button>
          <button
            onClick={() => {
              document.documentElement.style.fontSize = "16px"
              setFontSize("normal")
            }}
            className="hover:text-gov-saffron border-x border-slate-700 px-1 font-bold"
            title="Normal text size"
            suppressHydrationWarning
          >
            A
          </button>
          <button
            onClick={() => {
              document.documentElement.style.fontSize = "18px"
              setFontSize("large")
            }}
            className="hover:text-gov-saffron px-1 font-bold"
            title="Increase text size"
            suppressHydrationWarning
          >
            A+
          </button>
        </div>
      </div>
    </div>
  )
}
