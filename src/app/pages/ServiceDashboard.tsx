import { Copy, Plus, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { serviceRequestService } from '../../services/serviceRequestService';
import { LoadingState } from '../components/common/AsyncState';
import { ServiceRequestDialog } from '../components/services/ServiceRequestDialog';
import { ServicePhoneAction } from '../components/services/ServicePhoneAction';
import { AmcSection } from '../components/services/AmcSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const closedStatuses = ['completed', 'cancelled'];
type ScheduledDateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
const statusLabel = (status: string) => status === 'completed' ? 'Closed-Completed' : status === 'cancelled' ? 'Closed-Cancelled' : status === 'in_progress' ? 'In Progress' : 'Scheduled';
const paymentStatusLabel = (status: string) => status === 'received' ? 'Received' : status === 'warranty' ? 'Warranty' : status === 'amc' ? 'AMC' : 'Pending';
const isPastDate = (date?: string) => Boolean(date && date.slice(0, 10) < new Date().toLocaleDateString('en-CA'));
const isHiddenClosedService = (service: any) => service.status === 'cancelled' || (service.status === 'completed' && service.payment_status !== 'pending');
const machineDescription = (service: any) => (service.items || []).map((item: any) => item.machine_name).filter(Boolean).join(', ') || service.additional_comments || 'Not provided';
const firstThreeWords = (value: string) => value.trim().split(/\s+/).slice(0, 3).join(' ');

export const ServiceDashboard = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [serviceScope, setServiceScope] = useState<'mine' | 'all'>('mine');
  const [scheduledDateFilter, setScheduledDateFilter] = useState<ScheduledDateFilter>('all');
  const [customScheduledDate, setCustomScheduledDate] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [fullMachineDescription, setFullMachineDescription] = useState<string | null>(null);

  useEffect(() => {
    if (scheduledDateFilter === 'custom' && !customScheduledDate) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    serviceRequestService.list({
      scope: serviceScope,
      include_closed: showClosed ? 1 : 0,
      date_filter: scheduledDateFilter,
      ...(scheduledDateFilter === 'custom' ? { custom_date: customScheduledDate } : {}),
      per_page: 100,
    })
      .then((result) => setServices(result.data || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [customScheduledDate, scheduledDateFilter, showClosed, serviceScope]);

  const formatDate = (date?: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled';
  const statusClass = (status: string) => status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-red-50 text-red-700' : status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
  const paymentStatusClass = (status: string) => status === 'received' ? 'bg-emerald-50 text-emerald-700' : status === 'warranty' ? 'bg-sky-50 text-sky-700' : status === 'amc' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700';
  const copyService = async (service: any) => {
    const value = [
      `Service No.: ${service.service_number || '-'}`,
      `Customer Name: ${service.customer?.name || '-'}`,
      `Assigned User: ${service.scheduled_user?.name || 'Unassigned'}`,
      `Assigned User Phone No.: ${service.scheduled_user?.phone || '-'}`,
      `Estimated Attended Date: ${service.scheduled_date ? formatDate(service.scheduled_date) : 'Not scheduled'}`,
    ].join('\n');
    try { await navigator.clipboard.writeText(value); toast.success('Service details copied'); }
    catch { toast.error('Unable to copy service details'); }
  };

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-2xl font-semibold text-slate-950">Service Module</h2><p className="mt-1 text-sm text-slate-500">Schedule services and manage customer maintenance.</p></div><div className="flex flex-wrap items-center gap-3"><div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={()=>setServiceScope('mine')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${serviceScope==='mine'?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>My Service Tasks</button><button type="button" onClick={()=>setServiceScope('all')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${serviceScope==='all'?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>All Tasks</button></div>
      <button type="button" onClick={() => navigate('/services/spare-part-requests')} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">OEM Requests</button>
      <button type="button" onClick={() => navigate('/services/calendar')} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">Calendar View</button>
      <button type="button" onClick={() => navigate('/services/payments')} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">Payments</button>
    </div></div>
    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Wrench className="h-5 w-5" /></span><div><h3 className="font-semibold">Service Requests</h3><p className="text-sm text-slate-500">Scheduled and ongoing customer service requests</p></div></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-slate-600">Scheduled Date</span>
            <select value={scheduledDateFilter} onChange={event=>setScheduledDateFilter(event.target.value as ScheduledDateFilter)} aria-label="Filter service requests by scheduled date" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date</option>
            </select>
            {scheduledDateFilter==='custom'&&<input type="date" value={customScheduledDate} onChange={event=>setCustomScheduledDate(event.target.value)} aria-label="Custom scheduled date" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"/>}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={showClosed} onChange={event => setShowClosed(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />Show Hidden Closed Services</label>
          <button onClick={() => navigate('/services/new')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4" />Schedule New Service</button>
        </div>
      </div>
      {loading ? <div className="p-8"><LoadingState label="Loading service requests..." /></div> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Service No.</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Machine Description</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payment Status</th><th className="px-5 py-3">Schedule Date</th><th className="px-5 py-3">Assigned User</th><th className="px-5 py-3 text-right">Charges</th></tr></thead>
        <tbody className="divide-y">{services.map(service => { const needsScheduling = (!service.scheduled_date || isPastDate(service.scheduled_date)) && !closedStatuses.includes(service.status); const description=machineDescription(service); const hasMore=description.trim().split(/\s+/).length>3; return <tr key={service.id} onClick={() => setSelectedServiceId(String(service.id))} className={`cursor-pointer ${needsScheduling ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'hover:bg-slate-50'}`}><td className={`px-5 py-4 font-medium ${needsScheduling ? 'text-red-700' : 'text-blue-700'}`}><div className="flex items-center gap-2"><button type="button" title="Copy service details" aria-label={`Copy details for ${service.service_number}`} onClick={event=>{event.stopPropagation();void copyService(service);}} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><Copy className="h-4 w-4"/></button><span>{service.service_number}</span></div></td><td className="px-5 py-4"><div className="font-medium">{service.customer?.name}</div><div className="mt-1 text-xs text-slate-500">{service.customer?.city || 'City not specified'}</div><ServicePhoneAction serviceId={String(service.id)} phone={service.customer?.phone}/></td><td className="px-5 py-4 text-sm"><span>{firstThreeWords(description)}{hasMore?'…':''}</span>{hasMore&&<button type="button" onClick={event=>{event.stopPropagation();setFullMachineDescription(description);}} className="ml-2 whitespace-nowrap text-xs font-medium text-blue-700 hover:underline">Show more</button>}</td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(service.status)}`}>{statusLabel(service.status)}</span><p className="mt-2 max-w-56 whitespace-pre-wrap break-words text-xs text-slate-500" title={service.last_comment || undefined}>{service.last_comment || '—'}</p></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusClass(service.payment_status)}`}>{paymentStatusLabel(service.payment_status)}</span></td><td className={`px-5 py-4 text-sm ${needsScheduling ? 'font-semibold text-red-700' : ''}`}>{formatDate(service.scheduled_date)}</td><td className="px-5 py-4 text-sm">{service.scheduled_user?.name || 'Unassigned'}</td><td className="px-5 py-4 text-right font-medium">₹{Number(service.total_charges || 0).toLocaleString('en-IN')}</td></tr>; })}{!services.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">{scheduledDateFilter==='custom'&&!customScheduledDate?'Select a custom scheduled date to view services.':'No service requests found.'}</td></tr>}</tbody>
      </table></div>}
    </section>
    <AmcSection />
    <ServiceRequestDialog serviceId={selectedServiceId} open={Boolean(selectedServiceId)} onOpenChange={open => { if (!open) setSelectedServiceId(null); }} onUpdated={updated => setServices(current => showClosed || !isHiddenClosedService(updated) ? current.map(row => String(row.id) === String(updated.id) ? updated : row) : current.filter(row => String(row.id) !== String(updated.id)))} onDeleted={deletedId => { setServices(current => current.filter(row => String(row.id) !== String(deletedId))); setSelectedServiceId(null); }} />
    <Dialog open={Boolean(fullMachineDescription)} onOpenChange={open=>{if(!open)setFullMachineDescription(null);}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Machine Description</DialogTitle></DialogHeader><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{fullMachineDescription}</p></DialogContent></Dialog>
  </div>;
};
