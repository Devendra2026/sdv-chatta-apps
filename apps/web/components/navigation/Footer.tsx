"use client"

import { Mail, Phone, MapPin, ArrowUp, ShieldCheck, Heart } from "lucide-react"

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer
      id="contact-us"
      className="bg-gov-blue-dark border-gov-saffron relative z-30 border-t-4 text-slate-300"
    >
      {/* Top Main Link Matrix */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-16 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {/* Col 1: Brand & Bio */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* government logo */}
            <img
              src="https://cdn.s3waas.gov.in/s30336dcbab05b9d5ad24f4333c7658a0e/uploads/2018/02/2018021632.png"
              alt="Government Emblem"
              className="h-12 w-12 shrink-0 rounded-full bg-white object-contain p-1"
            />
            <div className="leading-none text-white">
              <h3 className="text-sm font-extrabold tracking-wider uppercase">
                {" "}
                Nagar Panchayat, Chhata, Mathura{" "}
              </h3>
              <p className="text-gov-saffron mt-0.5 text-[10px] font-bold uppercase">
                Panchayat Administration
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed font-medium text-slate-400">
            Authorized administrative portal of Nagar Panchayat, Chhata,
            Mathura, District Mathura, Government of Uttar Pradesh. Empowering
            citizens through digitized services.
          </p>
        </div>

        {/* Col 2: Useful Links */}
        <div>
          <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-black tracking-wider text-white uppercase">
            Quick Navigation
          </h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            {[
              { name: "About Chhata, Mathura", href: "/about" },
              { name: "Executive Committee Members", href: "/staff" },
              { name: "Departments", href: "/departments" },
              { name: "Gallery", href: "/gallery" },
              { name: "Contact-Us", href: "/contact" },
            ].map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="hover:text-gov-saffron flex items-center gap-1.5 transition-colors hover:underline"
                >
                  <span className="text-gov-saffron font-bold">›</span>
                  <span>{link.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Online Citizen Desks */}
        <div>
          <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-black tracking-wider text-white uppercase">
            Online Citizen Desks
          </h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            {[
              { name: "Property & House Tax Portal", href: "/propertytax" },
              { name: "Water Supply Bills & NOC", href: "/services" },
              { name: "Birth Certificate Applications", href: "/services" },
              { name: "Death Record Verification", href: "/services" },
              { name: "Shop / Trade Licenses desk", href: "/services" },
              { name: "Building Permission NOC portal", href: "/services" },
            ].map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="hover:text-gov-saffron flex items-center gap-1.5 transition-colors hover:underline"
                >
                  <span className="text-gov-saffron font-bold">›</span>
                  <span>{link.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4: Contact info */}
        <div>
          <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-black tracking-wider text-white uppercase">
            Official Contact Desk
          </h4>
          <ul className="space-y-3.5 text-xs font-semibold">
            <li className="flex items-start gap-2.5">
              <MapPin className="text-gov-saffron mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {" "}
                Main Bazar, Nagar Panchayat , Chhata, Mathura, Uttar Pradesh,
                India - 250606
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="text-gov-saffron h-4 w-4 shrink-0" />
              <a
                href="tel:+918189077892"
                className="hover:text-gov-saffron hover:underline"
              >
                +91 xxxxxxxxxxx
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="text-gov-saffron h-4 w-4 shrink-0" />
              <a
                href="mailto:npchhata@gmail.com"
                className="hover:text-gov-saffron hover:underline"
              >
                npchhata@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Mid Badges & Partners */}
      <div className="border-t border-white/10 bg-black/15 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:text-left md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
            <div className="rounded border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
              Digital India Partner
            </div>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
              Swachh Bharat Member
            </div>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
              SDV Edutech Pvt. Ltd. Hosted
            </div>
          </div>

          {/* Back to top widget */}
          <button
            suppressHydrationWarning
            onClick={scrollToTop}
            className="bg-gov-saffron hover:bg-gov-saffron-dark flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:scale-102"
          >
            <span>Back to Top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Legal & Developer Signatures */}
      <div className="border-t border-white/10 bg-black/30 py-6 text-center text-xs font-medium text-slate-500">
        <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-8">
          <p className="text-slate-400">
            © {new Date().getFullYear()} Nagar Panchayat , Chhata, Mathura.
            All Rights Reserved.
          </p>
          <p className="mx-auto max-w-2xl text-[10px] leading-relaxed text-slate-500">
            Disclaimer: Content on this website is published and managed by
            Nagar Panchayat , Chhata, Mathura . For any enquiries regarding
            information provided, please contact the Public Relations desk. Host
            nodes are secured under State Treasury systems.
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-semibold text-slate-600">
            <span>Developed with</span>
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
            <span>by SDV Edutech Pvt. Ltd.</span>
            <span>|</span>
            <span>Last Updated: August 12, 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
