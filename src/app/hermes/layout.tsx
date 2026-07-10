import { HermesNav } from "@/components/hermes/hermes-nav";

/** The Hermes module layout: an in-module Topics ⇄ Subscriptions nav above each view. */
export default function HermesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HermesNav />
      {children}
    </>
  );
}
