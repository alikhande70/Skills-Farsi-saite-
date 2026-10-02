import { normalizePersian, normalizeIranMobile } from './persian-utils.mjs';
import { LIMITS, SERVICE_IDS, WINDOW_IDS } from './config.mjs';
import { isAllowedDay } from './days.mjs';

// bidi controls and zero-width joiners other than ZWNJ can spoof identifiers and filenames (security.md §4, §12)
const BIDI_CONTROLS = /[‪-‮⁦-⁩​‍⁠﻿]/g;
const NAME_OK = /^[\p{L}\p{M}‌' .-]+$/u;
export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns { ok, values, errors }. errors[field] is a stable code: required | invalid | too_short | too_long. */
export function validateAppointment(input, nowMs) {
  const errors = {};
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const str = (v) => (typeof v === 'string' ? v : '');

  // name: keep what the user typed (display) and a normalized key (matching/uniqueness)
  const nameDisplay = str(src.name).normalize('NFC').replace(BIDI_CONTROLS, '').replace(/\s+/g, ' ').trim();
  if (!nameDisplay) errors.name = 'required';
  else if ([...nameDisplay].length > LIMITS.nameMax) errors.name = 'too_long';
  else if ([...nameDisplay.replace(/[^\p{L}]/gu, '')].length < LIMITS.nameMin || !NAME_OK.test(nameDisplay)) errors.name = 'invalid';

  const mob = normalizeIranMobile(str(src.mobile));
  if (!str(src.mobile).trim()) errors.mobile = 'required';
  else if (!mob.ok) errors.mobile = 'invalid';

  if (!SERVICE_IDS.includes(src.service)) errors.service = src.service ? 'invalid' : 'required';
  if (!WINDOW_IDS.includes(src.window)) errors.window = src.window ? 'invalid' : 'required';
  if (!src.day) errors.day = 'required';
  else if (typeof src.day !== 'string' || !isAllowedDay(src.day, nowMs)) errors.day = 'invalid';
  if (!(src.consent === true || src.consent === 'true' || src.consent === 'on')) errors.consent = 'required';

  const note = str(src.note).normalize('NFC').replace(BIDI_CONTROLS, '').replace(/\r\n?/g, '\n').trim();
  if ([...note].length > LIMITS.noteMax) errors.note = 'too_long';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    errors: {},
    values: { name: nameDisplay, nameKey: normalizePersian(nameDisplay).toLowerCase(), mobile: mob.national, service: src.service, day: src.day, window: src.window, note },
  };
}
