"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import type {
  PublicPropertyTaxResultItem,
  PublicPropertyTaxSearchResult,
} from "@workspace/types"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  User,
} from "lucide-react"
import Link from "next/link"
import React, { useRef, useState } from "react"

import { PaymentProcessSteps } from "@/components/propertytax/payment-process-steps"
import {
  fetchPublicWards,
  searchPublicProperties,
  type PropertyTaxSearchParams,
} from "@/lib/property-tax-api"
import { PublicApiError } from "@/lib/public-api"

type SearchTab = "ward" | "propertyId" | "owner"

const PAGE_SIZE = 10

export default function ProfessionalPropertyTaxPage() {
  const [activeTab, setActiveTab] = useState<SearchTab>("ward")
  const [wardNumber, setWardNumber] = useState("")
  const [propertyNumber, setPropertyNumber] = useState("")
  const [propertyIdInput, setPropertyIdInput] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [results, setResults] = useState<PublicPropertyTaxSearchResult | null>(
    null
  )
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [activeQuery, setActiveQuery] = useState<Omit<
    PropertyTaxSearchParams,
    "page" | "pageSize"
  > | null>(null)
  const resultsRef = useRef<HTMLElement | null>(null)

  const wardsQuery = useQuery({
    queryKey: ["public-property-tax-wards"],
    queryFn: fetchPublicWards,
    staleTime: 5 * 60_000,
  })

  const searchMutation = useMutation({
    mutationFn: searchPublicProperties,
    onSuccess: (data) => {
      setResults(data)
      setHasSearched(true)
      setBannerError(null)
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    onError: (error: unknown) => {
      setResults(null)
      setHasSearched(true)
      if (error instanceof PublicApiError) {
        setBannerError(error.message)
        return
      }
      setBannerError("Unable to search properties. Please try again.")
    },
  })

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (activeTab === "ward") {
      if (!wardNumber) {
        next.wardNumber = "Please select a ward"
      }
    } else if (activeTab === "propertyId") {
      if (!propertyIdInput.trim()) {
        next.propertyId = "Property ID or parcel number is required"
      }
    } else {
      if (ownerName.trim().length < 3) {
        next.ownerName = "Owner name must be at least 3 characters"
      }
      if (!/^\d{10}$/.test(mobileNumber.trim())) {
        next.mobile = "Enter a valid 10-digit mobile number"
      }
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function buildSearchParams(): Omit<
    PropertyTaxSearchParams,
    "page" | "pageSize"
  > | null {
    if (activeTab === "ward") {
      return {
        mode: "ward",
        wardNumber: Number(wardNumber),
        propertyNo: propertyNumber.trim() || undefined,
      }
    }
    if (activeTab === "propertyId") {
      return {
        mode: "propertyId",
        propertyId: propertyIdInput.trim(),
      }
    }
    return {
      mode: "owner",
      ownerName: ownerName.trim(),
      mobile: mobileNumber.trim(),
    }
  }

  function runSearch(
    query: Omit<PropertyTaxSearchParams, "page" | "pageSize">,
    nextPage: number
  ) {
    setPage(nextPage)
    setActiveQuery(query)
    searchMutation.mutate({
      ...query,
      page: nextPage,
      pageSize: PAGE_SIZE,
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setBannerError(null)
    if (!validate()) return
    const query = buildSearchParams()
    if (!query) return
    runSearch(query, 1)
  }

  const goToPage = (nextPage: number) => {
    if (!activeQuery || nextPage < 1) return
    const totalPages = results
      ? Math.max(1, Math.ceil(results.total / results.pageSize))
      : 1
    if (nextPage > totalPages) return
    setBannerError(null)
    runSearch(activeQuery, nextPage)
  }

  const handleReset = () => {
    setWardNumber("")
    setPropertyNumber("")
    setPropertyIdInput("")
    setOwnerName("")
    setMobileNumber("")
    setFieldErrors({})
    setBannerError(null)
    setResults(null)
    setHasSearched(false)
    setPage(1)
    setActiveQuery(null)
    searchMutation.reset()
  }

  const switchTab = (tab: SearchTab) => {
    setActiveTab(tab)
    setFieldErrors({})
    setBannerError(null)
  }

  const isSearching = searchMutation.isPending
  const items = results?.items ?? []
  const totalPages = results
    ? Math.max(1, Math.ceil(results.total / results.pageSize))
    : 1
  const rangeFrom =
    results && results.total > 0 ? (results.page - 1) * results.pageSize + 1 : 0
  const rangeTo = results
    ? Math.min(results.page * results.pageSize, results.total)
    : 0

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-orange-500 selection:text-white">
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-orange-100 px-3.5 py-1.5 text-xs font-bold tracking-wide text-orange-700 uppercase shadow-sm">
            Citizen Services & Assessment
          </span>
          <h1 className="text-4xl leading-[1.15] font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-5xl">
            Online House Tax{" "}
            <span className="bg-linear-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Payment
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed font-normal text-slate-600 sm:text-lg">
            Search your property records instantly, review house tax dues, and
            complete secure digital payments with official receipt generation.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
          <a href="/" className="transition-colors hover:text-orange-600">
            Home
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="transition-colors hover:text-orange-600">
            House Tax
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-orange-600">Search & Pay</span>
        </div>

        <PaymentProcessSteps current={1} className="mt-6" />
      </section>

      <main className="mx-auto max-w-7xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-1 scale-[1.01] transform rounded-[32px] bg-linear-to-r from-orange-500 to-amber-500 opacity-20 blur-xl" />

          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-100/80 p-2 sm:grid-cols-3 sm:p-3">
              <button
                type="button"
                onClick={() => switchTab("ward")}
                className={`flex cursor-pointer items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === "ward"
                    ? "scale-[1.02] border border-slate-200/60 bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              >
                <MapPin
                  className={`h-4 w-4 ${activeTab === "ward" ? "text-orange-600" : "text-slate-400"}`}
                />
                <span>Search by Ward</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("propertyId")}
                className={`flex cursor-pointer items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === "propertyId"
                    ? "scale-[1.02] border border-slate-200/60 bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              >
                <Hash
                  className={`h-4 w-4 ${activeTab === "propertyId" ? "text-orange-600" : "text-slate-400"}`}
                />
                <span>Property ID / Parcel No.</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("owner")}
                className={`flex cursor-pointer items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === "owner"
                    ? "scale-[1.02] border border-slate-200/60 bg-white text-orange-600 shadow-[0_10px_25px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              >
                <User
                  className={`h-4 w-4 ${activeTab === "owner" ? "text-orange-600" : "text-slate-400"}`}
                />
                <span>Owner Name / Mobile</span>
              </button>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    Find Your Property Record
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Please enter accurate details corresponding to your
                    municipal property registration.
                  </p>
                </div>
                <div className="self-start rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700">
                  Step 1 of 2: Search Verification
                </div>
              </div>

              {bannerError ? (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                >
                  {bannerError}
                </div>
              ) : null}

              {wardsQuery.isError ? (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
                >
                  Unable to load ward list. You can still search by Property ID
                  or Owner.
                </div>
              ) : null}

              <form onSubmit={handleSearch} className="space-y-6">
                {activeTab === "ward" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ward-number"
                        className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                      >
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                        Select Ward Number
                      </label>
                      <select
                        id="ward-number"
                        value={wardNumber}
                        onChange={(e) => setWardNumber(e.target.value)}
                        disabled={wardsQuery.isLoading}
                        className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 shadow-inner transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none disabled:opacity-60"
                      >
                        <option value="">
                          {wardsQuery.isLoading
                            ? "Loading wards…"
                            : "Select a ward"}
                        </option>
                        {(wardsQuery.data ?? []).map((ward) => (
                          <option key={ward.id} value={String(ward.number)}>
                            Ward {String(ward.number).padStart(2, "0")} —{" "}
                            {ward.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.wardNumber ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {fieldErrors.wardNumber}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor="property-number"
                        className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                      >
                        <Building2 className="h-3.5 w-3.5 text-orange-500" />
                        Building / House / Plot Details
                      </label>
                      <input
                        id="property-number"
                        type="text"
                        value={propertyNumber}
                        onChange={(e) => setPropertyNumber(e.target.value)}
                        placeholder="Enter House No. or Landmark (optional)"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "propertyId" && (
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label
                        htmlFor="property-id"
                        className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                      >
                        <FileText className="h-3.5 w-3.5 text-orange-500" />
                        Property ID / Unique Parcel Number
                      </label>
                      <input
                        id="property-id"
                        type="text"
                        value={propertyIdInput}
                        onChange={(e) => setPropertyIdInput(e.target.value)}
                        placeholder="e.g., CHH-PR-2026-98412"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                      />
                      {fieldErrors.propertyId ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {fieldErrors.propertyId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}

                {activeTab === "owner" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="owner-name"
                        className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                      >
                        <User className="h-3.5 w-3.5 text-orange-500" />
                        Owner Full Name
                      </label>
                      <input
                        id="owner-name"
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Enter property owner name"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                      />
                      {fieldErrors.ownerName ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {fieldErrors.ownerName}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor="mobile-number"
                        className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase"
                      >
                        <Phone className="h-3.5 w-3.5 text-orange-500" />
                        Registered Mobile Number
                      </label>
                      <input
                        id="mobile-number"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) =>
                          setMobileNumber(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Enter 10-digit mobile number"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 placeholder-slate-400 shadow-inner transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 focus:outline-none"
                      />
                      {fieldErrors.mobile ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {fieldErrors.mobile}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-orange-600 to-amber-600 px-8 py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(234,88,12,0.3)] transition-all duration-200 hover:from-orange-700 hover:to-amber-700 hover:shadow-[0_15px_30px_rgba(234,88,12,0.4)] active:scale-95 disabled:opacity-70"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>
                      {isSearching ? "Searching…" : "Search House Tax Dues"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-slate-200/50 bg-slate-100 px-7 py-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200/80 active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500" />
                    <span>Reset Fields</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {hasSearched || isSearching ? (
          <section
            ref={resultsRef}
            aria-live="polite"
            className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Step 2: Select Property
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isSearching
                    ? "Looking up matching municipal records…"
                    : results
                      ? results.total === 0
                        ? "0 matching records"
                        : `Showing ${rangeFrom}–${rangeTo} of ${results.total} record${results.total === 1 ? "" : "s"}`
                      : "Search results"}
                </p>
              </div>
              <div className="self-start rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700">
                Select a property to view tax dues
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {isSearching ? (
                <div className="flex items-center justify-center gap-3 py-12 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                  <span className="text-sm font-medium">
                    Searching property records…
                  </span>
                </div>
              ) : null}

              {!isSearching && hasSearched && items.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No matching property found.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Check details and try again.
                  </p>
                </div>
              ) : null}

              {!isSearching && items.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {items.map((item) => (
                      <PropertyResultRow key={item.id} item={item} />
                    ))}
                  </ul>

                  {totalPages > 1 ? (
                    <nav
                      aria-label="Search results pagination"
                      className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm font-medium text-slate-600">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goToPage(page - 1)}
                          disabled={page <= 1 || isSearching}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => goToPage(page + 1)}
                          disabled={page >= totalPages || isSearching}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </nav>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function PropertyResultRow({ item }: { item: PublicPropertyTaxResultItem }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-6">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Survey / Property Ref
          </p>
          <p className="truncate font-semibold text-slate-900">
            {item.surveyId}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Ward
          </p>
          <p className="font-semibold text-slate-900">
            Ward {String(item.wardNumber).padStart(2, "0")} — {item.wardName}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Property / Parcel
          </p>
          <p className="font-semibold text-slate-900">
            {item.propertyNo || item.parcelNo || "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Locality
          </p>
          <p className="font-semibold text-slate-900">{item.locality || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Owner
          </p>
          <p className="font-semibold text-slate-900">{item.ownerNameMasked}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Mobile
          </p>
          <p className="font-semibold text-slate-900">{item.mobileMasked}</p>
        </div>
      </div>
      {item.dueStatus === "NO_DUE" ? (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800"
          aria-label="No tax dues for current assessment year"
        >
          No Due
        </span>
      ) : (
        <Link
          href={`/propertytax/dues/${item.id}`}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-linear-to-r from-orange-600 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(234,88,12,0.28)] transition-all hover:from-orange-700 hover:to-amber-700"
        >
          Tax Dues
        </Link>
      )}
    </li>
  )
}
