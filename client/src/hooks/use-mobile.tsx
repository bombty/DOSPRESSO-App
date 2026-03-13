import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const LARGE_BREAKPOINT = 1440

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

type Breakpoint = "mobile" | "tablet" | "desktop" | "large"

function getInitialBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop"
  const w = window.innerWidth
  if (w < MOBILE_BREAKPOINT) return "mobile"
  if (w < TABLET_BREAKPOINT) return "tablet"
  if (w < LARGE_BREAKPOINT) return "desktop"
  return "large"
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>(getInitialBreakpoint)

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < MOBILE_BREAKPOINT) setBreakpoint("mobile")
      else if (w < TABLET_BREAKPOINT) setBreakpoint("tablet")
      else if (w < LARGE_BREAKPOINT) setBreakpoint("desktop")
      else setBreakpoint("large")
    }

    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlTablet = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const mqlLarge = window.matchMedia(`(min-width: ${LARGE_BREAKPOINT}px)`)

    const handler = () => update()
    mqlMobile.addEventListener("change", handler)
    mqlTablet.addEventListener("change", handler)
    mqlLarge.addEventListener("change", handler)
    update()

    return () => {
      mqlMobile.removeEventListener("change", handler)
      mqlTablet.removeEventListener("change", handler)
      mqlLarge.removeEventListener("change", handler)
    }
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop" || breakpoint === "large",
    isLargeScreen: breakpoint === "large",
  }
}
