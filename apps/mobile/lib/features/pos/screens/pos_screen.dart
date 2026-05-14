import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/pos_provider.dart';
import '../widgets/cart_panel.dart';
import '../widgets/shift_gate.dart';
import '../widgets/customer_search_sheet.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> with TickerProviderStateMixin {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String? _selectedCategoryId;
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 1, vsync: this);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final employeeStoreId = user?.storeId ?? '';

    // Auto-fetch store untuk employee — gunakan ref.listen agar tidak loop
    if (employeeStoreId.isNotEmpty) {
      ref.listen(storeByIdProvider(employeeStoreId), (_, next) {
        next.whenData((fetchedStore) {
          if (fetchedStore == null) return;
          final current = ref.read(selectedStoreProvider);
          if (current?.id != fetchedStore.id) {
            ref.read(selectedStoreProvider.notifier).state = fetchedStore;
          }
        });
      });
    }

    final store = ref.watch(selectedStoreProvider);
    final shift = ref.watch(activeShiftProvider);
    final cart = ref.watch(cartProvider);
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 768;
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    // Employee dengan storeId tapi store belum di-set — tampilkan loading
    if (store == null && employeeStoreId.isNotEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.surface,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Owner/admin tanpa storeId — tampilkan store selector
    if (store == null) {
      return _StoreSelector(onSelected: (s) {
        ref.read(selectedStoreProvider.notifier).state = s;
        ref.invalidate(posProductsProvider(s.id));
        ref.invalidate(categoriesProvider(s.id));
        ref.invalidate(paymentMethodsProvider(s.id));
      });
    }

    if (shift == null) {
      return ShiftGate(store: store);
    }

    return Scaffold(
      backgroundColor: AppColors.gray100,
      appBar: _buildAppBar(store, shift, cart, currency),
      body: isTablet
          ? _buildTabletLayout(store, cart, currency)
          : _buildPhoneLayout(store, cart, currency),
    );
  }

  PreferredSizeWidget _buildAppBar(StoreModel store, ShiftModel shift, CartState cart, NumberFormat currency) {
    return AppBar(
      backgroundColor: AppColors.white,
      elevation: 0,
      titleSpacing: 0,
      leading: Padding(
        padding: const EdgeInsets.only(left: 12),
        child: Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.point_of_sale, color: Colors.white, size: 20),
        ),
      ),
      title: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(store.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.gray900)),
            Row(children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              const Text('Shift aktif', style: TextStyle(fontSize: 11, color: AppColors.success)),
            ]),
          ],
        ),
      ),
      actions: [
        // FnB Active Orders button
        Consumer(builder: (ctx, ref, _) {
          final ordersAsync = ref.watch(fnbActiveOrdersProvider(store.id));
          final count = ordersAsync.valueOrNull?.length ?? 0;
          return Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.restaurant_menu, size: 22),
                tooltip: 'Order Aktif',
                onPressed: () => _showFnbOrdersPanel(ctx, store),
              ),
              if (count > 0)
                Positioned(
                  right: 4, top: 4,
                  child: Container(
                    width: 16, height: 16,
                    decoration: const BoxDecoration(color: AppColors.warning, shape: BoxShape.circle),
                    child: Center(child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
                  ),
                ),
            ],
          );
        }),
        // Customer button
        Consumer(builder: (ctx, ref, _) {
          final customer = ref.watch(cartProvider).customer;
          return TextButton.icon(
            onPressed: () => _showCustomerSearch(ctx),
            icon: Icon(customer != null ? Icons.person : Icons.person_add_outlined,
                size: 18, color: customer != null ? AppColors.primary : AppColors.gray500),
            label: Text(
              customer != null ? customer.name.split(' ').first : 'Pelanggan',
              style: TextStyle(fontSize: 12, color: customer != null ? AppColors.primary : AppColors.gray500),
            ),
          );
        }),
        // Close shift button
        IconButton(
          icon: const Icon(Icons.lock_outline, size: 22, color: AppColors.gray500),
          tooltip: 'Tutup Shift',
          onPressed: () => _showCloseShift(context, shift),
        ),
        // Cart button (mobile only)
        if (MediaQuery.of(context).size.width < 768)
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                onPressed: () => _showCartSheet(context),
              ),
              if (cart.itemCount > 0)
                Positioned(
                  right: 6, top: 6,
                  child: Container(
                    width: 18, height: 18,
                    decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                    child: Center(child: Text('${cart.itemCount}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                  ),
                ),
            ],
          ),
        const SizedBox(width: 4),
      ],
    );
  }

  Widget _buildTabletLayout(StoreModel store, CartState cart, NumberFormat currency) {
    return Row(
      children: [
        Expanded(flex: 3, child: _buildProductsPanel(store)),
        Container(
          width: 360,
          decoration: const BoxDecoration(
            color: AppColors.white,
            border: Border(left: BorderSide(color: AppColors.gray200)),
          ),
          child: CartPanel(store: store),
        ),
      ],
    );
  }

  Widget _buildPhoneLayout(StoreModel store, CartState cart, NumberFormat currency) {
    return Column(
      children: [
        Expanded(child: _buildProductsPanel(store)),
        if (cart.itemCount > 0)
          _CartSummaryBar(store: store, onTap: () => _showCartSheet(context)),
      ],
    );
  }

  Widget _buildProductsPanel(StoreModel store) {
    return Column(
      children: [
        // Search bar
        Container(
          color: AppColors.white,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: 'Cari produk atau scan barcode...',
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.gray400),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _search = v),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10)),
                child: IconButton(
                  icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary, size: 22),
                  onPressed: _scanBarcode,
                  tooltip: 'Scan Barcode',
                ),
              ),
            ],
          ),
        ),

        // FnB Order Type + Table selector
        Consumer(builder: (ctx, ref, _) {
          final cart = ref.watch(cartProvider);
          return Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _OrderTypeChip(icon: Icons.restaurant, label: 'Dine-in', selected: cart.orderType == 'dine-in',
                        onTap: () => ref.read(cartProvider.notifier).setOrderType('dine-in')),
                    const SizedBox(width: 8),
                    _OrderTypeChip(icon: Icons.takeout_dining, label: 'Bawa Pulang', selected: cart.orderType == 'takeaway',
                        onTap: () => ref.read(cartProvider.notifier).setOrderType('takeaway')),
                    const SizedBox(width: 8),
                    _OrderTypeChip(icon: Icons.delivery_dining, label: 'Delivery', selected: cart.orderType == 'delivery',
                        onTap: () => ref.read(cartProvider.notifier).setOrderType('delivery')),
                    if (cart.orderType == 'dine-in') ...[
                      const Spacer(),
                      GestureDetector(
                        onTap: () => _showTablePicker(ctx, ref, store),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: cart.tableId != null ? AppColors.primaryLight : AppColors.gray100,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: cart.tableId != null ? AppColors.primary : AppColors.gray300),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.table_restaurant, size: 16,
                                color: cart.tableId != null ? AppColors.primary : AppColors.gray500),
                            const SizedBox(width: 4),
                            Text(cart.tableName ?? 'Pilih Meja', style: TextStyle(
                              fontSize: 12,
                              color: cart.tableId != null ? AppColors.primary : AppColors.gray500,
                              fontWeight: cart.tableId != null ? FontWeight.w600 : FontWeight.normal,
                            )),
                          ]),
                        ),
                      ),
                    ],
                  ],
                ),
                // Delivery address input
                if (cart.orderType == 'delivery') ...[
                  const SizedBox(height: 6),
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Alamat pengiriman...',
                      prefixIcon: const Icon(Icons.location_on_outlined, size: 18, color: AppColors.gray400),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      filled: true,
                      fillColor: AppColors.gray100,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                    ),
                    onChanged: (v) => ref.read(cartProvider.notifier).setDeliveryAddress(v),
                    controller: TextEditingController(text: cart.deliveryAddress),
                  ),
                ],
              ],
            ),
          );
        }),

        // Active FnB order indicator
        Consumer(builder: (ctx, ref, _) {
          final cart = ref.watch(cartProvider);
          if (cart.fnbOrderId == null) return const SizedBox.shrink();
          return Container(
            color: AppColors.warningLight,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(children: [
              const Icon(Icons.edit_note, size: 16, color: AppColors.warning),
              const SizedBox(width: 6),
              Expanded(child: Text(
                'Mengedit order aktif${cart.tableName != null ? " — ${cart.tableName}" : ""}',
                style: const TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w600),
              )),
              GestureDetector(
                onTap: () {
                  ref.read(cartProvider.notifier).clear();
                  ref.invalidate(fnbActiveOrdersProvider(store.id));
                },
                child: const Icon(Icons.close, size: 16, color: AppColors.warning),
              ),
            ]),
          );
        }),

        // Category filter
        Consumer(builder: (ctx, ref, _) {
          final catsAsync = ref.watch(categoriesProvider(store.id));
          return catsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (cats) {
              if (cats.isEmpty) return const SizedBox.shrink();
              return Container(
                height: 40,
                color: AppColors.white,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: cats.length + 1,
                  itemBuilder: (_, i) {
                    if (i == 0) {
                      return _CategoryChip(label: 'Semua', selected: _selectedCategoryId == null,
                          onTap: () => setState(() => _selectedCategoryId = null));
                    }
                    final cat = cats[i - 1];
                    return _CategoryChip(
                      label: cat['name'] ?? '',
                      selected: _selectedCategoryId == cat['id'],
                      onTap: () => setState(() => _selectedCategoryId = cat['id']),
                    );
                  },
                ),
              );
            },
          );
        }),

        const Divider(height: 1),

        // Products grid
        Expanded(
          child: Consumer(builder: (ctx, ref, _) {
            final productsAsync = ref.watch(posProductsProvider(store.id));
            return productsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: 8),
                  Text(e.toString(), textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(posProductsProvider(store.id)),
                    style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                    child: const Text('Coba Lagi'),
                  ),
                ]),
              ),
              data: (products) {
                var filtered = products;
                if (_search.isNotEmpty) {
                  final q = _search.toLowerCase();
                  filtered = filtered.where((p) =>
                    p.name.toLowerCase().contains(q) ||
                    (p.sku?.toLowerCase().contains(q) ?? false) ||
                    (p.barcode?.contains(q) ?? false)
                  ).toList();
                }
                if (_selectedCategoryId != null) {
                  filtered = filtered.where((p) => p.categoryId == _selectedCategoryId).toList();
                }

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.gray300),
                      const SizedBox(height: 12),
                      Text(
                        _search.isNotEmpty ? 'Produk "$_search" tidak ditemukan' : 'Belum ada produk',
                        style: const TextStyle(color: AppColors.gray500),
                      ),
                    ]),
                  );
                }

                final isTablet = MediaQuery.of(ctx).size.width >= 768;
                final crossCount = isTablet ? 4 : 2;

                return GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossCount,
                    childAspectRatio: isTablet ? 0.85 : 0.9,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => _ProductCard(
                    product: filtered[i],
                    onTap: () => ref.read(cartProvider.notifier).addProduct(filtered[i]),
                  ),
                );
              },
            );
          }),
        ),
      ],
    );
  }

  void _showCartSheet(BuildContext context) {
    final store = ref.read(selectedStoreProvider);
    if (store == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (_, ctrl) => Container(
          decoration: const BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: CartPanel(store: store, scrollController: ctrl),
        ),
      ),
    );
  }

  void _showCustomerSearch(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CustomerSearchSheet(),
    );
  }

  Future<void> _scanBarcode() async {
    HapticFeedback.lightImpact();
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const _BarcodeScannerScreen()),
    );
    if (result != null && result.isNotEmpty) {
      setState(() {
        _searchCtrl.text = result;
        _search = result;
      });
    }
  }

  Future<void> _showTablePicker(BuildContext ctx, WidgetRef ref, StoreModel store) async {
    await showModalBottomSheet(
      context: ctx,
      backgroundColor: Colors.transparent,
      builder: (_) => _TablePickerSheet(
        storeId: store.id,
        onSelected: (id, name) => ref.read(cartProvider.notifier).setTable(id, name),
      ),
    );
  }

  void _showCloseShift(BuildContext context, ShiftModel shift) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CloseShiftSheet(shift: shift),
    );
  }

  void _showFnbOrdersPanel(BuildContext ctx, StoreModel store) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FnbOrdersPanel(
        store: store,
        onLoadOrder: (order) => _loadFnbOrderToCart(order, store),
      ),
    );
  }

  Future<void> _loadFnbOrderToCart(Map<String, dynamic> order, StoreModel store) async {
    try {
      final api = ApiClient();
      final res = await api.dio.get('/fnb/orders/${order['id']}');
      final fullOrder = res.data is Map && res.data.containsKey('data') ? res.data['data'] : res.data;
      final tx = fullOrder['transaction'];
      final items = (tx?['items'] as List? ?? []);

      if (items.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order belum ada item'), backgroundColor: AppColors.warning),
          );
        }
        return;
      }

      // Convert to CartItems
      final cartItems = items.map<CartItem>((item) => CartItem(
        productId: item['productId'] ?? item['product_id'] ?? '',
        name: item['productName'] ?? item['product_name'] ?? 'Item',
        price: double.tryParse(item['unitPrice']?.toString() ?? item['unit_price']?.toString() ?? '0') ?? 0,
        quantity: int.tryParse(item['quantity']?.toString() ?? '1') ?? 1,
      )).toList();

      final notifier = ref.read(cartProvider.notifier);
      notifier.clear();

      // Set items one by one
      for (final item in cartItems) {
        for (var i = 0; i < item.quantity; i++) {
          notifier.addProduct(ProductModel(
            id: item.productId,
            name: item.name,
            price: item.price,
            stock: 999,
          ));
        }
      }

      // Set order type and table
      final orderType = fullOrder['order_type'] ?? 'takeaway';
      notifier.setOrderType(orderType);
      if (orderType == 'dine-in' && fullOrder['table_id'] != null) {
        final tableName = fullOrder['table']?['table_name'] ?? fullOrder['table']?['table_number'] ?? 'Meja';
        notifier.setTable(fullOrder['table_id'], tableName);
      }
      notifier.setFnbOrder(order['id']);

      // Refresh active orders
      ref.invalidate(fnbActiveOrdersProvider(store.id));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order ${order['order_number']} dimuat ke cart'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat order: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }
}

// ─── Store Selector ───────────────────────────────────────────────────────────

class _StoreSelector extends ConsumerWidget {
  final void Function(StoreModel) onSelected;
  const _StoreSelector({required this.onSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storesAsync = ref.watch(storesProvider);
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.store, color: Colors.white, size: 30),
              ),
              const SizedBox(height: 20),
              const Text('Pilih Toko', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.gray900)),
              const SizedBox(height: 6),
              const Text('Pilih toko untuk memulai sesi POS', style: TextStyle(color: AppColors.gray500)),
              const SizedBox(height: 32),
              Expanded(
                child: storesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Error: $e')),
                  data: (stores) => stores.isEmpty
                      ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.store_outlined, size: 56, color: AppColors.gray300),
                          const SizedBox(height: 12),
                          const Text('Tidak ada toko tersedia', style: TextStyle(color: AppColors.gray500, fontSize: 15)),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: () => ref.invalidate(storesProvider),
                            icon: const Icon(Icons.refresh, size: 18),
                            label: const Text('Muat Ulang'),
                          ),
                        ]))
                      : ListView.separated(
                          itemCount: stores.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final s = stores[i];
                            return InkWell(
                              onTap: () => onSelected(s),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.gray200),
                                ),
                                child: Row(children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10)),
                                    child: const Icon(Icons.store_outlined, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                    if (s.address != null) Text(s.address!, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                                  ])),
                                  const Icon(Icons.arrow_forward_ios, size: 16, color: AppColors.gray400),
                                ]),
                              ),
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── FnB Orders Panel ─────────────────────────────────────────────────────────

class _FnbOrdersPanel extends ConsumerWidget {
  final StoreModel store;
  final Future<void> Function(Map<String, dynamic>) onLoadOrder;
  const _FnbOrdersPanel({required this.store, required this.onLoadOrder});

  Color _statusColor(String status) {
    switch (status) {
      case 'pending': return AppColors.warning;
      case 'preparing': return AppColors.primary;
      case 'ready': return AppColors.success;
      case 'served': return const Color(0xFF8B5CF6);
      default: return AppColors.gray400;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'preparing': return 'Dimasak';
      case 'ready': return 'Siap';
      case 'served': return 'Disajikan';
      default: return status;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(fnbActiveOrdersProvider(store.id));
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Row(children: [
              const Icon(Icons.restaurant_menu, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text('Order Aktif', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.refresh, size: 20),
                onPressed: () => ref.invalidate(fnbActiveOrdersProvider(store.id)),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: ordersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(child: Text('Gagal memuat order')),
              data: (orders) => orders.isEmpty
                  ? Center(
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.restaurant_outlined, size: 56, color: AppColors.gray300),
                        const SizedBox(height: 12),
                        const Text('Tidak ada order aktif', style: TextStyle(color: AppColors.gray500)),
                      ]),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: orders.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final order = orders[i];
                        final status = order['status'] ?? '';
                        final orderType = order['order_type'] ?? '';
                        final tableNum = order['table']?['table_number'] ?? order['table']?['table_name'];
                        final orderNum = order['order_number'] ?? '';
                        final createdAt = order['created_at'] ?? '';

                        return InkWell(
                          onTap: () async {
                            Navigator.pop(context);
                            await onLoadOrder(order);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.gray200),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2))],
                            ),
                            child: Row(children: [
                              // Status indicator
                              Container(
                                width: 44, height: 44,
                                decoration: BoxDecoration(
                                  color: _statusColor(status).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  orderType == 'dine-in' ? Icons.table_restaurant
                                      : orderType == 'delivery' ? Icons.delivery_dining
                                      : Icons.takeout_dining,
                                  color: _statusColor(status), size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Text(orderNum, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _statusColor(status).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(_statusLabel(status), style: TextStyle(
                                      fontSize: 11, fontWeight: FontWeight.w600, color: _statusColor(status),
                                    )),
                                  ),
                                ]),
                                const SizedBox(height: 3),
                                Row(children: [
                                  if (tableNum != null) ...[
                                    const Icon(Icons.table_restaurant, size: 12, color: AppColors.gray500),
                                    const SizedBox(width: 3),
                                    Text('Meja $tableNum', style: const TextStyle(fontSize: 12, color: AppColors.gray600)),
                                    const SizedBox(width: 8),
                                  ],
                                  const Icon(Icons.access_time, size: 12, color: AppColors.gray400),
                                  const SizedBox(width: 3),
                                  Text(
                                    _formatTime(createdAt),
                                    style: const TextStyle(fontSize: 12, color: AppColors.gray400),
                                  ),
                                ]),
                              ])),
                              const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.gray400),
                            ]),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────────

class _ProductCard extends ConsumerWidget {
  final ProductModel product;
  final VoidCallback onTap;
  const _ProductCard({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final cart = ref.watch(cartProvider);
    final inCart = cart.items.where((e) => e.productId == product.id).fold(0, (s, e) => s + e.quantity);
    final outOfStock = product.stock <= 0;

    return GestureDetector(
      onTap: outOfStock ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: inCart > 0 ? AppColors.primary : AppColors.gray200,
            width: inCart > 0 ? 2 : 1,
          ),
          boxShadow: inCart > 0
              ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: product.imageUrl != null
                          ? CachedNetworkImage(
                              imageUrl: product.imageUrl!,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              errorWidget: (_, __, ___) => _ProductPlaceholder(name: product.name),
                            )
                          : _ProductPlaceholder(name: product.name),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(product.name,
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12,
                          color: outOfStock ? AppColors.gray400 : AppColors.gray900),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(currency.format(product.price),
                      style: TextStyle(color: outOfStock ? AppColors.gray400 : AppColors.primary,
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  if (outOfStock)
                    const Text('Stok habis', style: TextStyle(color: AppColors.error, fontSize: 10))
                  else if (product.stock <= 5)
                    Text('Sisa ${product.stock}', style: const TextStyle(color: AppColors.warning, fontSize: 10)),
                ],
              ),
            ),
            if (inCart > 0)
              Positioned(
                top: 6, right: 6,
                child: Container(
                  width: 22, height: 22,
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                  child: Center(child: Text('$inCart', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                ),
              ),
            if (outOfStock)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProductPlaceholder extends StatelessWidget {
  final String name;
  const _ProductPlaceholder({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.gray100,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.gray400),
        ),
      ),
    );
  }
}

// ─── Category Chip ────────────────────────────────────────────────────────────

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.gray100,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(label, style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? Colors.white : AppColors.gray600,
          )),
        ),
      ),
    );
  }
}

// ─── Order Type Chip ──────────────────────────────────────────────────────────

class _OrderTypeChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _OrderTypeChip({required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.gray100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? AppColors.primary : AppColors.gray200),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: selected ? Colors.white : AppColors.gray500),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? Colors.white : AppColors.gray600,
          )),
        ]),
      ),
    );
  }
}

// ─── Cart Summary Bar (mobile) ────────────────────────────────────────────────

class _CartSummaryBar extends ConsumerWidget {
  final StoreModel store;
  final VoidCallback onTap;
  const _CartSummaryBar({required this.store, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: const BoxDecoration(
          color: AppColors.white,
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, -3))],
        ),
        child: SafeArea(
          top: false,
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
              child: Stack(alignment: Alignment.center, children: [
                const Icon(Icons.shopping_cart, color: Colors.white, size: 22),
                Positioned(
                  top: 4, right: 4,
                  child: Container(
                    width: 16, height: 16,
                    decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                    child: Center(child: Text('${cart.itemCount}', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
                  ),
                ),
              ]),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${cart.itemCount} item', style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
              Text(currency.format(cart.total), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.gray900)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
              child: const Text('Bayar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ]),
        ),
      ),
    );
  }
}

// ─── Table Picker Sheet ───────────────────────────────────────────────────────

class _TablePickerSheet extends ConsumerWidget {
  final String storeId;
  final void Function(String id, String name) onSelected;
  const _TablePickerSheet({required this.storeId, required this.onSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tablesAsync = ref.watch(_tablesProvider(storeId));
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Pilih Meja', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          tablesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Gagal memuat data meja'),
            data: (tables) => tables.isEmpty
                ? const Center(child: Text('Tidak ada meja tersedia', style: TextStyle(color: AppColors.gray500)))
                : Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: tables.map((t) {
                      final isOccupied = t['status'] == 'occupied';
                      final displayName = t['table_name'] ?? t['table_number'] ?? 'Meja';
                      return GestureDetector(
                        onTap: isOccupied ? null : () {
                          onSelected(t['id'], displayName);
                          Navigator.pop(context);
                        },
                        child: Container(
                          width: 72, height: 72,
                          decoration: BoxDecoration(
                            color: isOccupied ? AppColors.gray100 : AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isOccupied ? AppColors.gray300 : AppColors.primary),
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Icon(Icons.table_restaurant,
                                color: isOccupied ? AppColors.gray400 : AppColors.primary, size: 24),
                            const SizedBox(height: 4),
                            Text(displayName, style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w600,
                              color: isOccupied ? AppColors.gray400 : AppColors.primary,
                            )),
                            if (isOccupied)
                              const Text('Terisi', style: TextStyle(fontSize: 9, color: AppColors.gray400)),
                          ]),
                        ),
                      );
                    }).toList(),
                  ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

final _tablesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  if (!api.hasToken) return [];
  try {
    final res = await api.dio.get('/fnb/tables', queryParameters: {'store_id': storeId});
    final data = res.data;
    final list = data is List ? data : (data['data'] ?? []);
    return List<Map<String, dynamic>>.from(list);
  } catch (_) { return []; }
});

// ─── Barcode Scanner Screen ───────────────────────────────────────────────────

class _BarcodeScannerScreen extends StatefulWidget {
  const _BarcodeScannerScreen();

  @override
  State<_BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<_BarcodeScannerScreen> {
  final _ctrl = MobileScannerController();
  bool _scanned = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Scan Barcode'),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _ctrl,
              builder: (_, value, __) => Icon(
                value.torchState == TorchState.on ? Icons.flash_on : Icons.flash_off,
                color: Colors.white,
              ),
            ),
            onPressed: () => _ctrl.toggleTorch(),
          ),
        ],
      ),
      body: Stack(children: [
        MobileScanner(
          controller: _ctrl,
          onDetect: (capture) {
            if (_scanned) return;
            final barcode = capture.barcodes.firstOrNull;
            if (barcode?.rawValue != null) {
              _scanned = true;
              Navigator.pop(context, barcode!.rawValue);
            }
          },
        ),
        Center(
          child: Container(
            width: 260, height: 160,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.primary, width: 3),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const Positioned(
          bottom: 40, left: 0, right: 0,
          child: Text('Arahkan kamera ke barcode produk',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 14)),
        ),
      ]),
    );
  }
}

// ─── Close Shift Sheet ────────────────────────────────────────────────────────

class _CloseShiftSheet extends ConsumerStatefulWidget {
  final ShiftModel shift;
  const _CloseShiftSheet({required this.shift});

  @override
  ConsumerState<_CloseShiftSheet> createState() => _CloseShiftSheetState();
}

class _CloseShiftSheetState extends ConsumerState<_CloseShiftSheet> {
  final _cashCtrl = TextEditingController();
  double _closingCash = 0;
  bool _isClosing = false;
  Map<String, dynamic>? _shiftSummary;
  bool _loadingSummary = true;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final api = ApiClient();
      final res = await api.dio.get('/shifts/${widget.shift.id}/report');
      if (mounted) setState(() { _shiftSummary = res.data; _loadingSummary = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingSummary = false);
    }
  }

  @override
  void dispose() { _cashCtrl.dispose(); super.dispose(); }

  Future<void> _closeShift() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tutup Shift'),
        content: Text('Tutup shift dengan kas penutup ${currency.format(_closingCash)}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Tutup Shift'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    setState(() => _isClosing = true);
    final success = await ref.read(activeShiftProvider.notifier).closeShift(_closingCash);
    if (mounted) {
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Shift berhasil ditutup'), backgroundColor: AppColors.success),
        );
      } else {
        setState(() => _isClosing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal menutup shift'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final startTime = widget.shift.startTime.isNotEmpty
        ? DateFormat('dd MMM yyyy, HH:mm').format(DateTime.tryParse(widget.shift.startTime) ?? DateTime.now())
        : '-';

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: AppColors.errorLight, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.lock_outline, color: AppColors.error, size: 22),
            ),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Tutup Shift', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text('Dibuka: $startTime', style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
            ]),
          ]),
          const SizedBox(height: 16),

          // Shift summary
          if (_loadingSummary)
            const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
          else if (_shiftSummary != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.gray100, borderRadius: BorderRadius.circular(10)),
              child: Column(children: [
                const Text('Ringkasan Shift', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 10),
                Row(children: [
                  _SummaryItem('Transaksi', '${_shiftSummary!['totalTransactions'] ?? 0}', Icons.receipt_long, AppColors.primary),
                  _SummaryItem('Penjualan', currency.format(double.tryParse(_shiftSummary!['totalSales']?.toString() ?? '0') ?? 0), Icons.trending_up, AppColors.success),
                  _SummaryItem('Kas Masuk', currency.format(double.tryParse(_shiftSummary!['cashSales']?.toString() ?? '0') ?? 0), Icons.payments_outlined, AppColors.warning),
                ]),
              ]),
            ),
            const SizedBox(height: 16),
          ],

          const Text('Kas Penutup (IDR)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: _cashCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            decoration: const InputDecoration(
              prefixText: 'Rp ',
              prefixStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.gray700),
              hintText: '0',
            ),
            onChanged: (v) => setState(() => _closingCash = double.tryParse(v) ?? 0),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [0, 100000, 200000, 500000].map((a) => ActionChip(
            label: Text(a == 0 ? 'Rp 0' : currency.format(a.toDouble()), style: const TextStyle(fontSize: 12)),
            onPressed: () { _cashCtrl.text = a.toString(); setState(() => _closingCash = a.toDouble()); },
            backgroundColor: AppColors.gray100, side: BorderSide.none,
          )).toList()),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _isClosing ? null : _closeShift,
            icon: _isClosing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.lock_outline, size: 20),
            label: Text(_isClosing ? 'Menutup...' : 'Tutup Shift'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _SummaryItem(String label, String value, IconData icon, Color color) {
    return Expanded(child: Column(children: [
      Icon(icon, color: color, size: 20),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color), maxLines: 1, overflow: TextOverflow.ellipsis),
      Text(label, style: const TextStyle(fontSize: 10, color: AppColors.gray500)),
    ]));
  }
}
