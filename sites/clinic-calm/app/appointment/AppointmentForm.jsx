'use client';

import { useEffect, useRef, useState } from 'react';

const FIELD_ORDER = ['name', 'mobile', 'service', 'day', 'window', 'note', 'consent'];
const EMPTY = { name: '', mobile: '', service: '', day: '', window: '', note: '', consent: false, website: '' };

// crypto.randomUUID exists only in secure contexts; plain-HTTP previews need the fallback
function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * States: idle | submitting | success | invalid | server_error | network_error | rate_limited | conflict
 * Input is never cleared on failure. A retry sends the SAME idempotency key, so the server stores the request once.
 */
export default function AppointmentForm({ idempotencyKey, days, services, copy }) {
  const { labels, windows, errors: errorCopy, states } = copy;
  const [phase, setPhase] = useState('idle');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ref, setRef] = useState(null);
  const [attempt, setAttempt] = useState(0); // bumps on every finished request so focus moves even if the phase repeats
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []); // lets tests (and nothing else) wait until the handlers are attached
  // Focus follows the result AFTER the new view is mounted (a timeout before the commit finds no element).
  useEffect(() => {
    if (phase === 'success') successRef.current?.focus();
    else if (phase !== 'idle' && phase !== 'submitting') alertRef.current?.focus();
  }, [phase, attempt]);
  const key = useRef(idempotencyKey);
  const inFlight = useRef(false);
  const alertRef = useRef(null);
  const successRef = useRef(null);

  const set = (name) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((prev) => ({ ...prev, [name]: v }));
  };

  async function send() {
    if (inFlight.current) return; // second click while a request is running: ignored (the server is idempotent as well)
    inFlight.current = true;
    setPhase('submitting');
    setErrors({});
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key.current },
        body: JSON.stringify(values),
        signal: AbortSignal.timeout(15000),
      });
      let body = null;
      try { body = await res.json(); } catch { /* not JSON: handled by status below */ }
      if (res.ok && body?.ok) { setRef(body.ref); setPhase('success'); setAttempt((n) => n + 1); return; }
      if (res.status === 422 && body?.errors) { setErrors(body.errors); setPhase('invalid'); setAttempt((n) => n + 1); return; }
      setPhase(res.status === 429 ? 'rate_limited' : res.status === 409 ? 'conflict' : 'server_error');
      setAttempt((n) => n + 1);
    } catch (e) {
      setPhase(e?.name === 'TimeoutError' ? 'server_error' : 'network_error');
      setAttempt((n) => n + 1);
    } finally {
      inFlight.current = false;
    }
  }

  function another() {
    key.current = uuid();
    setValues(EMPTY); setErrors({}); setRef(null); setPhase('idle');
  }

  if (phase === 'success') {
    return (
      <div className="success" role="status">
        <h2 ref={successRef} tabIndex={-1}>{states.successTitle}</h2>
        <p>{states.successBody}</p>
        <p className="hint">{states.refLabel}</p>
        <p><bdi dir="ltr" className="ref" data-testid="ref">{ref}</bdi></p>
        <button type="button" className="btn btn--quiet" onClick={another}>{labels.another}</button>
      </div>
    );
  }

  const failures = { server_error: states.serverError, network_error: states.networkError, rate_limited: states.rateLimited, conflict: states.conflict };
  const invalidFields = FIELD_ORDER.filter((f) => errors[f]);
  const busy = phase === 'submitting';
  const err = (f) => (errors[f] ? errorCopy[f]?.[errors[f]] ?? states.generic : null);
  const describe = (f, hint) => [hint, errors[f] ? `${f}-error` : null].filter(Boolean).join(' ') || undefined;
  const FieldError = ({ f }) => (errors[f] ? <p className="field__error" id={`${f}-error`}>{err(f)}</p> : null);

  return (
    <>
    {/* method="post": if anything ever submits this form natively (JS off, or a click before hydration) the values must never
          end up in the URL. The submit button stays disabled until the handlers exist. */}
    <form className="form" method="post" action="/appointment" noValidate data-hydrated={hydrated ? 'true' : 'false'}
      onSubmit={(e) => { e.preventDefault(); send(); }} aria-busy={busy}>
      <noscript><div className="alert"><p>{states.noScript}</p></div></noscript>
      {phase === 'invalid' && (
        <div className="alert" role="alert" tabIndex={-1} ref={alertRef}>
          <p className="alert__title">{states.validationSummary}</p>
          <ul>{invalidFields.map((f) => <li key={f}><a href={`#field-${f}`}>{err(f)}</a></li>)}</ul>
        </div>
      )}
      {failures[phase] && (
        <div className="alert" role="alert" tabIndex={-1} ref={alertRef} data-state={phase}>
          <p className="alert__title">{failures[phase]}</p>
          {(phase === 'server_error' || phase === 'network_error') && (
            <button type="button" className="btn" onClick={send} disabled={busy}>{labels.retry}</button>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="field-name">{labels.name}</label>
        <input id="field-name" type="text" name="name" autoComplete="name" value={values.name} onChange={set('name')}
          aria-invalid={errors.name ? 'true' : undefined} aria-describedby={describe('name')} />
        <FieldError f="name" />
      </div>

      <div className="field">
        <label htmlFor="field-mobile">{labels.mobile}</label>
        <input id="field-mobile" type="tel" inputMode="tel" name="mobile" autoComplete="tel" dir="ltr" value={values.mobile} onChange={set('mobile')}
          aria-invalid={errors.mobile ? 'true' : undefined} aria-describedby={describe('mobile', 'mobile-hint')} />
        <p className="hint" id="mobile-hint">{labels.mobileHint}</p>
        <FieldError f="mobile" />
      </div>

      <fieldset className="field" id="field-service" aria-describedby={describe('service')}>
        <legend>{labels.service}</legend>
        <div className="choices choices--two">
          {services.map((s) => (
            <label className="choice" key={s.id}>
              <input type="radio" name="service" value={s.id} checked={values.service === s.id} onChange={set('service')} />
              <span>{s.title}</span>
            </label>
          ))}
        </div>
        <FieldError f="service" />
      </fieldset>

      <div className="field">
        <label htmlFor="field-day">{labels.day}</label>
        <select id="field-day" name="day" value={values.day} onChange={set('day')}
          aria-invalid={errors.day ? 'true' : undefined} aria-describedby={describe('day')}>
          <option value="">{labels.dayPlaceholder}</option>
          {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <FieldError f="day" />
      </div>

      <fieldset className="field" id="field-window" aria-describedby={describe('window')}>
        <legend>{labels.window}</legend>
        <div className="choices choices--three">
          {Object.entries(windows).map(([id, label]) => (
            <label className="choice" key={id}>
              <input type="radio" name="window" value={id} checked={values.window === id} onChange={set('window')} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <FieldError f="window" />
      </fieldset>

      <div className="field">
        <label htmlFor="field-note">{labels.note}</label>
        <textarea id="field-note" name="note" rows={4} value={values.note} onChange={set('note')}
          aria-invalid={errors.note ? 'true' : undefined} aria-describedby={describe('note', 'note-hint')} />
        <p className="hint" id="note-hint">{labels.noteHint}</p>
        <FieldError f="note" />
      </div>

      <div className="field" id="field-consent">
        <label className="check" htmlFor="consent-input">
          <input id="consent-input" type="checkbox" name="consent" checked={values.consent} onChange={set('consent')}
            aria-invalid={errors.consent ? 'true' : undefined} aria-describedby={describe('consent')} />
          <span>{labels.consent}</span>
        </label>
        <FieldError f="consent" />
      </div>

      {/* honeypot: real people never see it (hidden), simple bots fill it and are rejected by the server */}
      <div hidden aria-hidden="true">
        <label htmlFor="field-website">website</label>
        <input id="field-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
      </div>

      <div className="form__actions">
        <button type="submit" className="btn" disabled={!hydrated} aria-disabled={busy ? 'true' : undefined}>{busy ? labels.submitting : labels.submit}</button>
        <span className="status" role="status">{busy ? labels.submitting : ''}</span>
      </div>
    </form>
    </>
  );
}
