'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { Eye, EyeOff, ShoppingCart, Loader2, CheckCircle, Sparkles } from 'lucide-react';

const registerSchema = z.object({
  companyName: z.string().min(1, 'Nama usaha wajib diisi'),
  companyEmail: z.string().email('Email tidak valid'),
  companyPhone: z.string().min(1, 'Nomor telepon wajib diisi'),
  ownerName: z.string().min(1, 'Nama pemilik wajib diisi'),
  ownerEmail: z.string().email('Email tidak valid'),
  ownerPhone: z.string().min(1, 'Nomor HP wajib diisi'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
  businessType: z.enum(['retail', 'fnb', 'laundry']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterTrialPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterForm>({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    businessType: 'retail',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});

  const validate = () => {
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const errs: any = {};
      result.error.issues.forEach((e: any) => {
        errs[e.path[0]] = e.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register/simple', {
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        password: formData.password,
        businessType: formData.businessType,
      });

      // Save tokens
      localStorage.setItem('access_token', response.data.accessToken);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast.success('🎉 Registrasi berhasil! Trial 14 hari dimulai!');
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorMessage = error.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const businessTypes = [
    {
      value: 'retail',
      label: 'Retail / Jasa',
      emoji: '🛒',
      desc: 'Toko, warung, bengkel, salon',
      features: ['POS Kasir', 'Inventori', 'Laporan'],
    },
    {
      value: 'fnb',
      label: 'Makanan & Minuman',
      emoji: '🍽️',
      desc: 'Restoran, kafe, warung makan',
      features: ['POS', 'Meja', 'Kitchen Display'],
    },
    {
      value: 'laundry',
      label: 'Laundry',
      emoji: '👕',
      desc: 'Laundry kiloan, dry clean',
      features: ['Order', 'Tracking', 'Jadwal'],
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <ShoppingCart size={32} color="#6366f1" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>
            Mulai Trial Gratis 14 Hari
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.125rem' }}>
            Tidak perlu kartu kredit. Langsung bisa digunakan!
          </p>
        </div>

        {/* Benefits Banner */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { icon: CheckCircle, text: 'Trial 14 hari gratis' },
              { icon: Sparkles, text: 'Langsung bisa digunakan' },
              { icon: CheckCircle, text: 'Tidak perlu kartu kredit' },
              { icon: CheckCircle, text: 'Batalkan kapan saja' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
                <Icon size={20} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '2.5rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Business Type Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                Jenis Usaha *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {businessTypes.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => setFormData({ ...formData, businessType: type.value as any })}
                    style={{
                      border: '2px solid',
                      borderColor: formData.businessType === type.value ? '#6366f1' : '#e5e7eb',
                      borderRadius: 12,
                      padding: '1rem',
                      cursor: 'pointer',
                      background: formData.businessType === type.value ? 'rgba(99,102,241,0.05)' : 'white',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{type.emoji}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      {type.desc}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      {type.features.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Usaha *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Warung Makan Bu Sari"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
                {errors.companyName && <p className="form-error">{errors.companyName}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Usaha *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="usaha@example.com"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                />
                {errors.companyEmail && <p className="form-error">{errors.companyEmail}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nomor Telepon Usaha *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="081234567890"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
              />
              {errors.companyPhone && <p className="form-error">{errors.companyPhone}</p>}
            </div>

            {/* Owner Info */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
                Informasi Pemilik
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama Anda"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  />
                  {errors.ownerName && <p className="form-error">{errors.ownerName}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Anda *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@anda.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  />
                  {errors.ownerEmail && <p className="form-error">{errors.ownerEmail}</p>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nomor HP Anda *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="081234567890"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                />
                {errors.ownerPhone && <p className="form-error">{errors.ownerPhone}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Minimal 8 karakter"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Konfirmasi Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Ulangi password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Trial Info */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 12,
              padding: '1.5rem',
              color: 'white',
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} />
                Yang Anda Dapatkan di Trial:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>✅ Sistem POS lengkap</div>
                <div>✅ Manajemen inventori</div>
                <div>✅ Laporan penjualan</div>
                <div>✅ Hingga 50 produk</div>
                <div>✅ Hingga 100 transaksi/bulan</div>
                <div>✅ 2 pengguna</div>
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', opacity: 0.9 }}>
                💡 Upgrade kapan saja untuk unlock semua fitur & limit tidak terbatas
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Membuat akun...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Mulai Trial Gratis 14 Hari
                </>
              )}
            </button>

            {/* Terms */}
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
              Dengan mendaftar, Anda menyetujui{' '}
              <a href="/terms" style={{ color: '#6366f1', textDecoration: 'underline' }}>
                Syarat & Ketentuan
              </a>{' '}
              dan{' '}
              <a href="/privacy" style={{ color: '#6366f1', textDecoration: 'underline' }}>
                Kebijakan Privasi
              </a>
            </p>
          </form>
        </div>

        {/* Login Link */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'white' }}>
          Sudah punya akun?{' '}
          <Link href="/login" style={{ fontWeight: 600, textDecoration: 'underline' }}>
            Masuk di sini
          </Link>
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `,
      }} />
    </div>
  );
}
