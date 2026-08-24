"use client"

import { ArrowUpRight, Megaphone } from "lucide-react"

export default function AnnouncementTicker() {
  const notices = [
    {
      id: "property-tax",
      text: "संपत्ति कर सूचना: मूल्यांकन पर 10% शुरुआती छूट (Early-bird Rebate) का लाभ उठाने के लिए अंतिम तिथि से पहले भुगतान करें।",
      link: "/propertytax",
    },
    {
      id: "water-tax",
      text: "जल कर सूचना: छाता नगर वासियों के लिए जल कर भुगतान एवं बिल सुधार हेतु एकीकृत पोर्टल खुला है।",
      link: "/services",
    },
    {
      id: "recruitment",
      text: "भर्ती सूचना: प्रशासनिक सलाहकारों और स्वच्छता निरीक्षकों के पदों हेतु आवेदन आमंत्रित हैं।",
      link: "#news-notices",
    },
    {
      id: "public-meeting",
      text: "सार्वजनिक बैठक सूचना: टाउन हॉल में वार्ड समन्वय और विकास परियोजना ऑडिट का आयोजन निर्धारित है।",
      link: "#news-notices",
    },
    {
      id: "tender",
      text: "टेंडर सूचना: स्मार्ट सोलर स्ट्रीट लाइट खरीद एवं वार्डवार स्थापना हेतु निविदाएं आमंत्रित हैं।",
      link: "/news-notices",
    },
  ]

  return (
    <div className="relative z-30 flex flex-col items-stretch overflow-hidden border-y border-orange-800 bg-linear-to-r from-orange-700 via-amber-700 to-orange-800 text-white shadow-md md:flex-row">
      {/* Title Segment */}
      <div className="relative z-10 flex shrink-0 items-center gap-2 border-r border-orange-800 bg-slate-950 px-6 py-3 text-xs font-black tracking-wider uppercase shadow-md select-none md:-ml-3 md:skew-x-12 md:border-r-0 md:text-sm">
        <div className="flex items-center gap-2 md:-skew-x-12">
          <Megaphone className="h-4 w-4 animate-bounce text-orange-400" />
          <span className="text-orange-200">Announcements</span>
          <span className="ml-1 hidden font-serif text-[10px] text-amber-300 sm:inline">
            / नवीनतम सूचनाएं (छाता)
          </span>
        </div>
      </div>

      {/* Marquee Content */}
      <div className="relative flex flex-1 items-center overflow-hidden py-2.5 md:py-0">
        <div
          className="animate-marquee flex cursor-pointer items-center gap-16 whitespace-nowrap hover:paused"
          style={{ animationDuration: "60s" }}
        >
          {/* First iteration */}
          {notices.map((notice) => (
            <a
              key={notice.id}
              href={notice.link}
              className="flex items-center gap-2 text-xs font-bold transition-colors hover:text-amber-200"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-amber-300 shadow-sm"></span>
              <span>{notice.text}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-orange-200" />
            </a>
          ))}

          {/* Second iteration (for seamless looping) */}
          {notices.map((notice) => (
            <a
              key={`${notice.id}-dup`}
              href={notice.link}
              className="flex items-center gap-2 text-xs font-bold transition-colors hover:text-amber-200"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-amber-300 shadow-sm"></span>
              <span>{notice.text}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-orange-200" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
