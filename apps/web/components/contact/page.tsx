"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault() // Page refresh hone se rokega
    setIsPending(true)

    // Form ka data extract karne ke liye
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    console.log("Form Data:", data)

    // Form clear karna
    e.currentTarget.reset()

    // Fake API delay aur success state
    setTimeout(() => {
      setIsPending(false)
      setSubmitted(true)

      // 3 second baad success message hatane ke liye
      window.setTimeout(() => {
        setSubmitted(false)
      }, 3000)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 md:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Page Title */}
        <div className="space-y-3 text-center">
          <span className="border-gov-blue-medium/20 bg-gov-blue-medium/10 text-gov-blue-medium rounded-full border px-3 py-1 text-xs font-bold tracking-wider uppercase">
            Reach Out to Us
          </span>

          <h1 className="text-gov-blue-dark font-serif text-3xl font-black tracking-tight md:text-5xl">
            Get in Touch
          </h1>

          <p className="mx-auto max-w-2xl text-sm font-medium text-slate-500 md:text-base">
            Your feedback and queries help us serve you better. Contact Nagar
            Panchayat, Chhata, Mathura anytime.
          </p>

          <div className="bg-gov-saffron mx-auto mt-4 h-1 w-20 rounded-full" />
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: Contact Information */}
          <div className="flex flex-col space-y-6 lg:col-span-5">
            <div className="flex flex-1 flex-col justify-between space-y-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
              <div>
                <h2 className="text-gov-blue-dark mb-2 font-serif text-xl font-extrabold tracking-tight">
                  Contact Information
                </h2>

                <p className="mb-6 text-xs font-semibold text-slate-400">
                  Feel free to reach out to us for any support, queries,
                  complaints or general assistance.
                </p>

                {/* Contact Detail Cards */}
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-100/60 bg-slate-50 p-3 transition-all hover:bg-slate-100/80">
                    <div className="shrink-0 rounded-xl bg-blue-500 p-3 text-white shadow-md">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Office Address
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed font-bold text-slate-700">
                        Main Bazar, Nagar Panchayat, Chhata , Mathura, Uttar
                        Pradesh, 250606
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-100/60 bg-slate-50 p-3 transition-all hover:bg-slate-100/80">
                    <div className="shrink-0 rounded-xl bg-emerald-600 p-3 text-white shadow-md">
                      <Phone className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Phone Number
                      </p>

                      <Link
                        href="tel:+918189077892"
                        className="mt-0.5 block text-xs font-black text-slate-700 hover:underline"
                      >
                        +91 xxxx-xxx-7892
                      </Link>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-100/60 bg-slate-50 p-3 transition-all hover:bg-slate-100/80">
                    <div className="shrink-0 rounded-xl bg-amber-500 p-3 text-white shadow-md">
                      <Mail className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Email Address
                      </p>

                      <Link
                        href="mailto:npchhata@gmail.com"
                        className="mt-0.5 block text-xs font-black text-slate-700 hover:underline"
                      >
                        chhata@gmail.com
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Information */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                {/* Office Hours */}
                <div className="flex items-start gap-3">
                  <Clock className="text-gov-blue-medium mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <h4 className="text-gov-blue-dark text-xs font-black">
                      Office Hours
                    </h4>

                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      Monday – Saturday (10:00 AM to 05:00 PM)
                    </p>
                  </div>
                </div>

                {/* Emergency Helpline */}
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <div>
                    <h4 className="text-xs font-black text-red-600">
                      Emergency Helpline
                    </h4>

                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      Available 24x7 for essential municipal services.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="flex flex-col lg:col-span-7">
            <div className="flex flex-1 flex-col justify-between rounded-3xl border border-slate-100 bg-white p-8 shadow-xl md:p-10">
              <div>
                <h2 className="text-gov-blue-dark mb-2 font-serif text-xl font-extrabold tracking-tight">
                  Send Us a Message
                </h2>

                <p className="mb-8 text-xs font-semibold text-slate-400">
                  Our team will get back to you shortly.
                </p>

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success-message"
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-16 text-center"
                    >
                      <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-500" />

                      <h3 className="text-lg font-extrabold text-slate-800">
                        Message Transmitted!
                      </h3>

                      <p className="text-xs leading-relaxed font-semibold text-slate-500">
                        Thank you for reaching out to Nagar Panchayat, Chhata,
                        Mathura. We have logged your enquiry, and our desk
                        officer will contact you within 24-48 working hours.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="contact-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={onSubmit}
                      className="space-y-6"
                    >
                      {/* Name and Email */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label
                            htmlFor="contact-name"
                            className="mb-1 block text-[10px] font-bold text-slate-500 uppercase"
                          >
                            Your Name
                          </Label>

                          <Input
                            id="contact-name"
                            name="name"
                            required
                            type="text"
                            autoComplete="name"
                            disabled={isPending}
                            placeholder="Enter full name"
                            className="focus:outline-gov-blue-medium w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="contact-email"
                            className="mb-1 block text-[10px] font-bold text-slate-500 uppercase"
                          >
                            Your Email
                          </Label>

                          <Input
                            id="contact-email"
                            name="email"
                            required
                            type="email"
                            autoComplete="email"
                            disabled={isPending}
                            placeholder="Enter email"
                            className="focus:outline-gov-blue-medium w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Phone and Subject */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label
                            htmlFor="contact-phone"
                            className="mb-1 block text-[10px] font-bold text-slate-500 uppercase"
                          >
                            Phone Number
                          </Label>

                          <Input
                            id="contact-phone"
                            name="phone"
                            required
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            pattern="[1-9][0-9]{9}"
                            disabled={isPending}
                            placeholder="Enter 10-digit phone number"
                            className="focus:outline-gov-blue-medium w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
                            onChange={(e) => {
                              // Only allows numbers to be typed
                              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                           }}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="contact-subject"
                            className="mb-1 block text-[10px] font-bold text-slate-500 uppercase"
                          >
                            Subject
                          </Label>

                          <Input
                            id="contact-subject"
                            name="subject"
                            required
                            type="text"
                            disabled={isPending}
                            placeholder="Message subject"
                            className="focus:outline-gov-blue-medium w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <Label
                          htmlFor="contact-message"
                          className="mb-1 block text-[10px] font-bold text-slate-500 uppercase"
                        >
                          Your Message
                        </Label>

                        <Textarea
                          id="contact-message"
                          name="message"
                          required
                          disabled={isPending}
                          rows={6}
                          placeholder="Write your message..."
                          className="focus:outline-gov-blue-medium w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-gov-blue-medium hover:bg-gov-blue-dark flex cursor-pointer items-center gap-1.5 self-start rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                      >
                        <span>{isPending ? "Sending..." : "Send Message"}</span>
                        <Send className={`text-gov-saffron h-4 w-4 ${isPending ? "animate-pulse" : ""}`} />
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Google Maps Section */}
        <div className="space-y-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-gov-blue-dark font-serif text-xl font-extrabold tracking-tight">
                Find Us on Google Maps
              </h2>

              <p className="text-xs font-semibold text-slate-400">
                Navigate directly to Nagar Panchayat Office, Chhata, Mathura.
              </p>
            </div>

            <Link
              href="https://www.google.com/maps/place/Chhata+Rural,+Uttar+Pradesh+281401/@27.7283715,77.4872994,14z/data=!3m1!4b1!4m6!3m5!1s0x397315870e3c703f:0xbf95b8951b3201e0!8m2!3d27.7225032!4d77.495443!16zL20vMGYwbm5r?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200"
            >
              <Navigation className="h-3.5 w-3.5 animate-pulse text-blue-600" />
              <span>Open in Google Maps App</span>
            </Link>
          </div>

          <div className="group relative h-95 w-full overflow-hidden rounded-2xl border border-slate-100">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3505.4227727146524!2d77.49325407549721!3d27.722503224403756!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397315870e3c703f%3A0xbf95b8951b3201e0!2sNagar%20Panchayat%20chhata!5e0!3m2!1sen!2sin!4v1723890000000!5m2!1sen!2sin"
              className="h-full w-full border-0 grayscale transition-all duration-500 hover:grayscale-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Nagar Panchayat Chhata , Mathura Location Map"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
