"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ServiceNav } from "@/components/shell/service-nav";

/**
 * The console header: brand + a mobile menu trigger. On wide viewports the
 * service navigation lives in the persistent sidebar (AppSidebar); on narrow
 * viewports it collapses into the sheet opened from here (task 1.3).
 */
export function TopNav() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <span className="text-lg font-semibold tracking-tight">
                  Zeus
                </span>
              </SheetTitle>
            </SheetHeader>
            <ServiceNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Zeus home"
        >
          <Zap className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Zeus</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            operator console
          </span>
        </Link>
      </div>
    </header>
  );
}
