class AppConstants {
  static const String appName = 'MonetraPOS';
  static const String baseUrl = 'http://10.0.2.2:4404/api/v1'; // Android emulator
  // static const String baseUrl = 'http://localhost:4404/api/v1'; // iOS simulator

  static const String tokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';

  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
}
