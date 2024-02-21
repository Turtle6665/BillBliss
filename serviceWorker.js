// The name of the cache your app uses.
const CACHE_VERSION = "0.1.4";
const CURRENT_CACHES = {
  BillBliss: `BillBliss-cache-v${CACHE_VERSION}`,
};
const Testing = false;

self.addEventListener("activate", (event) => {
  // Delete all caches that aren't named in CURRENT_CACHES.
  // While there is only one cache in this example, the same logic
  // will handle the case where there are multiple versioned caches.
  const expectedCacheNamesSet = new Set(Object.values(CURRENT_CACHES));
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (
            !expectedCacheNamesSet.has(cacheName) &
            cacheName.includes("BillBliss")
          ) {
            // If this cache name isn't present in the set of "expected" cache names
            // and does have "BillBliss" in (see why on https://web.dev/articles/service-worker-lifecycle?)
            // then delete it.
            console.log("Deleting out of date cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      ),
    ),
  );
});

async function cacheThenNetwork(event) {
  let url = new URL(event.request.url);
  //remove hash and serach from the simple fetch
  url.hash = "";
  url.search = "";
  return caches.open(CURRENT_CACHES.BillBliss).then((cache) => {
    return cache
      .match(url.toString())
      .then((response) => {
        if (response & !Testing) {
          // If there is an entry in the cache for event.request,
          // then response will be defined and we can just return it.
          console.log(" Found response in cache:", response);
          return response;
        }

        // Otherwise, if there is no entry in the cache for event.request,
        // response will be undefined, and we need to fetch() the resource.
        console.log(
          " No response for %s found in cache. About to fetch " +
            "from network…",
          url.toString(),
        );

        // We call .clone() on the request since we might use it
        // in a call to cache.put() later on.
        // Both fetch() and cache.put() "consume" the request,
        // so we need to make a copy.
        // (see https://developer.mozilla.org/en-US/docs/Web/API/Request/clone)
        return fetch(event.request.clone()).then((response) => {
          console.log(
            "  Response for %s from network is: %O",
            url.toString(),
            response,
          );
          if (response.status < 400) {
            // This avoids caching responses that we know are errors
            // (i.e. HTTP status code of 4xx or 5xx).
            console.log("  Caching the response to", url.toString());
            // We call .clone() on the response to save a copy of it
            // to the cache. By doing so, we get to keep the original
            // response object which we will return back to the controlled
            // page.
            // https://developer.mozilla.org/en-US/docs/Web/API/Request/clone
            cache.put(url.toString(), response.clone());
          } else {
            console.log("  Not caching the response to", url.toString());
          }
          // Return the original response object, which will be used to
          // fulfill the resource request.
          return response;
        });
      })
      .catch((error) => {
        // This catch() will handle exceptions that arise from the match()
        // or fetch() operations.
        // Note that a HTTP error response (e.g. 404) will NOT trigger
        // an exception.
        // It will return a normal response object that has the appropriate
        // error code set.
        console.error("  Error in fetch handler:", error);

        throw error;
      });
  });
}

self.addEventListener("fetch", (event) => {
  console.log("fetched: ", event.request.url);
  if (/ihatemoney/.test(event.request.url)) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(cacheThenNetwork(event));
  }
});
