import Link from 'next/link';
import content from '../content/clinic.fa.json';

export default function HomePage() {
  const { hero, services, process, faq, closing } = content.home;
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <svg className="hero__art" viewBox="0 0 400 600" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1.200">
            <circle cx="300" cy="200" r="150" />
            <circle cx="300" cy="200" r="110" />
            <circle cx="300" cy="200" r="70" />
            <path d="M300 50c60 50 100 110 100 160s-45 120-100 160c-55-40-100-110-100-160s40-110 100-160Z" />
            <path d="M300 50v320" />
          </g>
        </svg>
        <div className="wrap hero__inner">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-title">{hero.title}</h1>
          <p className="hero__lead">{hero.lead}</p>
          <div className="hero__actions">
            <Link className="btn" href={content.cta.href}>{content.cta.label}</Link>
            <Link className="btn btn--quiet" href={hero.secondary.href}>{hero.secondary.label}</Link>
          </div>
        </div>
      </section>

      <section id="services" className="section" aria-labelledby="services-title">
        <div className="wrap">
          <h2 id="services-title">{services.title}</h2>
          <p>{services.intro}</p>
          <ul className="grid grid--services" role="list">
            {services.items.map((s) => (
              <li key={s.id} className="card"><h3>{s.title}</h3><p>{s.body}</p></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="process" className="section band" aria-labelledby="process-title">
        <div className="wrap">
          <h2 id="process-title">{process.title}</h2>
          <ol className="grid grid--steps" role="list">
            {process.steps.map((s) => (
              <li key={s.title} className="card step"><h3>{s.title}</h3><p>{s.body}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="section" aria-labelledby="faq-title">
        <div className="wrap">
          <h2 id="faq-title">{faq.title}</h2>
          {faq.items.map((f) => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
      </section>

      <section className="section band closing" aria-labelledby="closing-title">
        <div className="wrap">
          <h2 id="closing-title">{closing.title}</h2>
          <p>{closing.body}</p>
          <Link className="btn" href={content.cta.href}>{content.cta.label}</Link>
        </div>
      </section>
    </>
  );
}
