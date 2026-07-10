/**
 * The constellation services Zeus presides over. This single registry drives
 * both the service navigation and the `/` dashboard tiles, so adding a module
 * later is one entry here plus its route group — additive, not a restructure
 * (design: "build for find-all now"). Only Apollo ships in v1; the rest are
 * visible-but-disabled "coming soon" stubs.
 */
import {
  Boxes,
  Eye,
  Hammer,
  Send,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type ServiceStatus = "active" | "coming-soon";

export interface ServiceDef {
  key: string;
  name: string;
  /** One-line operator description. */
  blurb: string;
  icon: LucideIcon;
  status: ServiceStatus;
  /** Present only for built ("active") modules. */
  href?: string;
}

export const SERVICES: ServiceDef[] = [
  {
    key: "apollo",
    name: "Apollo",
    blurb: "Object storage — buckets, objects, uploads",
    icon: Boxes,
    status: "active",
    href: "/apollo",
  },
  {
    key: "hermes",
    name: "Hermes",
    blurb: "Message queue — topics, publish, DLQ",
    icon: Send,
    status: "active",
    href: "/hermes",
  },
  {
    key: "artemis",
    name: "Artemis",
    blurb: "Catalog — tags, reindex, post status",
    icon: Tags,
    status: "coming-soon",
  },
  {
    key: "hephaestus",
    name: "Hephaestus",
    blurb: "Jobs — worker runs and status",
    icon: Hammer,
    status: "coming-soon",
  },
  {
    key: "argus",
    name: "Argus",
    blurb: "Tagger — automated tagging runs",
    icon: Eye,
    status: "coming-soon",
  },
];
