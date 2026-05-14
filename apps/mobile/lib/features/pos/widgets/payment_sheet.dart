import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../providers/pos_provider.dart';
import 'receipt_screen.dart';

// Provider untuk tax rate dari company settings
final _taxSettingsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ApiClient();
  if (!api.hasToken) return {};
  try {
    final res = await api.dio.get('/companies/settings');
    return Map<String, dynamic>.from(res.data ?? {});
  } catch (_) { return {}; }
});

// Provider untuk generate QRIS dinamis
final _qrisProvider = FutureProvider.family<Map<String, dynamic>?, _QrisParams>((ref, params) async {
  final api = ApiClient();
  if (!api.hasToken) return null;
  try {
    final res = await api.dio.post('/qris/generate-dynamic', data: {
      'storeId': params.storeId,
      'amount': params.amount,
    });
    final data = res.data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return null;
  } catch (e) {
    throw Exception('Gagal generate QRIS: $e');
  }
});

class _QrisParams {
  final String storeId;
  final double amount;
  const _QrisParams(this.storeId, this.amount);
  @override bool operator ==(Object o) => o is _QrisParams && o.storeId == storeId && o.amount == amount;
  @override int get hashCode => Object.hash(storeId, amount);
}

class PaymentSheet extends ConsumerStatefulWidget {
  final StoreModel store;
  const PaymentSheet({super.key, required this.store});

  @override
  ConsumerState<PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends ConsumerState<PaymentSheet> {
  PaymentMethodModel? _selectedMethod;
  double _cashReceived = 0;
  final _cashCtrl = TextEditingController();
  bool _isProcessing = false;
  double _taxRate = 0;
  String _taxLabel = 'Pajak';
  // Split payment
  bool _isSplit = false;
  PaymentMethodModel? _splitMethod2;
  double _splitAmount1 = 0;
  double _splitAmount2 = 0;
  final _split1Ctrl = TextEditingController();
  final _split2Ctrl = TextEditingController();

  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    // Load tax settings once
    Future.microtask(() {
      ref.read(_taxSettingsProvider.future).then((settings) {
        final rate = (settings['taxSettings']?['defaultTaxRate'] as num?)?.toDouble() ?? 0;
        final label = settings['taxSettings']?['taxLabel'] as String? ?? 'Pajak';
        if (mounted) setState(() { _taxRate = rate; _taxLabel = label; });
        if (rate > 0 && ref.read(cartProvider).taxRate != rate) {
          ref.read(cartProvider.notifier).setTaxRate(rate);
        }
      }).catchError((_) {});
    });
  }

  @override
  void dispose() {
    _cashCtrl.dispose();
    _split1Ctrl.dispose();
    _split2Ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final shift = ref.watch(activeShiftProvider);
    final methodsAsync = ref.watch(paymentMethodsProvider(widget.store.id));

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Row(children: [
                const Text('Pembayaran', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                Text(currency.format(cart.total),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ]),
            ),

            // Summary ringkas
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Column(children: [
                _SummaryLine('Subtotal', currency.format(cart.subtotal)),
                if (cart.discountAmount > 0)
                  _SummaryLine('Diskon', '-${currency.format(cart.discountAmount)}', color: AppColors.success),
                if (_taxRate > 0)
                  _SummaryLine('$_taxLabel (${_taxRate.toStringAsFixed(0)}%)', currency.format(cart.taxAmount)),
              ]),
            ),

            const Divider(height: 20),

            // Payment methods
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: methodsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const Text('Gagal memuat metode pembayaran'),
                data: (methods) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: methods.map((m) => _MethodChip(
                      method: m,
                      selected: _selectedMethod?.id == m.id,
                      onTap: () => setState(() {
                        _selectedMethod = m;
                        if (m.type != 'cash') { _cashReceived = 0; _cashCtrl.clear(); }
                        if (_isSplit) { _splitAmount1 = cart.total; _split1Ctrl.text = cart.total.toInt().toString(); _splitAmount2 = 0; _split2Ctrl.clear(); }
                      }),
                    )).toList(),
                  ),
                  // Split payment toggle
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => setState(() {
                      _isSplit = !_isSplit;
                      if (_isSplit) { _splitAmount1 = cart.total; _split1Ctrl.text = cart.total.toInt().toString(); _splitAmount2 = 0; _split2Ctrl.clear(); }
                    }),
                    child: Row(children: [
                      Icon(_isSplit ? Icons.check_box : Icons.check_box_outline_blank, size: 18, color: AppColors.primary),
                      const SizedBox(width: 6),
                      const Text('Split Payment (2 metode)', style: TextStyle(fontSize: 13, color: AppColors.primary)),
                    ]),
                  ),
                  // Split method 2
                  if (_isSplit) ...[
                    const SizedBox(height: 8),
                    const Text('Metode ke-2:', style: TextStyle(fontSize: 12, color: AppColors.gray600)),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: methods.where((m) => m.id != _selectedMethod?.id).map((m) => _MethodChip(
                        method: m,
                        selected: _splitMethod2?.id == m.id,
                        onTap: () => setState(() => _splitMethod2 = m),
                      )).toList(),
                    ),
                    const SizedBox(height: 8),
                    Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_selectedMethod?.name ?? 'Metode 1', style: const TextStyle(fontSize: 12, color: AppColors.gray600)),
                        TextField(
                          controller: _split1Ctrl,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          decoration: const InputDecoration(prefixText: 'Rp ', isDense: true),
                          onChanged: (v) {
                            final val = double.tryParse(v) ?? 0;
                            setState(() {
                              _splitAmount1 = val;
                              _splitAmount2 = (cart.total - val).clamp(0, cart.total);
                              _split2Ctrl.text = _splitAmount2.toInt().toString();
                            });
                          },
                        ),
                      ])),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_splitMethod2?.name ?? 'Metode 2', style: const TextStyle(fontSize: 12, color: AppColors.gray600)),
                        TextField(
                          controller: _split2Ctrl,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          decoration: const InputDecoration(prefixText: 'Rp ', isDense: true),
                          onChanged: (v) {
                            final val = double.tryParse(v) ?? 0;
                            setState(() {
                              _splitAmount2 = val;
                              _splitAmount1 = (cart.total - val).clamp(0, cart.total);
                              _split1Ctrl.text = _splitAmount1.toInt().toString();
                            });
                          },
                        ),
                      ])),
                    ]),
                  ],
                ]),
              ),
            ),

            // Cash input
            if (_selectedMethod?.type == 'cash') ...[
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Uang Diterima', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _cashCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: InputDecoration(
                      prefixText: 'Rp ',
                      hintText: '0',
                      suffixIcon: _cashReceived > 0
                          ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _cashCtrl.clear(); setState(() => _cashReceived = 0); })
                          : null,
                    ),
                    onChanged: (v) => setState(() => _cashReceived = double.tryParse(v) ?? 0),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: _quickCashAmounts(cart.total).map((amount) => ActionChip(
                      label: Text(currency.format(amount), style: const TextStyle(fontSize: 12)),
                      onPressed: () {
                        _cashCtrl.text = amount.toInt().toString();
                        setState(() => _cashReceived = amount);
                      },
                      backgroundColor: AppColors.gray100,
                      side: BorderSide.none,
                    )).toList(),
                  ),
                  if (_cashReceived >= cart.total)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(color: AppColors.successLight, borderRadius: BorderRadius.circular(8)),
                      child: Row(children: [
                        const Icon(Icons.check_circle, color: AppColors.success, size: 16),
                        const SizedBox(width: 8),
                        Text('Kembalian: ${currency.format(_cashReceived - cart.total)}',
                            style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                ]),
              ),
            ],

            // QRIS display
            if (_selectedMethod?.type == 'qris') ...[
              const SizedBox(height: 16),
              _QrisDisplay(storeId: widget.store.id, amount: cart.total),
            ],

            // Non-cash info (bukan QRIS, bukan cash)
            if (_selectedMethod != null && _selectedMethod!.type != 'cash' && _selectedMethod!.type != 'qris') ...[
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(children: [
                    const Icon(Icons.info_outline, color: AppColors.primary, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(
                      'Pastikan pembayaran ${currency.format(cart.total)} sudah diterima sebelum konfirmasi.',
                      style: const TextStyle(fontSize: 12, color: AppColors.primary),
                    )),
                  ]),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Pay button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SafeArea(
                top: false,
                child: ElevatedButton(
                  onPressed: _canPay(cart) ? () => _processPayment(cart, shift, _taxRate, _taxLabel) : null,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    backgroundColor: AppColors.success,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isProcessing
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.check_circle_outline, size: 20),
                          const SizedBox(width: 8),
                          Text('Proses Pembayaran — ${currency.format(cart.total)}',
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _canPay(CartState cart) {
    if (_selectedMethod == null || _isProcessing) return false;
    if (_isSplit) {
      if (_splitMethod2 == null) return false;
      if ((_splitAmount1 + _splitAmount2) < cart.total) return false;
      return true;
    }
    if (_selectedMethod!.type == 'cash' && _cashReceived < cart.total) return false;
    return true;
  }

  List<double> _quickCashAmounts(double total) {
    final amounts = <double>[total];
    for (final round in [5000, 10000, 20000, 50000, 100000, 200000]) {
      final rounded = (total / round).ceil() * round.toDouble();
      if (rounded > total && !amounts.contains(rounded)) amounts.add(rounded);
      if (amounts.length >= 4) break;
    }
    return amounts.take(4).toList();
  }

  Future<void> _processPayment(CartState cart, ShiftModel? shift, double taxRate, String taxLabel) async {
    if (shift == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tidak ada shift aktif. Buka shift terlebih dahulu.'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _isProcessing = true);
    HapticFeedback.mediumImpact();

    try {
      final tx = await ref.read(checkoutProvider.notifier).checkout(
        storeId: widget.store.id,
        shiftId: shift.id,
        paymentMethodCode: _selectedMethod!.code,
        cashReceived: (!_isSplit && _selectedMethod!.type == 'cash') ? _cashReceived : null,
        orderType: ref.read(cartProvider).orderType,
        tableId: ref.read(cartProvider).tableId,
        splitPayments: _isSplit && _splitMethod2 != null ? [
          {'method': _selectedMethod!.code, 'amount': _splitAmount1},
          {'method': _splitMethod2!.code, 'amount': _splitAmount2},
        ] : null,
      );

      if (tx != null && mounted) {
        ref.invalidate(fnbActiveOrdersProvider(widget.store.id));
        if (Navigator.canPop(context)) Navigator.pop(context);

        if (mounted) {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            isDismissible: false,
            builder: (_) => ReceiptScreen(
              transaction: tx,
              storeName: widget.store.name,
              cashReceived: _selectedMethod!.type == 'cash' ? _cashReceived : null,
              paymentMethodName: _selectedMethod!.name,
              taxRate: taxRate,
              taxLabel: taxLabel,
            ),
          );
        }
      } else if (mounted) {
        final error = ref.read(checkoutProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal: ${error ?? "Terjadi kesalahan"}'), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }
}

// ─── QRIS Display ─────────────────────────────────────────────────────────────

class _QrisDisplay extends ConsumerWidget {
  final String storeId;
  final double amount;
  const _QrisDisplay({required this.storeId, required this.amount});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final qrisAsync = ref.watch(_qrisProvider(_QrisParams(storeId, amount)));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F3FF),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
        ),
        child: Column(children: [
          // Nominal
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              currency.format(amount),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
          const SizedBox(height: 16),

          // QR Code
          qrisAsync.when(
            loading: () => const SizedBox(
              width: 200, height: 200,
              child: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
            ),
            error: (e, _) => Column(children: [
              const Icon(Icons.qr_code, size: 80, color: Color(0xFF6366F1)),
              const SizedBox(height: 8),
              Text('$e', style: const TextStyle(fontSize: 11, color: AppColors.error), textAlign: TextAlign.center),
              const SizedBox(height: 4),
              const Text('Scan QR statis dari mesin QRIS', style: TextStyle(fontSize: 11, color: AppColors.gray400)),
            ]),
            data: (result) {
              if (result == null || result['qrDataUrl'] == null) {
                final msg = result?['message'] as String? ?? 'QRIS tidak tersedia';
                return Column(children: [
                  const Icon(Icons.qr_code, size: 80, color: Color(0xFF6366F1)),
                  const SizedBox(height: 8),
                  Text(msg, style: const TextStyle(fontSize: 12, color: AppColors.gray500), textAlign: TextAlign.center),
                ]);
              }

              // Parse base64 data URL: "data:image/png;base64,<data>"
              final dataUrl = result['qrDataUrl'] as String;
              Widget qrImage;
              try {
                final base64Str = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
                final bytes = base64Decode(base64Str);
                qrImage = Image.memory(bytes, width: 200, height: 200, fit: BoxFit.contain);
              } catch (_) {
                qrImage = const Icon(Icons.qr_code, size: 160, color: Color(0xFF6366F1));
              }

              return Column(children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)],
                  ),
                  padding: const EdgeInsets.all(8),
                  child: qrImage,
                ),
                if (result['merchantName'] != null) ...[
                  const SizedBox(height: 8),
                  Text(result['merchantName'] as String,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6366F1))),
                ],
                const SizedBox(height: 4),
                TextButton.icon(
                  onPressed: () => ref.invalidate(_qrisProvider(_QrisParams(storeId, amount))),
                  icon: const Icon(Icons.refresh, size: 14, color: Color(0xFF6366F1)),
                  label: const Text('Refresh', style: TextStyle(fontSize: 12, color: Color(0xFF6366F1))),
                ),
              ]);
            },
          ),

          const SizedBox(height: 8),
          const Text('Scan dengan aplikasi e-wallet atau m-banking',
              style: TextStyle(fontSize: 11, color: AppColors.gray500), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

// ─── Summary Line ─────────────────────────────────────────────────────────────

class _SummaryLine extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _SummaryLine(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
        const Spacer(),
        Text(value, style: TextStyle(fontSize: 12, color: color ?? AppColors.gray700, fontWeight: FontWeight.w500)),
      ]),
    );
  }
}

// ─── Method Chip ──────────────────────────────────────────────────────────────

class _MethodChip extends StatelessWidget {
  final PaymentMethodModel method;
  final bool selected;
  final VoidCallback onTap;
  const _MethodChip({required this.method, required this.selected, required this.onTap});

  IconData get _icon {
    switch (method.type) {
      case 'cash': return Icons.payments_outlined;
      case 'card': return Icons.credit_card;
      case 'ewallet': return Icons.account_balance_wallet_outlined;
      case 'qris': return Icons.qr_code;
      case 'bank_transfer': return Icons.account_balance_outlined;
      default: return Icons.payment;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.gray100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? AppColors.primary : AppColors.gray200),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(_icon, size: 18, color: selected ? Colors.white : AppColors.gray600),
          const SizedBox(width: 6),
          Text(method.name, style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w500,
            color: selected ? Colors.white : AppColors.gray700,
          )),
        ]),
      ),
    );
  }
}
