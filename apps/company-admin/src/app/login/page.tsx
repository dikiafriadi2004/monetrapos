"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res: any = await api.post('/admin/auth/login', { email, password });
      const token = res.accessToken || res.access_token || res.token;
      if (token) {
        localStorage.setItem('company_token', token);
        // Store user info for display
        if (res.user) localStorage.setItem('company_user', JSON.stringify(res.user));
        router.push('/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MonetraPOS</h1>
          <p className="text-sm text-gray-500 mt-1">Company Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your admin credentials to continue</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@monetrapos.com" required autoFocus/>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="form-input pr-10" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin"/> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2026 MonetraPOS. All rights reserved.</p>
      </div>
    </div>
  );
}

