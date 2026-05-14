import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/services/printer_service.dart';

class ReceiptScreen extends ConsumerStatefulWidget {
  final TransactionModel transaction;
  final String storeName;
  final double? cashReceived;
  final String? paymentMethodName;
  final double taxRate;
  final String taxLabel;

  const ReceiptScreen({
    super.key,
    required this.transaction,
    required this.storeName,
    this.cashReceived,
    this.paymentMethodName,
    this.taxRate = 0,
    this.taxLabel = 'Pajak',
  });

  @override
  ConsumerState<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends ConsumerState<ReceiptScreen> {
  bool _isPrinting = false;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('dd MMM yyyy, HH:mm', 'id_ID').format(dt);
    } catch (_) {
      return iso;
    }
  }

  Future<void> _print({bool isReprint = false}) async {
    setState(() => _isPrinting = true);
    try {
      final printer = PrinterService();
      final result = await printer.printReceipt(
        transaction: widget.transaction,
        storeName: widget.storeName,
        isReprint: isReprint,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: result.success ? AppColors.success : AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isPrinting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tx = widget.transaction;
    final change = widget.cashReceived != null ? widget.cashReceived! - tx.total : null;
    final isCash = widget.cashReceived != null;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
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

          // Success header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Column(children: [
              Container(
                width: 64, height: 64,
                decoration: const BoxDecoration(color: AppColors.successLight, shape: BoxShape.circle),
                child: const Icon(Icons.check_circle, color: AppColors.success, size: 36),
              ),
              const SizedBox(height: 12),
              const Text('Transaksi Berhasil!',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.gray900)),
              const SizedBox(height: 4),
              Text(tx.transactionNumber,
                  style: const TextStyle(color: AppColors.gray500, fontSize: 13, fontFamily: 'monospace')),
            ]),
          ),

          const SizedBox(height: 16),
          const Divider(height: 1),

          // Receipt preview
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                // Store name
                Text(widget.storeName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    textAlign: TextAlign.center),
                const SizedBox(height: 4),
                Text(_formatDate(tx.createdAt),
                    style: const TextStyle(fontSize: 11, color: AppColors.gray400),
                    textAlign: TextAlign.center),
                if (tx.customerName != null) ...[
                  const SizedBox(height: 4),
                  Text('Pelanggan: ${tx.customerName}',
                      style: const TextStyle(fontSize: 12, color: AppColors.gray600),
                      textAlign: TextAlign.center),
                ],
                const SizedBox(height: 16),

                // Items
                ...tx.items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item.productName,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                      Text('${item.quantity} x ${currency.format(item.price)}',
                          style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
                    ])),
                    Text(currency.format(item.subtotal),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  ]),
                )),

                const Divider(height: 20),

                // Totals
                _ReceiptRow('Subtotal', currency.format(tx.subtotal)),
                if (tx.discountAmount > 0)
                  _ReceiptRow('Diskon', '-${currency.format(tx.discountAmount)}',
                      valueColor: AppColors.success),
                if (tx.taxAmount > 0)
                  _ReceiptRow(
                    widget.taxRate > 0
                        ? '${widget.taxLabel} (${widget.taxRate.toStringAsFixed(0)}%)'
                        : widget.taxLabel,
                    currency.format(tx.taxAmount),
                  ),
                const Divider(height: 12),
                _ReceiptRow('TOTAL', currency.format(tx.total), bold: true, fontSize: 16),

                const SizedBox(height: 8),

                // Payment info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.gray100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(children: [
                    _ReceiptRow(
                      'Metode Bayar',
                      widget.paymentMethodName ?? tx.paymentMethod.toUpperCase(),
                    ),
                    if (isCash) ...[
                      _ReceiptRow('Tunai', currency.format(widget.cashReceived!)),
                      _ReceiptRow('Kembalian', currency.format(change!),
                          valueColor: AppColors.success),
                    ],
                  ]),
                ),
              ]),
            ),
          ),

          const Divider(height: 1),

          // Actions
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: SafeArea(
              top: false,
              child: Column(children: [
                ElevatedButton.icon(
                  onPressed: _isPrinting ? null : () => _print(),
                  icon: _isPrinting
                      ? const SizedBox(width: 18, height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.print, size: 20),
                  label: Text(_isPrinting ? 'Mencetak...' : 'Cetak Struk'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _print(isReprint: true),
                      icon: const Icon(Icons.replay, size: 18),
                      label: const Text('Cetak Ulang'),
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.add_shopping_cart, size: 18),
                      label: const Text('Transaksi Baru'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(0, 46),
                        backgroundColor: AppColors.success,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ]),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool bold;
  final double fontSize;

  const _ReceiptRow(this.label, this.value, {this.valueColor, this.bold = false, this.fontSize = 13});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Text(label, style: TextStyle(
          fontSize: fontSize,
          fontWeight: bold ? FontWeight.bold : FontWeight.normal,
          color: AppColors.gray700,
        )),
        const Spacer(),
        Text(value, style: TextStyle(
          fontSize: fontSize,
          fontWeight: bold ? FontWeight.bold : FontWeight.w500,
          color: valueColor ?? AppColors.gray900,
        )),
      ]),
    );
  }
}
