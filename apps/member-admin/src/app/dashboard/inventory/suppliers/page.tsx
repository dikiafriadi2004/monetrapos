'use client';

import { useState, useEffect } from 'react';
import { 
  suppliersService, 
  Supplier, 
  CreateSupplierDto,
  UpdateSupplierDto 
} from '@/services/suppliers.service';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Loader2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [searchTerm, showActiveOnly]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersService.getAll({
        search: searchTerm || undefined,
        active: showActiveOnly || undefined,
      });
      setSuppliers(response.data);
    } catch (error: any) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setModalMode('edit');
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete ${supplier.name}?`)) return;

    try {
      await suppliersService.delete(supplier.id);
      toast.success('Supplier deleted successfully');
      await loadSuppliers();
    } catch (error: any) {
      console.error('Failed to delete supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await suppliersService.toggleActive(supplier.id);
      toast.success(`Supplier ${supplier.isActive ? 'deactivated' : 'activated'}`);
      await loadSuppliers();
    } catch (error: any) {
      console.error('Failed to toggle supplier:', error);
      toast.error('Failed to update supplier');
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const filteredSuppliers = suppliers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 mt-1">Manage your suppliers and vendors</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Active Filter */}
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showActiveOnly
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showActiveOnly ? 'Active Only' : 'All Suppliers'}
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No suppliers found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by adding your first supplier'}
          </p>
          {!searchTerm && (
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {supplier.name}
                  </h3>
                  <p className="text-sm text-gray-500">{supplier.code}</p>
                </div>
                <button
                  onClick={() => handleToggleActive(supplier)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    supplier.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{supplier.city}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleViewDetails(supplier)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEdit(supplier)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(supplier)}
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
        <SupplierFormModal
          mode={modalMode}
          supplier={selectedSupplier}
          onClose={() => {
            setShowModal(false);
            setSelectedSupplier(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedSupplier(null);
            loadSuppliers();
          }}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSupplier && (
        <SupplierDetailsModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSupplier(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEdit(selectedSupplier);
          }}
        />
      )}
    </div>
  );
}

// Supplier Form Modal Component
function SupplierFormModal({
  mode,
  supplier,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    code: supplier?.code || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    province: supplier?.province || '',
    postalCode: supplier?.postalCode || '',
    country: supplier?.country || 'Indonesia',
    taxId: supplier?.taxId || '',
    paymentTerms: supplier?.paymentTerms || '',
    notes: supplier?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error('Name and code are required');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'create') {
        await suppliersService.create(formData as CreateSupplierDto);
        toast.success('Supplier created successfully');
      } else if (supplier) {
        await suppliersService.update(supplier.id, formData as UpdateSupplierDto);
        toast.success('Supplier updated successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name *
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
                Supplier Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                disabled={mode === 'edit'}
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID / NPWP
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="e.g., Net 30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'create' ? 'Create Supplier' : 'Update Supplier'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Supplier Details Modal Component
function SupplierDetailsModal({
  supplier,
  onClose,
  onEdit,
}: {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Supplier Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{supplier.name}</h3>
                <p className="text-gray-500">{supplier.code}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  supplier.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {supplier.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
            <div className="space-y-2">
              {supplier.contactPerson && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{supplier.contactPerson}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{supplier.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {(supplier.address || supplier.city) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="text-gray-900">
                  {supplier.address && <p>{supplier.address}</p>}
                  {supplier.city && (
                    <p>
                      {supplier.city}
                      {supplier.province && `, ${supplier.province}`}
                      {supplier.postalCode && ` ${supplier.postalCode}`}
                    </p>
                  )}
                  {supplier.country && <p>{supplier.country}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {supplier.taxId && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Tax ID / NPWP</h4>
                <p className="text-gray-900">{supplier.taxId}</p>
              </div>
            )}
            {supplier.paymentTerms && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Terms</h4>
                <p className="text-gray-900">{supplier.paymentTerms}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <p className="text-gray-900 whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Supplier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
