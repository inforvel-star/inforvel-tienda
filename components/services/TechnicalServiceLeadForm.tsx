'use client';

import { FormEvent, useMemo, useState } from 'react';

const LOCALITY_OPTIONS = ['Córdoba Capital', 'Provincia', 'Fuera de Córdoba'] as const;

type Locality = (typeof LOCALITY_OPTIONS)[number];

function buildWhatsAppMessage(payload: {
  name: string;
  phone: string;
  locality: Locality;
  issue: string;
}) {
  const message = [
    'Hola Inforvel, quiero solicitar presupuesto gratuito.',
    `Nombre: ${payload.name}`,
    `Teléfono: ${payload.phone}`,
    `Localidad: ${payload.locality}`,
    `Dispositivo y avería: ${payload.issue}`,
  ].join('\n');

  return `https://wa.me/34652369650?text=${encodeURIComponent(message)}`;
}

export function TechnicalServiceLeadForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState<Locality>('Córdoba Capital');
  const [issue, setIssue] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(false);

  const canSubmit = useMemo(
    () => name.trim().length > 2 && phone.trim().length > 8 && issue.trim().length > 6,
    [name, phone, issue]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResultMessage(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      locality,
      issue: `${issue.trim()}${urgent ? ' | Presupuesto urgente: Sí' : ' | Presupuesto urgente: No'}`,
    };

    fetch('/api/service-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
          const fallbackUrl = buildWhatsAppMessage(payload);
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
          setResultOk(false);
          setResultMessage(
            data?.message ||
              'No se pudo enviar por email. Hemos abierto WhatsApp para que nos contactes ahora.'
          );
          return;
        }

        setResultOk(true);
        setResultMessage('Solicitud enviada por email correctamente. Te responderemos en breve.');
        setName('');
        setPhone('');
        setLocality('Córdoba Capital');
        setIssue('');
      })
      .catch(() => {
        const fallbackUrl = buildWhatsAppMessage(payload);
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        setResultOk(false);
        setResultMessage('No se pudo enviar por email. Hemos abierto WhatsApp para continuar.');
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
      aria-label="Formulario de solicitud de presupuesto de reparación"
    >
      <h2 className="text-2xl font-bold text-white md:text-3xl">Solicita tu presupuesto gratuito</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Respuesta rápida por WhatsApp para cerrar diagnóstico y tiempos de reparación.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">Nombre y Apellidos</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="Ej. Manuel García"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">Teléfono de contacto</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="652 36 96 50"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">¿Vives en Córdoba o alrededores?</span>
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value as Locality)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none"
          >
            {LOCALITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-1">
          <span className="mb-2 block text-sm font-medium text-zinc-200">Dispositivo y Avería</span>
          <textarea
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            required
            rows={4}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="Ej. Portátil Lenovo no enciende y hace ruido de ventilador"
          />
        </label>
      </div>

      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(e) => setUrgent(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
        />
        Deseo presupuesto urgente
      </label>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Enviando...' : 'Solicitar Presupuesto Gratuito'}
      </button>
      {resultMessage && (
        <p className={`mt-4 text-sm ${resultOk ? 'text-green-400' : 'text-yellow-400'}`}>{resultMessage}</p>
      )}
    </form>
  );
}
