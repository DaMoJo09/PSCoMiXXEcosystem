import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import StreamingCatalog from "./pages/StreamingCatalog";
import StreamingChannels from "./pages/StreamingChannels";
import StreamingHub from "./pages/StreamingHub";
import StreamingTitle from "./pages/StreamingTitle";

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
      <Switch>
        <Route path="/streaming" component={StreamingHub} />
        <Route path="/streaming/title/:id" component={StreamingTitle} />
        <Route path="/streaming/browse/:type" component={StreamingCatalog} />
        <Route path="/streaming/search" component={StreamingCatalog} />
        <Route path="/streaming/channels" component={StreamingChannels} />
        <Route path="/streaming/continue" component={StreamingCatalog} />
        <Route component={StreamingNotFound} />
      </Switch>
    </QueryClientProvider>
  );
}
