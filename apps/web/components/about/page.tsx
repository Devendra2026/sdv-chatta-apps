import React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Target,
  Eye,
  History,
  Building2,
  Users,
  GraduationCap,
  Home,
  FileText,
  MessageSquareWarning,
  Droplets,
  Receipt,
  Award,
  FileCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  MapPin,
  Landmark,
} from "lucide-react"
// Yahan Button ke saath buttonVariants bhi import kiya gaya hai
import { buttonVariants } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

// नगर पंचायत छाता की मुख्य सेवाएं
const municipalServices = [
  {
    title: "जन्म एवं मृत्यु पंजीकरण",
    description:
      "सी० आर० एस० पोर्टल के माध्यम से ऑनलाइन जन्म-मृत्यु प्रमाण पत्र आवेदन।",
    icon: FileText,
    accent: "from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-200/60",
    hoverGlow: "group-hover:shadow-blue-500/10 group-hover:border-blue-400",
  },
  {
    title: "शिकायत दर्ज करें",
    description:
      "जनसुनवाई पोर्टल (IGRS) या संपर्क फॉर्म के माध्यम से अपनी शिकायत दर्ज करें।",
    icon: MessageSquareWarning,
    accent:
      "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/60",
    hoverGlow: "group-hover:shadow-amber-500/10 group-hover:border-amber-400",
  },
  {
    title: "जल आपूर्ति व कनेक्शन",
    description:
      "ऑनलाइन नए वाटर कनेक्शन आवेदन एवं जलकर (Water Tax) भुगतान सुविधा।",
    icon: Droplets,
    accent: "from-sky-500/10 to-blue-500/10 text-sky-600 border-sky-200/60",
    hoverGlow: "group-hover:shadow-sky-500/10 group-hover:border-sky-400",
  },
  {
    title: "गृह एवं संपत्ति कर",
    description: "भवन/गृह कर निर्धारण एवं ऑनलाइन व ऑफलाइन कर भुगतान प्रणाली।",
    icon: Receipt,
    accent:
      "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/60",
    hoverGlow:
      "group-hover:shadow-emerald-500/10 group-hover:border-emerald-400",
  },
  {
    title: "व्यापारिक लाइसेंस",
    description:
      "विभिन्न प्रकार के व्यावसायिक लाइसेंस निर्गमन एवं समय पर नवीनीकरण।",
    icon: Award,
    accent:
      "from-purple-500/10 to-indigo-500/10 text-purple-600 border-purple-200/60",
    hoverGlow: "group-hover:shadow-purple-500/10 group-hover:border-purple-400",
  },
  {
    title: "संपत्ति नामांतरण व अनुमति",
    description:
      "संपत्ति नामांतरण एवं नगर नियोजन हेतु भवन निर्माण स्वीकृति अनुमति।",
    icon: FileCheck,
    accent:
      "from-indigo-500/10 to-rose-500/10 text-indigo-600 border-indigo-200/60",
    hoverGlow: "group-hover:shadow-indigo-500/10 group-hover:border-indigo-400",
  },
]

export default function AboutChhataComplete() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-orange-50/20 font-sans text-slate-800 antialiased selection:bg-orange-600 selection:text-white">
      <div className="mx-auto max-w-6xl space-y-20 px-4 py-12 md:py-20">
        {/* हेडर / हीरो सेक्शन */}
        <header className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-linear-to-br from-slate-950 via-slate-900 to-orange-950 p-8 text-center text-white shadow-2xl md:p-16">
          <div className="pointer-events-none absolute top-0 right-[-10%] h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-[-10%] h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />

          <div className="relative z-10 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/20 px-4 py-1.5 text-xs font-bold tracking-wider text-orange-300 uppercase shadow-sm">
              <Landmark className="h-3.5 w-3.5" /> उत्तर प्रदेश सरकार आधिकारिक
              पोर्टल
            </span>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight md:text-5xl">
              नगर पंचायत,{" "}
              <span className="bg-linear-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                छाता
              </span>
              , मथुरा
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-medium text-orange-200/90 md:text-xl">
              धार्मिक ऐतिहासिक धरोहर, सांस्कृतिक समृद्धि और तेज विकास का संगम
            </p>
          </div>
        </header>

        {/* मुख्य सामग्री: इतिहास, इमेज और आंकड़े */}
        <main className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Information & History */}
          <div className="space-y-6 lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700 shadow-sm">
                <History className="h-6 w-6" />
              </div>
              <h2 className="border-b-4 border-orange-600 pb-1 font-serif text-2xl font-bold text-slate-900 md:text-3xl">
                ऐतिहासिक परिचय एवं स्थिति
              </h2>
            </div>

            <p className="text-justify text-base leading-relaxed text-slate-600 md:text-lg">
              <strong className="text-slate-900">छाता (Chhata)</strong> उत्तर
              प्रदेश के <strong className="text-slate-900">मथुरा जिले</strong>{" "}
              के अंतर्गत एक प्रमुख, ऐतिहासिक और निरंतर विकासशील नगर निकाय है।
              कुल{" "}
              <strong className="font-bold text-orange-700">
                15 सुव्यवस्थित वार्डों
              </strong>{" "}
              में विभाजित इस नगर पंचायत में पारदर्शी लोकतांत्रिक प्रक्रिया से
              जनहित व विकास कार्य संपन्न कराए जाते हैं।
            </p>

            <p className="text-justify text-sm leading-relaxed text-slate-600 md:text-base">
              ब्रज क्षेत्र के अंतर्गत आने वाला छाता अपनी पौराणिक मान्यताओं,
              सामाजिक सौहार्द और व्यापारिक महत्व के लिए प्रसिद्ध है। राष्ट्रीय
              राजमार्ग (NH-19) पर स्थित होने के कारण यह क्षेत्र आवागमन और आर्थिक
              गतिविधियों का एक महत्वपूर्ण केंद्र है।
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                    जिला मुख्यालय
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    मथुरा (Mathura, UP)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                    प्रशासनिक निकाय
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    नगर पंचायत छाता
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* YAHA PAR CHANGE KIYA GAYA HAI */}
              <Link
                href="#services"
                className={`${buttonVariants({ size: "lg" })} inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-600 to-amber-600 font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02] hover:from-orange-700 hover:to-amber-700`}
              >
                नागरिक सेवाएं देखें
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right Column: Key Stats Card */}
          <div className="lg:col-span-5">
            <Card className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur-md">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-orange-500 via-amber-500 to-yellow-500" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="flex items-center gap-1.5 font-serif text-lg font-black text-slate-900">
                    छाता : एक नज़र में
                    <Sparkles className="h-4 w-4 animate-pulse text-orange-500" />
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    आधिकारिक जनगणना व मुख्य आंकड़े
                  </p>
                </div>
                <span className="rounded-full bg-linear-to-r from-orange-600 to-amber-600 px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                  15 वार्ड
                </span>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3.5">
                {/* Population */}
                <div className="col-span-2 flex items-center justify-between rounded-2xl border border-orange-100 bg-linear-to-r from-orange-50/80 to-amber-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        कुल जनसंख्या
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        approx 35,000+
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-right text-xs">
                    <div className="rounded-md border border-orange-100/50 bg-white/80 px-2.5 py-1">
                      क्षेत्रफल:{" "}
                      <span className="font-extrabold text-orange-700">
                        विस्तृत
                      </span>
                    </div>
                    <div className="rounded-md border border-orange-100/50 bg-white/80 px-2.5 py-1">
                      विकास स्तर:{" "}
                      <span className="font-extrabold text-amber-700">
                        उच्च
                      </span>
                    </div>
                  </div>
                </div>

                {/* Literacy Rate */}
                <div className="rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50/60 to-teal-50/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-xs font-extrabold">शिक्षा स्तर</span>
                  </div>
                  <p className="mt-2 bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-2xl font-black text-transparent">
                    उन्नत
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-600">
                    आधुनिक शिक्षण संस्थान
                  </p>
                </div>

                {/* Households */}
                <div className="rounded-2xl border border-amber-100 bg-linear-to-b from-amber-50/60 to-orange-50/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Home className="h-4 w-4" />
                    <span className="text-xs font-extrabold">सुविधाएँ</span>
                  </div>
                  <p className="mt-2 bg-linear-to-r from-amber-600 to-orange-600 bg-clip-text text-2xl font-black text-transparent">
                    स्मार्ट
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-600">
                    डिजिटल ई-गवर्नेंस
                  </p>
                </div>

                {/* Governance Badge */}
                <div className="col-span-2 rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-600" />
                    पारदर्शी प्रशासनिक व्यवस्था एवं{" "}
                    <strong className="text-sm font-extrabold text-orange-700">
                      जनसेवा
                    </strong>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>

        {/* मिशन और दृष्टिकोण (Cards Section) */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* मिशन कार्ड */}
          <div className="flex flex-col justify-between rounded-3xl border-t-8 border-orange-600 bg-white p-6 shadow-xl shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 md:p-8">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-orange-50 p-3 text-orange-700 shadow-inner">
                  <Target className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 md:text-2xl">
                  नियत लक्ष्य (हमारा मिशन)
                </h3>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-slate-600 md:text-base">
                नगर पंचायत छाता का मुख्य उद्देश्य अपने नागरिकों को एक स्वच्छ,
                सुरक्षित और सुविधापूर्ण वातावरण प्रदान करना है। हम नगर के
                आधारभूत ढांचे के निर्माण और सुधार के लिए प्रतिबद्ध हैं:
              </p>
              <ul className="mb-6 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-600" />
                  <p className="text-sm text-slate-700 md:text-base">
                    <strong className="text-slate-900">नागरिक सुविधाएँ:</strong>{" "}
                    शुद्ध पेयजल आपूर्ति, कुशल जल निकासी प्रबंधन और स्वच्छता
                    सेवाओं का उच्च संचालन।
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-600" />
                  <p className="text-sm text-slate-700 md:text-base">
                    <strong className="text-slate-900">अवसंरचना विकास:</strong>{" "}
                    आधुनिक सड़कों का निर्माण, उन्नत स्ट्रीट लाइट व्यवस्था और
                    सार्वजनिक स्थलों का रखरखाव।
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-600" />
                  <p className="text-sm text-slate-700 md:text-base">
                    <strong className="text-slate-900">
                      सरकारी योजनाओं का क्रियान्वयन:
                    </strong>{" "}
                    केंद्र और राज्य सरकार की जनकल्याणकारी योजनाओं को सुगमता से
                    हर पात्र नागरिक तक पहुँचाना।
                  </p>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-200/60 bg-orange-50/60 p-4 text-center text-xs font-semibold text-orange-900">
              पारदर्शिता • जवाबदेही • नागरिक संतुष्टि
            </div>
          </div>

          {/* दृष्टिकोण कार्ड */}
          <div className="flex flex-col justify-between rounded-3xl border-t-8 border-amber-600 bg-white p-6 shadow-xl shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 md:p-8">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 shadow-inner">
                  <Eye className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 md:text-2xl">
                  भविष्य की राह (हमारा दृष्टिकोण)
                </h3>
              </div>
              <div className="mb-6 space-y-4 text-sm leading-relaxed text-slate-600 md:text-base">
                <p>
                  हम एक ऐसे आधुनिक, स्वच्छ और आत्मनिर्भर छाता नगर की कल्पना करते
                  हैं जो अपनी प्राचीन सांस्कृतिक व धार्मिक विरासत को संजोए रखते
                  हुए तकनीकी प्रगति और डिजिटल गवर्नेंस के नए आयाम छुए।
                </p>
                <p>
                  स्थानीय नागरिकों के सक्रिय सहयोग, कुशल जनप्रतिनिधि मंडल और
                  समर्पित प्रशासनिक टीम के माध्यम से छाता को मथुरा जिले का एक
                  आदर्श और प्रगतिशील नगर पंचायत बनाना हमारा प्रमुख लक्ष्य है।
                </p>
              </div>
            </div>
            <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4 text-xs font-medium text-amber-950 md:text-sm">
              हम अपने निवासियों, जनप्रतिनिधियों और प्रशासन के सहयोग से एक
              विकसित, हरित (Green) और प्रगतिशील नगर बनाने के लिए संकल्पित हैं।
            </div>
          </div>
        </section>

        {/* SECTION: SERVICES OFFERED */}
        <div
          id="services"
          className="space-y-10 border-t border-slate-200/80 pt-10"
        >
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-3.5 py-1 text-xs font-extrabold text-orange-800 ring-1 ring-orange-600/20 ring-inset">
              ई-गवर्नेंस एवं नागरिक सुविधाएं
            </span>

            <h3 className="font-serif text-3xl font-black tracking-tight sm:text-4xl">
              नगर पंचायत छाता द्वारा{" "}
              <span className="bg-linear-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                प्रदत्त प्रमुख सेवाएं
              </span>
            </h3>

            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              नगर वासियों की सुविधा एवं पूर्ण पारदर्शिता के लिए आधुनिक डिजिटल
              ई-गवर्नेंस सेवाएं उपलब्ध कराई जा रही हैं।
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {municipalServices.map((service) => {
              const Icon = service.icon

              return (
                <Card
                  key={service.title}
                  className={`group relative overflow-hidden rounded-2xl border bg-white/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${service.hoverGlow}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${service.accent} border shadow-inner transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-slate-900 transition-colors group-hover:text-orange-600">
                        {service.title}
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* फुटर नोट */}
        <footer className="border-t border-slate-200 pt-8 text-center text-xs font-medium text-slate-500 md:text-sm">
          <p>
            © 2026 नगर पंचायत छाता, जिला - मथुरा (उत्तर प्रदेश)। सर्वाधिकार
            सुरक्षित।
          </p>
        </footer>
      </div>
    </div>
  )
}
