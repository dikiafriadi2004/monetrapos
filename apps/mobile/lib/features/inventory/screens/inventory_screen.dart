import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _inventoryStoreProvider = StateProvider<String?>((ref) => null);

final _inventoryProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  final res = await api.dio.get('/inventory', queryParameters: {'storeId': storeId, 'limit': 100});
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

final _inventoryStoresProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ApiClient();
  final res = await api.dio.get('/stores');
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

class InventoryScreen extends ConsumerWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedStore = ref.watch(_inventoryStoreProvider);
    final storesAsync = ref.watch(_inventoryStoresProvider);
    final inventoryAsync = selectedStore != null ? ref.watch(_inventoryProvider(selectedStore)) : null;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(title: const Text('Inventori')),
      body: Column(
        children: [
          storesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, _e) => const SizedBox.shrink(),
            data: (stores) => Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: DropdownButtonFormField<String>(
                initialValue: selectedStore,
                decoration: const InputDecoration(labelText: 'Pilih Toko', prefixIcon: Icon(Icons.store)),
                items: stores.map((s) => DropdownMenuItem(value: s['id'] as String, child: Text(s['name']))).toList(),
                onChanged: (v) => ref.read(_inventoryStoreProvider.notifier).state = v,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: selectedStore == null
                ? const Center(child: Text('Pilih toko terlebih dahulu', style: TextStyle(color: Color(0xFF6B7280))))
                : inventoryAsync!.when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                    data: (items) {
                      if (items.isEmpty) return const Center(child: Text('Tidak ada data inventori'));
                      return RefreshIndicator(
                        onRefresh: () async => ref.invalidate(_inventoryProvider(selectedStore)),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: items.length,
                          itemBuilder: (_, i) {
                            final item = items[i];
                            final qty = item['quantity'] ?? 0;
                            final minQty = item['minimumQuantity'] ?? 0;
                            final isLow = qty <= minQty;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: isLow ? AppTheme.error.withValues(alpha: 0.1) : AppTheme.secondary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.warehouse,
                                    color: isLow ? AppTheme.error : AppTheme.secondary,
                                    size: 22,
                                  ),
                                ),
                                title: Text(item['product']?['name'] ?? item['productId'] ?? '-', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                subtitle: Text('Min: $minQty ${item['unit'] ?? 'pcs'}'),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('$qty', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: isLow ? AppTheme.error : const Color(0xFF111827))),
                                    Text(item['unit'] ?? 'pcs', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
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
