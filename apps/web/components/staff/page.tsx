"use client"

import { Button } from "@workspace/ui/components/button"
import { m, AnimatePresence } from "framer-motion"
import { Award, Calendar, Eye, Quote, Target, Sparkles } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

type TabType = "welcome" | "vision" | "mission"

interface OfficerRowProps {
  id: string
  roleTitle: string
  designation: string
  name: string
  subText: string
  imgSrc: string
  term: string
  status: string
  welcomeQuote: string
  welcomeText1: string
  welcomeText2: string
  visionTitle: string
  visionDesc: string
  visionPoints: string[]
  missionDesc: string
  missionTargets: { title: string; desc: string }[]
}

function OfficerRow({ data }: { data: OfficerRowProps }) {
  const [activeTab, setActiveTab] = useState<TabType>("welcome")

  return (
    <div className="grid grid-cols-1 items-start gap-8 border-b border-slate-200/80 pb-16 last:border-0 last:pb-0 lg:grid-cols-12">
      {/* Left Column: Officer Profile Card */}
      <div className="flex w-full flex-col items-center lg:col-span-4">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="group relative w-full max-w-xs overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-xl shadow-slate-200/50"
        >
          {/* Top Decorative Gradient Accent */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-linear-to-r from-orange-500 to-amber-600" />

          {/* Role Title Badge */}
          <div className="mb-4 inline-block rounded-full border border-blue-800 bg-blue-900 px-3.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-sm">
            {data.roleTitle}
          </div>

          {/* Name & Designation */}
          <h3 className="mt-2 font-serif text-xl font-extrabold tracking-tight text-slate-900">
            {data.name}
          </h3>
          <p className="mt-1 text-xs font-bold tracking-widest text-orange-600 uppercase">
            {data.designation}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {data.subText}
          </p>
        </m.div>
      </div>

      {/* Right Column: Dynamic Info Sheet */}
      <div className="w-full lg:col-span-8">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-8">
          {/* Tab Selector Header */}
          <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-slate-100 pb-4">
            <Button
              onClick={() => setActiveTab("welcome")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold tracking-wider whitespace-nowrap uppercase shadow-none transition-all ${
                activeTab === "welcome"
                  ? "bg-blue-900 text-white shadow-md shadow-blue-900/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Quote className="h-3.5 w-3.5" />
              <span>संदेश (Message)</span>
            </Button>
            <Button
              onClick={() => setActiveTab("vision")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold tracking-wider whitespace-nowrap uppercase shadow-none transition-all ${
                activeTab === "vision"
                  ? "bg-blue-900 text-white shadow-md shadow-blue-900/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>दृष्टिकोण (Vision)</span>
            </Button>
            <Button
              onClick={() => setActiveTab("mission")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold tracking-wider whitespace-nowrap uppercase shadow-none transition-all ${
                activeTab === "mission"
                  ? "bg-blue-900 text-white shadow-md shadow-blue-900/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>मिशन (Mission)</span>
            </Button>
          </div>

          {/* Dynamic Tab Content */}
          <div className="min-h-55 flex-1 py-6">
            <AnimatePresence mode="wait">
              {activeTab === "welcome" && (
                <m.div
                  key="welcome"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                    <Quote className="h-8 w-8 shrink-0 rotate-180 text-amber-600 opacity-60" />
                    <p className="font-serif text-xs leading-relaxed font-bold text-slate-900 italic md:text-sm">
                      "{data.welcomeQuote}"
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                    {data.welcomeText1}
                  </p>
                  {data.welcomeText2 && (
                    <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                      {data.welcomeText2}
                    </p>
                  )}
                </m.div>
              )}

              {activeTab === "vision" && (
                <m.div
                  key="vision"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-blue-950">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                      <Eye className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold tracking-wider uppercase md:text-sm">
                      {data.visionTitle}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                    {data.visionDesc}
                  </p>
                  <ul className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                    {data.visionPoints.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-700"
                      >
                        <Award className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </m.div>
              )}

              {activeTab === "mission" && (
                <m.div
                  key="mission"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-blue-950">
                    <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
                      <Target className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold tracking-wider uppercase md:text-sm">
                      प्रमुख लक्ष्य और उद्देश्य
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-slate-600 md:text-sm">
                    {data.missionDesc}
                  </p>
                  <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
                    {data.missionTargets.map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <h5 className="text-xs font-bold text-blue-900">
                          {item.title}
                        </h5>
                        <p className="mt-1 text-[11px] leading-normal font-medium text-slate-500">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Official Footer / Address Inside Card */}
          <div className="mt-2 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-orange-500" />
              <span>
                कार्यालय: नगर पंचायत कार्यालय, छाता, मथुरा, उत्तर प्रदेश -
                281401
              </span>
            </div>
            <div className="shrink-0 text-left sm:border-l sm:border-slate-200 sm:pl-4 sm:text-right">
              <p className="font-bold text-blue-950">नगर पंचायत, छाता</p>
              <p className="mt-0.5 text-[10px] tracking-widest text-slate-400 uppercase">
                मथुरा प्रशासन
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Staff() {
  const leadersData: OfficerRowProps[] = [
    {
      id: "chairman",
      roleTitle: "निर्वाचित अध्यक्ष",
      designation: "अध्यक्ष (Chairman)",
      name: "नगर पंचायत अध्यक्ष महोदय/महोदया",
      subText: "नगर पंचायत, छाता, मथुरा",
      imgSrc: "",
      term: "",
      status: "",
      welcomeQuote:
        "ब्रज भूमि के ऐतिहासिक और प्रमुख व्यापारिक नगर छाता को स्वच्छ, आधुनिक और प्रगतिशील बनाना ही हमारा मुख्य संकल्प है।",
      welcomeText1:
        "जनपद मथुरा के अंतर्गत स्थित छाता नगर अपनी पौराणिक विरासत और एन.एच.-19 पर स्थित एक प्रमुख व्यावसायिक केंद्र के रूप में विशेष पहचान रखता है। एक जनप्रतिनिधि के रूप में मेरा यह निरंतर प्रयास है कि हम छाता के प्रत्येक नागरिक को उच्च कोटि की बुनियादी सुविधाएँ, बेहतरीन साफ-सफाई और पारदर्शी प्रशासनिक व्यवस्था उपलब्ध कराएँ।",
      welcomeText2:
        "हमारा प्रशासन जनसेवा और क्षेत्रीय विकास के प्रति पूरी तरह समर्पित है। आपके बहुमूल्य सहयोग और सुझावों से ही हम छाता को एक आदर्श नगर पंचायत के रूप में स्थापित कर सकते हैं। आइए, इस विकास यात्रा में मिलकर आगे बढ़ें।",
      visionTitle: "हमारा दृष्टिकोण (Our Vision)",
      visionDesc:
        "छाता को एक स्वच्छ, हरित, व्यापार-अनुकूल और आधुनिक सुविधाओं से परिपूर्ण आदर्श नगर पंचायत के रूप में विकसित करना।",
      visionPoints: [
        "व्यापारिक एवं आवासीय क्षेत्रों का संतुलित और नियोजित विकास।",
        "पौराणिक ब्रज संस्कृति की गरिमा के साथ आधुनिक शहरी बुनियादी ढांचा।",
        "पर्यावरण-अनुकूल और टिकाऊ विकास पहलों को प्रोत्साहन।",
        "नागरिकों के लिए सुरक्षित, सुलभ और डिजिटल सार्वजनिक सेवाएं।",
      ],
      missionDesc:
        "नगर के प्रत्येक वार्ड तक सुदृढ़ सड़कें, शुद्ध पेयजल आपूर्ति, उन्नत स्ट्रीट लाइट नेटवर्क और प्रभावी स्वच्छता प्रणाली सुनिश्चित करना।",
      missionTargets: [
        {
          title: "पेयजल एवं जल निकासी",
          desc: "हर घर तक शुद्ध पेयजल तथा जलभराव की समस्या के स्थायी समाधान हेतु मजबूत ड्रेनेज सिस्टम।",
        },
        {
          title: "स्वच्छता एवं पर्यावरण",
          desc: 'प्रभावी डोर-टू-डोर कचरा संग्रहण के साथ "स्वच्छ छाता, सुंदर छाता" का निर्माण।',
        },
        {
          title: "व्यापारिक सुविधा",
          desc: "स्थानीय व्यापारियों और नागरिकों के लिए सुगम एवं पारदर्शी ई-गवर्नेंस सेवाएं।",
        },
      ],
    },
    {
      id: "eo",
      roleTitle: "प्रशासनिक प्रमुख",
      designation: "अधिशासी अधिकारी (EO)",
      name: "अधिशासी अधिकारी महोदय",
      subText: "नगर पंचायत, छाता, मथुरा",
      imgSrc: "",
      term: "शासकीय नियुक्ति",
      status: "कार्यकारी प्रमुख",
      welcomeQuote: "पारदर्शी, जवाबदेह और त्वरित नागरिक सेवा के प्रति कटिबद्ध",
      welcomeText1:
        "नगर पंचायत छाता के कार्यकारी कार्यालय की ओर से मैं आप सभी का हार्दिक स्वागत करता हूँ। हमारा मुख्य उद्देश्य शासन की सभी कल्याणकारी योजनाओं और नागरिक सेवाओं को पूरी ईमानदारी, पारदर्शिता और बिना किसी अनावश्यक विलंब के आप तक पहुँचाना है।",
      welcomeText2:
        "हम नागरिकों की शिकायतों के त्वरित निस्तारण और कार्यालयीन प्रक्रियाओं को पेपरलेस व सुगम बनाने के लिए निरंतर प्रयासरत हैं। आपका विश्वास ही हमारी कार्यप्रणाली की असली ऊर्जा है।",
      visionTitle: "प्रशासनिक दृष्टिकोण",
      visionDesc:
        "कार्यालयीय व्यवस्था को पूर्णतः डिजिटल और पेपरलेस बनाकर प्रशासनिक कार्यों में उच्चतम पारदर्शिता और दक्षता लाना।",
      visionPoints: [
        "डिजिटल माध्यमों से फाइलों और ऑनलाइन आवेदनों की त्वरित ट्रैकिंग।",
        "निर्धारित समय-सीमा के भीतर सभी नागरिक सेवाओं का प्रेषण।",
        "सरकारी निधियों का शत-प्रतिशत जनहित और विकास कार्यों में सदुपयोग।",
        "शिकायत निवारण के लिए सुलभ और प्रभावी सिंगल-विंडो सिस्टम।",
      ],
      missionDesc:
        "विकास योजनाओं को जमीनी स्तर पर प्रभावी ढंग से लागू करना तथा प्रशासन और आम जनता के बीच एक मजबूत संवाद सेतु स्थापित करना।",
      missionTargets: [
        {
          title: "डिजिटल कार्यप्रणाली",
          desc: "ई-नगरपालिका पोर्टल सेवाओं का सुचारू और पारदर्शी संचालन।",
        },
        {
          title: "वित्तीय पारदर्शिता",
          desc: "बजट आवंटन और विकास कार्यों के निष्पादन में पूर्ण स्पष्टता।",
        },
        {
          title: "त्वरित समाधान",
          desc: "नागरिक शिकायतों का समयबद्ध व संतोषजनक निस्तारण।",
        },
      ],
    },
    {
      id: "head-clerk",
      roleTitle: "कार्यालय अधीक्षक",
      designation: "मुख्य लिपिक (Head Clerk)",
      name: "मुख्य लिपिक महोदय",
      subText: "नगर पंचायत, छाता, मथुरा",
      imgSrc: "",
      term: "वरिष्ठ प्रशासन",
      status: "रजिस्ट्री प्रभारी",
      welcomeQuote: "कार्यालयीन सुगमता और आपकी सेवा में सदैव तत्पर",
      welcomeText1:
        "नगर पंचायत छाता कार्यालय में मुख्य लिपिक के रूप में मेरा यह दायित्व है कि सभी प्रशासनिक, अभिलेखीय और राजस्व संबंधी कार्य पूरी दक्षता के साथ संचालित हों। जन्म-मृत्यु पंजीकरण, संपत्ति कर प्रबंधन और अन्य सभी कार्यालयीय सेवाएँ सुचारू रूप से प्रदान की जा रही हैं।",
      welcomeText2:
        "हमारा पूरा स्टाफ नागरिकों को किसी भी प्रकार की असुविधा से बचाने और एक सहयोगी माहौल प्रदान करने के लिए प्रतिबद्ध है। किसी भी दस्तावेज, प्रमाण पत्र या कर संबंधी कार्य के लिए आप कार्यालय से संपर्क कर सकते हैं।",
      visionTitle: "त्रुटिहीन अभिलेख प्रबंधन",
      visionDesc:
        "कार्यालय के सभी पुराने दस्तावेजों और सरकारी रजिस्टरों को आधुनिक डिजिटल डेटाबेस में सुरक्षित और व्यवस्थित करना।",
      visionPoints: [
        "महत्वपूर्ण रिकॉर्ड्स, टैक्स फाइलों और संपत्ति रजिस्टरों का डिजिटलीकरण।",
        "प्रमाणपत्रों व आवेदनों का त्वरित, सटीक और पारदर्शी सत्यापन।",
        "कार्यालय में वरिष्ठ नागरिकों और आगंतुकों के मार्गदर्शन हेतु सहायता डेस्क।",
        "दैनिक प्रशासनिक कार्यों में कार्यकुशलता और गतिशीलता बढ़ाना।",
      ],
      missionDesc:
        "कार्यालय के दैनिक संचालन में पूर्ण सटीकता बनाए रखना तथा नागरिकों के आवेदनों और शिकायतों का बिना किसी देरी के निष्पादन करना।",
      missionTargets: [
        {
          title: "समयबद्ध प्रमाण पत्र",
          desc: "विभिन्न आवश्यक प्रमाणपत्रों का निर्धारित समयावधि में निर्गमन।",
        },
        {
          title: "जनता का सहयोग",
          desc: "आमजन को कागजी औपचारिकताओं को पूरा करने में सुलभ सहायता।",
        },
        {
          title: "सुरक्षित रिकॉर्ड",
          desc: "संपत्ति, कर और जन्म-मृत्यु अभिलेखों की उच्च सुरक्षा।",
        },
      ],
    },
  ]

  return (
    <section
      id="about-us"
      className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-50 px-4 py-24 font-sans md:px-8"
    >
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute top-1/4 left-0 h-96 w-96 rounded-full bg-orange-500/5 blur-[140px]"></div>
      <div className="pointer-events-none absolute right-0 bottom-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-[140px]"></div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-extrabold tracking-wider text-orange-600 uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" /> नेतृत्व एवं
            प्रशासन
          </span>
          <h2 className="font-serif text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Chairperson and{" "}
            <span className="bg-linear-to-r from-blue-900 to-indigo-800 bg-clip-text text-transparent">
              Administrative Desk
            </span>
          </h2>
          <p className="text-xs font-medium text-slate-600 md:text-sm">
            नगर पंचायत, छाता (मथुरा) के आधिकारिक प्रशासनिक पोर्टल पर आपका स्वागत
            है।
          </p>
          <div className="mx-auto mt-4 h-1.5 w-24 rounded-full bg-linear-to-r from-orange-500 to-blue-900"></div>
        </div>

        {/* Vertical List Layout */}
        <div className="space-y-16">
          {leadersData.map((leader) => (
            <OfficerRow key={leader.id} data={leader} />
          ))}
        </div>
      </div>
    </section>
  )
}
