'use client';

import { useState, useEffect } from 'react';
import { 
  discountsService, 
  Discount, 
  DiscountType,
  CreateDiscountDto 
} from '@/services/discounts.service';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  Loader2,
  X,
  Percent,
  DollarSign,
  Gift
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    loadDiscounts();
  }, [showActiveOnly]);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const response = await discountsService.getAll({
        isActive: showActiveOnly || undefined,
      });
      setDiscounts(response);
    } catch (error: any) {
      console.error('Failed to load discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedDiscount(null);
    setShowModal(true);
  };

  const handleEdit = (discount: Discount) => {
    setModalMode('edit');
    setSelectedDiscount(discount);
    setShowModal(true);
  };

  const handleDelete = async (discount: Discount) => {
    if (!confirm(`Delete discount "${discount.name}"?`)) return;

    try {
      await discountsService.delete(discount.id);
      toast.success('Discount deleted');
      await loadDiscounts();
    } catch (error: any) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete discount');
    }
  };

  const filteredDiscounts = discounts.filter(discount =>
    discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.promoCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDiscountIcon = (type: DiscountType) => {
    switch (type) {
      case DiscountType.PERCENTAGE:
        return <Percent className="w-5 h-5" />;
      case DiscountType.FIXED_AMOUNT:
        return <DollarSign className="w-5 h-5" />;
      case DiscountType.BUY_X_GET_Y:
        return <Gift className="w-5 h-5" />;
      default:
        return <Tag className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts & Promotions</h1>
          <p className="text-gray-600 mt-1">Manage discount codes and promotional offers</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Create Discount
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search discounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showActiveOnly
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showActiveOnly ? 'Active Only' : 'All Discounts'}
          </button>
        </div>
      </div>

      {/* Discounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No discounts found</h3>
          <p className="text-gray-600 mb-6">Create your first discount to boost sales</p>
          <button onClick={handleCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Create Discount
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiscounts.map((discount) => (
            <div
              key={discount.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    {getDiscountIcon(discount.discountType)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{discount.name}</h3>
                    {discount.promoCode && (
                      <p className="text-sm text-indigo-600 font-mono">{discount.promoCode}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    discount.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {discount.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{discount.discountType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-medium">
                    {discount.discountType === DiscountType.PERCENTAGE
                      ? `${discount.value}%`
                      : `Rp ${discount.value.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-medium">
                    {discount.usageCount} / {discount.usageLimit || '∞'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valid Until:</span>
                  <span className="font-medium">
                    {new Date(discount.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(discount)}
                  className="flex-1 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(discount)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <DiscountFormModal
          mode={modalMode}
          discount={selectedDiscount}
          onClose={() => {
            setShowModal(false);
            setSelectedDiscount(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedDiscount(null);
            loadDiscounts();
          }}
        />
      )}
    </div>
  );
}

function DiscountFormModal({
  mode,
  discount,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  discount: Discount | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: discount?.name || '',
    description: discount?.description || '',
    discountType: discount?.discountType || DiscountType.PERCENTAGE,
    value: discount?.value || 0,
    promoCode: discount?.promoCode || '',
    minPurchaseAmount: discount?.minPurchaseAmount || 0,
    maxDiscountAmount: discount?.maxDiscountAmount || 0,
    startDate: discount?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: discount?.endDate?.split('T')[0] || '',
    usageLimit: discount?.usageLimit || 0,
  });

  const handleGenerateCode = async () => {
    try {
      const code = await discountsService.generatePromoCode('PROMO', 8);
      setFormData({ ...formData, promoCode: code });
      toast.success('Promo code generated');
    } catch (error) {
      toast.error('Failed to generate code');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value) {
      toast.error('Name and value are required');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'create') {
        await discountsService.create(formData as CreateDiscountDto);
        toast.success('Discount created');
      } else if (discount) {
        await discountsService.update(discount.id, formData);
        toast.success('Discount updated');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error('Failed to save discount');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Create Discount' : 'Edit Discount'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type *
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={DiscountType.PERCENTAGE}>Percentage</option>
                <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount</option>
                <option value={DiscountType.BUY_X_GET_Y}>Buy X Get Y</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value *
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promo Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.promoCode}
                onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Purchase Amount
              </label>
              <input
                type="number"
                value={formData.minPurchaseAmount}
                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Discount Amount
              </label>
              <input
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Limit (0 = unlimited)
            </label>
            <input
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
