import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../providers/pos_provider.dart';
import 'payment_sheet.dart';

class CartPanel extends ConsumerWidget {
  final StoreModel store;
  final ScrollController? scrollController;
  const CartPanel({super.key, required this.store, this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Column(
      children: [
        // Handle bar (mobile)
        if (scrollController != null)
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)),
            ),
          ),

        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(children: [
            const Text('Keranjang', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.gray900)),
            const SizedBox(width: 8),
            // Order type badge
            Consumer(builder: (_, ref, __) {
              final cart = ref.watch(cartProvider);
              final label = cart.orderType == 'dine-in'
                  ? (cart.tableName != null ? '🍽 ${cart.tableName}' : '🍽 Dine-in')
                  : cart.orderType == 'delivery' ? '🛵 Delivery' : '🥡 Bawa Pulang';
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(label, style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
              );
            }),
            const Spacer(),
            if (cart.itemCount > 0)
              TextButton.icon(
                onPressed: () => _showClearConfirm(context, cartNotifier),
                icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.error),
                label: const Text('Kosongkan', style: TextStyle(color: AppColors.error, fontSize: 12)),
                style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
              ),
          ]),
        ),

        // Customer info + loyalty points
        if (cart.customer != null)
          Container(
            margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.person, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(cart.customer!.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.primary)),
                  Text('${cart.customer!.loyaltyPoints} poin tersedia', style: const TextStyle(fontSize: 11, color: AppColors.gray600)),
                ])),
                GestureDetector(
                  onTap: () => cartNotifier.setCustomer(null),
                  child: const Icon(Icons.close, size: 16, color: AppColors.gray500),
                ),
              ]),
              // Loyalty redeem row
              if (cart.customer!.loyaltyPoints > 0) ...[
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: cart.redeemPoints > 0
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                          child: Row(children: [
                            const Icon(Icons.star, size: 13, color: AppColors.success),
                            const SizedBox(width: 4),
                            Text('${cart.redeemPoints} poin = -${NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(cart.redeemDiscount)}',
                                style: const TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w600)),
                          ]),
                        )
                      : TextButton.icon(
                          onPressed: () => _showRedeemPoints(context, cart, cartNotifier),
                          icon: const Icon(Icons.star_outline, size: 14, color: AppColors.primary),
                          label: const Text('Tukar Poin', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 4), minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        )),
                  if (cart.redeemPoints > 0)
                    GestureDetector(
                      onTap: () => cartNotifier.setRedeemPoints(0),
                      child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, size: 14, color: AppColors.gray400)),
                    ),
                ]),
              ],
            ]),
          ),

        const Divider(height: 1),

        // Items
        Expanded(
          child: cart.isEmpty
              ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.gray300),
                    const SizedBox(height: 12),
                    const Text('Keranjang kosong', style: TextStyle(color: AppColors.gray400, fontSize: 15)),
                    const SizedBox(height: 4),
                    const Text('Tap produk untuk menambahkan', style: TextStyle(color: AppColors.gray400, fontSize: 12)),
                  ]),
                )
              : ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: cart.items.length,
                  itemBuilder: (_, i) => _CartItemTile(
                    item: cart.items[i],
                    currency: currency,
                    onIncrement: () => cartNotifier.updateQuantity(cart.items[i].productId, cart.items[i].quantity + 1),
                    onDecrement: () => cartNotifier.updateQuantity(cart.items[i].productId, cart.items[i].quantity - 1),
                    onRemove: () => cartNotifier.removeItem(cart.items[i].productId),
                  ),
                ),
        ),

        if (cart.itemCount > 0) ...[
          const Divider(height: 1),
          // Summary
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Column(children: [
              _SummaryRow('Subtotal', currency.format(cart.subtotal)),
              if (cart.discountAmount > 0)
                _SummaryRow('Diskon', '-${currency.format(cart.discountAmount)}', valueColor: AppColors.success),
              if (cart.redeemPoints > 0)
                _SummaryRow('Tukar Poin (${cart.redeemPoints})', '-${currency.format(cart.redeemDiscount)}', valueColor: AppColors.success),
              if (cart.taxAmount > 0)
                _SummaryRow('Pajak', currency.format(cart.taxAmount)),
              const Divider(height: 16),
              Row(children: [
                const Text('TOTAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const Spacer(),
                Text(currency.format(cart.total),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppColors.primary)),
              ]),
            ]),
          ),
          // Diskon button + Checkout button
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: SafeArea(
              top: false,
              child: Column(children: [
                // Diskon row
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showDiscountSheet(context, cart, cartNotifier),
                      icon: Icon(
                        cart.discountAmount > 0 ? Icons.discount : Icons.discount_outlined,
                        size: 16,
                        color: cart.discountAmount > 0 ? AppColors.success : AppColors.gray500,
                      ),
                      label: Text(
                        cart.discountAmount > 0
                            ? 'Diskon: -${currency.format(cart.discountAmount)}'
                            : 'Tambah Diskon',
                        style: TextStyle(
                          fontSize: 12,
                          color: cart.discountAmount > 0 ? AppColors.success : AppColors.gray500,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 38),
                        side: BorderSide(
                          color: cart.discountAmount > 0 ? AppColors.success : AppColors.gray300,
                        ),
                      ),
                    ),
                  ),
                  if (cart.discountAmount > 0) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: AppColors.gray400),
                      onPressed: () => cartNotifier.setDiscount(amount: 0),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                  ],
                ]),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: () => _showPaymentSheet(context, store),
                  icon: const Icon(Icons.payment, size: 20),
                  label: Text('Bayar ${currency.format(cart.total)}'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ],
    );
  }

  void _showPaymentSheet(BuildContext context, StoreModel store) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PaymentSheet(store: store),
    );
  }

  void _showRedeemPoints(BuildContext context, CartState cart, CartNotifier notifier) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RedeemPointsSheet(
        availablePoints: cart.customer!.loyaltyPoints,
        currentRedeem: cart.redeemPoints,
        subtotal: cart.subtotal,
        onApply: (points) => notifier.setRedeemPoints(points),
      ),
    );
  }

  void _showDiscountSheet(BuildContext context, CartState cart, CartNotifier notifier) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DiscountSheet(
        subtotal: cart.subtotal,
        currentDiscount: cart.discountAmount,
        onApply: (amount) => notifier.setDiscount(amount: amount),
      ),
    );
  }

  void _showClearConfirm(BuildContext context, CartNotifier notifier) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Kosongkan Keranjang'),
        content: const Text('Yakin ingin menghapus semua item dari keranjang?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              notifier.clear();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Kosongkan'),
          ),
        ],
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem item;
  final NumberFormat currency;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const _CartItemTile({
    required this.item,
    required this.currency,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(children: [
        // Qty controls
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.gray200),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            _QtyButton(icon: Icons.remove, onTap: onDecrement),
            Container(
              width: 32,
              alignment: Alignment.center,
              child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            _QtyButton(icon: Icons.add, onTap: onIncrement),
          ]),
        ),
        const SizedBox(width: 10),
        // Name & price
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(currency.format(item.price), style: const TextStyle(color: AppColors.gray500, fontSize: 11)),
        ])),
        // Subtotal
        Text(currency.format(item.subtotal), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(width: 4),
        GestureDetector(
          onTap: onRemove,
          child: const Padding(
            padding: EdgeInsets.all(4),
            child: Icon(Icons.close, size: 16, color: AppColors.gray400),
          ),
        ),
      ]),
    );
  }
}

class _QtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28, height: 28,
        alignment: Alignment.center,
        child: Icon(icon, size: 16, color: AppColors.gray700),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _SummaryRow(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Text(label, style: const TextStyle(color: AppColors.gray600, fontSize: 13)),
        const Spacer(),
        Text(value, style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: valueColor ?? AppColors.gray900)),
      ]),
    );
  }
}

// ─── Discount Sheet ───────────────────────────────────────────────────────────

class _DiscountSheet extends StatefulWidget {
  final double subtotal;
  final double currentDiscount;
  final void Function(double amount) onApply;
  const _DiscountSheet({required this.subtotal, required this.currentDiscount, required this.onApply});

  @override
  State<_DiscountSheet> createState() => _DiscountSheetState();
}

class _DiscountSheetState extends State<_DiscountSheet> {
  bool _isPercent = true;
  final _ctrl = TextEditingController();
  double _value = 0;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    if (widget.currentDiscount > 0) {
      _value = widget.currentDiscount;
      _ctrl.text = widget.currentDiscount.toInt().toString();
      _isPercent = false;
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  double get _discountAmount {
    if (_isPercent) return (widget.subtotal * _value / 100).clamp(0, widget.subtotal);
    return _value.clamp(0, widget.subtotal);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          const Text('Tambah Diskon', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),

          // Type toggle
          Row(children: [
            Expanded(child: GestureDetector(
              onTap: () { setState(() { _isPercent = true; _ctrl.clear(); _value = 0; }); },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _isPercent ? AppColors.primary : AppColors.gray100,
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
                ),
                child: Text('Persentase (%)', textAlign: TextAlign.center,
                    style: TextStyle(color: _isPercent ? Colors.white : AppColors.gray600, fontWeight: FontWeight.w600)),
              ),
            )),
            Expanded(child: GestureDetector(
              onTap: () { setState(() { _isPercent = false; _ctrl.clear(); _value = 0; }); },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: !_isPercent ? AppColors.primary : AppColors.gray100,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(8)),
                ),
                child: Text('Nominal (Rp)', textAlign: TextAlign.center,
                    style: TextStyle(color: !_isPercent ? Colors.white : AppColors.gray600, fontWeight: FontWeight.w600)),
              ),
            )),
          ]),
          const SizedBox(height: 16),

          // Input
          TextField(
            controller: _ctrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            autofocus: true,
            decoration: InputDecoration(
              prefixText: _isPercent ? '' : 'Rp ',
              suffixText: _isPercent ? '%' : '',
              hintText: _isPercent ? '0 – 100' : '0',
            ),
            onChanged: (v) => setState(() => _value = double.tryParse(v) ?? 0),
          ),
          const SizedBox(height: 8),

          // Quick percent buttons
          if (_isPercent)
            Wrap(spacing: 8, children: [5, 10, 15, 20, 25, 50].map((p) => ActionChip(
              label: Text('$p%', style: const TextStyle(fontSize: 12)),
              onPressed: () { _ctrl.text = p.toString(); setState(() => _value = p.toDouble()); },
              backgroundColor: AppColors.gray100, side: BorderSide.none,
            )).toList()),

          // Preview
          if (_value > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.successLight, borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                const Icon(Icons.check_circle, color: AppColors.success, size: 16),
                const SizedBox(width: 8),
                Text('Diskon: -${currency.format(_discountAmount)}',
                    style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600)),
              ]),
            ),
          ],

          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () { widget.onApply(0); Navigator.pop(context); },
              child: const Text('Hapus Diskon'),
            )),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(
              onPressed: _value > 0 ? () { widget.onApply(_discountAmount); Navigator.pop(context); } : null,
              child: const Text('Terapkan'),
            )),
          ]),
        ]),
      ),
    );
  }
}

// ─── Redeem Points Sheet ──────────────────────────────────────────────────────

class _RedeemPointsSheet extends StatefulWidget {
  final int availablePoints;
  final int currentRedeem;
  final double subtotal;
  final void Function(int points) onApply;
  const _RedeemPointsSheet({
    required this.availablePoints,
    required this.currentRedeem,
    required this.subtotal,
    required this.onApply,
  });

  @override
  State<_RedeemPointsSheet> createState() => _RedeemPointsSheetState();
}

class _RedeemPointsSheetState extends State<_RedeemPointsSheet> {
  late int _points;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  static const double _pointValue = 100; // 1 poin = Rp 100

  @override
  void initState() {
    super.initState();
    _points = widget.currentRedeem;
  }

  int get _maxPoints {
    // Maksimal poin yang bisa ditukar = min(availablePoints, subtotal / pointValue)
    final maxBySubtotal = (widget.subtotal / _pointValue).floor();
    return maxBySubtotal < widget.availablePoints ? maxBySubtotal : widget.availablePoints;
  }

  double get _discount => _points * _pointValue;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Row(children: [
            const Icon(Icons.star, color: AppColors.warning, size: 22),
            const SizedBox(width: 8),
            const Text('Tukar Poin', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ]),
          const SizedBox(height: 4),
          Text('${widget.availablePoints} poin tersedia · Maks $_maxPoints poin dapat ditukar',
              style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
          const SizedBox(height: 20),

          // Slider
          Row(children: [
            const Text('0', style: TextStyle(fontSize: 12, color: AppColors.gray400)),
            Expanded(child: Slider(
              value: _points.toDouble(),
              min: 0,
              max: _maxPoints.toDouble(),
              divisions: _maxPoints > 0 ? _maxPoints : 1,
              activeColor: AppColors.warning,
              onChanged: _maxPoints > 0
                  ? (v) => setState(() => _points = v.round())
                  : null,
            )),
            Text('$_maxPoints', style: const TextStyle(fontSize: 12, color: AppColors.gray400)),
          ]),

          // Quick buttons
          Wrap(spacing: 8, children: [
            _quickBtn(0, 'Tidak'),
            if (_maxPoints >= 10) _quickBtn((_maxPoints * 0.25).round(), '25%'),
            if (_maxPoints >= 10) _quickBtn((_maxPoints * 0.5).round(), '50%'),
            if (_maxPoints >= 10) _quickBtn((_maxPoints * 0.75).round(), '75%'),
            _quickBtn(_maxPoints, 'Semua'),
          ]),

          const SizedBox(height: 16),

          // Preview
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _points > 0 ? AppColors.warningLight : AppColors.gray100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(children: [
              Icon(Icons.star, size: 16, color: _points > 0 ? AppColors.warning : AppColors.gray400),
              const SizedBox(width: 8),
              Text(
                _points > 0
                    ? '$_points poin = diskon ${currency.format(_discount)}'
                    : 'Pilih jumlah poin yang ingin ditukar',
                style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: _points > 0 ? AppColors.warning : AppColors.gray500,
                ),
              ),
            ]),
          ),

          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () { widget.onApply(0); Navigator.pop(context); },
              child: const Text('Hapus'),
            )),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(
              onPressed: () { widget.onApply(_points); Navigator.pop(context); },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning),
              child: const Text('Terapkan'),
            )),
          ]),
        ]),
      ),
    );
  }

  Widget _quickBtn(int pts, String label) => ActionChip(
    label: Text(label, style: const TextStyle(fontSize: 12)),
    onPressed: () => setState(() => _points = pts),
    backgroundColor: _points == pts ? AppColors.warning.withValues(alpha: 0.15) : AppColors.gray100,
    side: BorderSide(color: _points == pts ? AppColors.warning : Colors.transparent),
  );
}
