'use client';

import { useState, useEffect, useRef } from 'react';
import { formatRupiah, parseRupiah } from '@/lib/date';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  min?: number;
  disabled?: boolean;
  id?: string;
}

/**
 * Input angka dengan format Rupiah otomatis.
 * Tampil: "1.000.000" — disimpan sebagai number 1000000
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'Contoh: 1.000.000',
  className = 'form-input',
  autoFocus,
  min = 0,
  disabled,
  id,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(value > 0 ? formatRupiah(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync dari luar jika value berubah
  useEffect(() => {
    setDisplay(value > 0 ? formatRupiah(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Hanya izinkan digit
    const digitsOnly = raw.replace(/\D/g, '');
    const num = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    if (min !== undefined && num < min) return;
    setDisplay(num > 0 ? formatRupiah(num) : '');
    onChange(num);
  };

  const handleFocus = () => {
    // Saat fokus, tampilkan angka saja tanpa titik agar mudah diedit
    if (value > 0) setDisplay(String(value));
  };

  const handleBlur = () => {
    // Saat blur, format kembali dengan titik ribuan
    setDisplay(value > 0 ? formatRupiah(value) : '');
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
}
