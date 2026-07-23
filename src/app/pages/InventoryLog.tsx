import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { inventoryService } from '../../services/inventoryService';
import { LoadingState } from '../components/common/AsyncState';
import { PaginationControls } from '../components/common/Pagination';

const transportLabel = (value: string) => value === 'courier' ? 'Courier' : 'Freight Vehicle';
const formatDate = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const InventoryLog = () => {
  const navigate = useNavigate();
  const [loading,setLoading]=useState(true); const [rows,setRows]=useState<any[]>([]); const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(10); const [meta,setMeta]=useState<any>({total:0,last_page:1});
  const load=useCallback(async(nextPage=page,nextSize=pageSize)=>{setLoading(true);try{const result=await inventoryService.movements({page:nextPage,per_page:nextSize});setRows(result.data||[]);setMeta(result.meta?.pagination||{});setPage(nextPage);setPageSize(nextSize);}finally{setLoading(false);}},[page,pageSize]);
  useEffect(()=>{void load(1,pageSize);},[]);
  return <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <div className="flex items-center gap-3"><button onClick={()=>navigate('/inventory')} className="rounded-lg p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5"/></button><div><h2 className="text-2xl font-semibold">Inventory Log</h2><p className="text-sm text-gray-500">Complete IN and OUT movement history</p></div></div>
    <div className="overflow-hidden rounded-2xl border bg-white">{loading?<LoadingState label="Loading inventory log..."/>:<div className="overflow-x-auto"><table className="min-w-[1100px] w-full"><thead className="bg-gray-50"><tr><th className="px-5 py-4 text-left text-xs uppercase">Date</th><th className="px-5 py-4 text-left text-xs uppercase">Movement</th><th className="px-5 py-4 text-left text-xs uppercase">Transport</th><th className="px-5 py-4 text-left text-xs uppercase">Products</th><th className="px-5 py-4 text-right text-xs uppercase">Final Pkgs</th><th className="px-5 py-4 text-left text-xs uppercase">CRM User</th><th className="px-5 py-4 text-left text-xs uppercase">Slip</th></tr></thead><tbody className="divide-y">{rows.map(row=><tr key={row.id} className="align-top"><td className="whitespace-nowrap px-5 py-4">{formatDate(row.movement_date)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.movement_type==='in'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{String(row.movement_type).toUpperCase()}</span></td><td className="px-5 py-4">{transportLabel(row.transport_type)}</td><td className="px-5 py-4"><div className="space-y-2">{row.items.map((item:any)=><div key={item.id} className="rounded-lg bg-gray-50 p-2 text-sm"><div className="font-medium">{item.product} {item.brand&&<span className="font-normal text-gray-500">• {item.brand}</span>}</div><div className="text-xs text-gray-500">{item.godown}: Qty {item.quantity} • Pkgs {item.packages}</div></div>)}</div></td><td className="px-5 py-4 text-right font-semibold">{row.total_packages}</td><td className="px-5 py-4">{row.created_by?.name||row.created_by?.email||'System'}</td><td className="px-5 py-4">{row.slip_url?<a href={row.slip_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">View <ExternalLink className="h-3.5 w-3.5"/></a>:'-'}</td></tr>)}</tbody></table>{!rows.length&&<div className="p-10 text-center text-gray-500">No inventory movements recorded yet.</div>}</div>}
      <PaginationControls page={page} pageSize={pageSize} totalItems={meta.total||0} totalPages={meta.last_page||1} onPageChange={p=>void load(p,pageSize)} onPageSizeChange={s=>void load(1,s)}/></div>
  </div></div>;
};
