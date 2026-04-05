import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _storeIdProvider = StateProvider<String?>((ref) => null);

final _productsProvider = FutureProvider.family<Map<String, dynamic>, Map<String, dynamic>>((ref, params) async {
  final api = ApiClient();
  final res = await api.dio.get('/products', queryParameters: params);
  return Map<String, dynamic>.from(res.data);
});

final _storesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ApiClient();
  final res = await api.dio.get('/stores');
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  String _search = '';
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final selectedStore = ref.watch(_storeIdProvider);
    final storesAsync = ref.watch(_storesListProvider);

    final params = {
      'storeId': selectedStore ?? '',
      'search': _search,
      'limit': 50,
      'isActive': true,
    };

    final productsAsync = selectedStore != null ? ref.watch(_productsProvider(params)) : null;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(title: const Text('Produk')),
      body: Column(
        children: [
          // Store selector
          storesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, _e) => const SizedBox.shrink(),
            data: (stores) => Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: DropdownButtonFormField<String>(
                initialValue: selectedStore,
                decoration: const InputDecoration(labelText: 'Pilih Toko', prefixIcon: Icon(Icons.store)),
                items: stores.map((s) => DropdownMenuItem(value: s['id'] as String, child: Text(s['name']))).toList(),
                onChanged: (v) => ref.read(_storeIdProvider.notifier).state = v,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Cari produk...', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: selectedStore == null
                ? const Center(child: Text('Pilih toko terlebih dahulu', style: TextStyle(color: Color(0xFF6B7280))))
                : productsAsync!.when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                    data: (data) {
                      final products = List<Map<String, dynamic>>.from(data['data'] ?? []);
                      if (products.isEmpty) {
                        return const Center(child: Text('Tidak ada produk'));
                      }
                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: products.length,
                        itemBuilder: (_, i) {
                          final p = products[i];
                          final price = double.tryParse(p['price']?.toString() ?? '0') ?? 0;
                          final stock = p['stock'] ?? 0;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.inventory_2, color: AppTheme.primary),
                              ),
                              title: Text(p['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text('SKU: ${p['sku'] ?? '-'}'),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(currency.format(price), style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                  Text('Stok: $stock', style: TextStyle(fontSize: 12, color: stock < 5 ? AppTheme.error : const Color(0xFF6B7280))),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
