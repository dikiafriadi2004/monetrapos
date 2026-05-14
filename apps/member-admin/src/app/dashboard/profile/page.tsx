'use client';

import { useState, useEffect } from 'react';
import { Save, KeyRound, Hash, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [myProfile, setMyProfile] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pinForm, setPinForm] = useState({ newPin: '', confirmPin: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (user) {
      setMyProfile({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProfile.name.trim()) { toast.error('Nama tidak boleh kosong'); return; }
    setSavingProfile(true);
    try {
      await apiClient.patch('/auth/profile', { name: myProfile.name });
      await refreshUser();
      toast.success('Profile berhasil diperbarui');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui profile');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Password baru tidak cocok'); return; }
    if (passwordForm.newPassword.length < 8) { toast.error('Password minimal 8 karakter'); return; }
    setSavingPassword(true);
    try {
      await apiClient.patch('/auth/profile', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password berhasil diubah');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah password');
    } finally { setSavingPassword(false); }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin && !/^\d{4,6}$/.test(pinForm.newPin)) { toast.error('PIN harus 4-6 digit angka'); return; }
    if (pinForm.newPin && pinForm.newPin !== pinForm.confirmPin) { toast.error('Konfirmasi PIN tidak cocok'); return; }
    setSavingPin(true);
    try {
      await apiClient.patch('/auth/profile', { pin: pinForm.newPin || '' });
      toast.success(pinForm.newPin ? 'PIN berhasil diubah' : 'PIN berhasil dihapus');
      setPinForm({ newPin: '', confirmPin: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah PIN');
    } finally { setSavingPin(false); }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola informasi akun dan keamanan Anda.</p>
      </div>

      <div className="space-y-4">
        {/* Edit Profile */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User size={15} /> Informasi Akun
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  className="form-input"
                  value={myProfile.name}
                  onChange={e => setMyProfile({ ...myProfile, name: e.target.value })}
                  placeholder="Nama lengkap"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input bg-gray-50" value={myProfile.email} disabled />
                <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <KeyRound size={15} /> Ganti Password
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Password Saat Ini</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Masukkan password saat ini"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Ganti Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change PIN */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Hash size={15} /> PIN Kasir
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              PIN digunakan untuk absensi dan login cepat di POS (4-6 digit angka)
            </p>
          </div>
          <div className="card-body">
            <form onSubmit={handleChangePin} className="space-y-4">
              <div className="form-group">
                <label className="form-label">PIN Baru (kosongkan untuk hapus PIN)</label>
                <input
                  type="password"
                  className="form-input"
                  value={pinForm.newPin}
                  onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="4-6 digit angka"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              {pinForm.newPin && (
                <div className="form-group">
                  <label className="form-label">Konfirmasi PIN Baru</label>
                  <input
                    type="password"
                    className="form-input"
                    value={pinForm.confirmPin}
                    onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Ulangi PIN baru"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingPin}>
                  {savingPin ? <Loader2 size={14} className="animate-spin" /> : <Hash size={14} />}
                  {pinForm.newPin ? 'Simpan PIN' : 'Hapus PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
