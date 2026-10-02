'use client';
import content from '../content/clinic.fa.json';

export default function ErrorPage({ reset }) {
  const c = content.errorPage;
  return (
    <section className="section"><div className="wrap">
      <h1>{c.title}</h1>
      <p>{c.body}</p>
      <button type="button" className="btn" onClick={() => reset()}>{c.retry}</button>
    </div></section>
  );
}
