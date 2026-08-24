"use client"

import { m } from "framer-motion"
import {
  ArrowRight,
  Coins,
  Droplet,
  Hammer,
  HardHat,
  HeartPulse,
  Trash2,
  Landmark,
  Sparkles,
} from "lucide-react"
import React from "react"

interface DepartmentCard {
  name: string
  nameHi: string
  desc: string
  icon: React.ReactNode
  color: string
  badgeBg: string
  services: string[]
}

export default function Departments() {
  const departments: DepartmentCard[] = [
    {
      name: "Public Works Department",
      nameHi: "लोक निर्माण विभाग",
      desc: "छाता नगर की सड़कों, मुख्य मार्गों, प्रशासनिक भवनों, नालियों और सार्वजनिक सुरक्षा से जुड़े बुनियादी ढांचों का रखरखाव व प्रबंधन।",
      icon: <HardHat className="h-7 w-7" />,
      color: "from-amber-500 to-orange-600",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200/60",
      services: [
        "सड़क क्षति एवं मरम्मत रिपोर्टिंग",
        "सड़क खुदाई अनुमति (ट्रेंचिंग एनओसी)",
        "सार्वजनिक प्रकाश व सुरक्षा व्यवस्था",
      ],
    },
    {
      name: "Revenue Department",
      nameHi: "राजस्व विभाग",
      desc: "गृह/संपत्ति कर निर्धारण, व्यावसायिक विज्ञापन लाइसेंस, यूजर चार्ज और स्थानीय करों के पारदर्शी संग्रह का संचालन।",
      icon: <Coins className="h-7 w-7" />,
      color: "from-blue-600 to-indigo-700",
      badgeBg: "bg-blue-50 text-blue-800 border-blue-200/60",
      services: [
        "स्वयं संपत्ति कर आकलन (Self Assessment)",
        "संपत्ति का नामांतरण (म्यूटेशन)",
        "कर भुगतान रसीद एवं एनओसी",
      ],
    },
    {
      name: "Water Supply Department",
      nameHi: "जल आपूर्ति विभाग",
      desc: "पेयजल पाइपलाइन नेटवर्क, ओवरहैड टैंक, टैंकर सेवा, सीवर कनेक्शन और जल संबंधी शिकायतों का त्वरित समाधान।",
      icon: <Droplet className="h-7 w-7" />,
      color: "from-sky-500 to-blue-600",
      badgeBg: "bg-sky-50 text-sky-800 border-sky-200/60",
      services: [
        "नया जल कनेक्शन अनुरोध",
        "पाइपलाइन लीकेज व मरम्मत शिकायत",
        "जल बिल विवाद समाधान",
      ],
    },
    {
      name: "Sanitation Department",
      nameHi: "स्वास्थ्य एवं स्वच्छता विभाग",
      desc: "घर-घर कचरा संग्रहण, ठोस अपशिष्ट प्रबंधन, एंटी-लार्वा स्प्रे और स्वच्छ छाता अभियान का सुचारू संचालन।",
      icon: <Trash2 className="h-7 w-7" />,
      color: "from-emerald-500 to-teal-600",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
      services: [
        "कचरा प्रबंधन व डंपिंग रिपोर्टिंग",
        "मच्छर रोधी फॉगिंग एवं स्प्रे अनुरोध",
        "कम्युनिटी बिन शिकायत निवारण",
      ],
    },
    {
      name: "Health Department",
      nameHi: "लोक स्वास्थ्य विभाग",
      desc: "नागरिक जीवन अभिलेखों (जन्म एवं मृत्यु प्रमाण पत्र), टीकाकरण रिकॉर्ड और खाद्य प्रतिष्ठान स्वच्छता जाँच।",
      icon: <HeartPulse className="h-7 w-7" />,
      color: "from-rose-500 to-red-600",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200/60",
      services: [
        "ऑनलाइन जन्म पंजीकरण व प्रमाण पत्र",
        "ऑनलाइन मृत्यु पंजीकरण",
        "खाद्य एवं व्यापार लाइसेंस एनओसी",
      ],
    },
    {
      name: "Engineering & Town Planning",
      nameHi: "अभियांत्रिकी एवं नगर नियोजन",
      desc: "भवन निर्माण नक्शा स्वीकृति, ज़ोनिंग नियम, अतिक्रमण हटाना और नियोजित नगर विकास का सुदृढ़ीकरण।",
      icon: <Hammer className="h-7 w-7" />,
      color: "from-indigo-600 to-violet-700",
      badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200/60",
      services: [
        "भवन योजना ब्लूप्रिंट स्वीकृति",
        "अतिक्रमण निकासी एवं कार्रवाई",
        "ज़ोनिंग विनियमन और लैंड यूज़",
      ],
    },
  ]

  return (
    <section
      id="digital-gateway"
      className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-orange-50/20 px-4 py-20 font-sans md:px-8"
    >
      {/* Decorative backdrop elements */}
      <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-400/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-orange-800 uppercase shadow-sm">
            <Landmark className="h-4 w-4 text-orange-600" /> नगर पंचायत छाता
            प्रशासन पोर्टल
          </span>

          <h2 className="font-serif text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
           Departments of Chhata, Mathura{" "}
          </h2>

          <p className="text-sm font-medium text-slate-600 md:text-base">
           Digital Services of Chhata, Mathura from various departments, applications and complaint resolution system available at one place.
          </p>

          <div className="mx-auto mt-4 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-12 rounded-full bg-orange-500" />
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="h-1.5 w-12 rounded-full bg-blue-600" />
          </div>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept, index) => (
            <m.div
              key={dept.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-orange-300 hover:shadow-2xl"
            >
              {/* Card top accent line */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${dept.color}`}
              />

              <div className="pointer-events-none absolute top-0 right-0 z-0 h-32 w-32 rounded-bl-full bg-slate-50 transition-colors group-hover:bg-orange-50/40" />

              <div className="relative z-10">
                {/* Header Icon Card */}
                <div className="flex items-center justify-between">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-linear-to-br ${dept.color} flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    {dept.icon}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase ${dept.badgeBg}`}
                  >
                    सक्रिय सेवा
                  </span>
                </div>

                {/* Titles */}
                <div className="mt-6 space-y-1">
                  <span className="block text-xs font-extrabold tracking-wider text-orange-700 uppercase">
                    {dept.nameHi}
                  </span>
                  <h3 className="font-serif text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600">
                    {dept.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                  {dept.desc}
                </p>

                {/* Services Bullets List */}
                <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    प्रमुख सेवाएं:
                  </p>
                  {dept.services.map((serv) => (
                    <div
                      key={serv}
                      className="flex items-center gap-2.5 text-xs font-semibold text-slate-700"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 transition-transform group-hover:scale-125"></span>
                      <span>{serv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Link Footer inside Card */}
              <div className="relative z-10 mt-8 flex cursor-pointer items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-orange-600 group-hover:text-orange-700">
                <span>सेवाओं का लाभ उठाएं</span>
                <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1.5" />
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
