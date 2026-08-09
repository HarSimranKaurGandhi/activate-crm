import { Plus, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { serviceRequestService } from '../../services/serviceRequestService';
import { LoadingState } from '../components/common/AsyncState';
import { ServiceRequestDialog } from '../components/services/ServiceRequestDialog';
import { AmcSection } from '../components/services/AmcSection';

const closedStatuses = ['completed', 'cancelled'];
const statusLabel = (status: string) => status === 'completed' ? 'Closed-Completed' : status === 'cancelled' ? 'Closed-Cancelled' : status === 'in_progress' ? 'In Progress' : 'Scheduled';
const isPastDate = (date?: string) => Boolean(date && date.slice(0, 10) < new Date().toLocaleDateString('en-CA'));

export const ServiceDashboard = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [serviceScope, setServiceScope] = useState<'mine' | 'all'>('mine');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    serviceRequestService.list({ scope: serviceScope, include_closed: showClosed ? 1 : 0, per_page: 100 })
      .then((result) => setServices(result.data || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [showClosed, serviceScope]);

  const formatDate = (date?: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled';
  const statusClass = (status: string) => status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-red-50 text-red-700' : status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';

  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold text-slate-950">Service Module</h2><p className="mt-1 text-sm text-slate-500">Schedule services and manage customer maintenance.</p></div><div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={()=>setServiceScope('mine')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${serviceScope==='mine'?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>My Service Tasks</button><button type="button" onClick={()=>setServiceScope('all')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${serviceScope==='all'?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>All Tasks</button></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Wrench className="h-5 w-5" /></span><div><h3 className="font-semibold">Service Requests</h3><p className="text-sm text-slate-500">Scheduled and ongoing customer service requests</p></div></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={showClosed} onChange={event => setShowClosed(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />Show Completed/Cancelled Services</label>
          <button onClick={() => navigate('/services/new')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4" />Schedule New Service</button>
        </div>
      </div>
      {loading ? <div className="p-8"><LoadingState label="Loading service requests..." /></div> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Service No.</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Request Date</th><th className="px-5 py-3">Schedule Date</th><th className="px-5 py-3">Assigned User</th><th className="px-5 py-3">Machines</th><th className="px-5 py-3 text-right">Charges</th></tr></thead>
        <tbody className="divide-y">{services.map(service => { const overdue = isPastDate(service.scheduled_date) && !closedStatuses.includes(service.status); return <tr key={service.id} onClick={() => setSelectedServiceId(String(service.id))} className={`cursor-pointer ${overdue ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'hover:bg-slate-50'}`}><td className={`px-5 py-4 font-medium ${overdue ? 'text-red-700' : 'text-blue-700'}`}>{service.service_number}</td><td className="px-5 py-4"><div className="font-medium">{service.customer?.name}</div><div className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-500'}`}>{service.customer?.phone}</div></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(service.status)}`}>{statusLabel(service.status)}</span></td><td className="px-5 py-4 text-sm">{formatDate(service.request_date)}</td><td className={`px-5 py-4 text-sm ${overdue ? 'font-semibold text-red-700' : ''}`}>{formatDate(service.scheduled_date)}</td><td className="px-5 py-4 text-sm">{service.scheduled_user?.name || 'Unassigned'}</td><td className="px-5 py-4 text-sm">{service.items?.length || 0}</td><td className="px-5 py-4 text-right font-medium">₹{Number(service.total_charges || 0).toLocaleString('en-IN')}</td></tr>; })}{!services.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">No service requests found.</td></tr>}</tbody>
      </table></div>}
    </section>
    <AmcSection />
    <ServiceRequestDialog serviceId={selectedServiceId} open={Boolean(selectedServiceId)} onOpenChange={open => { if (!open) setSelectedServiceId(null); }} onUpdated={updated => setServices(current => showClosed || !closedStatuses.includes(updated.status) ? current.map(row => String(row.id) === String(updated.id) ? updated : row) : current.filter(row => String(row.id) !== String(updated.id)))} />
  </div>;
};
