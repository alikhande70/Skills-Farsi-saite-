import { randomUUID } from 'node:crypto';
import content from '../../content/clinic.fa.json';
import { availableDays } from '../../lib/days.mjs';
import { nowMs } from '../../lib/config.mjs';
import AppointmentForm from './AppointmentForm';

export const metadata = { title: `${content.appointment.title} — ${content.brand.name}` };

export default function AppointmentPage() {
  const { appointment } = content;
  const services = content.home.services.items.map(({ id, title }) => ({ id, title }));
  return (
    <section className="section">
      <div className="wrap form-shell">
        <h1>{appointment.title}</h1>
        <p>{appointment.lead}</p>
        {/* One idempotency key per page load: a retry reuses it, so a request can never be stored twice. */}
        <AppointmentForm
          idempotencyKey={randomUUID()}
          days={availableDays(nowMs())}
          services={services}
          copy={{ labels: appointment.labels, windows: appointment.windows, errors: appointment.errors, states: appointment.states }}
        />
      </div>
    </section>
  );
}
