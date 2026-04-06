import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _txStoreProvider = StateProvider<String?>((ref) => null);

final _txStoresProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ApiClient();
  final res = await api.dio.get('/stores');
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

final _transactionsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  final res = await api.dio.get('/transactions', queryParameters: {
    'storeId': storeId,
    'limit': 50,
    'page': 1,
  });
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedStore = ref.watch(_txStoreProvider);
    final storesAsync = ref.watch(_txStoresProvider);
    final txAsync = selectedStore != null
        ? ref.watch(_transactionsProvider(selectedStore))
        : null;
    final currency =
        NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Transaksi'),
        actions: [
          if (selectedStore != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.invalidate(_transactionsProvider(selectedStore)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Store selector
          storesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
            data: (stores) => stores.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Tidak ada toko tersedia',
                        style: TextStyle(color: AppTheme.error)),
                  )
                : Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: DropdownButtonFormField<String>(
                      initialValue: selectedStore,
                      decoration: const InputDecoration(
                          labelText: 'Pilih Toko',
                          prefixIcon: Icon(Icons.store)),
                      items: stores
                          .map((s) => DropdownMenuItem<String>(
                              value: s['id'] as String,
                              child: Text(s['name'] as String)))
                          .toList(),
                      onChanged: (v) =>
                          ref.read(_txStoreProvider.notifier).state = v,
                    ),
                  ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: selectedStore == null
                ? const Center(
                    child: Text('Pilih toko terlebih dahulu',
                        style: TextStyle(color: Color(0xFF6B7280))))
                : txAsync!.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                    data: (transactions) {
                      if (transactions.isEmpty) {
                        return const Center(
                            child: Text('Belum ada transaksi'));
                      }
                      return RefreshIndicator(
                        onRefresh: () async =>
                            ref.invalidate(_transactionsProvider(selectedStore)),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: transactions.length,
                          itemBuilder: (_, i) {
                            final tx = transactions[i];
                            final total = double.tryParse(
                                    tx['total']?.toString() ?? '0') ??
                                0;
                            final status = tx['status'] ?? '';
                            final statusColor = status == 'completed'
                                ? AppTheme.secondary
                                : AppTheme.warning;
                            final date =
                                tx['createdAt']?.toString().substring(0, 10) ??
                                    '-';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.receipt_long,
                                      color: AppTheme.primary, size: 22),
                                ),
                                title: Text(
                                    tx['transactionNumber'] ?? '-',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14)),
                                subtitle: Text(date,
                                    style: const TextStyle(fontSize: 12)),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(currency.format(total),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14)),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: statusColor
                                            .withValues(alpha: 0.1),
                                        borderRadius:
                                            BorderRadius.circular(4),
                                      ),
                                      child: Text(status,
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: statusColor,
                                              fontWeight: FontWeight.w500)),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
