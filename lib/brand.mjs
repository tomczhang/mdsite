const MDSITE_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
      <stop stop-color="#020617"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="signal" x1="16" y1="12" x2="50" y2="50" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <path d="M14 50V16a4 4 0 0 1 4-4h22l10 10v28a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4Z" fill="#0b1220" stroke="#38bdf8" stroke-width="2"/>
  <path d="M40 12v11h10" fill="#172554" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
  <path d="M22 26h14M22 33h10M22 40h15" stroke="url(#signal)" stroke-width="3" stroke-linecap="round"/>
  <path d="M17 18h-5m0 0v8m35 24h6m0 0v-8" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="18" r="2.5" fill="#22d3ee"/>
  <circle cx="53" cy="50" r="2.5" fill="#34d399"/>
  <path d="M43 43c4.5 0 7.5-2.4 7.5-6.1 0-3.2-2.3-5.4-5.4-5.8A8 8 0 0 0 30.4 34 6.2 6.2 0 0 0 32 47h11z" fill="url(#signal)"/>
  <path d="M39.5 48V35m0 0-5 5m5-5 5 5" stroke="#020617" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const MDSITE_FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(MDSITE_FAVICON_SVG)}`
const MDSITE_FAVICON_LINK = `<link rel="icon" type="image/svg+xml" href="${MDSITE_FAVICON_HREF}">`

export { MDSITE_FAVICON_SVG, MDSITE_FAVICON_HREF, MDSITE_FAVICON_LINK }
