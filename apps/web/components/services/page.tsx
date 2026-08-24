"use client"

import { AnimatePresence, m } from "framer-motion"
import {
  AlertOctagon,
  Award,
  CheckCircle,
  Construction,
  CreditCard,
  Download,
  Droplet,
  FileText,
  HelpCircle,
  Skull,
  Store,
  Sparkles,
  X,
  MapPin,
} from "lucide-react"
import React, { useState } from "react"

interface ServiceItem {
  id: string
  name: string
  nameHi: string
  desc: string
  icon: React.ReactNode
  themeColor: string
  badge: string
  pdfName: string
}

export default function Services() {
  const [activeService, setActiveService] = useState<ServiceItem | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const services: ServiceItem[] = [
    {
      id: "prop-tax",
      name: "Property Tax Assessment",
      nameHi: "संपत्ति कर एवं मूल्यांकन",
      desc: "नगर पंचायत छाता क्षेत्र के अंतर्गत आवासीय और व्यावसायिक संपत्तियों के वार्षिक कर का भुगतान एवं डिजिटल रसीद।",
      icon: <CreditCard className="h-6 w-6" />,
      themeColor: "from-blue-600 to-indigo-700",
      badge: "सबसे लोकप्रिय",
      pdfName: "Chhata_Property_Tax_Assessment_Form.pdf",
    },
    {
      id: "water-tax",
      name: "Water Supply & Tax",
      nameHi: "जल कर एवं कनेक्शन",
      desc: "घरेलू तथा व्यावसायिक जल आपूर्ति कनेक्शन बिलों की जाँच और सुरक्षित डिजिटल माध्यम से बकाया भुगतान।",
      icon: <Droplet className="h-6 w-6" />,
      themeColor: "from-sky-500 to-blue-600",
      badge: "त्वरित भुगतान",
      pdfName: "Chhata_Water_Connection_Tax_Form.pdf",
    },
    {
      id: "birth-cert",
      name: "Birth Registration",
      nameHi: "जन्म प्रमाण पत्र",
      desc: "छाता क्षेत्र में हुए नवजात शिशुओं के पंजीकरण के लिए आवेदन तथा आधिकारिक प्रमाण पत्र सत्यापन सेवा।",
      icon: <Award className="h-6 w-6" />,
      themeColor: "from-emerald-500 to-teal-700",
      badge: "अनिवार्य सेवा",
      pdfName: "Chhata_Birth_Registration_Form.pdf",
    },
    {
      id: "death-cert",
      name: "Death Registration",
      nameHi: "मृत्यु प्रमाण पत्र",
      desc: "पारदर्शी और आसान प्रशासनिक प्रक्रिया के तहत मृत्यु अभिलेख दर्ज करें व आधिकारिक प्रमाण पत्र प्राप्त करें।",
      icon: <Skull className="h-6 w-6" />,
      themeColor: "from-rose-500 to-red-700",
      badge: "आधिकारिक अभिलेख",
      pdfName: "Chhata_Death_Registration_Form.pdf",
    },
    {
      id: "trade-lic",
      name: "Trade License",
      nameHi: "व्यापार लाइसेंस (दुकान पंजीकरण)",
      desc: "छाता बाजार और हाईवे क्षेत्र के व्यापारियों के लिए नया लाइसेंस या मौजूदा व्यावसायिक परमिट का नवीनीकरण।",
      icon: <Store className="h-6 w-6" />,
      themeColor: "from-amber-500 to-orange-600",
      badge: "व्यवसायिक",
      pdfName: "Chhata_Trade_License_Application.pdf",
    },
    {
      id: "build-perm",
      name: "Building Permission",
      nameHi: "भवन निर्माण अनुमति",
      desc: "नगर पंचायत छाता के शहरी विकास एवं वास्तुशिल्प नियमों के अंतर्गत निर्माण ब्लूप्रिंट स्वीकृति।",
      icon: <Construction className="h-6 w-6" />,
      themeColor: "from-purple-600 to-indigo-800",
      badge: "नियोजन",
      pdfName: "Chhata_Building_Permission_Blueprint_Form.pdf",
    },
    {
      id: "rti",
      name: "RTI Application",
      nameHi: "सूचना का अधिकार (RTI)",
      desc: "पारदर्शिता अधिनियम के तहत नगर पंचायत कार्यालय से जुड़े विकास कार्यों व सूचनाओं के लिए आवेदन।",
      icon: <HelpCircle className="h-6 w-6" />,
      themeColor: "from-cyan-600 to-blue-700",
      badge: "पारदर्शिता",
      pdfName: "Chhata_RTI_Application_Form.pdf",
    },
    {
      id: "grievance",
      name: "Civic Grievance Registry",
      nameHi: "नागरिक शिकायत पंजीकरण",
      desc: "सफाई, स्ट्रीट लाइट, सड़क या जल निकासी से जुड़ी समस्याएं दर्ज करें और समाधान की स्थिति देखें।",
      icon: <AlertOctagon className="h-6 w-6" />,
      themeColor: "from-red-600 to-rose-800",
      badge: "त्वरित समाधान",
      pdfName: "Chhata_Civic_Grievance_Form.pdf",
    },
  ]

  const handleCardClick = (service: ServiceItem) => {
    setActiveService(service)
    setDownloading(false)
    setDownloaded(false)
  }

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      setDownloaded(true)
      setTimeout(() => {
        setActiveService(null)
        setDownloaded(false)
      }, 1500)
    }, 1500)
  }

  return (
    <section
      id="citizen-services"
      className="relative overflow-hidden bg-slate-50 px-4 py-24 font-sans text-slate-900 md:px-8"
    >
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute top-1/4 left-0 h-112.5 w-112.5 rounded-full bg-orange-500/5 blur-[140px]"></div>
      <div className="pointer-events-none absolute right-0 bottom-10 h-112.5 w-112.5 rounded-full bg-blue-500/5 blur-[140px]"></div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Title Header */}
        <div className="mx-auto mb-16 max-w-3xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-orange-600 uppercase shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 animate-pulse text-orange-600" />
            <span>नगर पंचायत छाता • डिजिटल नागरिक सेवा पोर्टल</span>
          </div>

          <h2 className="font-serif text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Unified Public{" "}
            <span className="bg-linear-to-r from-orange-600 via-amber-600 to-blue-600 bg-clip-text text-transparent">
              Services Desk
            </span>
          </h2>

          <p className="text-sm leading-relaxed font-medium text-slate-600 md:text-base">
            छाता, मथुरा के नागरिकों के लिए पारदर्शी और त्वरित ऑनलाइन डिजिटल
            सेवाएं। आवश्यक आवेदन फॉर्म डाउनलोड करें और सरलता से लाभ उठाएं।
          </p>
          <div className="mx-auto mt-4 h-1.5 w-24 rounded-full bg-linear-to-r from-orange-500 to-blue-600"></div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <m.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              onClick={() => handleCardClick(service)}
              className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-orange-500/50 hover:shadow-2xl"
            >
              {/* Top Accent Gradient Line */}
              <div
                className={`absolute top-0 right-0 left-0 h-1 bg-linear-to-r ${service.themeColor} opacity-80 transition-opacity group-hover:opacity-100`}
              />

              <div>
                {/* Header with Icon and Badge */}
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-linear-to-br ${service.themeColor} flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    {service.icon}
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-700">
                    {service.badge}
                  </span>
                </div>

                {/* Titles */}
                <div>
                  <span className="mb-1 block text-[10px] font-extrabold tracking-widest text-orange-600 uppercase">
                    {service.nameHi}
                  </span>
                  <h3 className="font-serif text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600">
                    {service.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 line-clamp-3 text-xs leading-relaxed font-medium text-slate-600">
                  {service.desc}
                </p>
              </div>

              {/* Footer CTA Hint */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-orange-600 transition-transform group-hover:translate-x-1">
                <span>फॉर्म डाउनलोड करें</span>
                <Download className="h-3.5 w-3.5 text-orange-600" />
              </div>
            </m.div>
          ))}
        </div>

        {/* Office Location Assistance Footer Note */}
        <div className="mt-12 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs font-medium text-slate-600 shadow-md backdrop-blur-md">
          <MapPin className="h-4 w-4 shrink-0 text-orange-600" />
          <span>
            कार्यालय सहायता: किसी भी समस्या या पूछताछ के लिए नगर पंचायत छाता,
            मथुरा कार्यालय में कार्यदिवस में संपर्क करें।
          </span>
        </div>
      </div>

      {/* ================================================= */}
      {/* DOWNLOAD SIMULATION MODAL SHEET                  */}
      {/* ================================================= */}

      <AnimatePresence>
        {activeService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between bg-linear-to-r from-orange-600 to-amber-600 px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/20 p-2 text-white">
                    {activeService.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider uppercase">
                      {activeService.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-orange-100">
                      {activeService.nameHi}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveService(null)}
                  className="cursor-pointer rounded-full bg-black/10 p-1.5 text-white transition-colors hover:bg-black/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 p-6 text-center">
                {downloaded ? (
                  <div className="flex flex-col items-center space-y-3 py-6">
                    <CheckCircle className="h-14 w-14 text-emerald-600" />
                    <h4 className="text-base font-extrabold text-slate-900">
                      डाउनलोड पूर्ण हुआ!
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      आपका दस्तावेज़{" "}
                      <span className="font-mono text-orange-600">
                        {activeService.pdfName}
                      </span>{" "}
                      सफलतापूर्वक डाउनलोड हो गया है।
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-orange-600 shadow-inner">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        आधिकारिक दस्तावेज़ तैयार है
                      </h4>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {activeService.name} के लिए नगर पंचायत छाता का आधिकारिक
                        पीडीएफ आवेदन पत्र डाउनलोड करने के लिए नीचे क्लिक करें।
                      </p>
                      <div className="mt-3 inline-block rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-slate-700">
                        {activeService.pdfName} (PDF)
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveService(null)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900"
                      >
                        रद्द करें (Cancel)
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:brightness-110 disabled:opacity-50"
                      >
                        {downloading ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            <span>डाउनलोड हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            <span>पीडीएफ डाउनलोड करें</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
