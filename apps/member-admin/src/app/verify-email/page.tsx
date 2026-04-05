'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token verifikasi tidak ditemukan.');
      return;
    }

    axios.post(`${API_URL}/auth/verify-email`, { token })
      .then(() => {
        setStatus('success');
        setMessage('Email Anda berhasil diverifikasi! Akun Anda sekarang aktif.');
        setTimeout(() => router.push('/login'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Token tidak valid atau sudah kadaluarsa.');
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '3rem 2rem', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={56} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Memverifikasi Email...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Mohon tunggu sebentar.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>Email Terverifikasi!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{message}</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Mengarahkan ke halaman login...</p>
            <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Login Sekarang <ArrowRight size={16} />
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={56} style={{ color: 'var(--danger)', margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>Verifikasi Gagal</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{message}</p>
            <Link href="/login" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Kembali ke Login
            </Link>
          </>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
