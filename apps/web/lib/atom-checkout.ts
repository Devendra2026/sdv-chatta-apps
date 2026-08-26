import type { PublicPropertyTaxAipayCheckout } from "@workspace/types"

declare global {
  interface Window {
    AtomPaynetz?: new (
      options: {
        atomTokenId: string
        merchId: string
        custEmail: string
        custMobile: string
        returnUrl: string
      },
      env: string
    ) => unknown
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-atom-checkout="1"]`
    )
    if (existing && window.AtomPaynetz) {
      resolve()
      return
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Atom checkout script")),
        { once: true }
      )
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.dataset.atomCheckout = "1"
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error("Failed to load Atom checkout script"))
    document.body.appendChild(script)
  })
}

/**
 * Opens Atom AIPay widget (card / UPI / net banking).
 * Requires PAYMENT_PROVIDER=atom and a valid atomTokenId from auth API.
 */
export async function openAtomAipayCheckout(
  checkout: PublicPropertyTaxAipayCheckout
): Promise<void> {
  await loadScript(checkout.cdnUrl)
  if (!window.AtomPaynetz) {
    throw new Error("Atom checkout library did not initialize")
  }
  // Opens modal / payment page with card, UPI, and other instruments.
  new window.AtomPaynetz(
    {
      atomTokenId: checkout.atomTokenId,
      merchId: checkout.merchId,
      custEmail: checkout.custEmail,
      custMobile: checkout.custMobile,
      returnUrl: checkout.returnUrl,
    },
    checkout.env
  )
}
