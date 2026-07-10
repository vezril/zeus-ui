"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Send, Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/hermes", label: "Topics", icon: Send },
  { href: "/hermes/subscriptions", label: "Subscriptions", icon: Waypoints },
  { href: "/hermes/playground", label: "Playground", icon: Radio },
];

/** In-module Topics ⇄ Subscriptions navigation, shared across the Hermes views. */
export function HermesNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <nav
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
        aria-label="Hermes views"
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/hermes"
              ? pathname === "/hermes"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
