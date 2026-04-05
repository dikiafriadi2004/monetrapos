'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  uploadEndpoint?: string; // e.g. '/products/:id/image' or '/companies/upload-logo'
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  uploadEndpoint,
  label = 'Upload Image',
  accept = 'image/*',
  maxSizeMB = 5,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File terlalu besar. Maksimal ${maxSizeMB}MB`);
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (!uploadEndpoint) {
      // No endpoint - just use local preview (caller handles upload)
      onChange(localUrl);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.imageUrl || res.data?.url || res.data?.logoUrl || localUrl;
      setPreview(url);
      onChange(url);
      toast.success('Gambar berhasil diupload');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal upload gambar');
      setPreview(value || '');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const clear = () => {
    setPreview('');
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: '100%', maxWidth: '200px', height: '120px',
              objectFit: 'cover', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          />
          <button
            type="button"
            onClick={clear}
            style={{
              position: 'absolute', top: -8, right: -8,
              background: 'var(--danger)', color: 'white',
              border: 'none', borderRadius: '50%', width: 22, height: 22,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              marginTop: 6, width: '100%', maxWidth: '200px',
              padding: '4px 8px', fontSize: '0.75rem',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Upload size={12} /> Ganti Gambar
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: 'var(--bg-tertiary)',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          {uploading ? (
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 8px' }} />
          ) : (
            <ImageIcon size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
          )}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
            {uploading ? 'Mengupload...' : label}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Klik atau drag & drop • Max {maxSizeMB}MB
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
