"use client";

import { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        alert('Please upload a CSV file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      await onImport(file);
      setFile(null);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,SKU,Barcode,Category,Base Price,Cost Price,Unit,Min Stock,Track Inventory,Active\n' +
                     'Example Product,PROD-001,1234567890,Beverages,25000,15000,pcs,10,Yes,Yes\n' +
                     'Another Product,PROD-002,0987654321,Food,35000,20000,pcs,5,Yes,Yes';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 'var(--space-md)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '100%', maxWidth: '600px', padding: 'var(--space-xl)', position: 'relative' 
      }}>
        
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', 
            background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' 
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-md)', fontSize: '1.5rem' }}>
          Bulk Import Products
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
          Upload a CSV file to import multiple products at once
        </p>

        {/* Instructions */}
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: 'var(--space-md)', 
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>CSV Format Requirements</h4>
              <ul style={{ margin: 'var(--space-xs) 0 0', paddingLeft: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li>First row must contain headers</li>
                <li>Required columns: Name, Base Price</li>
                <li>Optional: SKU, Barcode, Category, Cost Price, Unit, Min Stock, Track Inventory, Active</li>
                <li>Category must match existing category names</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Template */}
        <button
          onClick={downloadTemplate}
          className="btn btn-outline"
          style={{ 
            width: '100%', 
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)'
          }}
        >
          <Download size={18} />
          Download CSV Template
        </button>

        {/* File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xl)',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-tertiary)',
            transition: 'all 0.2s ease',
            marginBottom: 'var(--space-lg)'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          {file ? (
            <div>
              <FileText size={48} style={{ margin: '0 auto', color: 'var(--success)' }} />
              <p style={{ marginTop: 'var(--space-md)', fontWeight: 600 }}>{file.name}</p>
              <p style={{ marginTop: 'var(--space-xs)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="btn btn-outline"
                style={{ marginTop: 'var(--space-md)', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                Remove File
              </button>
            </div>
          ) : (
            <div>
              <Upload size={48} style={{ margin: '0 auto', color: 'var(--text-tertiary)' }} />
              <p style={{ marginTop: 'var(--space-md)', fontWeight: 600 }}>
                Drop your CSV file here or click to browse
              </p>
              <p style={{ marginTop: 'var(--space-xs)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Supports .csv files only
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-between" style={{ gap: 'var(--space-md)' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline" 
            style={{ flex: 1 }}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="btn btn-primary" 
            style={{ flex: 2, background: 'var(--success)', border: 'none' }} 
            disabled={!file || loading}
          >
            {loading ? 'Importing...' : 'Import Products'}
          </button>
        </div>
      </div>
    </div>
  );
}
