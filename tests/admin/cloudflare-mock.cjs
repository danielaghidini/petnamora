// Loaded only by the isolated HTTP test server. Never contacts Cloudflare.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url || input);
  if (url.hostname === "api.cloudflare.com") {
    if (!process.env.ADMIN_TEST_IMAGES_URL) throw new Error("Missing Cloudflare mock");
    return originalFetch(`${process.env.ADMIN_TEST_IMAGES_URL}${url.pathname}`, options);
  }
  return originalFetch(input, options);
};
