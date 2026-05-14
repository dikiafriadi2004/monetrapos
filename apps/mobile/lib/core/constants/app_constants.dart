class AppConstants {
  static const String appName = 'MonetraPOS';

  // ─── API URL ───────────────────────────────────────────────────────────────
  // IP public — pastikan port forwarding Mikrotik sudah dikonfigurasi
  static const String baseUrl = 'http://5.181.178.226:4404/api/v1';

  // ─── Storage Keys ──────────────────────────────────────────────────────────
  static const String tokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String storeKey = 'selected_store';
  static const String printerKey = 'printer_config';
  // Migration key — sudah tidak dipakai, hapus untuk menghindari force logout
  static const String authVersionKey = 'auth_version';
  static const String authVersion = '2';

  // ─── Timeouts ──────────────────────────────────────────────────────────────
  static const int connectTimeout = 15000;
  static const int receiveTimeout = 15000;

  // ─── POS ───────────────────────────────────────────────────────────────────
  static const double pointValue = 100; // 1 poin = Rp 100
  static const int printerPaperWidth = 58; // 58mm atau 80mm
}
