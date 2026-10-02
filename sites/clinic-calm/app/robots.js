// Sample site: keep crawlers out. (A real launch replaces this; see references/seo.md and AP-028.)
export default function robots() {
  return { rules: { userAgent: '*', disallow: '/' } };
}
