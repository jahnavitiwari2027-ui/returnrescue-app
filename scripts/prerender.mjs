// After `vite build` and the SSR build: write one HTML file per public page with its own title,
// description, canonical link, link-preview tags and structured data, plus sitemap.xml and
// robots.txt. The plain app shell is kept as app.html for everything else (/app, /demo, …).
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const dist = resolve('dist')
const { render, PAGES, SITE_URL, FAQS, PRICE, PLAN_NAME, LIMITS } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)

const shell = readFileSync(`${dist}/index.html`, 'utf8')
if (!shell.includes('<div id="root"></div>')) throw new Error('prerender: app shell has no empty #root')
// The shell serves sign-in, the demo, the app and unknown URLs: keep those out of search results.
writeFileSync(`${dist}/app.html`, shell.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />'))

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

const app = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ReturnRescue',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: PAGES[0].description,
  offers: ['starter', 'pro'].flatMap((plan) =>
    [['month', 'monthly'], ['year', 'yearly']].map(([interval, word]) => ({
      '@type': 'Offer',
      name: `${PLAN_NAME[plan]} (${word})`,
      price: PRICE[plan][interval],
      priceCurrency: 'INR',
      url: `${SITE_URL}/pricing`,
    })),
  ),
}
const faqPage = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})
const structured = {
  '/': [app],
  '/features': [app],
  '/pricing': [app, faqPage(FAQS.filter((f) => f.pricing))],
  '/faq': [faqPage(FAQS)],
}

for (const page of PAGES) {
  const url = `${SITE_URL}${page.path}`
  const body = render(page.path)
  if (!body || body.length < 500) throw new Error(`prerender: ${page.path} rendered almost nothing`)
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="ReturnRescue" />`,
    `<meta property="og:image" content="${SITE_URL}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(structured[page.path] ?? []).map(ld),
  ].join('\n    ')
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(page.description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  for (const must of [`<title>${esc(page.title)}</title>`, `content="${esc(page.description)}"`, 'rel="canonical"'])
    if (!html.includes(must)) throw new Error(`prerender: ${page.path} is missing ${must}`)
  const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`
  writeFileSync(`${dist}/${file}`, html)
  console.log(`prerendered ${page.path} → ${file} (${Math.round(html.length / 1024)} kB)`)
}

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  `${dist}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(
    (p) => `  <url><loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc><lastmod>${today}</lastmod></url>`,
  ).join('\n')}\n</urlset>\n`,
)
writeFileSync(`${dist}/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /app\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
rmSync(resolve('dist-ssr'), { recursive: true, force: true })
console.log(`sitemap.xml and robots.txt written · trial ${LIMITS.trialDays} days`)
