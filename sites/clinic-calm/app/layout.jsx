import localFont from 'next/font/local';
import { connection } from 'next/server';
import Link from 'next/link';
import content from '../content/clinic.fa.json';
import './globals.css';

// Self-hosted variable font from the pinned npm package (SIL OFL 1.1, see LICENSES.md). No request leaves the origin.
const vazirmatn = localFont({
  src: '../node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-vazirmatn',
  adjustFontFallback: false, // the Arial-based fallback metrics Next generates say nothing about Persian fallback fonts
});

export const metadata = {
  title: content.meta.title,
  description: content.meta.description,
  // This is a sample site: it must not be indexed. A real launch removes this (AP-028 is about the opposite mistake).
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }) {
  await connection(); // per-request rendering: required for the CSP nonce (proxy.js)
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        <a className="skip-link" href="#main">{content.a11y.skip}</a>
        <p className="sample-banner" role="note">{content.sample.banner}</p>
        <header className="site-header">
          <div className="wrap site-header__inner">
            <Link href="/" className="brand">
              <svg className="brand__mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
                <path d="M16 3c5 4 8 8.500 8 13.500S20.500 26 16 29c-4.500-3-8-7.500-8-12.500S11 7 16 3Z" fill="none" stroke="currentColor" strokeWidth="1.400" />
                <path d="M16 9v17" fill="none" stroke="currentColor" strokeWidth="1.400" />
              </svg>
              <span>{content.brand.name}</span>
            </Link>
            <nav aria-label={content.a11y.mainNav} className="site-nav">
              <ul>
                {content.nav.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
                <li><Link href={content.cta.href} className="btn btn--small">{content.cta.label}</Link></li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p className="brand-line">{content.brand.name} · {content.brand.tagline}</p>
            <p>{content.sample.footer}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
