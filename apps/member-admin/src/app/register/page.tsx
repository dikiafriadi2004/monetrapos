"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Store, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register/member', formData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-xl)' }}>
        <div className="glass-panel animate-fade-in text-center" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-2xl) var(--space-xl)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)' }}>
            <Store size={40} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-sm)' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to MonetRAPOS. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: 'var(--space-xl)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-xl)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2>Grow Your Business</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
            Create your MonetRAPOS account
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ 
            display: 'flex', width: '100%', marginBottom: 'var(--space-md)', 
            padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="owner@mybusiness.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', background: 'var(--success)' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--success)', fontWeight: 600 }}>Sign in</Link>
        </p>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
