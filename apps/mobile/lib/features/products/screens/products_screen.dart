import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/providers/auth_provider.dart';
import '../../pos/providers/pos_provider.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final _productSearchProvider = StateProvider<String>((ref) => '');
final _productCategoryProvider = StateProvider<String?>((ref) => null);

final _productsListProvider = FutureProvider.family<List<ProductModel>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final search = ref.watch(_productSearchProvider);
  final categoryId = ref.watch(_productCategoryProvider);
  final api = ApiClient();
  final params = <String, dynamic>{'storeId': storeId, 'limit': 100, 'isActive': true};
  if (search.isNotEmpty) params['search'] = search;
  if (categoryId != null) params['categoryId'] = categoryId;
  final res = await api.dio.get('/products', queryParameters: params);
  final list = res.data is List ? res.data : (res.data['data'] ?? []);
  return (list as List).map((e) => ProductModel.fromJson(e)).toList();
});

// ─── Screen ───────────────────────────────────────────────────────────────────

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});
  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  final _searchCtrl = TextEditingController();
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider).user;
      final storeId = user?.storeId ?? ref.read(selectedStoreProvider)?.id;
      if (storeId != null && ref.read(selectedStoreProvider) == null) {
        ref.read(storeByIdProvider(storeId)).whenData((store) {
          if (store != null) ref.read(selectedStoreProvider.notifier).state = store;
        });
      }
    });
  }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final selectedStore = ref.watch(selectedStoreProvider);
    final search = ref.watch(_productSearchProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Produk'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () {
            if (selectedStore != null) ref.invalidate(_productsListProvider(selectedStore.id));
          }),
        ],
      ),
      body: Column(children: [
        // Store selector — hanya untuk owner/admin
        Consumer(builder: (_, ref, __) {
          final user = ref.watch(authProvider).user;
          if (user?.type == 'employee') return const SizedBox.shrink();
          return ref.watch(storesProvider).when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
            data: (stores) => stores.isEmpty ? const SizedBox.shrink() : Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
              child: DropdownButtonFormField<String>(
                initialValue: selectedStore?.id,
                decoration: const InputDecoration(labelText: 'Toko', prefixIcon: Icon(Icons.store, size: 18), isDense: true),
                items: stores.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                onChanged: (v) {
                  final store = stores.firstWhere((s) => s.id == v);
                  ref.read(selectedStoreProvider.notifier).state = store;
                },
              ),
            ),
          );
        }),
        // Search
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Cari produk, SKU, barcode...',
              prefixIcon: const Icon(Icons.search, size: 18),
              isDense: true,
              suffixIcon: search.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () {
                      _searchCtrl.clear();
                      ref.read(_productSearchProvider.notifier).state = '';
                    })
                  : null,
            ),
            onChanged: (v) => ref.read(_productSearchProvider.notifier).state = v,
          ),
        ),
        const SizedBox(height: 4),
        const Divider(height: 1),
        // Products list
        Expanded(
          child: selectedStore == null
              ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.store_outlined, size: 56, color: AppColors.gray300),
                  SizedBox(height: 12),
                  Text('Pilih toko untuk melihat produk', style: TextStyle(color: AppColors.gray500)),
                ]))
              : Consumer(builder: (ctx, ref, _) {
                  final productsAsync = ref.watch(_productsListProvider(selectedStore.id));
                  return productsAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 8),
                      Text(e.toString()),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: () => ref.invalidate(_productsListProvider(selectedStore.id)),
                          style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                          child: const Text('Coba Lagi')),
                    ])),
                    data: (products) {
                      if (products.isEmpty) {
                        return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.inventory_2_outlined, size: 56, color: AppColors.gray300),
                          const SizedBox(height: 12),
                          Text(search.isNotEmpty ? 'Produk "$search" tidak ditemukan' : 'Belum ada produk',
                              style: const TextStyle(color: AppColors.gray500)),
                        ]));
                      }
                      // Summary bar
                      final lowStock = products.where((p) => p.stock <= 5).length;
                      return Column(children: [
                        if (lowStock > 0)
                          Container(
                            margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.warningLight,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                            ),
                            child: Row(children: [
                              const Icon(Icons.warning_amber_outlined, color: AppColors.warning, size: 16),
                              const SizedBox(width: 8),
                              Text('$lowStock produk stok menipis', style: const TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.w500)),
                            ]),
                          ),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: () async => ref.invalidate(_productsListProvider(selectedStore.id)),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: products.length,
                              itemBuilder: (_, i) => _ProductTile(product: products[i], currency: currency),
                            ),
                          ),
                        ),
                      ]);
                    },
                  );
                }),
        ),
      ]),
    );
  }
}

// ─── Product Tile ─────────────────────────────────────────────────────────────

class _ProductTile extends StatelessWidget {
  final ProductModel product;
  final NumberFormat currency;
  const _ProductTile({required this.product, required this.currency});

  @override
  Widget build(BuildContext context) {
    final isLow = product.stock <= 5;
    final isOut = product.stock <= 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isOut ? AppColors.error.withValues(alpha: 0.3) : isLow ? AppColors.warning.withValues(alpha: 0.3) : AppColors.gray200),
      ),
      child: Row(children: [
        // Image
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            width: 52, height: 52,
            child: product.imageUrl != null
                ? CachedNetworkImage(imageUrl: product.imageUrl!, fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => _placeholder())
                : _placeholder(),
          ),
        ),
        const SizedBox(width: 12),
        // Info
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(product.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Row(children: [
            if (product.sku != null) Text('SKU: ${product.sku}', style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
            if (product.categoryName != null) ...[
              if (product.sku != null) const Text(' · ', style: TextStyle(fontSize: 11, color: AppColors.gray400)),
              Text(product.categoryName!, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
            ],
          ]),
          const SizedBox(height: 4),
          Text(currency.format(product.price), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13)),
        ])),
        // Stock
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isOut ? AppColors.errorLight : isLow ? AppColors.warningLight : AppColors.successLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('${product.stock}', style: TextStyle(
              fontWeight: FontWeight.bold, fontSize: 16,
              color: isOut ? AppColors.error : isLow ? AppColors.warning : AppColors.success,
            )),
          ),
          const SizedBox(height: 2),
          Text(isOut ? 'Habis' : isLow ? 'Menipis' : 'Tersedia',
              style: TextStyle(fontSize: 10, color: isOut ? AppColors.error : isLow ? AppColors.warning : AppColors.success)),
        ]),
      ]),
    );
  }

  Widget _placeholder() => Container(
    color: AppColors.gray100,
    child: Center(child: Text(product.name.isNotEmpty ? product.name[0].toUpperCase() : '?',
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.gray400))),
  );
}
