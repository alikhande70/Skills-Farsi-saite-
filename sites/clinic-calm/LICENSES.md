# Licences of third-party material in this sample site

Scope: the sample site `sites/clinic-calm/` only. The licence of this repository's own code and texts is **not decided** (owner decision, `meta/OPEN-QUESTIONS.md` OQ-19); nothing here chooses it.

Rule used for this site: a third-party file ships only if its licence text is in the package it comes from, the version is pinned exactly, and the licence text's hash is recorded here. No images, no icons, no stock photos, no remote fonts, no CDN assets. A binary or media file in `app/`, `lib/` or `content/` fails `tests/audit.test.mjs`.

## Font

| Field | Value |
|---|---|
| Package | Vazirmatn 33.0.3 (npm `vazirmatn`, pinned exactly in `package.json`, integrity in `package-lock.json`) |
| Registry source | `https://registry.npmjs.org/vazirmatn/-/vazirmatn-33.0.3.tgz` |
| Lock integrity | `sha512-fbjNc0CMjazZpIegWzz9OHGzI1APFboT+x7ZecXlUCtDe/nkyx7gtCTZnWS/+eeXG7fbfXymCPKJI8EsnM3iqw==` |
| File used | `node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2`, sha256 `4e3fa217d38fdafc1fea4414ceb58ca5e662cf0ab5fa735a8c8c20e8b42cad92` |
| Loaded by | `next/font/local` from `app/layout.jsx` (self-hosted by the site, no request to a third-party host at runtime) |
| Licence | SIL Open Font License 1.1 (SPDX `OFL-1.1`) |
| Licence text | `node_modules/vazirmatn/OFL.txt`, sha256 `17e355067c8284f47743a1ee3b1ef7ff684ff0601eda357f9353b10b3016ab31` |
| Copyright line in that text | "Copyright 2015 The Vazirmatn Project Authors (https://github.com/rastikerdar/vazirmatn)" |
| Author file | `node_modules/vazirmatn/AUTHORS.txt` (Saber Rastikerdar) |

### What was verified and what was not (2026-10-02)

- **Verified:** the shipped `OFL.txt` begins with the Vazirmatn copyright line and states "SIL Open Font License, Version 1.1" (read from the installed package; the audit test reads it again on every run). The lockfile version equals the installed version and `LICENSES.md` names it.
- **Verified:** the `name` table of the uncompressed variable TTF in the same package (`fonts/variable/Vazirmatn[wght].ttf`) carries the copyright (ID 0), the licence statement (ID 13) and the licence URL (ID 14). That is the file the licence text describes as stand-alone and machine-readable metadata.
- **Not verified:** the same metadata inside the `.woff2` file the site actually serves (the woff2 container needs its own decoder; not done). Until it is checked, assume the metadata may not be present in the served binary.
- **Note on the package's own metadata:** `package.json` says `"license": "OFL"`, which is not a valid SPDX identifier. `OFL-1.1` above is **our reading** of the shipped licence text, not a field in the package.
- **Not done and not claimed:** the OFL clauses on bundling, selling and renaming (Reserved Font Name) were not analysed. The site uses the font unmodified and does not sell it. If the site is ever published, the OFL text should be reachable from it (for example a `/licenses` page); the sample is `noindex` and not published.

## Code dependencies

`next`, `react`, `react-dom` are pinned exactly in `package.json`; the lockfile (v3) holds an integrity hash for every package (`tests/audit.test.mjs` checks this). Their licences were **not** audited in this run: the sample is not distributed, and a licence inventory of the transitive tree is a launch task, not done here.

## Content

All text in `content/clinic.fa.json` is fictional text written for this sample by the Builder (an AI agent). The clinic, doctors, phone numbers and prices are invented; the emergency number «۱۱۵» in the FAQ is a general public fact, not clinic data. Content has not been reviewed by a native Persian editor (OQ-12).
