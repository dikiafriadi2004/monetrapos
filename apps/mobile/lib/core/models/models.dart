// ─── User ────────────────────────────────────────────────────────────────────

class UserModel {
  final String id;
  final String name;
  final String firstName;
  final String lastName;
  final String email;
  final String role;
  final String type; // 'member' | 'employee'
  final String? companyId;
  final String? storeId;
  final List<String> permissions;

  const UserModel({
    required this.id,
    required this.name,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    required this.type,
    this.companyId,
    this.storeId,
    this.permissions = const [],
  });

  factory UserModel.fromJson(Map<String, dynamic> j) => UserModel(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        firstName: j['firstName'] ?? j['name']?.toString().split(' ').first ?? '',
        lastName: j['lastName'] ?? '',
        email: j['email'] ?? '',
        role: j['role'] ?? '',
        type: j['type'] ?? 'member',
        companyId: j['companyId'],
        storeId: j['storeId'],
        permissions: List<String>.from(j['permissions'] ?? []),
      );

  Map<String, dynamic> toJson() => {
        'id': id, 'name': name, 'firstName': firstName, 'lastName': lastName,
        'email': email, 'role': role, 'type': type,
        'companyId': companyId, 'storeId': storeId, 'permissions': permissions,
      };

  bool hasPermission(String p) => permissions.contains(p);
  String get displayName => firstName.isNotEmpty ? firstName : name;
}

// ─── Store ───────────────────────────────────────────────────────────────────

class StoreModel {
  final String id;
  final String name;
  final String? address;
  final String? phone;
  final bool isActive;

  const StoreModel({
    required this.id,
    required this.name,
    this.address,
    this.phone,
    this.isActive = true,
  });

  factory StoreModel.fromJson(Map<String, dynamic> j) => StoreModel(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        address: j['address'],
        phone: j['phone'],
        isActive: j['isActive'] ?? j['is_active'] ?? true,
      );
}

// ─── Product ─────────────────────────────────────────────────────────────────

class ProductModel {
  final String id;
  final String name;
  final String? sku;
  final double price;
  final double? costPrice;
  final int stock;
  final String? imageUrl;
  final String? categoryId;
  final String? categoryName;
  final bool isActive;
  final String? barcode;
  final String? unit;

  const ProductModel({
    required this.id,
    required this.name,
    this.sku,
    required this.price,
    this.costPrice,
    required this.stock,
    this.imageUrl,
    this.categoryId,
    this.categoryName,
    this.isActive = true,
    this.barcode,
    this.unit,
  });

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        sku: j['sku'],
        price: double.tryParse(j['price']?.toString() ?? '0') ?? 0,
        costPrice: j['costPrice'] != null ? double.tryParse(j['costPrice'].toString()) : null,
        stock: int.tryParse(j['stock']?.toString() ?? '0') ?? 0,
        imageUrl: j['imageUrl'] ?? j['image_url'],
        categoryId: j['categoryId'] ?? j['category_id'],
        categoryName: j['category']?['name'],
        isActive: j['isActive'] ?? j['is_active'] ?? true,
        barcode: j['barcode'],
        unit: j['unit'],
      );
}

// ─── Cart ────────────────────────────────────────────────────────────────────

class CartItem {
  final String productId;
  final String name;
  final double price;
  final double? costPrice;
  int quantity;
  double? discountAmount;
  String? notes;
  String? imageUrl;

  CartItem({
    required this.productId,
    required this.name,
    required this.price,
    this.costPrice,
    this.quantity = 1,
    this.discountAmount,
    this.notes,
    this.imageUrl,
  });

  double get subtotal => (price * quantity) - (discountAmount ?? 0);

  CartItem copyWith({int? quantity, double? discountAmount, String? notes}) => CartItem(
        productId: productId,
        name: name,
        price: price,
        costPrice: costPrice,
        quantity: quantity ?? this.quantity,
        discountAmount: discountAmount ?? this.discountAmount,
        notes: notes ?? this.notes,
        imageUrl: imageUrl,
      );
}

// ─── Customer ────────────────────────────────────────────────────────────────

class CustomerModel {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final int loyaltyPoints;
  final double totalSpent;
  final String? loyaltyTier;

  const CustomerModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.loyaltyPoints = 0,
    this.totalSpent = 0,
    this.loyaltyTier,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> j) => CustomerModel(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        phone: j['phone'],
        email: j['email'],
        loyaltyPoints: int.tryParse(j['loyaltyPoints']?.toString() ?? '0') ?? 0,
        totalSpent: double.tryParse(j['totalSpent']?.toString() ?? '0') ?? 0,
        loyaltyTier: j['loyaltyTier'] ?? j['loyalty_tier'],
      );
}

// ─── Shift ───────────────────────────────────────────────────────────────────

class ShiftModel {
  final String id;
  final String storeId;
  final String status;
  final double startingCash;
  final double? endingCash;
  final String startTime;
  final String? endTime;

  const ShiftModel({
    required this.id,
    required this.storeId,
    required this.status,
    required this.startingCash,
    this.endingCash,
    required this.startTime,
    this.endTime,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> j) => ShiftModel(
        id: j['id'] ?? '',
        storeId: j['storeId'] ?? j['store_id'] ?? '',
        status: j['status'] ?? '',
        startingCash: double.tryParse(j['startingCash']?.toString() ?? j['opening_amount']?.toString() ?? '0') ?? 0,
        endingCash: j['endingCash'] != null ? double.tryParse(j['endingCash'].toString()) : null,
        startTime: j['startTime'] ?? j['start_time'] ?? '',
        endTime: j['endTime'] ?? j['end_time'],
      );

  bool get isOpen => status == 'open';
}

// ─── Payment Method ───────────────────────────────────────────────────────────

class PaymentMethodModel {
  final String id;
  final String name;
  final String code;
  final String type; // cash, card, ewallet, qris, bank_transfer
  final bool isActive;
  final String? color;
  final int sortOrder;

  const PaymentMethodModel({
    required this.id,
    required this.name,
    required this.code,
    required this.type,
    this.isActive = true,
    this.color,
    this.sortOrder = 0,
  });

  factory PaymentMethodModel.fromJson(Map<String, dynamic> j) => PaymentMethodModel(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        code: j['code'] ?? '',
        type: j['type'] ?? 'cash',
        isActive: j['isActive'] ?? j['is_active'] ?? true,
        color: j['color'],
        sortOrder: j['sortOrder'] ?? j['sort_order'] ?? 0,
      );
}

// ─── Transaction ─────────────────────────────────────────────────────────────

class TransactionModel {
  final String id;
  final String transactionNumber;
  final String status;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double total;
  final String paymentMethod;
  final String? customerName;
  final String createdAt;
  final List<TransactionItem> items;

  const TransactionModel({
    required this.id,
    required this.transactionNumber,
    required this.status,
    required this.subtotal,
    required this.taxAmount,
    required this.discountAmount,
    required this.total,
    required this.paymentMethod,
    this.customerName,
    required this.createdAt,
    this.items = const [],
  });

  factory TransactionModel.fromJson(Map<String, dynamic> j) => TransactionModel(
        id: j['id'] ?? '',
        transactionNumber: j['transactionNumber'] ?? j['transaction_number'] ?? '',
        status: j['status'] ?? '',
        subtotal: double.tryParse(j['subtotal']?.toString() ?? '0') ?? 0,
        taxAmount: double.tryParse(j['taxAmount']?.toString() ?? j['tax_amount']?.toString() ?? '0') ?? 0,
        discountAmount: double.tryParse(j['discountAmount']?.toString() ?? j['discount_amount']?.toString() ?? '0') ?? 0,
        total: double.tryParse(j['total']?.toString() ?? '0') ?? 0,
        paymentMethod: j['paymentMethod'] ?? j['payment_method'] ?? '',
        customerName: j['customer']?['name'] ?? j['customerName'],
        createdAt: j['createdAt'] ?? j['created_at'] ?? '',
        items: (j['items'] as List? ?? []).map((i) => TransactionItem.fromJson(i)).toList(),
      );
}

class TransactionItem {
  final String productId;
  final String productName;
  final int quantity;
  final double price;
  final double subtotal;

  const TransactionItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.subtotal,
  });

  factory TransactionItem.fromJson(Map<String, dynamic> j) => TransactionItem(
        productId: j['productId'] ?? j['product_id'] ?? '',
        productName: j['product']?['name'] ?? j['productName'] ?? '',
        quantity: int.tryParse(j['quantity']?.toString() ?? '1') ?? 1,
        price: double.tryParse(j['price']?.toString() ?? '0') ?? 0,
        subtotal: double.tryParse(j['subtotal']?.toString() ?? '0') ?? 0,
      );
}
