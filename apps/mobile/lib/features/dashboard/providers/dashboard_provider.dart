import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';

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
  try {
    // Fetch stores first to get a valid storeId
    final storesRes = await api.dio.get('/stores');
    final stores = List<Map<String, dynamic>>.from(storesRes.data['data'] ?? []);
    final storeId = stores.isNotEmpty ? stores.first['id'] as String? : null;

    final txParams = <String, dynamic>{
      'page': 1,
      'limit': 5,
    };
    if (storeId != null) txParams['storeId'] = storeId;

    final results = await Future.wait([
      api.dio
          .get('/transactions', queryParameters: txParams)
          .then((r) => r)
          .catchError((_) => null as dynamic),
      api.dio
          .get('/customers', queryParameters: {'page': 1, 'limit': 1})
          .then((r) => r)
          .catchError((_) => null as dynamic),
      api.dio
          .get('/products', queryParameters: {
            'page': 1,
            'limit': 1,
            'storeId': ?storeId,
          })
          .then((r) => r)
          .catchError((_) => null as dynamic),
    ]);

    final txData = (results[0] as dynamic)?.data;
    final custData = (results[1] as dynamic)?.data;
    final prodData = (results[2] as dynamic)?.data;

    final recentTx = (txData?['data'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e))
            .toList() ??
        [];

    // Calculate today's sales from recent transactions
    final today = DateTime.now();
    double todaySales = 0;
    int todayCount = 0;
    for (final tx in recentTx) {
      final createdAt = DateTime.tryParse(tx['createdAt'] ?? '');
      if (createdAt != null &&
          createdAt.year == today.year &&
          createdAt.month == today.month &&
          createdAt.day == today.day &&
          tx['status'] == 'completed') {
        todaySales += double.tryParse(tx['total']?.toString() ?? '0') ?? 0;
        todayCount++;
      }
    }

    return DashboardData(
      todaySales: todaySales,
      todayTransactions: todayCount,
      totalProducts: prodData?['total'] ?? 0,
      totalCustomers: custData?['total'] ?? 0,
      recentTransactions: recentTx.take(5).toList(),
    );
  } catch (e) {
    throw ApiException('Gagal memuat data dashboard');
  }
});
