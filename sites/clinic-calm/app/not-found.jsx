import Link from 'next/link';
import content from '../content/clinic.fa.json';

export default function NotFound() {
  const c = content.notFound;
  return (
    <section className="section"><div className="wrap">
      <h1>{c.title}</h1>
      <p>{c.body}</p>
      <Link className="btn" href="/">{c.home}</Link>
    </div></section>
  );
}
