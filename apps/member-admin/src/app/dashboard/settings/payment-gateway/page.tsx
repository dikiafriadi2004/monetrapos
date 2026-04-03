'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  paymentGatewayService, 
  PaymentGatewayPreference 
} from '@/services/payment-gateway.service';
import { CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function PaymentGatewaySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preference, setPreference] = useState<PaymentGatewayPreference | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'midtrans' | 'xendit'>('midtrans');

  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      setLoading(true);
      const data = await paymentGatewayService.getPreference();
      setPreference(data);
      setSelectedGateway(data.gateway);
    } catch (error: any) {
      console.error('Failed to load payment gateway preference:', error);
      toast.error('Failed to load payment gateway settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await paymentGatewayService.setPreference(selectedGateway);
      toast.success('Payment gateway preference updated successfully');
      await loadPreference();
    } catch (error: any) {
      console.error('Failed to save preference:', error);
      toast.error(error.response?.data?.message || 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const getGatewayInfo = (gateway: 'midtrans' | 'xendit') => {
    const info = {
      midtrans: {
        name: 'Midtrans',
        description: 'Popular payment gateway in Indonesia with comprehensive payment methods',
        logo: '💳',
        features: [
          'Credit/Debit Cards',
          'Bank Transfer',
          'E-Wallets (GoPay, OVO, Dana)',
          'Convenience Store',
          'Installment',
        ],
        pros: [
          'Well-established in Indonesia',
          'Advanced fraud detection',
          'Polished Snap UI',
          'Great for B2C',
        ],
      },
      xendit: {
        name: 'Xendit',
        description: 'Modern payment gateway with flexible API and more payment options',
        logo: '🚀',
        features: [
          'Credit/Debit Cards',
          'Bank Transfer (More banks)',
          'E-Wallets (OVO, Dana, LinkAja, ShopeePay)',
          'QRIS',
          'Retail Outlets (Alfamart, Indomaret)',
        ],
        pros: [
          'More payment methods',
          'Better API documentation',
          'Flexible pricing',
          'Great for B2B',
        ],
      },
    };

    return info[gateway];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Loading payment gateway settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Gateway Settings
        </h1>
        <p className="text-gray-600">
          Choose your preferred payment gateway for subscription payments and renewals
        </p>
      </div>

      {/* Current Selection Banner */}
      {preference && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="font-semibold text-indigo-900">
                Current Payment Gateway
              </p>
              <p className="text-sm text-indigo-700">
                {getGatewayInfo(preference.gateway).name} is currently active for your payments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Selection */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {preference?.available.map((gateway) => {
          const info = getGatewayInfo(gateway.gateway);
          const isSelected = selectedGateway === gateway.gateway;
          const isCurrent = preference.gateway === gateway.gateway;

          return (
            <div
              key={gateway.gateway}
              className={`
                relative border-2 rounded-lg p-6 cursor-pointer transition-all
                ${isSelected 
                  ? 'border-indigo-600 bg-indigo-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${!gateway.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => gateway.enabled && setSelectedGateway(gateway.gateway)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Current Badge */}
              {isCurrent && (
                <div className="absolute top-4 left-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    Current
                  </span>
                </div>
              )}

              {/* Gateway Info */}
              <div className="mt-8">
                <div className="text-4xl mb-3">{info.logo}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {info.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {info.description}
                </p>

                {/* Enabled Status */}
                {!gateway.enabled && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-900">
                          Not Configured
                        </p>
                        <p className="text-xs text-yellow-700">
                          This gateway is not configured. Contact support to enable it.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Payment Methods:
                  </p>
                  <ul className="space-y-1">
                    {info.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Advantages */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Advantages:
                  </p>
                  <ul className="space-y-1">
                    {info.pros.map((pro, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-600" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Save Changes
          </p>
          <p className="text-xs text-gray-600">
            Your preference will be applied to all future payments
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || selectedGateway === preference?.gateway}
          className="btn btn-primary"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preference'
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Important Information
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Changing payment gateway will affect future subscription payments and renewals</li>
              <li>• Existing payment transactions will not be affected</li>
              <li>• Both gateways are secure and PCI-DSS compliant</li>
              <li>• You can change your preference at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
