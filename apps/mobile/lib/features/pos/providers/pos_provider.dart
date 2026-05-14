import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/models/models.dart';

// ─── Stores ──────────────────────────────────────────────────────────────────

final storesProvider = FutureProvider<List<StoreModel>>((ref) async {
  final api = ApiClient();
  if (!api.hasToken) return [];
  try {
    final res = await api.dio.get('/stores');
    final data = res.data;
    List<dynamic> list;
    if (data is List) {
      list = data;
    } else if (data is Map && data['data'] is List) {
      list = data['data'] as List;
    } else {
      list = [];
    }
    final stores = list.map((e) => StoreModel.fromJson(e as Map<String, dynamic>)).toList();
    debugPrint('storesProvider: loaded ${stores.length} stores');
    return stores;
  } catch (e) {
    debugPrint('storesProvider error: $e');
    return [];
  }
});

// Fetch store by ID — dipakai untuk auto-select store employee
final storeByIdProvider = FutureProvider.family<StoreModel?, String>((ref, storeId) async {
  if (storeId.isEmpty) return null;
  final api = ApiClient();
  if (!api.hasToken) return null;
  // Coba /stores/:id
  try {
    final res = await api.dio.get('/stores/$storeId');
    final raw = res.data;
    final json = (raw is Map && raw.containsKey('data')) ? raw['data'] : raw;
    return StoreModel.fromJson(json as Map<String, dynamic>);
  } catch (_) {}
  // Fallback: cari dari list
  try {
    final res = await api.dio.get('/stores');
    final data = res.data;
    final list = data is List ? data : (data['data'] ?? []);
    final stores = (list as List).map((e) => StoreModel.fromJson(e as Map<String, dynamic>)).toList();
    return stores.where((s) => s.id == storeId).firstOrNull;
  } catch (_) {}
  // Fallback minimal
  return StoreModel(id: storeId, name: 'Toko');
});

// ─── Selected Store ───────────────────────────────────────────────────────────

final selectedStoreProvider = StateProvider<StoreModel?>((ref) => null);

// ─── Active Shift ─────────────────────────────────────────────────────────────

final activeShiftProvider = StateNotifierProvider<ShiftNotifier, ShiftModel?>((ref) {
  final store = ref.watch(selectedStoreProvider);
  return ShiftNotifier(store?.id);
});

class ShiftNotifier extends StateNotifier<ShiftModel?> {
  final String? storeId;
  final _api = ApiClient();

  ShiftNotifier(this.storeId) : super(null) {
    if (storeId != null) load();
  }

  Future<void> load() async {
    try {
      final res = await _api.dio.get('/shifts/active', queryParameters: {'storeId': storeId});
      if (res.data != null && res.data is Map) {
        state = ShiftModel.fromJson(res.data);
      } else {
        state = null;
      }
    } catch (e) {
      debugPrint('ShiftNotifier.load error: $e');
      state = null;
    }
  }

  Future<bool> openShift(double openingAmount) async {
    try {
      final res = await _api.dio.post('/shifts/open', data: {
        'storeId': storeId,
        'openingAmount': openingAmount,
      });
      state = ShiftModel.fromJson(res.data);
      return true;
    } catch (e) {
      debugPrint('openShift error: $e');
      return false;
    }
  }

  Future<bool> closeShift(double closingCash) async {
    if (state == null) return false;
    try {
      await _api.dio.patch('/shifts/${state!.id}/close', data: {'closingCash': closingCash});
      state = null;
      return true;
    } catch (_) {
      return false;
    }
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

final posProductsProvider = FutureProvider.family<List<ProductModel>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  if (!api.hasToken) {
    debugPrint('posProductsProvider: no token, hasToken=${api.hasToken}');
    return [];
  }
  try {
    debugPrint('posProductsProvider: loading for store $storeId, hasToken=${api.hasToken}');
    final res = await api.dio.get('/products', queryParameters: {
      'storeId': storeId,
      'isActive': true,
      'limit': 200,
    });
    final data = res.data;
    final list = data is List ? data : (data['data'] ?? []);
    final products = (list as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    debugPrint('posProductsProvider: loaded ${products.length} products');
    return products;
  } catch (e) {
    debugPrint('posProductsProvider error: $e');
    return [];
  }
});

// ─── Categories ───────────────────────────────────────────────────────────────

final categoriesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  if (!api.hasToken) return [];
  try {
    final res = await api.dio.get('/categories', queryParameters: {'storeId': storeId});
    final data = res.data;
    final list = data is List ? data : (data['data'] ?? []);
    return List<Map<String, dynamic>>.from(list);
  } catch (e) {
    debugPrint('categoriesProvider error: $e');
    return [];
  }
});

// ─── Payment Methods ──────────────────────────────────────────────────────────

final paymentMethodsProvider = FutureProvider.family<List<PaymentMethodModel>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [const PaymentMethodModel(id: 'cash', name: 'Tunai', code: 'cash', type: 'cash')];
  final api = ApiClient();
  if (!api.hasToken) return [const PaymentMethodModel(id: 'cash', name: 'Tunai', code: 'cash', type: 'cash')];
  try {
    final res = await api.dio.get('/payment-methods', queryParameters: {'storeId': storeId});
    final data = res.data;
    final list = data is List ? data : (data['data'] ?? []);
    final methods = (list as List)
        .map((e) => PaymentMethodModel.fromJson(e as Map<String, dynamic>))
        .where((m) => m.isActive)
        .toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return methods.isEmpty
        ? [const PaymentMethodModel(id: 'cash', name: 'Tunai', code: 'cash', type: 'cash')]
        : methods;
  } catch (e) {
    debugPrint('paymentMethodsProvider error: $e');
    return [const PaymentMethodModel(id: 'cash', name: 'Tunai', code: 'cash', type: 'cash')];
  }
});

// ─── Cart ─────────────────────────────────────────────────────────────────────

class CartState {
  final List<CartItem> items;
  final CustomerModel? customer;
  final double discountAmount;
  final String? discountType;
  final double discountValue;
  final String? promoCode;
  final int redeemPoints;
  final double taxRate;
  final String? notes;
  // FnB
  final String orderType; // 'dine-in' | 'takeaway' | 'delivery'
  final String? tableId;
  final String? tableName;
  final String? fnbOrderId; // active FnB order being edited
  final String? deliveryAddress;

  const CartState({
    this.items = const [],
    this.customer,
    this.discountAmount = 0,
    this.discountType,
    this.discountValue = 0,
    this.promoCode,
    this.redeemPoints = 0,
    this.taxRate = 0,
    this.notes,
    this.orderType = 'takeaway',
    this.tableId,
    this.tableName,
    this.fnbOrderId,
    this.deliveryAddress,
  });

  double get subtotal => items.fold(0, (s, e) => s + e.subtotal);
  double get redeemDiscount => redeemPoints * 100;
  double get taxAmount => (subtotal - discountAmount) * (taxRate / 100);
  double get total => subtotal - discountAmount - redeemDiscount + taxAmount;
  int get itemCount => items.fold(0, (s, e) => s + e.quantity);
  bool get isEmpty => items.isEmpty;

  CartState copyWith({
    List<CartItem>? items,
    CustomerModel? customer,
    bool clearCustomer = false,
    double? discountAmount,
    String? discountType,
    double? discountValue,
    String? promoCode,
    bool clearPromo = false,
    int? redeemPoints,
    double? taxRate,
    String? notes,
    String? orderType,
    String? tableId,
    String? tableName,
    bool clearTable = false,
    String? fnbOrderId,
    bool clearFnbOrder = false,
    String? deliveryAddress,
  }) =>
      CartState(
        items: items ?? this.items,
        customer: clearCustomer ? null : (customer ?? this.customer),
        discountAmount: discountAmount ?? this.discountAmount,
        discountType: discountType ?? this.discountType,
        discountValue: discountValue ?? this.discountValue,
        promoCode: clearPromo ? null : (promoCode ?? this.promoCode),
        redeemPoints: redeemPoints ?? this.redeemPoints,
        taxRate: taxRate ?? this.taxRate,
        notes: notes ?? this.notes,
        orderType: orderType ?? this.orderType,
        tableId: clearTable ? null : (tableId ?? this.tableId),
        tableName: clearTable ? null : (tableName ?? this.tableName),
        fnbOrderId: clearFnbOrder ? null : (fnbOrderId ?? this.fnbOrderId),
        deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      );
}

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  void addProduct(ProductModel product) {
    final idx = state.items.indexWhere((e) => e.productId == product.id);
    if (idx >= 0) {
      final updated = List<CartItem>.from(state.items);
      updated[idx] = updated[idx].copyWith(quantity: updated[idx].quantity + 1);
      state = state.copyWith(items: updated);
    } else {
      state = state.copyWith(items: [
        ...state.items,
        CartItem(productId: product.id, name: product.name, price: product.price,
            costPrice: product.costPrice, imageUrl: product.imageUrl),
      ]);
    }
  }

  void removeItem(String productId) =>
      state = state.copyWith(items: state.items.where((e) => e.productId != productId).toList());

  void updateQuantity(String productId, int qty) {
    if (qty <= 0) { removeItem(productId); return; }
    state = state.copyWith(
      items: state.items.map((e) => e.productId == productId ? e.copyWith(quantity: qty) : e).toList(),
    );
  }

  void setCustomer(CustomerModel? customer) =>
      customer == null ? state = state.copyWith(clearCustomer: true, redeemPoints: 0) : state = state.copyWith(customer: customer);

  void setDiscount({required double amount, String? type, double? value, String? promoCode}) =>
      state = state.copyWith(discountAmount: amount, discountType: type, discountValue: value ?? 0, promoCode: promoCode);

  void setRedeemPoints(int points) => state = state.copyWith(redeemPoints: points);
  void setTaxRate(double rate) => state = state.copyWith(taxRate: rate);
  void setNotes(String notes) => state = state.copyWith(notes: notes);
  void setOrderType(String type) => state = state.copyWith(orderType: type, clearTable: type != 'dine-in');
  void setTable(String? id, String? name) => state = state.copyWith(tableId: id, tableName: name);
  void setFnbOrder(String? id) => id == null
      ? state = state.copyWith(clearFnbOrder: true)
      : state = state.copyWith(fnbOrderId: id);
  void setDeliveryAddress(String address) => state = state.copyWith(deliveryAddress: address.isEmpty ? null : address);
  void clear() => state = const CartState();
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((_) => CartNotifier());

// ─── Checkout ─────────────────────────────────────────────────────────────────

class CheckoutNotifier extends StateNotifier<AsyncValue<TransactionModel?>> {
  final Ref _ref;
  final _api = ApiClient();

  CheckoutNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<TransactionModel?> checkout({
    required String storeId,
    required String shiftId,
    required String paymentMethodCode,
    double? cashReceived,
    String? orderType,
    String? tableId,
    List<Map<String, dynamic>>? splitPayments,
  }) async {
    final cart = _ref.read(cartProvider);
    if (cart.isEmpty) return null;

    state = const AsyncValue.loading();
    try {
      // Jika ada fnbOrderId, sync items ke FnB order dulu
      if (cart.fnbOrderId != null) {
        try {
          await _api.dio.post('/fnb/orders/${cart.fnbOrderId}/items', data: {
            'items': cart.items.map((e) => {
              'product_id': e.productId,
              'product_name': e.name,
              'unit_price': e.price,
              'quantity': e.quantity,
            }).toList(),
          });
        } catch (e) {
          debugPrint('FnB addItems error (non-fatal): $e');
        }
      }
      final subtotal = cart.subtotal;
      final discountAmount = cart.discountAmount + cart.redeemDiscount;
      final taxAmount = cart.taxAmount;
      final total = cart.total;
      final paidAmount = cashReceived ?? total;
      final changeAmount = (paidAmount - total).clamp(0, double.infinity);

      final body = <String, dynamic>{
        'storeId': storeId,
        'shiftId': shiftId,
        'paymentMethod': paymentMethodCode,
        'subtotal': subtotal,
        'taxAmount': taxAmount,
        'discountAmount': discountAmount,
        'total': total,
        'paidAmount': paidAmount,
        'changeAmount': changeAmount,
        'items': cart.items.map((e) => {
          'productId': e.productId,
          'productName': e.name,
          'quantity': e.quantity,
          'unitPrice': e.price,
          'subtotal': e.subtotal,
          if (e.notes != null) 'notes': e.notes,
        }).toList(),
        if (cart.customer != null) 'customerId': cart.customer!.id,
        if (cart.customer != null) 'customerName': cart.customer!.name,
        if (cart.customer != null && cart.customer!.phone != null) 'customerPhone': cart.customer!.phone,
        if (cart.notes != null) 'notes': cart.notes,
        'orderType': ?orderType,
        'tableId': ?tableId,
        if (cart.fnbOrderId != null) 'fnbOrderId': cart.fnbOrderId,
        if (cart.deliveryAddress != null) 'deliveryAddress': cart.deliveryAddress,
        'paymentMethods': ?splitPayments,
      };

      debugPrint('Checkout payload: $body');
      final res = await _api.dio.post('/transactions', data: body);

      final data = res.data is Map && res.data.containsKey('data')
          ? res.data['data']
          : res.data;
      final tx = TransactionModel.fromJson(data as Map<String, dynamic>);
      state = AsyncValue.data(tx);
      _ref.read(cartProvider.notifier).clear();
      return tx;
    } catch (e, st) {
      debugPrint('Checkout error: $e');
      state = AsyncValue.error(e, st);
      return null;
    }
  }

  void reset() => state = const AsyncValue.data(null);
}

final checkoutProvider = StateNotifierProvider<CheckoutNotifier, AsyncValue<TransactionModel?>>(
  (ref) => CheckoutNotifier(ref),
);

// ─── FnB Active Orders ────────────────────────────────────────────────────────

final fnbActiveOrdersProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, storeId) async {
  if (storeId.isEmpty) return [];
  final api = ApiClient();
  if (!api.hasToken) return [];
  try {
    final statuses = ['pending', 'preparing', 'ready', 'served'];
    final results = await Future.wait(statuses.map((s) async {
      try {
        final res = await api.dio.get('/fnb/orders', queryParameters: {'store_id': storeId, 'status': s});
        final data = res.data;
        final list = data is List ? data : (data['data'] ?? []);
        return List<Map<String, dynamic>>.from(list);
      } catch (_) { return <Map<String, dynamic>>[]; }
    }));
    return results.expand((l) => l).toList();
  } catch (e) {
    debugPrint('fnbActiveOrdersProvider error: $e');
    return [];
  }
});
