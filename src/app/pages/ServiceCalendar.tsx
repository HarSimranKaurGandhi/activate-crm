import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { serviceRequestService } from '../../services/serviceRequestService';
import { ServiceRequestDialog } from '../components/services/ServiceRequestDialog';
import { LoadingState } from '../components/common/AsyncState';
import { addDays, calendarDays, dateKey } from '../utils/serviceCalendar';

const statuses: Record<string, { label: string; style: string }> = {
  scheduled: { label: 'Scheduled', style: 'border-blue-200 bg-blue-50 text-blue-800' },
  in_progress: { label: 'In Progress', style: 'border-amber-200 bg-amber-50 text-amber-900' },
  completed: { label: 'Completed', style: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  cancelled: { label: 'Cancelled', style: 'border-slate-200 bg-slate-100 text-slate-600' },
};
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const todayDate = () => new Date(`${todayKey()}T12:00:00`);
export function ServiceCalendar() {
  const [mode, setMode] = useState<'month' | 'week'>('week');
  const [anchor, setAnchor] = useState(todayDate);
  const [scope, setScope] = useState('all');
  const [showClosed, setShowClosed] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragged, setDragged] = useState<any>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const suppressClick = useRef(false);
  const reschedule = async (service: any, date: string) => {
    if (savingRef.current || !service || service.scheduled_date?.slice(0, 10) === date) return;
    if (date < service.request_date?.slice(0, 10)) { toast.error('The scheduled date cannot be earlier than the request date.'); return; }
    savingRef.current = true; setSaving(true);
    try {
      const updated = await serviceRequestService.reschedule(String(service.id), date, service.scheduled_date?.slice(0, 10) || null);
      setRows(current => current.map(row => row.id === updated.id ? updated : row));
      toast.success(`${service.service_number} rescheduled to ${new Date(`${date}T12:00:00`).toLocaleDateString('en-IN')}`);
      setReload(value => value + 1);
    } catch (err: any) {
      toast.error(err.errors?.scheduled_date?.[0] || err.message || 'Unable to reschedule service.');
      setReload(value => value + 1);
    } finally { savingRef.current = false; setSaving(false); }
  };
  const days = useMemo(() => calendarDays(anchor, mode), [anchor, mode]);
  const from = dateKey(days[0]);
  const to = dateKey(days[days.length - 1]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const load = async () => {
      const entries: any[] = [];
      let page = 1, lastPage = 1;
      do {
        const result = await serviceRequestService.list({ scope, include_closed: showClosed ? 1 : 0, date_filter: 'range', date_from: from, date_to: to, per_page: 100, page });
        if (cancelled) return;
        entries.push(...(result.data || []));
        lastPage = result.meta?.pagination?.last_page || 1;
        page++;
      } while (page <= lastPage);
      setRows(entries);
    };
    load().catch(() => { if (!cancelled) setError('Unable to load the service calendar. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, scope, showClosed, reload]);
  const byDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const row of rows) { const key = row.scheduled_date?.slice(0, 10); if (key) (grouped[key] ||= []).push(row); }
    return grouped;
  }, [rows]);
  const move = (direction: number) => setAnchor(current => mode === 'week' ? addDays(current, direction * 7) : new Date(current.getFullYear(), current.getMonth() + direction, 1));
  const title = mode === 'month' ? anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${days[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return <div className="space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><div className="flex items-center gap-2"><CalendarDays className="h-6 w-6 text-blue-600" /><h1 className="text-2xl font-semibold text-slate-950">Service Calendar</h1></div><p className="mt-1 text-sm text-slate-500">Drag a service onto another day to reschedule it. Click a service to view or edit.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Service task scope" className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${scope === 'mine' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>My Service Tasks</button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${scope === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>All Tasks</button>
        </div>
        <Link to="/services" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm"><List className="h-4 w-4" />List View</Link><Link to="/services/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white"><Plus className="h-4 w-4" />Schedule Service</Link></div>
    </header>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4 sm:p-5">
        <div className="flex items-center gap-3"><div className="flex rounded-lg border"><button onClick={() => move(-1)} aria-label={`Previous ${mode}`} className="p-2 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => move(1)} aria-label={`Next ${mode}`} className="border-l p-2 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button></div><h2 className="text-lg font-semibold">{title}</h2><button onClick={() => setAnchor(todayDate())} className="rounded-lg border px-3 py-2 text-sm">Today</button></div>
        <div className="flex rounded-xl bg-slate-100 p-1">{(['week', 'month'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{value === 'week' ? 'Weekly' : 'Monthly'}</button>)}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50/60 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showClosed} onChange={event => setShowClosed(event.target.checked)} />Show Hidden Closed Services</label></div>
        <span role="status" className="text-xs text-slate-500">{saving ? 'Saving schedule…' : loading ? 'Loading…' : error ? '' : `${rows.length} services in view`} · Monday–Sunday</span>
      </div>
      {loading ? <div className="p-16"><LoadingState label="Loading service calendar..." /></div> : error ? <div role="alert" className="p-12 text-center"><p className="text-red-600">{error}</p><button onClick={() => setReload(value => value + 1)} className="mt-3 text-blue-600 underline">Retry</button></div> : <>
        {!rows.length && <p className="border-b bg-blue-50 px-5 py-3 text-sm text-blue-800">No services scheduled for this period with the selected filters.</p>}
        <div className="overflow-x-auto"><div className="min-w-[840px]">
          <div className="grid grid-cols-7 border-b bg-slate-50">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => <div key={day} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${mode === 'week' && dateKey(days[index]) === todayKey() ? 'bg-green-50 text-green-800' : 'text-slate-500'}`}>{day}</div>)}</div>
          <div className="grid grid-cols-7">{days.map(day => {
            const key = dateKey(day), isToday = key === todayKey(), entries = byDate[key] || [];
            return <section key={key}
              onDragOver={event => { if (dragged && !saving && key >= dragged.request_date?.slice(0, 10)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropDate(key); } }}
              onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropDate(current => current === key ? null : current); }}
              onDrop={event => { event.preventDefault(); const service = dragged; setDragged(null); setDropDate(null); void reschedule(service, key); }}
              aria-label={day.toLocaleDateString('en-IN', { dateStyle: 'full' })} className={`border-b border-r p-2 ${dropDate === key ? 'ring-2 ring-inset ring-blue-500 bg-blue-100' : ''} ${mode === 'week' ? 'min-h-[420px]' : 'min-h-[150px]'} ${isToday ? 'bg-green-50' : mode === 'month' && day.getMonth() !== anchor.getMonth() ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}>
              <div className="mb-2 flex items-center justify-between px-1"><span aria-current={isToday ? 'date' : undefined} className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-blue-600 text-white' : ''}`}>{day.getDate()}</span>{entries.length > 0 && <span className="text-xs text-slate-400">{entries.length}</span>}</div>
              <div className="space-y-2">{entries.map(service => {
                const status = statuses[service.status] || statuses.scheduled;
                const overdue = key < todayKey() && ['scheduled', 'in_progress'].includes(service.status);
                return <button key={service.id} draggable={!saving} disabled={saving}
                  onDragStart={event => { if (savingRef.current) { event.preventDefault(); return; } suppressClick.current = true; setDragged(service); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(service.id)); }}
                  onDragEnd={() => { setDragged(null); setDropDate(null); window.setTimeout(() => { suppressClick.current = false; }, 0); }}
                  onClick={() => { if (!suppressClick.current) setSelected(String(service.id)); }}
                  title="Drag to another day to reschedule, or click to edit"
 className={`block w-full cursor-grab rounded-lg border p-2 text-left transition active:cursor-grabbing disabled:cursor-wait disabled:opacity-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${status.style}`}>
                  <div className="text-[11px] font-semibold">{service.service_number}</div><div className="mt-1 break-words text-xs font-semibold">{service.customer?.name || 'Customer unavailable'}</div><div className="mt-1 break-words text-[11px] opacity-80">{service.customer?.city || 'City not specified'}</div><div className="mt-1 break-words text-[11px] opacity-80">{service.scheduled_user?.name || 'Unassigned'}</div><div className="mt-1 text-[10px]">{status.label}{overdue && <span className="ml-1 font-semibold text-red-700">· Overdue</span>}</div>
                </button>;
              })}</div>
            </section>;
          })}</div>
        </div></div>
      </>}
      <footer className="flex flex-wrap items-center gap-3 px-5 py-4">{Object.entries(statuses).map(([key, status]) => <span key={key} className={`rounded-full border px-2.5 py-1 text-xs ${status.style}`}>{status.label}</span>)}<span className="text-xs text-slate-500">Services without a scheduled date remain in List View.</span></footer>
    </section>
    <ServiceRequestDialog serviceId={selected} open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }} onUpdated={() => setReload(value => value + 1)} onDeleted={() => { setSelected(null); setReload(value => value + 1); }} />
  </div>;
}
