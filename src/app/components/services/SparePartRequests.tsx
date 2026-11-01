import { renderOemRequest } from '../../utils/oemRequestTemplate';
import { OemRequestTimeline } from './OemRequestTimeline';
import { CustomerDetailsLink } from '../customers/CustomerDetailsLink';
import { OemServicePicker } from './OemServicePicker';
import { OemCustomerDetails } from './OemCustomerDetails';
import { SparePartImageUpload } from './SparePartImageUpload';
import { oemService, Oem } from '../../../services/oemService';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { sparePartRequestService } from '../../../services/sparePartRequestService';
import { customerService } from '../../../services/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const customerLabel = (row: any) => row?.name || row?.company_name || row?.primary_name || 'No customer';
const emptyForm = { serial_number: '', invoice_number: '', customer_owned_product_id: '', purchase_date: '', estimated_completion_date: '', request_date: '', status: 'pending', request_category: 'spare_part', claim_amount: '', oem_id: '', spare_part_name: '', machine_name: '', quantity: '1', reason: '', request_type: 'in_warranty' };

export function SparePartRequests({ linkedService }: { linkedService?: any }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
  const [removeInvoiceImage, setRemoveInvoiceImage] = useState(false);
  const [oems, setOems] = useState<Oem[]>([]);
  const [oemError, setOemError] = useState('');
  const loadOems = () => { setOemError(''); oemService.list().then(setOems).catch(() => setOemError('Unable to load OEMs.')); };
  useEffect(loadOems, []);
  const [oemFilter, setOemFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState<'view' | 'edit'>('view');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef(0);
  const [showClosed, setShowClosed] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [service, setService] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [pickerError, setPickerError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const resetMedia = () => { setInvoiceImage(null); setRemoveInvoiceImage(false); setImages([]); setRemovedImages([]); setVideo(null); setRemoveVideo(false); };
  const retainedImages = (selected?.images || []).filter((image: any) => !removedImages.includes(image.path));
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      sparePartRequestService.list({ page, per_page: 20, search, include_closed: showClosed ? 1 : 0, ...(oemFilter === 'unassigned' ? { unassigned: 1 } : oemFilter ? { oem_id: Number(oemFilter) } : {}), ...(linkedService ? { service_request_id: linkedService.id } : {}) })
        .then(result => { if (!cancelled) { setRows(result.data); setLastPage(result.meta?.pagination?.last_page || 1); } })
        .catch(() => { if (!cancelled) setError('Unable to load OEM requests.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [page, search, linkedService?.id, reload, showClosed, oemFilter]);

  useEffect(() => {
    if (!open || linkedService) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPickerError('');
      customerService.list({ search: customerSearch, per_page: 100 }).then(result => { if (!cancelled) setCustomers(result.data); })
        .catch(() => { if (!cancelled) setPickerError('Unable to load customers. Change the search to retry.'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, customerSearch, linkedService?.id]);

  const [ownedProducts, setOwnedProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productsRetry, setProductsRetry] = useState(0);
  const machineCustomerId = service ? (service.customer?.id || service.customer_id) : customer?.id;
  useEffect(() => {
    let active = true;
    setOwnedProducts([]); setProductsError('');
    if (!open || !machineCustomerId) { setProductsLoading(false); return; }
    setProductsLoading(true);
    customerService.overview(String(machineCustomerId)).then(data => { if (active) setOwnedProducts(data.owned_products || []); })
      .catch(() => { if (active) setProductsError('Unable to load customer products.'); })
      .finally(() => { if (active) setProductsLoading(false); });
    return () => { active = false; };
  }, [open, machineCustomerId, productsRetry]);
  const clearMachine = () => setForm(current => ({ ...current, customer_owned_product_id: '', machine_name: '', purchase_date: '' }));

  const start = () => {
    detailRequest.current++; setSelected(null); setTab('edit'); setDetailLoading(false); setDetailError('');
    setForm(emptyForm); setService(linkedService || null); setCustomer(null);
    resetMedia(); setErrors({}); setServicePickerOpen(false); setCustomerSearch(''); setOpen(true);
  };
  const populate = (row: any) => {
    setForm({ serial_number: row.serial_number || '', invoice_number: row.invoice_number || '', customer_owned_product_id: row.customer_owned_product_id ? String(row.customer_owned_product_id) : '', purchase_date: row.purchase_date || '', estimated_completion_date: row.estimated_completion_date || '', request_date: row.request_date || '', status: row.status || 'pending', request_category: row.request_category || 'spare_part', claim_amount: row.claim_amount == null ? '' : String(row.claim_amount), oem_id: row.oem_id ? String(row.oem_id) : '', spare_part_name: row.spare_part_name || '', machine_name: row.machine_name || '', quantity: String(row.quantity), reason: row.reason || '', request_type: row.request_type || 'in_warranty' });
    setService(row.service_request || null); setCustomer(row.customer || null);
  };
  const viewRequest = async (row: any) => {
    const requestId = ++detailRequest.current;
    setSelected(row); setTab('view'); setOpen(true); setDetailLoading(true); setDetailError('');
    resetMedia(); setErrors({}); setServicePickerOpen(false); setCustomerSearch('');
    try {
      const detail = await sparePartRequestService.get(row.id);
      if (requestId !== detailRequest.current) return;
      setSelected(detail); populate(detail);
    } catch { if (requestId === detailRequest.current) setDetailError('Unable to load request details.'); }
    finally { if (requestId === detailRequest.current) setDetailLoading(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || deleting) return;
    setSaving(true); setErrors({});
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => { if (key !== 'request_date' || selected) payload.append(key, value); });
    payload.append('service_request_id', service ? String(service.id) : '');
    payload.append('customer_id', !service && customer ? String(customer.id) : '');
    images.forEach(image => payload.append('images[]', image));
    removedImages.forEach(path => payload.append('remove_images[]', path));
    if (invoiceImage) payload.append('invoice_image', invoiceImage);
    if (removeInvoiceImage) payload.append('remove_invoice_image', '1');
    if (video) payload.append('video', video);
    if (removeVideo) payload.append('remove_video', '1');
    try {
      if (selected) {
        const updated = await sparePartRequestService.update(selected.id, payload);
        setSelected(updated); populate(updated); resetMedia(); setTab('view');
      } else {
        await sparePartRequestService.create(payload);
        setOpen(false);
      }
      toast.success(selected ? 'OEM request updated' : 'OEM request created');
      setPage(1); setReload(value => value + 1);
    } catch (error: any) {
      setErrors(error.errors || {});
      toast.error(error.message || 'Unable to save OEM request');
    } finally { setSaving(false); }
  };
  const field = 'w-full rounded-lg border border-gray-200 px-3 py-2';
  const deleteRequest = async () => {
    if (!selected || saving || deleting) return;
    if (!confirm(`Delete OEM request ${selected.request_number}? This permanently removes the request and its image.`)) return;
    setDeleting(true);
    try {
      await sparePartRequestService.remove(selected.id);
      detailRequest.current++;
      setOpen(false); setSelected(null); resetMedia();
      setPage(1); setReload(value => value + 1);
      toast.success('OEM request deleted');
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete OEM request');
    } finally { setDeleting(false); }
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <input aria-label="Search OEM requests" placeholder="Search request, machine, customer or service number" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-xl border px-4 py-2" />
      <select aria-label="Filter by OEM" value={oemFilter} disabled={!!oemError} onChange={event => { setOemFilter(event.target.value); setPage(1); }} className="rounded-xl border bg-white px-4 py-2">
        <option value="">All OEMs</option><option value="unassigned">Unassigned</option>
        {oems.map(oem => <option key={oem.id} value={oem.id}>{oem.name}</option>)}
      </select>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={showClosed} onChange={event=>{setShowClosed(event.target.checked);setPage(1);}} className="h-4 w-4" />Show Closed Requests</label>
      <button type="button" onClick={start} className="rounded-xl bg-blue-600 px-4 py-2 text-white">New OEM Request</button>
    </div>
    {oemError && <p role="alert">{oemError} <button onClick={loadOems} className="text-blue-600">Retry</button></p>}
    {loading ? <p>Loading OEM requests...</p> : error ? <p role="alert">{error} <button onClick={() => setReload(v => v + 1)} className="text-blue-600">Retry</button></p> : <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['Request', 'Days Overdue', 'Customer', 'Part Name / Machine', 'Request Type / Coverage', 'Claim Amount', 'OEM', 'Status', 'Estimated Completion Date / Comment'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} onClick={() => void viewRequest(row)} className="cursor-pointer border-t hover:bg-blue-50">
          <td className="p-3 whitespace-nowrap"><button type="button" className="font-medium text-blue-600 hover:underline" onClick={event => { event.stopPropagation(); void viewRequest(row); }}>{row.request_number}</button><div className="mt-1 text-xs text-gray-500">{row.request_date ? row.request_date.split('-').reverse().join('/') : '—'}</div></td>
          <td className="p-3">{row.days_overdue ?? 0}</td>
          <td className="p-3">{row.customer_name || customerLabel(row.customer)}</td>
          <td className="p-3"><div className="font-medium">{row.spare_part_name}</div><div className="mt-1 text-xs text-gray-500">{row.machine_name} x {row.quantity}</div></td>
          <td className="p-3"><div>{row.request_category === 'claim' ? 'Claim' : 'Spare Part'}</div><div className="mt-1 text-xs text-gray-500">{row.request_type === 'in_warranty' ? 'In Warranty' : 'Chargeable'}</div></td>
          <td className="p-3 whitespace-nowrap">{row.request_category === 'claim' && row.claim_amount != null ? `₹${Number(row.claim_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
          <td className="p-3"><div>{row.oem?.name || 'Unassigned'}</div>{row.oem && <div className="mt-1 text-xs text-gray-500">{row.oem.email}</div>}</td>
          <td className="p-3"><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.status === 'closed' ? 'Closed' : 'Pending'}</span></div></td>
          <td className="max-w-64 p-3"><div className="mb-1 whitespace-nowrap font-medium">{row.estimated_completion_date ? row.estimated_completion_date.slice(0, 10).split('-').reverse().join('/') : '—'}</div><p className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-gray-600" title={row.last_comment || undefined}>{row.last_comment || '—'}</p></td>
        </tr>)}{!rows.length && <tr><td colSpan={9} className="p-8 text-center text-gray-500">No OEM requests found.</td></tr>}</tbody>
      </table>
    </div>}
    <div className="flex justify-end gap-4 text-sm"><button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {lastPage}</span><button disabled={page >= lastPage || loading} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Next</button></div>
    <Dialog open={open} onOpenChange={value => { if (!saving && !deleting) { setOpen(value); if (!value) detailRequest.current++; } }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{selected ? `OEM Request ${selected.request_number}` : 'New OEM Request'}</DialogTitle></DialogHeader>
      {selected && <div role="tablist" aria-label="OEM request tabs" className="flex gap-2 border-b">
        {(['view', 'edit'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} disabled={saving || deleting || detailLoading || !!detailError} onClick={() => setTab(value)} className={`px-4 py-2 font-medium ${tab === value ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>{value === 'view' ? 'View' : 'Edit'}</button>)}
      </div>}
      {detailLoading ? <p>Loading request details…</p> : detailError ? <p role="alert">{detailError} <button onClick={() => void viewRequest(selected)} className="text-blue-600">Retry</button></p> : selected && tab === 'view' ? <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {[
            ['Request Number', selected.request_number], ['Status', selected.status === 'closed' ? 'Closed' : 'Pending'],
            ['Service Request', selected.service_request?.service_number || '—'], ['Customer', selected.customer_name || customerLabel(selected.customer)],
            ['Part Name', selected.spare_part_name], ['Machine Model', selected.machine_name], ['Serial Number', selected.serial_number || 'NA'], ['Invoice Number', selected.invoice_number || 'NA'], ['Quantity', selected.quantity],
            ['Request Type', selected.request_category === 'claim' ? 'Claim' : 'Spare Part'],
            ['Claim Amount', selected.request_category === 'claim' ? `₹${Number(selected.claim_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'],
            ['Coverage', selected.request_type === 'in_warranty' ? 'In Warranty' : 'Chargeable'],
            ['OEM', selected.oem?.name || 'Unassigned'], ['OEM Email', selected.oem?.email || '—'],
            ['Request Date', selected.request_date ? selected.request_date.split('-').reverse().join('/') : '—'],
            ['Days Overdue', selected.days_overdue ?? 0],
            ['Estimated Completion Date', selected.estimated_completion_date || '—'],
            ['Date of Purchase', selected.purchase_date || '—'],
          ].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}{label === 'Customer' && <CustomerDetailsLink customerId={selected.customer_id} />}</dd></div>)}
        </dl>
        <div><p className="text-sm text-gray-500">Description of Issue</p><p className="mt-1 whitespace-pre-wrap break-words">{selected.reason}</p></div>
        <button type="button" onClick={() => setPreview(renderOemRequest(selected))} className="rounded-xl bg-blue-600 px-4 py-2 text-white">OEM request format</button>
        {selected.invoice_image_url && <a href={selected.invoice_image_url} target="_blank" rel="noreferrer" className="block text-sm text-blue-600">View invoice image</a>}
        <OemCustomerDetails customer={selected.service_request?.customer || selected.customer} />
        <div className="flex flex-wrap gap-3">{(selected.images || []).map((image: any) => <a key={image.path} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={selected.spare_part_name} className="h-[50px] w-[50px] rounded object-contain" /></a>)}</div>
        {selected.video_url && <video src={selected.video_url} controls preload="metadata" className="max-h-48 max-w-full rounded-lg" />}
        <OemRequestTimeline key={selected.id} requestId={selected.id} onCommentAdded={() => setReload(value => value + 1)} />

      </div> : <form onSubmit={save} className="space-y-4">
        {selected && <label className="block text-sm font-medium">Request Date *<input required type="date" value={form.request_date} onChange={event => setForm({ ...form, request_date: event.target.value })} className={field + ' mt-1'} /></label>}
        {linkedService ? <p>Service Request: <strong>{linkedService.service_number}</strong></p> : <div>
          <label className="block text-sm font-medium">Service Request No. (Optional)</label>
          <div className="mt-2 flex items-center gap-3"><button type="button" onClick={()=>setServicePickerOpen(true)} className={field + ' text-left'}>{service ? service.service_number + ' — Change service request' : 'Select service request'}</button>{service && <button type="button" onClick={()=>{setService(null);clearMachine();}} className="text-sm text-red-600">Clear</button>}</div>
        </div>}
        {!service && <div>
          <label className="block text-sm font-medium">Customer (Optional)</label>
          <input aria-label="Search customers" placeholder="Search customers" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className={field + ' my-2'} />
          <select aria-label="Customer" value={customer?.id || ''} onChange={e => { setCustomer(customers.find(c => String(c.id) === e.target.value) || null); clearMachine(); }} className={field}>
            <option value="">No customer</option>
            {customer && !customers.some(c => String(c.id) === String(customer.id)) && <option value={customer.id}>{customerLabel(customer)}</option>}
            {customers.map(c => <option key={c.id} value={c.id}>{customerLabel(c)}</option>)}
          </select>
        </div>}
        <OemCustomerDetails customer={service?.customer || customer} />
        <label className="block text-sm font-medium">Assign OEM (Optional)<select disabled={!!oemError} value={form.oem_id} onChange={e=>setForm({...form, oem_id:e.target.value})} className={field + ' mt-1'}><option value="">Unassigned</option>{oems.map(oem=><option key={oem.id} value={oem.id}>{oem.name} — {oem.email}</option>)}</select><span className="text-xs text-gray-500">OEMs can be added in Masters → OEMs.</span></label>
        {oemError && <p role="alert">{oemError} <button type="button" onClick={loadOems}>Retry</button></p>}
        {pickerError && <p role="alert" className="text-sm text-red-600">{pickerError}</p>}
        <label className="block text-sm font-medium">Request Type *<select value={form.request_category} onChange={e=>setForm({...form, request_category:e.target.value, claim_amount:''})} className={field + ' mt-1'}><option value="spare_part">Spare Part</option><option value="claim">Claim</option></select></label>
        {form.request_category === 'claim' && <label className="block text-sm font-medium">Amount of Claim (₹) *<input required type="number" min="0.01" max="9999999999.99" step="0.01" value={form.claim_amount} onChange={e=>setForm({...form, claim_amount:e.target.value})} className={field + ' mt-1'} /></label>}
        {(['quantity', 'spare_part_name'] as const).map(key => <label key={key} className="block text-sm font-medium">
          {{ spare_part_name: 'Part Name', machine_name: 'Machine Model', quantity: 'Qty' }[key]} *
          <input required type={key === 'quantity' ? 'number' : 'text'} min={key === 'quantity' ? 1 : undefined} max={key === 'quantity' ? 1000000 : undefined} step={key === 'quantity' ? 1 : undefined} maxLength={key === 'quantity' ? undefined : 255} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className={field + ' mt-1'} />
        </label>)}
        <label className="block text-sm font-medium">Machine Model *<select value={form.customer_owned_product_id || 'custom'} disabled={saving || productsLoading} onChange={event => {
          const id = event.target.value;
          const product = ownedProducts.find(product => String(product.id) === id);
          setForm(current => ({ ...current, customer_owned_product_id: product ? id : '', machine_name: product ? product.model_number || product.product_name : '', purchase_date: product?.last_purchased_at || '' }));
        }} className={field + ' mt-1'}>
          {form.customer_owned_product_id && !ownedProducts.some(product => String(product.id) === form.customer_owned_product_id) && <option value={form.customer_owned_product_id}>{form.machine_name} {productsLoading ? '(loading...)' : '(saved selection)'}</option>}
          {ownedProducts.map(product => <option key={product.id} value={String(product.id)}>{product.product_name}{product.model_number ? ` · ${product.model_number}` : ''}</option>)}
          <option value="custom">Custom</option>
        </select></label>
        {productsError && <p role="alert" className="text-sm text-red-600">{productsError} <button type="button" onClick={() => setProductsRetry(value => value + 1)} className="underline">Retry</button></p>}
        {!form.customer_owned_product_id && <label className="block text-sm font-medium">Custom Machine Model *<input required maxLength={255} value={form.machine_name} onChange={event => setForm({ ...form, machine_name: event.target.value })} className={field + ' mt-1'} /></label>}
        <details className="text-sm">
          <summary className="w-fit cursor-pointer py-1 text-xs font-medium text-blue-600 hover:text-blue-700">Add more information</summary>
          <div className="mt-2 space-y-3">
        {(['serial_number', 'invoice_number'] as const).map(key => <label key={key} className="block text-sm font-medium">{key === 'serial_number' ? 'Serial Number' : 'Customer Invoice Number'}<input maxLength={255} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} className={field + ' mt-1'} /></label>)}
        <label className="block text-sm font-medium">Customer Invoice Image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast.error('Invoice image must be at most 5 MB.'); return; } setInvoiceImage(file); }} className="mt-1 block w-full" /></label>
        {invoiceImage ? <p className="text-sm">{invoiceImage.name} <button type="button" onClick={() => setInvoiceImage(null)}>Remove selected image</button></p> : selected?.invoice_image_url && !removeInvoiceImage && <div><a href={selected.invoice_image_url} target="_blank" rel="noreferrer" className="text-blue-600">View invoice image</a><button type="button" onClick={() => setRemoveInvoiceImage(true)} className="ml-3 text-red-600">Remove invoice image</button></div>}
        <label className="block text-sm font-medium">Date of Purchase<input type="date" max={new Date().toLocaleDateString('en-CA')} value={form.purchase_date} onChange={event => setForm({ ...form, purchase_date: event.target.value })} className={field + ' mt-1'} /></label>
          </div>
        </details>
        <label className="block text-sm font-medium">Description of Issue *<textarea required maxLength={5000} rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={field + ' mt-1'} /></label>
        <label className="block text-sm font-medium">Status *<select required value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={field + ' mt-1'}><option value="pending">Pending</option><option value="closed">Closed</option></select></label>
        <label className="block text-sm font-medium">Coverage *<select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} className={field + ' mt-1'}><option value="in_warranty">In Warranty</option><option value="chargeable">Chargeable</option></select></label>
        <label className="block text-sm font-medium">Estimated Completion Date<input type="date" value={form.estimated_completion_date} onChange={event => setForm({ ...form, estimated_completion_date: event.target.value })} className={field + ' mt-1'} /></label>
        {retainedImages.length > 0 && <div className="flex flex-wrap gap-3">{retainedImages.map((image: any) => <div key={image.path} className="rounded border p-2"><a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt="Current reference" className="h-[50px] w-[50px] object-contain" /></a><button type="button" disabled={saving} onClick={() => setRemovedImages(paths => [...paths, image.path])} className="mt-1 text-xs text-red-600">Remove</button></div>)}</div>}
        <SparePartImageUpload images={images} onChange={setImages} existingCount={retainedImages.length} disabled={saving} />
        {removedImages.length > 0 && <p className="text-xs text-gray-500">Images will be deleted when you save changes. <button type="button" disabled={saving || retainedImages.length + images.length + removedImages.length > 4} onClick={() => setRemovedImages([])} className="text-blue-600">Undo removals</button></p>}
        <div className="space-y-2"><label className="block text-sm font-medium">Reference Video (optional)<input type="file" accept="video/mp4,video/webm,video/quicktime,.mov" disabled={saving} onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          if (file.size >= 5 * 1024 * 1024) { toast.error('Video must be less than 5 MB.'); return; }
          if (!/\.(mp4|webm|mov)$/i.test(file.name)) { toast.error('Choose an MP4, WebM or MOV video.'); return; }
          setVideo(file);
        }} className="mt-2 block w-full text-sm" /></label><p className="text-xs text-gray-500">One MP4, WebM or MOV video, less than 5 MB. Uploading replaces the current video.</p>
        {video ? <div className="text-sm">{video.name} <button type="button" disabled={saving} onClick={() => setVideo(null)} className="text-red-600">Remove selected video</button></div> : selected?.video_url && !removeVideo && <div><video src={selected.video_url} controls preload="metadata" className="max-h-32 max-w-full" /><button type="button" disabled={saving} onClick={() => setRemoveVideo(true)} className="text-sm text-red-600">Remove video on save</button></div>}
        </div>
        {Object.entries(errors).map(([key, messages]) => <p key={key} role="alert" className="text-sm text-red-600">{messages.join(' ')}</p>)}
        <div className="flex flex-wrap justify-end gap-3">
          {selected && <button type="button" disabled={saving || deleting} onClick={() => void deleteRequest()} className="mr-auto rounded-xl border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Request'}</button>}
          <button type="button" disabled={saving || deleting} onClick={() => setOpen(false)}>Cancel</button>
          <button disabled={saving || deleting} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : selected ? 'Save Changes' : 'Create Request'}</button>
        </div>
      </form>}
    <Dialog open={preview !== null} onOpenChange={value => { if (!value) setPreview(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>OEM request format</DialogTitle></DialogHeader>
      <p className="text-sm text-gray-500">Complete the manual entries before copying. Invoice image links are included in the text; attach the image separately when sharing.</p>
      <textarea aria-label="Generated OEM request" rows={20} value={preview || ''} onChange={event => setPreview(event.target.value)} className="w-full rounded-lg border p-3 text-sm" />
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(preview || ''); toast.success('OEM request copied'); } catch { toast.error('Unable to copy automatically. Select the text and copy it manually.'); } }} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Copy Request</button>
    </DialogContent></Dialog>
    <OemServicePicker open={servicePickerOpen} onOpenChange={setServicePickerOpen} onSelect={selected=>{setService(selected);setCustomer(null);clearMachine();}} />
    </DialogContent></Dialog>
  </div>;
}
