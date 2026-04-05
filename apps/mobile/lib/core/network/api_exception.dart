import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  factory ApiException.fromDioError(DioException e) {
    final data = e.response?.data;
    String msg = 'Terjadi kesalahan';

    if (data is Map) {
      msg = data['message']?.toString() ?? msg;
    } else if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      msg = 'Koneksi timeout. Periksa jaringan Anda.';
    } else if (e.type == DioExceptionType.connectionError) {
      msg = 'Tidak dapat terhubung ke server.';
    }

    return ApiException(msg, statusCode: e.response?.statusCode);
  }

  @override
  String toString() => message;
}
