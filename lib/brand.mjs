const MDSITE_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M18 10h21l9 9v35H18z" fill="#f8fafc"/>
  <path d="M39 10v10h9" fill="#dbeafe"/>
  <path d="M22 27h17M22 34h13" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  <path d="M43 42c4 0 7-2.5 7-6.1 0-3-2.1-5.3-5-5.8A8 8 0 0 0 30.6 33 6.5 6.5 0 0 0 32 46h11z" fill="#38bdf8"/>
  <path d="M39 47V34m0 0-5 5m5-5 5 5" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const MDSITE_FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(MDSITE_FAVICON_SVG)}`
const MDSITE_FAVICON_LINK = `<link rel="icon" type="image/svg+xml" href="${MDSITE_FAVICON_HREF}">`

export { MDSITE_FAVICON_SVG, MDSITE_FAVICON_HREF, MDSITE_FAVICON_LINK }
