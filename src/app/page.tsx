/**
 * Placeholder landing for the scaffold. The real `/` service-health dashboard
 * (tiles fed by each service's grpc.health.v1.Health via the BFF) is built in
 * task 1.2; the multi-service nav + Apollo module land in tasks 1.x–5.x.
 */
export default function Home() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">
        Constellation operator console
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Zeus</h1>
      <p className="text-balance text-muted-foreground">
        The sovereign control panel for the pantheon. Manage Apollo object
        storage — buckets, objects, uploads, metadata — with more services to
        follow, one at a time.
      </p>
      <p className="text-sm text-muted-foreground">
        Scaffold ready. Service-health dashboard and the Apollo module are on
        the way.
      </p>
    </div>
  );
}
