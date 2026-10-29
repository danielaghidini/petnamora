// Loaded only by the isolated HTTP test server; never contacts Google.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url || input);
  if (url.hostname === "oauth2.googleapis.com" || url.hostname === "openidconnect.googleapis.com") {
    if (!process.env.AUTH_TEST_GOOGLE_URL) throw new Error("Missing Google mock");
    return originalFetch(`${process.env.AUTH_TEST_GOOGLE_URL}${url.pathname}`, options);
  }
  return originalFetch(input, options);
};
