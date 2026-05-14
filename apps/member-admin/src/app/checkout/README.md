# Halaman Checkout - MonetraPOS

## Deskripsi
Halaman checkout yang lengkap untuk menyelesaikan pembayaran subscription MonetraPOS melalui Xendit payment gateway.

## Fitur Utama

### 1. **Detail Invoice**
- Menampilkan nomor invoice dengan tombol copy
- Informasi nama usaha dan paket langganan
- Total pembayaran dengan format mata uang IDR
- Tanggal kadaluarsa invoice
- Status badge (Belum Dibayar, Menunggu Konfirmasi, Lunas, Kadaluarsa)

### 2. **Metode Pembayaran**
- Instruksi pembayaran step-by-step
- Tombol "Bayar Sekarang" yang membuka payment URL Xendit di tab baru
- Support berbagai metode pembayaran (Transfer Bank, E-Wallet, QRIS, dll)

### 3. **Cek Status Pembayaran**
- Tombol untuk mengecek status pembayaran secara manual
- Auto-redirect ke halaman success setelah pembayaran dikonfirmasi
- Loading state saat mengecek status

### 4. **State Management**
- **Loading State**: Menampilkan spinner saat memuat data
- **Unpaid State**: Menampilkan tombol pembayaran dan instruksi
- **Paid State**: Menampilkan pesan sukses dan tombol ke dashboard
- **Expired State**: Menampilkan pesan kadaluarsa dan tombol registrasi ulang
- **Not Found State**: Menampilkan error jika invoice tidak ditemukan

### 5. **User Experience**
- Responsive design untuk semua ukuran layar
- Copy invoice number dengan satu klik
- Toast notifications untuk feedback
- Smooth transitions dan animations
- Support link untuk bantuan

## Flow Penggunaan

```
Register → Checkout → Payment Gateway (Xendit) → Cek Status → Success → Dashboard/Login
```

### Parameter URL
- `invoice`: Nomor invoice (required)
- `amount`: Total pembayaran (fallback)
- `paymentUrl`: URL pembayaran Xendit (optional)

### Contoh URL
```
/checkout?invoice=INV-2024-001&amount=500000&paymentUrl=https://checkout.xendit.co/...
```

## API Endpoints yang Digunakan

### 1. GET `/payment-gateway/invoice/:invoiceNumber`
Mengambil detail invoice dari backend.

**Response:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "amount": 500000,
  "status": "unpaid",
  "expiresAt": "2024-04-20T10:00:00Z",
  "paymentUrl": "https://checkout.xendit.co/...",
  "companyName": "Warung Makan Bu Sari",
  "planName": "Starter",
  "durationMonths": 1
}
```

### 2. POST `/payment-gateway/check-payment`
Mengecek status pembayaran dan mengaktifkan subscription jika sudah dibayar.

**Request:**
```json
{
  "invoiceNumber": "INV-2024-001"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Pembayaran dikonfirmasi! Subscription diaktifkan."
}
```

**Response (Pending):**
```json
{
  "success": false,
  "message": "Pembayaran belum dikonfirmasi"
}
```

## Styling

Menggunakan CSS variables dari `globals.css`:
- `--accent-base`, `--accent-lighter`: Warna primary
- `--success`, `--success-lighter`: Status sukses
- `--warning`: Status pending
- `--danger`, `--danger-lighter`: Status error/expired
- `--info`, `--info-lighter`: Informasi
- `--bg-primary`, `--bg-secondary`: Background
- `--text-primary`, `--text-secondary`, `--text-tertiary`: Text colors
- `--border-color`, `--border-subtle`: Borders
- `--radius-*`: Border radius
- `--shadow-*`: Box shadows

## Dependencies

- `next/navigation`: Routing dan URL params
- `react-hot-toast`: Toast notifications
- `lucide-react`: Icons
- `@/lib/api-client`: HTTP client untuk API calls

## Error Handling

1. **Invoice tidak ditemukan**: Menampilkan error state dengan tombol kembali ke registrasi
2. **API error**: Fallback ke data dari URL params
3. **Network error**: Toast error dengan pesan yang jelas
4. **Payment check failed**: Toast error dengan opsi retry

## Security

- Semua API calls menggunakan authenticated client
- Payment URL dibuka di tab baru untuk keamanan
- Invoice number dapat dicopy untuk referensi
- Tidak menyimpan data sensitif di localStorage

## Testing

### Manual Testing Checklist
- [ ] Load halaman dengan invoice valid
- [ ] Load halaman dengan invoice tidak valid
- [ ] Klik tombol "Bayar Sekarang"
- [ ] Klik tombol "Cek Status Pembayaran"
- [ ] Copy invoice number
- [ ] Test dengan status: unpaid, pending, paid, expired
- [ ] Test responsive di mobile
- [ ] Test dengan payment URL kosong
- [ ] Test redirect setelah pembayaran sukses

## Future Improvements

1. **Real-time Status Updates**: WebSocket untuk update status otomatis
2. **Payment History**: Menampilkan riwayat pembayaran
3. **Multiple Payment Methods**: Support payment gateway lain selain Xendit
4. **QR Code**: Generate QR code untuk pembayaran
5. **Email Notification**: Kirim email setelah pembayaran sukses
6. **Countdown Timer**: Tampilkan countdown untuk expiry time
7. **Payment Proof Upload**: Upload bukti transfer manual
8. **Installment Options**: Opsi cicilan untuk paket tertentu

## Troubleshooting

### Invoice tidak muncul
- Pastikan parameter `invoice` atau `amount` ada di URL
- Cek network tab untuk error API
- Cek console untuk error JavaScript

### Tombol "Bayar Sekarang" tidak muncul
- Pastikan `paymentUrl` tersedia dari API atau URL params
- Cek status invoice (hanya muncul untuk status unpaid/pending)

### Status tidak update setelah bayar
- Klik tombol "Cek Status Pembayaran" secara manual
- Tunggu beberapa menit untuk webhook Xendit
- Cek dengan admin jika masih bermasalah

## Support

Untuk bantuan lebih lanjut, hubungi:
- Email: support@monetrapos.com
- Dokumentasi: [Link ke docs]
