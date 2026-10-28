'use client';

import { useState, useTransition } from 'react';
import { respondToQuotation } from '@/app/actions/quotation-review';

export default function ReviewForm({ token }: { token: string }) {
  const [observation, setObservation] = useState('');
  const [agree, setAgree] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);

  function submit(decision: 'ACCEPTED' | 'REJECTED') {
    if (decision === 'ACCEPTED' && !agree) return setMessage('Confirma que revisaste las condiciones.');
    if (decision === 'REJECTED' && !observation.trim()) return setMessage('Indica el motivo del rechazo.');
    if (!window.confirm(decision === 'ACCEPTED' ? '¿Confirmas que aceptas la cotización?' : '¿Confirmas que rechazas la cotización?')) return;
    startTransition(async () => {
      const result = await respondToQuotation(token, decision, observation);
      setMessage(result.message);
      if (result.ok) setFinished(true);
    });
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-bold text-slate-900">Tu respuesta</h2>
      <label className="block text-sm font-semibold text-slate-700">
        Observaciones (obligatorias si rechazas)
        <textarea maxLength={2000} rows={4} value={observation} onChange={(e) => setObservation(e.target.value)} disabled={pending || finished}
          placeholder="Escribe aquí tus comentarios o el motivo del rechazo..." className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500" />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={pending || finished} className="mt-1" />
        He revisado los servicios, importes y condiciones comerciales.
      </label>
      {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">{message}</p>}
      {!finished && <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={pending} onClick={() => submit('REJECTED')} className="rounded-xl border border-rose-200 px-5 py-3 font-semibold text-rose-700 disabled:opacity-50">Rechazar cotización</button>
        <button type="button" disabled={pending || !agree} onClick={() => submit('ACCEPTED')} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? 'Procesando...' : 'Aceptar cotización'}</button>
      </div>}
    </div>
  );
}
