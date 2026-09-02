"use client"

import Image from "next/image"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-svh flex-col bg-slate-50">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <Image
              src="/branding/up-government-logo.png"
              alt="Uttar Pradesh Government emblem"
              width={44}
              height={44}
              className="size-10 object-contain p-0.5"
              priority
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Password recovery / पासवर्ड पुनर्प्राप्ति
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Password recovery must be initiated by an administrator. Please
            contact your municipal administrator to receive a secure password
            reset link.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            पासवर्ड रीसेट के लिए कृपया अपने प्रशासक से संपर्क करें।
          </p>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="cursor-pointer font-medium text-sky-800 transition-colors duration-200 hover:text-sky-950 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
