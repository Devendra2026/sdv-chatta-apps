"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, ChevronDown, Building, FileSpreadsheet, Newspaper, Award, Calendar, Layers, ShieldCheck, Mail, Home, Image as ImageIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface MenuItem {
  name: string;
  href: string;
  hasDropdown?: boolean;
  megaMenuType?: "departments" | "services" | null;
  items?: { name: string; href: string }[];
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update active tab based on path
  useEffect(() => {
    if (pathname === '/public-grievance') setActiveTab('Public Grievance');
    else if (pathname === '/schemes') setActiveTab('Schemes');
    else if (pathname === '/gallery') setActiveTab('Gallery');
    else if (pathname === '/contact') setActiveTab('Contact');
    else if (pathname === '/about') setActiveTab('About');
    else if (pathname === '/departments') setActiveTab('Departments');
    else if (pathname === '/services') setActiveTab('Services');
    // else if (pathname === '/newsandnotice') setActiveTab('News And Notice');
    else if (pathname === '/propertytax') setActiveTab('Property Tax');
    else if (pathname === '/staff') setActiveTab('Staff');
    else setActiveTab('Home');
  }, [pathname]);

  const menuItems: MenuItem[] = [
    { name: "Home", href: "/", hasDropdown: false },
    { name: "About", href: "/about", hasDropdown: false ,},
    {name: "Departments",href: "/departments",hasDropdown: false,megaMenuType: "departments",},
    { name: "Services", href: "/services",hasDropdown: true,megaMenuType: "services",},
    { name: "Public Grievance", href: "/public-grievance", hasDropdown: false },
    {name: "Schemes",href: "/schemes",hasDropdown: false,},
    // { name: "News And Notice", href: "/newsandnotice", hasDropdown: false },
    { name: "Gallery", href: "/gallery", hasDropdown: false },
    { name: "Staff", href:"/staff", hasDropdown: false },
    { name: "Contact", href: "/contact", hasDropdown: false },
    { name: "Property Tax", href: "/propertytax", hasDropdown: false },
    
  ];

  const departments = [
    { name: "Public Works Department", desc: "Municipal road infrastructure, civil projects" },
    { name: "Revenue Department", desc: "Taxation collection, trade license billing" },
    { name: "Water Supply Department", desc: "Clean drinking water distribution & connections" },
    { name: "Sanitation Department", desc: "Waste management, waste disposal & hygiene" },
    { name: "Health Department", desc: "Birth/death verification, community medicine" },
    { name: "Engineering Department", desc: "Town planning, building construction safety" },
  ];

  const services = [
    { name: "Property Tax Payment", desc: "Submit yearly property & house dues" },
    { name: "Water Connection Request", desc: "Request tap supply configuration" },
    { name: "Birth Certificate Portal", desc: "Verify and apply for municipal birth register" },
    { name: "Death Registration Desk", desc: "Verify or register unfortunate demises" },
    { name: "Trade License Portal", desc: "Verify or renew local industry certificates" },
    { name: "Building Permission Desk", desc: "Submit blueprints for structural review" },
    { name: "RTI Filings Section", desc: "Request administrative information updates" },
    { name: "Grievance Redressal Desk", desc: "File complain ticket for civic issues" },
  ];

  const handleMenuClick = (name: string, href: string) => {
    setActiveTab(name);
    setIsOpen(false);
    setOpenDropdown(null);

    // If it's a homepage anchor
    if (href.includes("#")) {
      const targetId = href.split("#")[1];
      if (!targetId) {
        router.push(href)
        return;
           }
      if (pathname === "/") {
        const element = document.getElementById(targetId);
        if (element) {
          const offset = scrolled ? 80 : 140;
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - offset,
            behavior: "smooth",
          });
        }
      } else {
        router.push(href);
      }
    } else {
      router.push(href);
    }
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-gov-blue-dark/95 backdrop-blur-sm shadow-lg border-b border-gov-blue-medium py-2.5"
          : "bg-gov-blue-medium py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
       
        {/* Shortened Brand name visible only when scrolled */}
        <Link
          href="/"
          className={`flex items-center gap-2 text-white transition-all duration-300 ${
            scrolled ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none w-0 overflow-hidden"
          }`}
        >
          <img 
              src="https://cdn.s3waas.gov.in/s30336dcbab05b9d5ad24f4333c7658a0e/uploads/2018/02/2018021632.png" 
              alt="Government Emblem" 
              className="w-12 h-12 shrink-0 object-contain bg-white rounded-full p-1"
            />
          <div className="leading-none text-left">
            <span className="text-[10px] text-gov-saffron uppercase font-bold block">Chhata Portal</span>
            <span className="text-xs font-extrabold uppercase tracking-wide block">Nagar Panchayat, Chhata , Mathura</span>
          </div>
        </Link>

        {/* Desktop Menu links */}
        <div className="hidden lg:flex items-center space-x-1 mx-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.name;
            const isDropdownOpen = openDropdown === item.name;

            return (
              <div
                key={item.name}
                className="relative group"
                onMouseEnter={() => item.hasDropdown && setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  suppressHydrationWarning
                  onClick={() => handleMenuClick(item.name, item.href)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all cursor-pointer ${
                    isActive
                      ? "bg-gov-saffron text-white shadow-sm"
                      : "text-slate-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.hasDropdown && <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Dropdown Menu (Standard Layout) */}
                {item.hasDropdown && !item.megaMenuType && isDropdownOpen && (
                  <div className="absolute left-0 mt-0 w-56 bg-white border border-slate-100 rounded-lg shadow-xl py-2 z-50 animate-fade-in">
                    {item.items?.map((sub) => (
                      <button
                        key={sub.name}
                        onClick={() => handleMenuClick(item.name, sub.href)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-gov-blue-light hover:text-gov-blue-dark transition-all cursor-pointer border-0"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mega Menu Layout for Departments & Services */}
                {item.hasDropdown && item.megaMenuType && isDropdownOpen && (
                  <div className="fixed left-0 right-0 top-[inherit] mx-auto max-w-7xl px-4 z-50">
                    <div className="bg-white border border-slate-100 rounded-xl shadow-2xl p-6 grid grid-cols-3 gap-6 animate-scale-up mt-1">
                      {/* Left highlight box */}
                      <div className="bg-linear-to-br from-gov-blue-dark to-gov-blue-medium text-white p-5 rounded-lg flex flex-col justify-between text-left">
                        <div>
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-gov-saffron mb-2">
                            {item.name} gateway
                          </h4>
                          <p className="text-xs text-slate-200 leading-relaxed">
                           Nagar Panchayat, Chhata , Mathura Administrative services are unified online. Browse details, download documents, and apply securely.
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest border-t border-white/10 pt-4 mt-4">
                          Government of Uttar Pradesh
                        </div>
                      </div>

                      {/* Right list grid */}
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        {(item.megaMenuType === "departments" ? departments : services).map((subItem) => (
                          <button
                            key={subItem.name}
                            onClick={() => handleMenuClick(item.name, item.href)}
                            className="text-left p-3 rounded-lg border border-slate-50 hover:border-gov-blue-medium hover:bg-slate-50 transition-all group flex items-start gap-3 cursor-pointer"
                          >
                            <div className="bg-gov-blue-light p-2 rounded text-gov-blue-medium group-hover:bg-gov-saffron group-hover:text-white transition-colors shrink-0">
                              {item.megaMenuType === "departments" ? (
                                <Building className="w-4 h-4" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-gov-blue-dark transition-colors font-sans">
                                {subItem.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-sans">{subItem.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-white hover:text-gov-saffron p-1 cursor-pointer transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ================================================= */}
      {/* MOBILE DRAWER NAVIGATION                         */}
      {/* ================================================= */}

      {isOpen && (
        <div className="fixed inset-0 top-13 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden" onClick={() => setIsOpen(false)}>
          <div
            className="w-4/5 max-w-sm bg-gov-blue-dark h-full p-6 shadow-2xl overflow-y-auto transform transition-transform duration-300 animate-slide-in relative flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo in drawer */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-4">
                <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" stroke="#FF9933" strokeWidth="4" fill="#0A2540" />
                  <path d="M35 50 L65 50 M50 35 L50 65" stroke="#FFFFFF" strokeWidth="4" />
                </svg>
                <div className="leading-none text-left">
                  <span className="text-xs font-bold text-white uppercase block">Chhata Portal</span>
                  <span className="text-[10px] text-gov-saffron block">Portal Menu</span>
                </div>
              </div>

              {/* Menu lists */}
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = activeTab === item.name;
                  const hasSub = item.hasDropdown;
                  const isDropdownOpen = openDropdown === item.name;

                  return (
                    <div key={item.name} className="border-b border-slate-800/40 py-1 text-left">
                      <button
                        onClick={() => {
                          if (hasSub) {
                            setOpenDropdown(isDropdownOpen ? null : item.name);
                          } else {
                            handleMenuClick(item.name, item.href);
                          }
                        }}
                        className={`w-full flex justify-between items-center py-2 px-3 text-xs uppercase tracking-wide font-bold rounded-lg transition-colors cursor-pointer border-0 ${
                          isActive
                            ? "bg-gov-saffron text-white"
                            : "text-slate-200 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{item.name}</span>
                        {hasSub && (
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>

                      {/* Mobile Dropdown Subitems */}
                      {hasSub && isDropdownOpen && (
                        <div className="mt-1 pl-4 space-y-1 bg-black/10 rounded-lg py-2">
                          {item.megaMenuType === "departments" &&
                            departments.map((dept) => (
                              <button
                                key={dept.name}
                                onClick={() => handleMenuClick(item.name, item.href)}
                                className="w-full text-left py-1.5 px-3 text-[11px] font-semibold text-slate-300 hover:text-white border-0 bg-transparent"
                              >
                                • {dept.name}
                              </button>
                            ))}

                          {item.megaMenuType === "services" &&
                            services.map((serv) => (
                              <button
                                key={serv.name}
                                onClick={() => handleMenuClick(item.name, item.href)}
                                className="w-full text-left py-1.5 px-3 text-[11px] font-semibold text-slate-300 hover:text-white border-0 bg-transparent"
                              >
                                • {serv.name}
                              </button>
                            ))}

                          {item.items &&
                            item.items.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={() => handleMenuClick(item.name, sub.href)}
                                className="w-full text-left py-1.5 px-3 text-[11px] font-semibold text-slate-300 hover:text-white border-0 bg-transparent"
                              >
                                • {sub.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom contact info inside drawer */}
            <div className="mt-8 border-t border-slate-700/60 pt-4 text-center">
              <p className="text-[10px] text-slate-400">Emergency Helpline</p>
              <a href="tel:18001804040" className="text-sm font-extrabold text-gov-saffron block hover:underline">
                1800-180-4040
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
