import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/services/printer_service.dart';
import '../../../core/providers/auth_provider.dart';
import '../../pos/providers/pos_provider.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final _txFilterProvider = StateProvider<_TxFilter>((ref) => const _TxFilter());

class _TxFilter {
  final String? storeId;
  final String status;
  final String? startDate;
  final String? endDate;
  final String search;
  const _TxFilter({this.storeId, this.status = 'all', this.startDate, this.endDate, this.search = ''});
  _TxFilter copyWith({String? storeId, String? status, String? startDate, String? endDate, String? search}) =>
      _TxFilter(
        storeId: storeId ?? this.storeId,
        status: status ?? this.status,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        search: search ?? this.search,
      );
}

final _transactionsProvider = FutureProvider<List<TransactionModel>>((ref) async {
  final filter = ref.watch(_txFilterProvider);
  if (filter.storeId == null) return [];
  final api = ApiClient();
  final params = <String, dynamic>{'storeId': filter.storeId, 'limit': 50};
  if (filter.status != 'all') params['status'] = filter.status;
  if (filter.startDate != null) params['startDate'] = filter.startDate;
  if (filter.endDate != null) params['endDate'] = filter.endDate;
  if (filter.search.isNotEmpty) params['search'] = filter.search;
  final res = await api.dio.get('/transactions', queryParameters: params);
  final list = res.data is List ? res.data : (res.data['data'] ?? []);
  return (list as List).map((e) => TransactionModel.fromJson(e)).toList();
});

// ─── Screen ───────────────────────────────────────────────────────────────────

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});
  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _searchCtrl = TextEditingController();
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    // Auto-select store dari employee storeId
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider).user;
      final storeId = user?.storeId ?? ref.read(selectedStoreProvider)?.id;
      if (storeId != null && ref.read(_txFilterProvider).storeId == null) {
        ref.read(_txFilterProvider.notifier).update((s) => s.copyWith(storeId: storeId));
      }
    });
  }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(_txFilterProvider);
    final txAsync = ref.watch(_transactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Riwayat Transaksi'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(_transactionsProvider)),
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () => _showFilterSheet(context, filter)),
        ],
      ),
      body: Column(children: [
        // Store selector — hanya tampil jika user punya akses ke banyak toko
        Consumer(builder: (_, ref, __) {
          final user = ref.watch(authProvider).user;
          final isEmployee = user?.type == 'employee';
          if (isEmployee) return const SizedBox.shrink(); // employee hanya 1 toko
          return ref.watch(storesProvider).when(
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
            data: (stores) => stores.isEmpty ? const SizedBox.shrink() : Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
              child: DropdownButtonFormField<String>(
                initialValue: ref.watch(_txFilterProvider).storeId,
                decoration: const InputDecoration(labelText: 'Toko', prefixIcon: Icon(Icons.store, size: 18), isDense: true),
                items: stores.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                onChanged: (v) => ref.read(_txFilterProvider.notifier).update((s) => s.copyWith(storeId: v)),
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
              hintText: 'Cari no. transaksi...',
              prefixIcon: const Icon(Icons.search, size: 18),
              isDense: true,
              suffixIcon: filter.search.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () {
                      _searchCtrl.clear();
                      ref.read(_txFilterProvider.notifier).update((s) => s.copyWith(search: ''));
                    })
                  : null,
            ),
            onChanged: (v) => ref.read(_txFilterProvider.notifier).update((s) => s.copyWith(search: v)),
          ),
        ),
        // Status filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: Row(children: ['all', 'completed', 'pending', 'voided'].map((s) {
            final selected = filter.status == s;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(_statusLabel(s), style: TextStyle(fontSize: 12, color: selected ? Colors.white : AppColors.gray600)),
                selected: selected,
                onSelected: (_) => ref.read(_txFilterProvider.notifier).update((f) => f.copyWith(status: s)),
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.gray100,
                side: BorderSide.none,
                showCheckmark: false,
              ),
            );
          }).toList()),
        ),
        const Divider(height: 1),
        // List
        Expanded(
          child: filter.storeId == null
              ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.store_outlined, size: 56, color: AppColors.gray300),
                  SizedBox(height: 12),
                  Text('Pilih toko untuk melihat transaksi', style: TextStyle(color: AppColors.gray500)),
                ]))
              : txAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 8),
                    Text(e.toString(), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: () => ref.invalidate(_transactionsProvider),
                        style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                        child: const Text('Coba Lagi')),
                  ])),
                  data: (txList) {
                    if (txList.isEmpty) {
                      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.gray300),
                        const SizedBox(height: 12),
                        Text(filter.search.isNotEmpty ? 'Tidak ada hasil untuk "${filter.search}"' : 'Belum ada transaksi',
                            style: const TextStyle(color: AppColors.gray500)),
                      ]));
                    }
                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(_transactionsProvider),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: txList.length,
                        itemBuilder: (_, i) => _TxCard(tx: txList[i], currency: currency,
                            onTap: () => _showDetail(context, txList[i])),
                      ),
                    );
                  },
                ),
        ),
      ]),
    );
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'all': return 'Semua';
      case 'completed': return 'Selesai';
      case 'pending': return 'Pending';
      case 'voided': return 'Void';
      default: return s;
    }
  }

  void _showFilterSheet(BuildContext context, _TxFilter filter) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FilterSheet(filter: filter, onApply: (f) {
        ref.read(_txFilterProvider.notifier).state = f;
        ref.invalidate(_transactionsProvider);
      }),
    );
  }

  void _showDetail(BuildContext context, TransactionModel tx) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TxDetailSheet(tx: tx, currency: currency,
          onVoid: () => _voidTransaction(context, tx)),
    );
  }

  Future<void> _voidTransaction(BuildContext context, TransactionModel tx) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Void Transaksi'),
        content: Text('Void transaksi ${tx.transactionNumber}?\nStok akan dikembalikan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Void'),
          ),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    try {
      final api = ApiClient();
      await api.dio.post('/transactions/${tx.id}/void');
      if (context.mounted) {
        // Tutup detail sheet
        if (Navigator.of(context).canPop()) Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaksi berhasil di-void'), backgroundColor: AppColors.success),
        );
        ref.invalidate(_transactionsProvider);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal void: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }
}

// ─── Transaction Card ─────────────────────────────────────────────────────────

class _TxCard extends StatelessWidget {
  final TransactionModel tx;
  final NumberFormat currency;
  final VoidCallback onTap;
  const _TxCard({required this.tx, required this.currency, required this.onTap});

  Color get _statusColor {
    switch (tx.status) {
      case 'completed': return AppColors.success;
      case 'voided': return AppColors.error;
      default: return AppColors.warning;
    }
  }

  String get _statusLabel {
    switch (tx.status) {
      case 'completed': return 'Selesai';
      case 'voided': return 'Void';
      default: return tx.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final date = tx.createdAt.isNotEmpty
        ? DateFormat('dd MMM yyyy, HH:mm').format(DateTime.tryParse(tx.createdAt) ?? DateTime.now())
        : '-';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.gray200),
        ),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: _statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.receipt_long, color: _statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(tx.transactionNumber, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 2),
            Text(date, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
            if (tx.customerName != null && tx.customerName!.isNotEmpty)
              Text(tx.customerName!, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(currency.format(tx.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(_statusLabel, style: TextStyle(fontSize: 10, color: _statusColor, fontWeight: FontWeight.w600)),
            ),
          ]),
        ]),
      ),
    );
  }
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

class _TxDetailSheet extends StatelessWidget {
  final TransactionModel tx;
  final NumberFormat currency;
  final VoidCallback onVoid;
  const _TxDetailSheet({required this.tx, required this.currency, required this.onVoid});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Center(child: Container(margin: const EdgeInsets.only(top: 10, bottom: 4), width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)))),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tx.transactionNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Text(tx.createdAt.isNotEmpty
                  ? DateFormat('dd MMM yyyy, HH:mm').format(DateTime.tryParse(tx.createdAt) ?? DateTime.now())
                  : '-', style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
            ])),
            Text(currency.format(tx.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppColors.primary)),
          ]),
        ),
        const Divider(height: 20),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(children: [
              // Items
              ...tx.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                    Text('${item.quantity} x ${currency.format(item.price)}', style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
                  ])),
                  Text(currency.format(item.subtotal), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                ]),
              )),
              const Divider(height: 16),
              if (tx.discountAmount > 0) _Row('Diskon', '-${currency.format(tx.discountAmount)}', color: AppColors.success),
              if (tx.taxAmount > 0) _Row('Pajak', currency.format(tx.taxAmount)),
              _Row('Total', currency.format(tx.total), bold: true),
              _Row('Metode', tx.paymentMethod.toUpperCase()),
              if (tx.customerName != null) _Row('Pelanggan', tx.customerName!),
              const SizedBox(height: 8),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: SafeArea(top: false, child: Row(children: [
            Expanded(child: OutlinedButton.icon(
              onPressed: () async {
                final printer = PrinterService();
                await printer.printReceipt(
                  transaction: tx,
                  storeName: 'Toko',
                  isReprint: true,
                );
              },
              icon: const Icon(Icons.print, size: 18),
              label: const Text('Cetak Ulang'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
            )),
            if (tx.status == 'completed') ...[
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton.icon(
                onPressed: () { Navigator.pop(context); onVoid(); },
                icon: const Icon(Icons.cancel_outlined, size: 18),
                label: const Text('Void'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(0, 46),
                  backgroundColor: AppColors.error,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              )),
            ],
          ])),
        ),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? color;
  const _Row(this.label, this.value, {this.bold = false, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Text(label, style: TextStyle(fontSize: 13, color: AppColors.gray600, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        const Spacer(),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.bold : FontWeight.w500, color: color ?? AppColors.gray900)),
      ]),
    );
  }
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

class _FilterSheet extends StatefulWidget {
  final _TxFilter filter;
  final void Function(_TxFilter) onApply;
  const _FilterSheet({required this.filter, required this.onApply});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late String _startDate;
  late String _endDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = widget.filter.startDate ?? DateFormat('yyyy-MM-dd').format(DateTime(now.year, now.month, 1));
    _endDate = widget.filter.endDate ?? DateFormat('yyyy-MM-dd').format(now);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Filter Transaksi', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Dari', style: TextStyle(fontSize: 12, color: AppColors.gray600)),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () async {
                  final d = await showDatePicker(context: context, initialDate: DateTime.tryParse(_startDate) ?? DateTime.now(),
                      firstDate: DateTime(2020), lastDate: DateTime.now());
                  if (d != null) setState(() => _startDate = DateFormat('yyyy-MM-dd').format(d));
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(border: Border.all(color: AppColors.gray300), borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    const Icon(Icons.calendar_today, size: 16, color: AppColors.gray500),
                    const SizedBox(width: 8),
                    Text(_startDate, style: const TextStyle(fontSize: 13)),
                  ]),
                ),
              ),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Sampai', style: TextStyle(fontSize: 12, color: AppColors.gray600)),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () async {
                  final d = await showDatePicker(context: context, initialDate: DateTime.tryParse(_endDate) ?? DateTime.now(),
                      firstDate: DateTime(2020), lastDate: DateTime.now());
                  if (d != null) setState(() => _endDate = DateFormat('yyyy-MM-dd').format(d));
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(border: Border.all(color: AppColors.gray300), borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    const Icon(Icons.calendar_today, size: 16, color: AppColors.gray500),
                    const SizedBox(width: 8),
                    Text(_endDate, style: const TextStyle(fontSize: 13)),
                  ]),
                ),
              ),
            ])),
          ]),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () {
                final now = DateTime.now();
                widget.onApply(_TxFilter(
                  storeId: widget.filter.storeId,
                  startDate: DateFormat('yyyy-MM-dd').format(DateTime(now.year, now.month, 1)),
                  endDate: DateFormat('yyyy-MM-dd').format(now),
                ));
                Navigator.pop(context);
              },
              child: const Text('Reset'),
            )),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(
              onPressed: () {
                widget.onApply(widget.filter.copyWith(startDate: _startDate, endDate: _endDate));
                Navigator.pop(context);
              },
              child: const Text('Terapkan'),
            )),
          ]),
        ]),
      ),
    );
  }
}
