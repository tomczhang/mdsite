import { MDSITE_LOGO_DATA_URI } from './brand-logo.mjs'

const MDSITE_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="signal" x1="16" y1="12" x2="50" y2="50" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset=".55" stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <path d="M15 50V14a4 4 0 0 1 4-4h21l10 10v30a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4Z" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
  <path d="M40 10v11h10" fill="#dbeafe" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M23 27h14M23 34h10M23 41h13" stroke="url(#signal)" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M42 43c4.8 0 8-2.6 8-6.4 0-3.2-2.3-5.7-5.6-6.1A8.5 8.5 0 0 0 28.8 34 6.7 6.7 0 0 0 30.4 47H42z" fill="url(#signal)" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M38.5 48V35m0 0-5 5m5-5 5 5" stroke="#0f172a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const MDSITE_FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(MDSITE_FAVICON_SVG)}`
const MDSITE_FAVICON_LINK = `<link rel="icon" type="image/svg+xml" href="${MDSITE_FAVICON_HREF}">`

// 品牌主题色 + 报告徽标：用真实 ribbon-M logo（base64 内联，保持单文件自包含）。
const MDSITE_BRAND_COLOR = '#63fe13'
const MDSITE_LOGO = `<img src="${MDSITE_LOGO_DATA_URI}" alt="mdsite" width="64" height="64" style="width:100%;height:100%;display:block;object-fit:contain">`

export { MDSITE_FAVICON_SVG, MDSITE_FAVICON_HREF, MDSITE_FAVICON_LINK, MDSITE_BRAND_COLOR, MDSITE_LOGO }
