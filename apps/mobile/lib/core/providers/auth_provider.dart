import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_constants.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
import '../models/models.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final UserModel? user;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    UserModel? user,
    String? error,
    bool clearError = false,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        isLoading: isLoading ?? this.isLoading,
        user: user ?? this.user,
        error: clearError ? null : error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final _api = ApiClient();

  AuthNotifier() : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    state = state.copyWith(isLoading: true);
    try {
      await _api.loadToken();
      if (_api.hasToken) {
        final userData = await _api.storage.read(key: AppConstants.userKey);
        if (userData != null) {
          final user = UserModel.fromJson(jsonDecode(userData));
          debugPrint('_checkAuth: user=${user.email} storeId=${user.storeId} type=${user.type}');
          try {
            await _api.dio.get('/auth/me');
            state = state.copyWith(isAuthenticated: true, isLoading: false, user: user);
            return;
          } catch (e) {
            debugPrint('_checkAuth /auth/me error: $e — clearing token');
            await _api.clearToken();
          }
        }
      }
    } catch (e) {
      debugPrint('_checkAuth error: $e');
    }
    state = state.copyWith(isLoading: false);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    // Coba employee dulu — employee punya storeId yang dibutuhkan POS
    try {
      final response = await _api.dio.post('/auth/login/employee', data: {
        'email': email,
        'password': password,
      });
      return _handleLoginResponse(response.data);
    } catch (_) {}
    // Fallback ke member (owner/admin)
    try {
      final response = await _api.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return _handleLoginResponse(response.data);
    } catch (e) {
      final msg = ApiException.fromDioError(e as dynamic).message;
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<bool> loginPin(String pin) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _api.dio.post('/auth/login/pin', data: {'pin': pin});
      return _handleLoginResponse(response.data);
    } catch (e) {
      final msg = e is Exception ? ApiException.fromDioError(e as dynamic).message : e.toString();
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  Future<bool> _handleLoginResponse(Map<String, dynamic> data) async {
    final token = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    await _api.saveToken(token, refreshToken);

    final user = UserModel.fromJson(data['user']);
    await _api.storage.write(key: AppConstants.userKey, value: jsonEncode(data['user']));

    state = state.copyWith(isAuthenticated: true, isLoading: false, user: user);
    return true;
  }

  Future<void> logout() async {
    await _api.clearToken();
    state = const AuthState();
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
