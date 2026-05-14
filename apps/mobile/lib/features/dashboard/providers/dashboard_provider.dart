import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';
import '../../pos/providers/pos_provider.dart';

class DashboardData {
  final double todaySales;
  final int todayTransactions;
  final int totalProducts;
  final int totalCustomers;
  final List<Map<String, dynamic>> recentTransactions;

  const DashboardData({
    this.todaySales = 0,
    this.todayTransactions = 0,
    this.totalProducts = 0,
    this.totalCustomers = 0,
    this.recentTransactions = const [],
  });
}

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final api = ApiClient();
  if (!api.hasToken) return const DashboardData();

  // Ambil storeId dari user atau selectedStore
  final user = ref.read(authProvider).user;
  final selectedStore = ref.read(selectedStoreProvider);
  final storeId = user?.storeId ?? selectedStore?.id;

  final today = DateTime.now();
  final startOfDay = DateTime(today.year, today.month, today.day).toIso8601String();
  final endOfDay = DateTime(today.year, today.month, today.day, 23, 59, 59).toIso8601String();

  double todaySales = 0;
  int todayTx = 0;
  int totalProducts = 0;
  int totalCustomers = 0;
  List<Map<String, dynamic>> recentTx = [];

  try {
    final params = <String, dynamic>{
      'startDate': startOfDay, 'endDate': endOfDay, 'limit': 50,
    };
    if (storeId != null) params['storeId'] = storeId;
    final r = await api.dio.get('/transactions', queryParameters: params);
    final list = r.data is List ? r.data : (r.data['data'] ?? []);
    final txList = List<Map<String, dynamic>>.from(list);
    todaySales = txList.where((tx) => tx['status'] == 'completed')
        .fold(0.0, (sum, tx) => sum + (double.tryParse(tx['total']?.toString() ?? '0') ?? 0));
    todayTx = txList.where((tx) => tx['status'] == 'completed').length;
    recentTx = txList.take(5).toList();
  } catch (e) { debugPrint('Dashboard tx error: $e'); }

  try {
    final params = <String, dynamic>{'limit': 1};
    if (storeId != null) params['storeId'] = storeId;
    final r = await api.dio.get('/products', queryParameters: params);
    final data = r.data;
    totalProducts = data is Map ? (int.tryParse(data['total']?.toString() ?? '0') ?? 0) : 0;
  } catch (e) { debugPrint('Dashboard products error: $e'); }

  try {
    final r = await api.dio.get('/customers', queryParameters: {'limit': 1});
    final data = r.data;
    totalCustomers = data is Map ? (int.tryParse(data['total']?.toString() ?? '0') ?? 0) : 0;
  } catch (e) { debugPrint('Dashboard customers error: $e'); }

  return DashboardData(
    todaySales: todaySales,
    todayTransactions: todayTx,
    totalProducts: totalProducts,
    totalCustomers: totalCustomers,
    recentTransactions: recentTx,
  );
});
