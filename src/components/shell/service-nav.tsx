"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { SERVICES } from "@/lib/services";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const rowBase =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";

/**
 * The shared service navigation. Rendered in the persistent desktop sidebar and
 * inside the mobile menu sheet (task 1.3). Active modules are links; future
 * services are visible but disabled "coming soon" stubs (task 1.4).
 */
export function ServiceNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Services">
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          rowBase,
          isActive(pathname, "/")
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        <LayoutDashboard className="size-4 shrink-0" />
        Dashboard
      </Link>

      <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
        Services
      </p>

      {SERVICES.map((service) => {
        const Icon = service.icon;

        if (service.status === "coming-soon") {
          return (
            <Tooltip key={service.key}>
              <TooltipTrigger asChild>
                <div
                  aria-disabled="true"
                  className={cn(
                    rowBase,
                    "cursor-not-allowed text-muted-foreground/50"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{service.name}</span>
                  <Badge variant="muted">Soon</Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {service.name} — {service.blurb}. Coming in a later change.
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={service.key}
            href={service.href!}
            onClick={onNavigate}
            className={cn(
              rowBase,
              isActive(pathname, service.href!)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {service.name}
          </Link>
        );
      })}
    </nav>
  );
}
