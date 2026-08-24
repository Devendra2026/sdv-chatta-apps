'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Hash, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  RotateCcw,
  MapPin,
  FileText,
  Phone
} from 'lucide-react';

type SearchTab = 'ward' | 'propertyId' | 'owner';

export default function ProfessionalPropertyTaxPage() {
  const [activeTab, setActiveTab] = useState<SearchTab>('ward');
  
  // Form states for actual production integration
  const [wardNumber, setWardNumber] = useState('');
  const [propertyNumber, setPropertyNumber] = useState('');
  const [propertyIdInput, setPropertyIdInput] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement your API call / routing logic here based on activeTab
    console.log('Submitting search for tab:', activeTab);
  };

  const handleReset = () => {
    setWardNumber('');
    setPropertyNumber('');
    setPropertyIdInput('');
    setOwnerName('');
    setMobileNumber('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-orange-500 selection:text-white">

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="max-w-3xl">
          <span className="inline-block py-1.5 px-3.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold tracking-wide uppercase mb-4 shadow-sm">
            Citizen Services & Assessment
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
            Online Property Tax <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-amber-600">Payment & Dues</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mt-4 font-normal leading-relaxed">
            Search your property records instantly, review comprehensive tax breakdowns, and complete secure digital payments with official receipt generation.
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-8 bg-white py-2.5 px-4 rounded-xl border border-slate-200/80 shadow-sm">
          <a href="/" className="hover:text-orange-600 transition-colors">Home</a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <a href="#" className="hover:text-orange-600 transition-colors">Property Tax</a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-orange-600 font-bold">Search & Pay</span>
        </div>
      </section>

      {/* Main Interactive Form Card with 3D Depth */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative">
          {/* Ambient 3D Glow Backdrops */}
          <div className="absolute -inset-1 bg-linear-to-r from-orange-500 to-amber-500 rounded-[32px] blur-xl opacity-20 transform scale-[1.01] pointer-events-none"></div>

          <div className="relative bg-white rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200/80 overflow-hidden">
            
            {/* 3D Tab Navigation Header */}
            <div className="bg-slate-100/80 p-2 sm:p-3 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* Tab 1 */}
              <button 
                type="button"
                onClick={() => setActiveTab('ward')}
                className={`flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                  activeTab === 'ward' 
                    ? 'bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 scale-[1.02]' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <MapPin className={`w-4 h-4 ${activeTab === 'ward' ? 'text-orange-600' : 'text-slate-400'}`} />
                <span>Search by Ward</span>
              </button>

              {/* Tab 2 */}
              <button 
                type="button"
                onClick={() => setActiveTab('propertyId')}
                className={`flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                  activeTab === 'propertyId' 
                    ? 'bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 scale-[1.02]' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Hash className={`w-4 h-4 ${activeTab === 'propertyId' ? 'text-orange-600' : 'text-slate-400'}`} />
                <span>Property ID / Parcel No.</span>
              </button>

              {/* Tab 3 */}
              <button 
                type="button"
                onClick={() => setActiveTab('owner')}
                className={`flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                  activeTab === 'owner' 
                    ? 'bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 scale-[1.02]' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <User className={`w-4 h-4 ${activeTab === 'owner' ? 'text-orange-600' : 'text-slate-400'}`} />
                <span>Owner Name / Mobile</span>
              </button>

            </div>

            {/* Form Input Section */}
            <div className="p-6 sm:p-10 lg:p-12">
              <div className="mb-8 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Find Your Property Record</h2>
                  <p className="text-slate-500 text-sm mt-1">Please enter accurate details corresponding to your municipal property registration.</p>
                </div>
                <div className="text-xs font-semibold bg-orange-50 text-orange-700 px-3.5 py-2 rounded-xl border border-orange-100 self-start">
                  Step 1 of 2: Search Verification
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-6">
                
                {/* TAB 1 CONTENT: Ward Search */}
                {activeTab === 'ward' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        Select Ward Number
                      </label>
                      <input 
                        type="text" 
                        value={wardNumber}
                        onChange={(e) => setWardNumber(e.target.value)}
                        placeholder="Enter Ward Name or Number (e.g., Ward 04)" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-orange-500" />
                        Building / House / Plot Details
                      </label>
                      <input 
                        type="text" 
                        value={propertyNumber}
                        onChange={(e) => setPropertyNumber(e.target.value)}
                        placeholder="Enter House No. or Landmark" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2 CONTENT: Property ID Search */}
                {activeTab === 'propertyId' && (
                  <div className="grid grid-cols-1 gap-6 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-orange-500" />
                        Property ID / Unique Parcel Number
                      </label>
                      <input 
                        type="text" 
                        value={propertyIdInput}
                        onChange={(e) => setPropertyIdInput(e.target.value)}
                        placeholder="e.g., CHH-PR-2026-98412" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3 CONTENT: Owner Name / Mobile */}
                {activeTab === 'owner' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-orange-500" />
                        Owner Full Name
                      </label>
                      <input 
                        type="text" 
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Enter property owner name" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-orange-500" />
                        Registered Mobile Number
                      </label>
                      <input 
                        type="tel" 
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Enter 10-digit mobile number" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* Form Action Buttons with 3D Pop Effect */}
                <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
                  <button 
                    type="submit" 
                    className="flex items-center justify-center gap-2.5 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_10px_25px_rgba(234,88,12,0.3)] hover:shadow-[0_15px_30px_rgba(234,88,12,0.4)] active:scale-95 transition-all duration-200 text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Property Tax Dues</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold px-7 py-4 rounded-2xl transition-all duration-200 text-sm active:scale-95 border border-slate-200/50"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Reset Fields</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}
