import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/shell/top-nav";
import { AppSidebar } from "@/components/shell/app-sidebar";

export const metadata: Metadata = {
  title: {
    default: "Zeus",
    template: "%s · Zeus",
  },
  description:
    "The constellation's operator console — manage Apollo object storage (buckets, objects, uploads) and, over time, the rest of the pantheon from one dark control panel.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Dark by default: the `dark` class is set here so shadcn-style `dark:`
  // variants resolve, and `color-scheme` keeps native UI (scrollbars) dark.
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <TopNav />
            <div className="flex flex-1">
              <AppSidebar />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
