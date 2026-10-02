// Reference environment: Next.js (App Router) + React, versions pinned in package.json and package-lock.json.
const enforceHttps = process.env.CLINIC_ENFORCE_HTTPS === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' }, // also covered by CSP frame-ancestors (set in proxy.js)
  // HSTS only when the deployment is really HTTPS (preload is hard to reverse: security.md section 6).
  ...(enforceHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

export default {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
