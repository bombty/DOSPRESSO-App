import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const [showLeftGradient, setShowLeftGradient] = React.useState(false)
  const [showRightGradient, setShowRightGradient] = React.useState(false)

  const checkOverflow = React.useCallback(() => {
    const el = listRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth + 2
    setShowLeftGradient(hasOverflow && el.scrollLeft > 4)
    setShowRightGradient(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    checkOverflow()
    el.addEventListener("scroll", checkOverflow, { passive: true })
    const ro = new ResizeObserver(checkOverflow)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkOverflow)
      ro.disconnect()
    }
  }, [checkOverflow])

  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      const activeTab = el.querySelector('[data-state="active"]') as HTMLElement | null
      if (activeTab) {
        activeTab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
      }
      checkOverflow()
    })
    return () => cancelAnimationFrame(raf)
  }, [children, checkOverflow])

  return (
    <div ref={containerRef} className="relative" data-testid="tabs-scroll-container">
      {showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none rounded-l-xl bg-gradient-to-r from-muted/80 to-transparent" />
      )}
      <TabsPrimitive.List
        ref={(node) => {
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        className={cn(
          "inline-flex h-11 items-center justify-start rounded-xl bg-muted/80 backdrop-blur-sm p-1 text-muted-foreground gap-0.5",
          "overflow-x-auto scrollbar-hidden max-w-full",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
      {showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none rounded-r-xl bg-gradient-to-l from-muted/80 to-transparent" />
      )}
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm",
      "hover-elevate",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "animate-fade-in data-[state=inactive]:animate-fade-out",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
