'use client';

import { useState, useEffect } from 'react';
import { 
  paymentMethodsService, 
  PaymentMethod, 
  PaymentMethodType,
  CreatePaymentMethodDto 
} from '@/services/payment-methods.service';
import { 
  CreditCard, 
  Wallet, 
  Banknote, 
  QrCode, 
  Building2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function PaymentMethodsSettingsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const data = await paymentMethodsService.getAll();
      setMethods(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error: any) {
      console.error('Failed to load payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (method: PaymentMethod) => {
    try {
      await paymentMethodsService.toggle(method.id);
      toast.success(`${method.name} ${method.isActive ? 'disabled' : 'enabled'}`);
      await loadMethods();
    } catch (error: any) {
      console.error('Failed to toggle payment method:', error);
      toast.error('Failed to update payment method');
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (!confirm(`Are you sure you want to delete ${method.name}?`)) return;

    try {
      await paymentMethodsService.delete(method.id);
      toast.success('Payment method deleted');
      await loadMethods();
    } catch (error: any) {
      console.error('Failed to delete payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const handleUploadIcon = async (method: PaymentMethod, file: File) => {
    try {
      setUploading(true);
      await paymentMethodsService.uploadIcon(method.id, file);
      toast.success('Icon uploaded successfully');
      await loadMethods();
      setShowQRISModal(false);
    } catch (error: any) {
      console.error('Failed to upload icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setUploading(false);
    }
  };

  const getIcon = (type: PaymentMethodType) => {
    switch (type) {
      case PaymentMethodType.CASH:
        return <Banknote className="w-5 h-5" />;
      case PaymentMethodType.CARD:
        return <CreditCard className="w-5 h-5" />;
      case PaymentMethodType.EWALLET:
        return <Wallet className="w-5 h-5" />;
      case PaymentMethodType.QRIS:
        return <QrCode className="w-5 h-5" />;
      case PaymentMethodType.BANK_TRANSFER:
        return <Building2 className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: PaymentMethodType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-600 mt-1">
            Manage payment methods available at your POS
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ️</div>
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold mb-1">
              About Payment Methods
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• These are manual payment methods for POS transactions (not online payment gateway)</li>
              <li>• QRIS: Upload a static QR code image - customers scan and input amount manually</li>
              <li>• Enable/disable methods to show/hide them in POS screen</li>
              <li>• Drag to reorder how they appear in POS</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference Required
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {methods.map((method) => (
                <tr key={method.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: method.color || '#6366f1' }}
                      >
                        {method.iconUrl ? (
                          <Image
                            src={method.iconUrl}
                            alt={method.name}
                            width={40}
                            height={40}
                            className="rounded-lg"
                          />
                        ) : (
                          <div className="text-white">
                            {getIcon(method.type)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {method.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method.code}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {getTypeLabel(method.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(method)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        method.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {method.isActive ? (
                        <>
                          <Eye className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {method.requiresReference ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {method.type === PaymentMethodType.QRIS && (
                        <button
                          onClick={() => {
                            setSelectedMethod(method);
                            setShowQRISModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Upload QRIS Image"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedMethod(method);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {methods.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No payment methods yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Your First Payment Method
            </button>
          </div>
        )}
      </div>

      {/* QRIS Upload Modal */}
      {showQRISModal && selectedMethod && (
        <QRISUploadModal
          method={selectedMethod}
          onClose={() => {
            setShowQRISModal(false);
            setSelectedMethod(null);
          }}
          onUpload={handleUploadIcon}
          uploading={uploading}
        />
      )}
    </div>
  );
}

// QRIS Upload Modal Component
function QRISUploadModal({
  method,
  onClose,
  onUpload,
  uploading,
}: {
  method: PaymentMethod;
  onClose: () => void;
  onUpload: (method: PaymentMethod, file: File) => void;
  uploading: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(method, selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Upload QRIS Image
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Upload a static QRIS image. Customers will scan this QR code and input the amount manually.
          </p>

          {/* Current Image */}
          {method.iconUrl && !preview && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Current Image:</p>
              <div className="border-2 border-gray-200 rounded-lg p-4 flex justify-center">
                <Image
                  src={method.iconUrl}
                  alt="Current QRIS"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
              <div className="border-2 border-gray-200 rounded-lg p-4 flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            </div>
          )}

          {/* File Input */}
          <label className="block">
            <span className="sr-only">Choose file</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100
                cursor-pointer"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
