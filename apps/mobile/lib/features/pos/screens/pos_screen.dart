import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

// Cart item model
class CartItem {
  final String id;
  final String name;
  final double price;
  int quantity;

  CartItem({required this.id, required this.name, required this.price, this.quantity = 1});

  double get subtotal => price * quantity;
}

// Cart state
class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addItem(Map<String, dynamic> product) {
    final id = product['id'];
    final idx = state.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      state = [
        for (int i = 0; i < state.length; i++)
          if (i == idx) CartItem(id: state[i].id, name: state[i].name, price: state[i].price, quantity: state[i].quantity + 1)
          else state[i]
      ];
    } else {
      state = [
        ...state,
        CartItem(
          id: id,
          name: product['name'],
          price: double.tryParse(product['price']?.toString() ?? '0') ?? 0,
        ),
      ];
    }
  }

  void removeItem(String id) => state = state.where((e) => e.id != id).toList();

  void updateQty(String id, int qty) {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    state = [
      for (final item in state)
        if (item.id == id) CartItem(id: item.id, name: item.name, price: item.price, quantity: qty)
        else item
    ];
  }

  void clear() => state = [];

  double get total => state.fold(0, (sum, e) => sum + e.subtotal);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((_) => CartNotifier());

// Products for POS
final posProductsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  final res = await api.dio.get('/products', queryParameters: {'storeId': storeId, 'isActive': true, 'limit': 100});
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

// Stores provider
final storesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ApiClient();
  final res = await api.dio.get('/stores');
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  String? _selectedStoreId;
  String _search = '';
  bool _isProcessing = false;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  Future<void> _checkout() async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty || _selectedStoreId == null) return;

    setState(() => _isProcessing = true);
    try {
      final api = ApiClient();
      await api.dio.post('/transactions', data: {
        'storeId': _selectedStoreId,
        'items': cart
            .map((e) => {
                  'productId': e.id,
                  'quantity': e.quantity,
                  'price': e.price,
                })
            .toList(),
        'paymentMethod': 'cash',
      });

      ref.read(cartProvider.notifier).clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaksi berhasil!'), backgroundColor: AppTheme.secondary),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final storesAsync = ref.watch(storesProvider);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Point of Sale'),
        actions: [
          if (cart.isNotEmpty)
            TextButton.icon(
              onPressed: () => ref.read(cartProvider.notifier).clear(),
              icon: const Icon(Icons.clear_all, color: AppTheme.error),
              label: const Text('Kosongkan', style: TextStyle(color: AppTheme.error)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Store selector
          storesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, _e) => const SizedBox.shrink(),
            data: (stores) => stores.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Tidak ada toko tersedia', style: TextStyle(color: AppTheme.error)),
                  )
                : Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: DropdownButtonFormField<String>(
                      initialValue: _selectedStoreId,
                      decoration: const InputDecoration(labelText: 'Pilih Toko', prefixIcon: Icon(Icons.store)),
                      items: stores.map((s) => DropdownMenuItem<String>(value: s['id'] as String, child: Text(s['name'] as String))).toList(),
                      onChanged: (v) => setState(() => _selectedStoreId = v),
                    ),
                  ),
          ),

          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Cari produk...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),

          // Products grid
          Expanded(
            child: _selectedStoreId == null
                ? const Center(child: Text('Pilih toko terlebih dahulu', style: TextStyle(color: Color(0xFF6B7280))))
                : Consumer(
                    builder: (context, ref, _) {
                      final productsAsync = ref.watch(posProductsProvider(_selectedStoreId!));
                      return productsAsync.when(
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (e, _) => Center(child: Text('Error: $e')),
                        data: (products) {
                          final filtered = _search.isEmpty
                              ? products
                              : products.where((p) => p['name'].toString().toLowerCase().contains(_search.toLowerCase())).toList();

                          return GridView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 1.2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: filtered.length,
                            itemBuilder: (_, i) {
                              final p = filtered[i];
                              final price = double.tryParse(p['price']?.toString() ?? '0') ?? 0;
                              return InkWell(
                                onTap: () => cartNotifier.addItem(p),
                                borderRadius: BorderRadius.circular(12),
                                child: Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Center(
                                            child: Icon(Icons.inventory_2, size: 40, color: AppTheme.primary.withValues(alpha: 0.5)),
                                          ),
                                        ),
                                        Text(p['name'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        Text(currency.format(price), style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                                        if ((p['stock'] ?? 0) < 5)
                                          Text('Stok: ${p['stock']}', style: const TextStyle(color: AppTheme.error, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      );
                    },
                  ),
          ),

          // Cart summary
          if (cart.isNotEmpty)
            Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
              ),
              child: Column(
                children: [
                  // Cart items
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.builder(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: cart.length,
                      itemBuilder: (_, i) {
                        final item = cart[i];
                        return Row(
                          children: [
                            Expanded(child: Text(item.name, style: const TextStyle(fontSize: 13))),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: () => cartNotifier.updateQty(item.id, item.quantity - 1),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20),
                                  onPressed: () => cartNotifier.updateQty(item.id, item.quantity + 1),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                              ],
                            ),
                            SizedBox(width: 80, child: Text(currency.format(item.subtotal), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                          ],
                        );
                      },
                    ),
                  ),
                  // Total & checkout
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total', style: TextStyle(color: Color(0xFF6B7280))),
                            Text(currency.format(cartNotifier.total), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isProcessing ? null : _checkout,
                            icon: _isProcessing
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(Icons.payment),
                            label: Text(_isProcessing ? 'Memproses...' : 'Bayar'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
