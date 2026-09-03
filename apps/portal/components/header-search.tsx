"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [expanded, setExpanded] = React.useState(false)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/surveys?q=${encodeURIComponent(q)}`)
    } else {
      router.push("/surveys")
    }
    setExpanded(false)
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || !event.key || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      if (window.matchMedia("(min-width: 768px)").matches) {
        inputRef.current?.focus()
      } else {
        setExpanded(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <form
        onSubmit={submit}
        className={cn("relative hidden min-w-0 flex-1 md:block", className)}
      >
        <label htmlFor="header-survey-search" className="sr-only">
          Search surveys
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="header-survey-search"
          className="h-10 w-full max-w-xl rounded-xl border-transparent bg-muted/70 pr-16 pl-10 shadow-none transition-colors duration-200 focus-visible:border-ring focus-visible:bg-card"
          placeholder="Search surveys, parcels, owners…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </form>

      <div className="md:hidden">
        {expanded ? (
          <form onSubmit={submit} className="relative">
            <label htmlFor="header-survey-search-mobile" className="sr-only">
              Search surveys
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="header-survey-search-mobile"
              autoFocus
              className="h-9 w-48 rounded-xl border-transparent bg-muted/70 pl-8"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                if (!query) setExpanded(false)
              }}
            />
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-pointer rounded-xl"
            aria-label="Search surveys"
            onClick={() => setExpanded(true)}
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </>
  )
}
