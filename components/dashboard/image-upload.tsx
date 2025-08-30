'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/dashboard/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      onChange(url);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          disabled={uploading}
          aria-label="Upload image file"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.querySelector('input[type="file"]')?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      
      <div className="text-sm text-gray-500">Or paste an image URL:</div>
      <Input
        placeholder="https://example.com/image.jpg"
        value={value}
        onChange={handlePaste}
        disabled={uploading}
      />
      
      {value && (
        <div className="mt-2">
          <img src={value} alt="Preview" className="w-32 h-32 object-cover rounded" />
        </div>
      )}
    </div>
  );
}
