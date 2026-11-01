import { apiClient, AUTH_TOKEN_KEY, unwrap } from './apiClient';

type Reply = { id: number; name: string };
const TTL = 4 * 60 * 60 * 1000;
const storageKey = 'activate_crm_quick_replies_version';
export const QUICK_REPLIES_CHANGED = 'quick-replies-changed';
let generation = 0;
let cache: { data: Reply[]; expires: number; token: string | null } | null = null;
let pending: { promise: Promise<Reply[]>; token: string | null } | null = null;

function invalidate(broadcast = true) {
  generation++;
  cache = null;
  pending = null;
  if (broadcast) {
    try { localStorage.setItem(storageKey, `${Date.now()}-${Math.random()}`); } catch { /* Cache is optional. */ }
  }
  window.dispatchEvent(new Event(QUICK_REPLIES_CHANGED));
}
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === AUTH_TOKEN_KEY || event.key === null) invalidate(false);
});

async function read(): Promise<Reply[]> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (cache && cache.token === token && cache.expires > Date.now()) return cache.data;
  if (pending?.token === token) return pending.promise;
  const version = generation;
  const promise = apiClient.get('/quick-replies').then(response => {
    // If Masters changed during this request, read the new list instead.
    if (version !== generation) return read();
    const data = unwrap<Reply[]>(response);
    cache = { data, expires: Date.now() + TTL, token };
    return data;
  }).finally(() => { if (pending?.promise === promise) pending = null; });
  pending = { promise, token };
  return promise;
}
export const quickReplyService = {
  async list() { return { data: await read() }; },
  async create(payload: { name: string }) {
    const reply = unwrap<Reply>(await apiClient.post('/quick-replies', payload));
    invalidate(); return reply;
  },
  async update(id: string, payload: { name: string }) {
    const reply = unwrap<Reply>(await apiClient.put(`/quick-replies/${id}`, payload));
    invalidate(); return reply;
  },
  async remove(id: string) {
    const result = unwrap(await apiClient.delete(`/quick-replies/${id}`));
    invalidate(); return result;
  },
};
