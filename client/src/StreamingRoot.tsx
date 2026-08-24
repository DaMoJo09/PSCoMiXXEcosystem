import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import StreamingChannels from "./pages/StreamingChannels";
import StreamingMasterCatalog from "./pages/StreamingMasterCatalog";
import StreamingMasterHub from "./pages/StreamingMasterHub";
import StreamingMasterTitle from "./pages/StreamingMasterTitle";

const STREAMING_REQUEST_TIMEOUT_MS = 8_000;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function StreamingNetworkGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;

    const guardedFetch: typeof window.fetch = async (input, init) => {
      const url = requestUrl(input);
      const isCatalogFeed = url.includes("/functions/v1/catalog-feed");

      // Only own timeout behavior for Press Start catalog/manifest calls that
      // do not already provide an AbortSignal. Catalog and LISTEN requests
      // already use explicit timeout helpers; READ/EXPERIENCE/PLAY inherit it
      // here without duplicating transport code inside each frozen runtime.
      if (!isCatalogFeed || init?.signal) return originalFetch(input, init);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), STREAMING_REQUEST_TIMEOUT_MS);
      try {
        return await originalFetch(input, { ...init, signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
    };

    window.fetch = guardedFetch;
    return () => {
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}

function StreamingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center text-white">
      <div className="text-xs font-black tracking-[0.22em] text-[#f0ae2e]">PRESS START STREAMING</div>
      <h1 className="text-3xl font-black">That streaming page does not exist.</h1>
      <a href="/streaming" className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-[#f0ae2e]/45 hover:text-white">
        Back to Streaming
      </a>
    </div>
  );
}

export default function StreamingRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <StreamingNetworkGuard>
        <Switch>
          <Route path="/streaming" component={StreamingMasterHub} />
          <Route path="/streaming/title/:id" component={StreamingMasterTitle} />
          <Route path="/streaming/browse/:type" component={StreamingMasterCatalog} />
          <Route path="/streaming/search" component={StreamingMasterCatalog} />
          <Route path="/streaming/channels" component={StreamingChannels} />
          <Route path="/streaming/continue" component={StreamingMasterCatalog} />
          <Route path="/streaming/discover" component={StreamingMasterCatalog} />
          <Route path="/streaming/trending" component={StreamingMasterCatalog} />
          <Route path="/streaming/explore" component={StreamingMasterCatalog} />
          <Route component={StreamingNotFound} />
        </Switch>
      </StreamingNetworkGuard>
    </QueryClientProvider>
  );
}
