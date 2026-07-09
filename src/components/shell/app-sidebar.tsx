import { ServiceNav } from "@/components/shell/service-nav";

/**
 * The persistent desktop service sidebar (task 1.1/1.3). Hidden on narrow
 * viewports, where the same ServiceNav is reached through the header's menu
 * sheet instead. Sticks below the 3.5rem (h-14) header.
 */
export function AppSidebar() {
  return (
    <aside
      className="hidden shrink-0 border-r border-border md:block md:w-56 lg:w-60"
      aria-label="Services"
    >
      <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
        <ServiceNav />
      </div>
    </aside>
  );
}
