'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registrationService, SubscriptionPlan } from '@/services/registration.service';
import { CheckCircle, Building2, CreditCard, User, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: 'retail' as 'retail' | 'fnb' | 'laundry',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    planId: '',
    durationMonths: 1,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const data = await registrationService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast.error('Failed to load subscription plans. Please refresh the page.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.companyName) newErrors.companyName = 'Nama usaha wajib diisi';
      if (!formData.businessType) newErrors.businessType = 'Jenis usaha wajib dipilih';
      if (!formData.companyEmail) newErrors.companyEmail = 'Email usaha wajib diisi';
      if (!formData.companyPhone) newErrors.companyPhone = 'Nomor telepon wajib diisi';
    } else if (currentStep === 2) {
      if (!formData.planId) newErrors.planId = 'Please select a plan';
      if (!formData.durationMonths) newErrors.durationMonths = 'Please select duration';
    } else if (currentStep === 3) {
      if (!formData.ownerName) newErrors.ownerName = 'Owner name is required';
      if (!formData.ownerEmail) newErrors.ownerEmail = 'Owner email is required';
      if (!formData.ownerPhone) newErrors.ownerPhone = 'Owner phone is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const response = await registrationService.register({
        companyName: formData.companyName,
        businessType: formData.businessType,
        companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone,
        companyAddress: formData.companyAddress,
        planId: formData.planId,
        durationMonths: formData.durationMonths,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        password: formData.password,
      });

      if (response.paymentUrl) {
        toast.success('Registrasi berhasil! Mengarahkan ke halaman pembayaran...');
        setTimeout(() => {
          // Redirect ke halaman checkout custom kita, bukan langsung ke Xendit
          const checkoutUrl = `/checkout?invoice=${response.invoiceNumber}&amount=${response.amount}&paymentUrl=${encodeURIComponent(response.paymentUrl)}`;
          router.push(checkoutUrl);
        }, 1000);
      } else if ((response as any).paymentError) {
        const errMsg = (response as any).paymentError as string;
        if (errMsg.includes('IP Allowlist') || errMsg.includes('IP server')) {
          toast.error('Registrasi berhasil! Pembayaran otomatis tidak tersedia saat ini (IP restriction). Silakan bayar manual via halaman billing.', { duration: 6000 });
        } else {
          toast.error(`Registrasi berhasil, namun pembayaran otomatis gagal. Silakan bayar via halaman billing.`, { duration: 5000 });
        }
        setTimeout(() => {
          router.push(`/checkout?invoice=${response.invoiceNumber}&amount=${response.amount}`);
        }, 2000);
      } else {
        toast.success('Registrasi berhasil! Silakan selesaikan pembayaran.');
        setTimeout(() => {
          router.push(`/checkout?invoice=${response.invoiceNumber}&amount=${response.amount}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorMessage = error.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePrice = (plan: SubscriptionPlan, months: number) => {
    const duration = plan.durations?.find(d => d.durationMonths === months);
    if (duration) {
      return {
        subtotal: plan.priceMonthly * months,
        discount: duration.discountPercentage,
        final: duration.finalPrice,
      };
    }
    return {
      subtotal: plan.priceMonthly * months,
      discount: 0,
      final: plan.priceMonthly * months,
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Register MonetraPOS
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
            Complete POS System for Your Business
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            {[
              { num: 1, label: 'Info Usaha', icon: Building2 },
              { num: 2, label: 'Pilih Paket', icon: CreditCard },
              { num: 3, label: 'Info Pemilik', icon: User },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '1.125rem',
                        background: s.num <= step ? 'var(--accent-base)' : 'var(--bg-tertiary)',
                        color: s.num <= step ? 'white' : 'var(--text-tertiary)',
                        transition: 'all 0.3s',
                      }}
                    >
                      {s.num < step ? <CheckCircle size={24} /> : <Icon size={24} />}
                    </div>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: s.num <= step ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      style={{
                        width: '4rem',
                        height: '2px',
                        background: s.num < step ? 'var(--accent-base)' : 'var(--bg-tertiary)',
                        transition: 'all 0.3s',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          {/* Step 1: Info Usaha */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Informasi Usaha
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Tidak perlu berbadan hukum. Cukup nama usaha Anda.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Usaha *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="form-input"
                    placeholder="Contoh: Warung Makan Bu Sari, Laundry Bersih, Toko Kelontong Jaya"
                  />
                  {errors.companyName && <p className="form-error">{errors.companyName}</p>}
                </div>

                {/* Jenis Usaha - menentukan fitur yang tersedia */}
                <div className="form-group">
                  <label className="form-label">Jenis Usaha *</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                    Pilihan ini menentukan fitur yang akan tersedia di dashboard Anda
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {[
                      {
                        value: 'retail',
                        label: 'Retail / Jasa',
                        emoji: '🛒',
                        desc: 'Toko, warung, bengkel, salon, dll',
                        features: ['POS Kasir', 'Inventori', 'Laporan', 'Pelanggan'],
                      },
                      {
                        value: 'fnb',
                        label: 'Makanan & Minuman',
                        emoji: '🍽️',
                        desc: 'Restoran, kafe, warung makan, dll',
                        features: ['POS Kasir', 'Manajemen Meja', 'Kitchen Display', 'Split Bill'],
                      },
                      {
                        value: 'laundry',
                        label: 'Laundry',
                        emoji: '👕',
                        desc: 'Laundry kiloan, dry clean, dll',
                        features: ['Order Laundry', 'Tracking Status', 'Jadwal Antar/Jemput', 'Checklist Item'],
                      },
                    ].map((type) => (
                      <div
                        key={type.value}
                        onClick={() => setFormData({ ...formData, businessType: type.value as any })}
                        style={{
                          border: '2px solid',
                          borderColor: formData.businessType === type.value ? 'var(--accent-base)' : 'var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          background: formData.businessType === type.value ? 'rgba(99,102,241,0.05)' : 'var(--bg-secondary)',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{type.emoji}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                          {type.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                          {type.desc}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                          {type.features.map(f => (
                            <li key={f} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              ✓ {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {errors.businessType && <p className="form-error">{errors.businessType}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Usaha *</label>
                  <input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    className="form-input"
                    placeholder="usaha@example.com"
                  />
                  {errors.companyEmail && <p className="form-error">{errors.companyEmail}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor Telepon *</label>
                  <input
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    className="form-input"
                    placeholder="081234567890"
                  />
                  {errors.companyPhone && <p className="form-error">{errors.companyPhone}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Alamat Usaha</label>
                  <textarea
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="form-textarea"
                    rows={2}
                    placeholder="Jl. Contoh No. 123, Jakarta (opsional)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Pilih Paket Langganan
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Paket menentukan jumlah <strong>cabang</strong> yang bisa Anda kelola. Bisa upgrade kapan saja.
              </p>
              
              {loadingPlans ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <>
                  {/* Plans Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => {
                          setFormData({ ...formData, planId: plan.id });
                          setSelectedPlan(plan);
                        }}
                        style={{
                          border: '2px solid',
                          borderColor: formData.planId === plan.id ? 'var(--accent-base)' : 'var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          background: formData.planId === plan.id ? 'var(--accent-lighter)' : 'var(--bg-secondary)',
                          position: 'relative',
                        }}
                        className="card"
                      >
                        {plan.isPopular && (
                          <span style={{
                            position: 'absolute',
                            top: '-12px',
                            right: '1rem',
                            background: 'var(--accent-base)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                          }}>
                            POPULAR
                          </span>
                        )}
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                          {plan.name}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          {plan.description}
                        </p>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-base)', marginBottom: '1rem' }}>
                          {formatCurrency(plan.priceMonthly)}
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '400' }}>/month</span>
                        </div>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                          <li>✓ {plan.maxStores === -1 ? 'Unlimited' : plan.maxStores} Store{plan.maxStores !== 1 ? 's' : ''}</li>
                          <li>✓ {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} User{plan.maxUsers !== 1 ? 's' : ''}</li>
                          <li>✓ {plan.maxEmployees === -1 ? 'Unlimited' : plan.maxEmployees} Employee{plan.maxEmployees !== 1 ? 's' : ''}</li>
                          <li>✓ {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products</li>
                          {plan.features && typeof plan.features === 'object' && Object.entries(plan.features)
                            .filter(([, v]) => v)
                            .map(([k]) => {
                              const featureLabels: Record<string, string> = {
                                pos: 'Point of Sale', inventory: 'Inventori', reports: 'Laporan',
                                employees: 'Manajemen Karyawan', customers: 'Manajemen Pelanggan',
                                receipt_printing: 'Cetak Struk', multiStore: 'Multi-Outlet',
                                loyaltyProgram: 'Program Loyalitas', api: 'Akses API',
                                customReceipt: 'Custom Struk', prioritySupport: 'Priority Support',
                                whiteLabel: 'White Label',
                              };
                              return <li key={k}>✓ {featureLabels[k] || k.replace(/_/g, ' ')}</li>;
                            })
                          }
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Duration Selection */}
                  {selectedPlan && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        Select Duration *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                        {[1, 3, 6, 12].map((months) => {
                          const price = calculatePrice(selectedPlan, months);
                          return (
                            <div
                              key={months}
                              onClick={() => setFormData({ ...formData, durationMonths: months })}
                              style={{
                                border: '2px solid',
                                borderColor: formData.durationMonths === months ? 'var(--accent-base)' : 'var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                background: formData.durationMonths === months ? 'var(--accent-lighter)' : 'var(--bg-secondary)',
                                transition: 'all 0.3s',
                              }}
                            >
                              <div style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                                {months} Month{months > 1 ? 's' : ''}
                              </div>
                              {price.discount > 0 && (
                                <div style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                  Save {price.discount}%
                                </div>
                              )}
                              <div style={{ color: 'var(--accent-base)', fontWeight: '700', fontSize: '1rem' }}>
                                {formatCurrency(price.final)}
                              </div>
                              {price.discount > 0 && (
                                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textDecoration: 'line-through' }}>
                                  {formatCurrency(price.subtotal)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {errors.planId && <p className="form-error" style={{ marginTop: '1rem' }}>{errors.planId}</p>}
                </>
              )}
            </div>
          )}

          {/* Step 3: Owner Info */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Informasi Pemilik
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Data ini digunakan untuk login dan notifikasi.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Pemilik *</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="form-input"
                    placeholder="Nama lengkap Anda"
                  />
                  {errors.ownerName && <p className="form-error">{errors.ownerName}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Pemilik *</label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="form-input"
                    placeholder="email@anda.com"
                  />
                  {errors.ownerEmail && <p className="form-error">{errors.ownerEmail}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor HP Pemilik *</label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="form-input"
                    placeholder="081234567890"
                  />
                  {errors.ownerPhone && <p className="form-error">{errors.ownerPhone}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                    placeholder="Minimal 8 karakter"
                  />
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Konfirmasi Password *</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="form-input"
                    placeholder="Ulangi password"
                  />
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '1.125rem' }}>Ringkasan Pesanan</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Nama Usaha:</span>
                      <span style={{ fontWeight: '600' }}>{formData.companyName || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Jenis Usaha:</span>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {formData.businessType === 'fnb' ? 'Makanan & Minuman' : formData.businessType === 'laundry' ? 'Laundry' : 'Retail / Jasa'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Paket:</span>
                      <span style={{ fontWeight: '600' }}>{selectedPlan.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Maks. Cabang:</span>
                      <span style={{ fontWeight: '600' }}>{selectedPlan.maxStores === -1 ? 'Unlimited' : selectedPlan.maxStores}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Durasi:</span>
                      <span style={{ fontWeight: '600' }}>{formData.durationMonths} bulan</span>
                    </div>
                    {calculatePrice(selectedPlan, formData.durationMonths).discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                        <span>Diskon ({calculatePrice(selectedPlan, formData.durationMonths).discount}%):</span>
                        <span>-{formatCurrency(calculatePrice(selectedPlan, formData.durationMonths).subtotal - calculatePrice(selectedPlan, formData.durationMonths).final)}</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      paddingTop: '0.75rem',
                      borderTop: '2px solid var(--border-color)',
                      marginTop: '0.5rem',
                    }}>
                      <span>Total:</span>
                      <span style={{ color: 'var(--accent-base)' }}>{formatCurrency(calculatePrice(selectedPlan, formData.durationMonths).final)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', gap: '1rem' }}>
            <button
              onClick={step === 1 ? () => router.push('/login') : handleBack}
              className="btn btn-outline"
              style={{ minWidth: '140px' }}
            >
              <ArrowLeft size={18} />
              {step === 1 ? 'Kembali ke Login' : 'Kembali'}
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="btn btn-primary"
                style={{ minWidth: '140px' }}
              >
                Lanjut
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
                style={{ minWidth: '180px' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Memproses...
                  </>
                ) : (
                  <>
                    Lanjut ke Pembayaran
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--accent-base)', fontWeight: '600' }}>
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

