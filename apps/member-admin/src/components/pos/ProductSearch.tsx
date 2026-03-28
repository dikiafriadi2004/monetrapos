'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Product } from '@/types';
import { productService } from '@/services/product.service';

interface ProductSearchProps {
  storeId: string;
  onSelectProduct: (product: Product) => void;
}

export default function ProductSearch({ storeId, onSelectProduct }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  useEffect(() => {
    if (query) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [query, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts(storeId);
      setProducts(data.filter(p => p.isActive));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setQuery('');
    setFilteredProducts([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product by name, SKU, or barcode..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filteredProducts.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    {product.sku && `SKU: ${product.sku}`}
                    {product.barcode && ` | Barcode: ${product.barcode}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-gray-500">
                    Stock: {product.stock}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
