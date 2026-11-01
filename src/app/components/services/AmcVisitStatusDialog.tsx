import { CalendarClock, CheckCircle2, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { amcService } from '../../../services/amcService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export type AmcVisitStatusTarget={
  amcId:string|number;
  visitId?:string|number;
  visitNumber?:number;
  scheduledDate?:string;
};

type VisitAction='skip'|'reschedule';

export const AmcVisitStatusDialog=({target,open,onOpenChange,onUpdated}:{
  target:AmcVisitStatusTarget|null;
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  onUpdated:()=>void;
})=>{
  const[action,setAction]=useState<VisitAction|null>(null);
  const[reason,setReason]=useState('');
  const[rescheduledDate,setRescheduledDate]=useState('');
  const[saving,setSaving]=useState(false);

  useEffect(()=>{
    if(open){setAction(null);setReason('');setRescheduledDate('');}
  },[open,target?.amcId,target?.visitId]);

  const update=async(status:'completed'|'skipped'|'rescheduled')=>{
    if(!target)return;
    if(status!=='completed'&&!reason.trim()){toast.error('Reason is required');return;}
    if(status==='rescheduled'&&!rescheduledDate){toast.error('Select a new visit date');return;}
    setSaving(true);
    try{
      await amcService.updateVisitStatus(target.amcId,{status,visit_id:target.visitId,reason:reason.trim()||undefined,rescheduled_date:rescheduledDate||undefined});
      toast.success(status==='completed'?'AMC visit marked as done':status==='skipped'?'AMC service skipped':'AMC service rescheduled');
      onOpenChange(false);
      onUpdated();
    }catch{}finally{setSaving(false);}
  };

  const visitLabel=target?.visitNumber?`Visit ${target.visitNumber}`:'the next eligible visit';
  const today=new Date().toLocaleDateString('en-CA');

  return <Dialog open={open} onOpenChange={value=>{if(!saving)onOpenChange(value);}}><DialogContent onClick={event=>event.stopPropagation()} className="sm:max-w-xl">
    <DialogHeader><DialogTitle>Update Visit Status</DialogTitle><DialogDescription>Choose an action for {visitLabel}.</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-3">
      <button type="button" disabled={saving} onClick={()=>void update('completed')} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50"><CheckCircle2 className="h-6 w-6"/>{saving&&!action?'Updating...':'Mark as Done'}</button>
      <button type="button" disabled={saving} onClick={()=>setAction('skip')} className={`flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border px-4 py-4 text-center text-sm font-semibold transition disabled:opacity-50 ${action==='skip'?'border-amber-500 bg-amber-100 text-amber-800':'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'}`}><SkipForward className="mb-1 h-6 w-6"/>Skip Service<span className="text-xs font-medium">Reason Required</span></button>
      <button type="button" disabled={saving} onClick={()=>setAction('reschedule')} className={`flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border px-4 py-4 text-center text-sm font-semibold transition disabled:opacity-50 ${action==='reschedule'?'border-blue-500 bg-blue-100 text-blue-800':'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'}`}><CalendarClock className="mb-1 h-6 w-6"/>Reschedule Service<span className="text-xs font-medium">Reason Required</span></button>
    </div>
    {action&&<div className="space-y-4 rounded-xl border bg-slate-50 p-4">
      {action==='reschedule'&&<label className="block text-sm font-medium text-slate-700">New Visit Date <span className="text-red-600">*</span><input type="date" min={today} value={rescheduledDate} onChange={event=>setRescheduledDate(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"/></label>}
      <label className="block text-sm font-medium text-slate-700">Reason <span className="text-red-600">*</span><textarea autoFocus rows={3} maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)} placeholder={action==='skip'?'Why is this service being skipped?':'Why is this service being rescheduled?'} className="mt-1.5 w-full resize-none rounded-lg border bg-white px-3 py-2.5"/></label>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setAction(null)} className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button type="button" disabled={saving||!reason.trim()||(action==='reschedule'&&!rescheduledDate)} onClick={()=>void update(action==='skip'?'skipped':'rescheduled')} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${action==='skip'?'bg-amber-600 hover:bg-amber-700':'bg-blue-600 hover:bg-blue-700'}`}>{saving?'Updating...':action==='skip'?'Confirm Skip':'Confirm Reschedule'}</button></div>
    </div>}
  </DialogContent></Dialog>;
};
