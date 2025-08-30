'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// NOTE: For client side, we create a small fetcher that calls a signed upload action
export function ImageUpload({ value, onChange }: { value?: string | null; onChange: (url: string) => void }) {
  const [url, setUrl] = useState(value || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const doUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/dashboard/api/upload', { method: 'POST', body });
      if (!res.ok) throw new Error('upload failed');
      const json = await res.json();
      setUrl(json.publicUrl);
      onChange(json.publicUrl);
    } catch (e) {
      console.error(e);
      alert('Upload failed. You can paste an external URL instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input type="url" placeholder="https://..." value={url} onChange={(e) => { setUrl(e.target.value); onChange(e.target.value); }} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Upload image file" />
        <Button disabled={!file || busy} onClick={doUpload}>Upload</Button>
      </div>
      {url ? <img src={url} alt="preview" className="h-24 w-24 rounded object-cover" /> : null}
    </div>
  );
}
