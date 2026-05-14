import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../pos/providers/pos_provider.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final _inventoryFilterProvider = StateProvider<String>((ref) => 'all'); // all | low | out

final _inventoryProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  final res = await api.dio.get('/inventory', queryParameters: {'storeId': storeId, 'limit': 200});
  final list = res.data is List ? res.data : (res.data['data'] ?? []);
  return List<Map<String, dynamic>>.from(list);
});

// ─── Screen ───────────────────────────────────────────────────────────────────

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
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
  Widget build(BuildContext context) {
    final selectedStore = ref.watch(selectedStoreProvider);
    final filter = ref.watch(_inventoryFilterProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Inventori'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () {
            if (selectedStore != null) ref.invalidate(_inventoryProvider(selectedStore.id));
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
        // Filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: Row(children: [
            _FilterChip(label: 'Semua', value: 'all', groupValue: filter,
                onTap: () => ref.read(_inventoryFilterProvider.notifier).state = 'all'),
            const SizedBox(width: 8),
            _FilterChip(label: '⚠️ Stok Menipis', value: 'low', groupValue: filter, color: AppColors.warning,
                onTap: () => ref.read(_inventoryFilterProvider.notifier).state = 'low'),
            const SizedBox(width: 8),
            _FilterChip(label: '🔴 Stok Habis', value: 'out', groupValue: filter, color: AppColors.error,
                onTap: () => ref.read(_inventoryFilterProvider.notifier).state = 'out'),
          ]),
        ),
        const Divider(height: 1),
        // List
        Expanded(
          child: selectedStore == null
              ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.warehouse_outlined, size: 56, color: AppColors.gray300),
                  SizedBox(height: 12),
                  Text('Pilih toko untuk melihat inventori', style: TextStyle(color: AppColors.gray500)),
                ]))
              : Consumer(builder: (ctx, ref, _) {
                  final inventoryAsync = ref.watch(_inventoryProvider(selectedStore.id));
                  return inventoryAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 8),
                      Text(e.toString()),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: () => ref.invalidate(_inventoryProvider(selectedStore.id)),
                          style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                          child: const Text('Coba Lagi')),
                    ])),
                    data: (items) {
                      // Apply filter
                      final filtered = items.where((item) {
                        final qty = item['quantity'] ?? 0;
                        final min = item['minimumQuantity'] ?? 0;
                        if (filter == 'out') return qty <= 0;
                        if (filter == 'low') return qty > 0 && qty <= min;
                        return true;
                      }).toList();

                      // Stats
                      final outCount = items.where((i) => (i['quantity'] ?? 0) <= 0).length;
                      final lowCount = items.where((i) {
                        final q = i['quantity'] ?? 0;
                        final m = i['minimumQuantity'] ?? 0;
                        return q > 0 && q <= m;
                      }).length;

                      if (filtered.isEmpty) {
                        return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.check_circle_outline, size: 56, color: AppColors.success),
                          const SizedBox(height: 12),
                          Text(filter == 'all' ? 'Tidak ada data inventori' : 'Tidak ada produk dengan kondisi ini',
                              style: const TextStyle(color: AppColors.gray500)),
                        ]));
                      }

                      return Column(children: [
                        // Summary
                        if (outCount > 0 || lowCount > 0)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                            child: Row(children: [
                              if (outCount > 0) Expanded(child: _SummaryCard(
                                label: 'Stok Habis', value: '$outCount', color: AppColors.error, icon: Icons.remove_circle_outline)),
                              if (outCount > 0 && lowCount > 0) const SizedBox(width: 8),
                              if (lowCount > 0) Expanded(child: _SummaryCard(
                                label: 'Stok Menipis', value: '$lowCount', color: AppColors.warning, icon: Icons.warning_amber_outlined)),
                            ]),
                          ),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: () async => ref.invalidate(_inventoryProvider(selectedStore.id)),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filtered.length,
                              itemBuilder: (_, i) => _InventoryTile(item: filtered[i]),
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

// ─── Inventory Tile ───────────────────────────────────────────────────────────

class _InventoryTile extends StatelessWidget {
  final Map<String, dynamic> item;
  const _InventoryTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final qty = item['quantity'] ?? 0;
    final min = item['minimumQuantity'] ?? 0;
    final isOut = qty <= 0;
    final isLow = qty > 0 && qty <= min;
    final name = item['product']?['name'] ?? item['productId'] ?? '-';
    final sku = item['product']?['sku'];
    final unit = item['unit'] ?? 'pcs';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isOut ? AppColors.error.withValues(alpha: 0.4) : isLow ? AppColors.warning.withValues(alpha: 0.4) : AppColors.gray200,
          width: (isOut || isLow) ? 1.5 : 1,
        ),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: isOut ? AppColors.errorLight : isLow ? AppColors.warningLight : AppColors.successLight,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.inventory_2_outlined,
              color: isOut ? AppColors.error : isLow ? AppColors.warning : AppColors.success, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
          if (sku != null) Text('SKU: $sku', style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
          Text('Min: $min $unit', style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('$qty', style: TextStyle(
            fontSize: 22, fontWeight: FontWeight.bold,
            color: isOut ? AppColors.error : isLow ? AppColors.warning : AppColors.success,
          )),
          Text(unit, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
        ]),
      ]),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _SummaryCard({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
          Text(label, style: TextStyle(fontSize: 11, color: color)),
        ]),
      ]),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final String groupValue;
  final Color? color;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.value, required this.groupValue, this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    final c = color ?? AppColors.primary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? c : AppColors.gray100,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? Colors.white : AppColors.gray600)),
      ),
    );
  }
}
