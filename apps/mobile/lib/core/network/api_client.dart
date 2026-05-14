import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class ApiClient {
  // True singleton — hanya satu instance selamanya
  static final ApiClient _singleton = ApiClient._internal();
  factory ApiClient() => _singleton;

  late final Dio dio;
  final storage = const FlutterSecureStorage();

  // Token di-cache di memory untuk akses cepat tanpa async storage read
  String? _token;

  ApiClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(milliseconds: AppConstants.connectTimeout),
      receiveTimeout: const Duration(milliseconds: AppConstants.receiveTimeout),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        // Gunakan token dari memory cache — tidak perlu async
        if (_token != null && _token!.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $_token';
          debugPrint('ApiClient: sending request to ${options.path} WITH token');
        } else {
          debugPrint('ApiClient: sending request to ${options.path} WITHOUT token');
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Jangan handle 401 untuk login endpoints
          final path = error.requestOptions.path;
          if (path.contains('/auth/login') || path.contains('/auth/refresh')) {
            handler.next(error);
            return;
          }
          // Cek apakah token yang dipakai request ini sama dengan token saat ini
          final requestToken = error.requestOptions.headers['Authorization']?.toString().replaceFirst('Bearer ', '');
          if (requestToken != null && _token != null && requestToken != _token) {
            handler.next(error);
            return;
          }
          final refreshed = await _refreshToken();
          if (refreshed && _token != null) {
            error.requestOptions.headers['Authorization'] = 'Bearer $_token';
            final response = await dio.fetch(error.requestOptions);
            return handler.resolve(response);
          }
          _token = null;
          await storage.deleteAll();
          debugPrint('ApiClient: token expired, cleared');
        }
        handler.next(error);
      },
    ));
  }

  // ─── Token Management ─────────────────────────────────────────────────────

  /// Set token setelah login — simpan ke memory DAN storage
  Future<void> saveToken(String token, String refreshToken) async {
    _token = token;
    await storage.write(key: AppConstants.tokenKey, value: token);
    await storage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
    debugPrint('ApiClient: token saved');
  }

  /// Load token dari storage saat app restart
  Future<void> loadToken() async {
    final token = await storage.read(key: AppConstants.tokenKey);
    if (token != null && token.isNotEmpty) {
      _token = token;
      debugPrint('ApiClient: token loaded from storage');
    }
  }

  /// Clear token saat logout
  Future<void> clearToken() async {
    _token = null;
    await storage.deleteAll();
    debugPrint('ApiClient: token cleared');
  }

  /// Cek apakah ada token
  bool get hasToken => _token != null && _token!.isNotEmpty;

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await storage.read(key: AppConstants.refreshTokenKey);
      if (refreshToken == null) return false;

      final response = await Dio().post(
        '${AppConstants.baseUrl}/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final newToken = response.data['accessToken'] as String;
      _token = newToken;
      await storage.write(key: AppConstants.tokenKey, value: newToken);
      return true;
    } catch (_) {
      _token = null;
      await storage.deleteAll();
      return false;
    }
  }
}
