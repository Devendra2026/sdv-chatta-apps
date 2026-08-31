"use client"

import { AnimatePresence, motion as m } from "framer-motion"
import {
  Award,
  Calendar,
  Eye,
  MapPin,
  Quote,
  ShieldCheck,
  Target,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"

export default function ChairmanMessage() {
  const [activeTab, setActiveTab] = useState<"welcome" | "vision" | "mission">(
    "welcome"
  )

  return (
    <section
      id="about-us"
      className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-100 px-4 py-24 font-sans md:px-8"
    >
      {/* Background Aesthetic Glows */}
      <div className="pointer-events-none absolute top-10 left-10 h-125 w-125 rounded-full bg-orange-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 bottom-10 h-125 w-125 rounded-full bg-sky-600/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <m.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-orange-600 uppercase shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span>Leadership & Administration</span>
          </m.div>

          <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Desk of the Chairman & Administration
          </h2>
          <p className="mt-4 text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            Welcome to the official administrative portal of{" "}
            <span className="font-bold text-orange-600">
             नगर पंचायत, छाता, मथुरा
            </span>{" "}
            , Uttar Pradesh.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-1.5 w-12 rounded-full bg-orange-500" />
            <span className="h-1.5 w-3 rounded-full bg-slate-300" />
            <span className="h-1.5 w-6 rounded-full bg-emerald-600" />
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: Official Profile Card */}
          <div className="flex flex-col lg:col-span-4">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="group relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 p-6 text-center shadow-2xl"
            >
              {/* Tricolor Accent Top Bar */}
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-orange-500 via-white to-emerald-500" />

              {/* Top Tag */}
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1.5 text-[11px] font-extrabold tracking-wider text-orange-400 uppercase shadow-inner">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
                  Elected Chairperson
                </span>
              </div>

              {/* Portrait Frame */}
              <div className="relative my-6">
                <div className="relative mx-auto aspect-4/5 w-full max-w-60 overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-slate-800 shadow-xl transition-all duration-500 group-hover:border-orange-500/50">
                  <Image
                    src="/chhatachairman.png"
                    alt="Chairman Nagar Palika Chhata Mathura"
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 280px"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>
              </div>

              {/* Name Details */}
              <div className="mb-2 space-y-1.5">
                <h3 className="text-xl leading-tight font-black tracking-tight text-white">
                  Smt. Lakshmi
                </h3>
                <p className="text-xs font-bold tracking-widest text-orange-400 uppercase">
                  Hon'ble Chairman
                </p>
                <p className="pt-1 text-xs font-medium text-slate-400">
                  छाता, मथुरा, उत्तर प्रदेश
                </p>
              </div>

              {/* Quick Seal Badge */}
              <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-800/80 pt-4 text-[11px] font-semibold text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                <span>Mathura District Administration</span>
              </div>
            </m.div>
          </div>

          {/* Right Column: Dynamic Interactive Info Sheet */}
          <div className="flex flex-col lg:col-span-8">
            <div className="flex flex-1 flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl md:p-8">
              {/* Tab Selector Header */}
              <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                <TabButton
                  active={activeTab === "welcome"}
                  onClick={() => setActiveTab("welcome")}
                  icon={<Quote className="h-4 w-4" />}
                  label="Welcome Message"
                />
                <TabButton
                  active={activeTab === "vision"}
                  onClick={() => setActiveTab("vision")}
                  icon={<Eye className="h-4 w-4" />}
                  label="Our Vision"
                />
                <TabButton
                  active={activeTab === "mission"}
                  onClick={() => setActiveTab("mission")}
                  icon={<Target className="h-4 w-4" />}
                  label="Our Mission"
                />
              </div>

              {/* Dynamic Tab Contents */}
              <div className="flex flex-1 flex-col justify-center py-6">
                <AnimatePresence mode="wait">
                  {activeTab === "welcome" && (
                    <m.div
                      key="welcome"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-start gap-3.5 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 shadow-sm">
                        <Quote className="h-8 w-8 shrink-0 rotate-180 text-orange-500 opacity-80" />
                        <div>
                          <p className="text-sm leading-snug font-bold text-slate-900 italic md:text-base">
                            "छाता: ब्रज भूमि की ऐतिहासिक धरोहर, पारदर्शी प्रशासन
                            और आधुनिक विकास का संगम।"
                          </p>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                        ब्रज क्षेत्र के ऐतिहासिक नगर छाता, जिला मथुरा के इस
                        आधिकारिक डिजिटल पोर्टल पर आपका हार्दिक स्वागत है। हमारा
                        प्रशासन पूरी पारदर्शिता, निष्ठा और जन-सहयोग के साथ नगर
                        के चहुंमुखी विकास के लिए प्रतिबद्ध है।
                      </p>
                      <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                        हमारा मुख्य उद्देश्य छाता के प्रत्येक नागरिक को उत्कृष्ट
                        नागरिक सुविधाएँ, शुद्ध पेयजल, सुदृढ़ प्रकाश व्यवस्था और
                        स्वच्छ एवं सुंदर वातावरण उपलब्ध कराना है। आपका सहयोग ही
                        हमारी सबसे बड़ी शक्ति है।
                      </p>
                    </m.div>
                  )}

                  {activeTab === "vision" && (
                    <m.div
                      key="vision"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-slate-900">
                        <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                          <Eye className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                            Vision 2030 Roadmap
                          </h4>
                          <p className="text-xs text-slate-500">
                            Building a smart, self-reliant, and clean municipal
                            town in Braj
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5 pt-2 md:grid-cols-2">
                        {[
                          {
                            title: "समावेशी एवं समान विकास",
                            desc: "छाता के प्रत्येक वार्ड में बिना किसी भेदभाव के समान रूप से बुनियादी सुविधाएँ पहुँचाना।",
                          },
                          {
                            title: "स्वच्छ एवं हरित परिवेश",
                            desc: "पर्यावरण अनुकूल पहलों और वृक्षारोपण अभियानों के साथ स्वच्छ और सुंदर छाता का निर्माण।",
                          },
                          {
                            title: "सांस्कृतिक एवं ऐतिहासिक संरक्षण",
                            desc: "ब्रज भूमि की गौरवशाली पहचान को सहेजते हुए आधुनिक शहरी इंफ्रास्ट्रक्चर विकसित करना।",
                          },
                          {
                            title: "नागरिक सशक्तिकरण",
                            desc: "डिजिटल माध्यमों से नगर पालिका की सेवाओं को त्वरित, सुगम और पूरी तरह पारदर्शी बनाना।",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-sky-200 hover:shadow-sm"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <Award className="h-4 w-4 shrink-0 text-orange-500" />
                              <h5 className="text-xs font-black text-slate-900">
                                {item.title}
                              </h5>
                            </div>
                            <p className="pl-6 text-[11px] leading-normal text-slate-600">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </m.div>
                  )}

                  {activeTab === "mission" && (
                    <m.div
                      key="mission"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-slate-900">
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                            Actionable Targets
                          </h4>
                          <p className="text-xs text-slate-500">
                            Executing ground-level improvements for daily
                            citizen welfare
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5 pt-2 md:grid-cols-3">
                        {[
                          {
                            title: "बुनियादी सुविधाएँ",
                            desc: "नियमित स्वच्छ पेयजल आपूर्ति, आधुनिक नाली-नाला निर्माण और मुख्य मार्गों पर एलईडी स्ट्रीट लाइट्स।",
                          },
                          {
                            title: "उत्कृष्ट स्वच्छता",
                            desc: "डोर-टू-डोर कचरा संग्रहण और प्रभावी निस्तारण प्रणाली के माध्यम से स्वच्छ भारत अभियान को गति देना।",
                          },
                          {
                            title: "डिजिटल सेवाएँ",
                            desc: "कर भुगतान, लाइसेंस और शिकायत निवारण प्रणालियों को ऑनलाइन व मोबाइल-फ्रेंडली बनाना।",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-200 hover:shadow-sm"
                          >
                            <div>
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase">
                                Target 0{idx + 1}
                              </span>
                              <h5 className="mt-2 mb-1 text-xs font-black text-slate-900">
                                {item.title}
                              </h5>
                              <p className="text-[11px] leading-relaxed text-slate-600">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Official Seal / Footer Information */}
              <div className="mt-4 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-5 text-xs font-bold text-slate-600 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 shadow-sm">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-900">
                      कार्यालय: मुख्य मार्ग, नगर पंचायत, छाता, मथुरा
                    </p>
                    <p className="text-[11px] font-normal text-slate-500">
                      जिला - मथुरा, उत्तर प्रदेश (पिन - 281401)
                    </p>
                  </div>
                </div>

                <div className="shrink-0 sm:border-l sm:border-slate-200 sm:pl-4 sm:text-right">
                  <p className="font-black text-slate-900">छाता, मथुरा</p>
                  <p className="mt-0.5 text-[10px] font-extrabold tracking-widest text-orange-600 uppercase">
                    Government Approved Portal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Sub-component for clean reusable tab buttons
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
        active
          ? "scale-[1.02] bg-linear-to-r from-slate-900 to-slate-950 text-white shadow-md shadow-slate-900/10"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-orange-400" : "text-slate-500"}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
