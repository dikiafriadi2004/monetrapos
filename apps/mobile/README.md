# MonetraPOS Mobile — Flutter POS App

Aplikasi Point of Sale profesional untuk Android & iOS.

## Fitur

- ✅ Login Member (Owner/Admin) & Employee (Kasir/Staff)
- ✅ Pilih Toko & Buka/Tutup Shift
- ✅ POS dengan grid produk, search, filter kategori
- ✅ Keranjang belanja dengan qty control
- ✅ Pilih pelanggan & loyalty points
- ✅ Multiple payment methods (Cash, QRIS, Transfer, EDC)
- ✅ Cetak struk thermal (Bluetooth & Network)
- ✅ Responsive: HP, Tablet, Mesin EDC
- ✅ Dashboard ringkasan penjualan
- ✅ Riwayat transaksi
- ✅ Manajemen pelanggan

## Setup

### 1. Konfigurasi API URL

Edit `lib/core/constants/app_constants.dart`:
```dart
static const String baseUrl = 'http://YOUR_SERVER_IP:4404/api/v1';
```

### 2. Install dependencies
```bash
flutter pub get
```

### 3. Run
```bash
flutter run
```

## Printer Thermal

### Bluetooth
1. Buka Settings → Printer
2. Tap "Scan" untuk cari printer
3. Tap "Hubungkan" pada printer yang ditemukan

### Network (TCP/IP)
1. Pastikan printer terhubung ke WiFi yang sama
2. Masukkan IP printer (biasanya 192.168.x.x)
3. Port default: 9100

### Mesin EDC
- Printer bawaan EDC menggunakan SDK khusus per vendor
- Hubungi vendor EDC untuk integrasi SDK

## Struktur

```
lib/
├── core/
│   ├── constants/     # App constants & API URL
│   ├── models/        # Data models
│   ├── network/       # API client & exceptions
│   ├── providers/     # Auth provider
│   ├── router/        # App routing
│   ├── services/      # Printer service
│   └── theme/         # App theme & colors
└── features/
    ├── auth/          # Login screen
    ├── dashboard/     # Dashboard
    ├── pos/           # POS screen + cart + payment
    ├── transactions/  # Transaction history
    ├── customers/     # Customer management
    ├── products/      # Product list
    ├── inventory/     # Inventory
    └── settings/      # Settings + printer config
```
