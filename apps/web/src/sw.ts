/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === "document",
  new NetworkFirst({
    cacheName: "documents"
  })
);

registerRoute(
  ({ url }) => url.hostname.includes("supabase.co") || url.hostname.includes("coingecko.com"),
  new NetworkFirst({
    cacheName: "api-cache"
  })
);

registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "asset-cache"
  })
);
