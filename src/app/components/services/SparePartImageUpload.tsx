import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function SparePartImageUpload({ images, onChange, existingCount = 0, disabled = false }: { images: File[]; onChange: (files: File[]) => void; existingCount?: number; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);
  const select = (files: FileList | null) => {
    if (disabled || !files?.length) return;
    const next = Array.from(files);
    if (existingCount + images.length + next.length > 4) { toast.error('Maximum four images. Remove an existing image to add another.'); return; }
    if (next.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name))) { toast.error('Choose JPG, PNG or WebP images.'); return; }
    if (next.some(file => file.size > 5 * 1024 * 1024)) { toast.error('Each image must be 5 MB or smaller.'); return; }
    onChange([...images, ...next]);
  };
  return <div className="space-y-2">
    <p className="text-sm font-medium">Reference Images ({existingCount + images.length}/4)</p>
    <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); select(event.dataTransfer.files); }} className="rounded-xl border-2 border-dashed p-4 text-center">
      <p className="text-sm">Drag images here or browse</p><button type="button" disabled={disabled || existingCount + images.length >= 4} onClick={() => input.current?.click()} className="mt-2 rounded-lg border px-3 py-2 text-sm text-blue-700 disabled:opacity-50">Browse Images</button>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { select(event.target.files); event.target.value = ''; }} />
      <p className="mt-2 text-xs text-gray-500">Up to four JPG, PNG or WebP images, 5 MB each.</p>
    </div>
    {images.map((file,index) => <div key={index} className="flex items-center gap-3 rounded-lg border p-2"><img src={previews[index]} alt={file.name} className="h-[50px] w-[50px] rounded object-contain" /><span className="min-w-0 flex-1 break-words text-xs">{file.name}</span><button type="button" disabled={disabled} onClick={() => onChange(images.filter((_,i) => i !== index))} className="text-sm text-red-600">Remove</button></div>)}
  </div>;
}
