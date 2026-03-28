'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Scan } from 'lucide-react';
import { Product } from '@/types';
import { productService } from '@/services/product.service';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  onProductFound: (product: Product) => void;
}

export default function BarcodeScanner({
  isOpen,
  onClose,
  storeId,
  onProductFound,
}: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Listen for keyboard input (barcode scanner)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Barcode scanners typically send Enter after scanning
      if (e.key === 'Enter' && barcode) {
        handleSearch();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [isOpen, barcode]);

  const handleSearch = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const product = await productService.getProductByBarcode(storeId, barcode);
      
      if (!product.isActive) {
        setError('Product is not active');
        return;
      }

      if (product.stock < 1) {
        setError('Product is out of stock');
        return;
      }

      onProductFound(product);
      onClose();
      setBarcode('');
    } catch (err: any) {
      console.error('Product not found:', err);
      setError(err.response?.data?.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Scan size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Scan Barcode</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Scanner Animation */}
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-blue-500 rounded-lg flex items-center justify-center">
                <Scan size={64} className="text-blue-500 animate-pulse" />
              </div>
              <div className="absolute inset-0 border-4 border-blue-300 rounded-lg animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Barcode Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Number
            </label>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => {
                setBarcode(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Scan or enter barcode..."
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Use a barcode scanner or type manually and press Enter
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">How to use:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Point barcode scanner at product barcode</li>
              <li>• Scanner will automatically read and search</li>
              <li>• Or type barcode manually and press Enter</li>
            </ul>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !barcode.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
