/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ImageUpload({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string) => void;
}) {
  const [url, setUrl] = useState(value || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function doUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/dashboard/api/upload', { method: 'POST', body });
      if (!res.ok) throw new Error('upload failed');
      const json = (await res.json()) as { publicUrl: string };
      setUrl(json.publicUrl);
      onChange(json.publicUrl);
    } catch (e) {
      console.error(e);
      alert('Upload failed. You can paste an external URL instead.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Direct URL entry */}
        <Input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onChange(e.target.value);
          }}
        />

        {/* Hidden file input controlled via ref */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload image file"
          onChange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0] || null;
            setFile(f);
          }}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Choose file
        </Button>

        <Button type="button" onClick={doUpload} disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      {url ? (
        <img src={url} alt="preview" className="h-24 w-24 rounded object-cover" />
      ) : null}
    </div>
  );
}
