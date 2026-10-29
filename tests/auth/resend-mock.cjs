// Only loaded by the isolated recovery test process. Never sends real email.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url || input);
  if (url.hostname === "api.resend.com") {
    if (!process.env.AUTH_TEST_RESEND_URL) throw new Error("Missing Resend mock");
    return originalFetch(`${process.env.AUTH_TEST_RESEND_URL}${url.pathname}`, options);
  }
  return originalFetch(input, options);
};
