import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/pos_provider.dart';

class ShiftGate extends ConsumerStatefulWidget {
  final StoreModel store;
  const ShiftGate({super.key, required this.store});

  @override
  ConsumerState<ShiftGate> createState() => _ShiftGateState();
}

class _ShiftGateState extends ConsumerState<ShiftGate> {
  final _cashCtrl = TextEditingController();
  double _openingCash = 0;
  bool _isOpening = false;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void dispose() {
    _cashCtrl.dispose();
    super.dispose();
  }

  Future<void> _openShift() async {
    setState(() => _isOpening = true);
    HapticFeedback.mediumImpact();
    final success = await ref.read(activeShiftProvider.notifier).openShift(_openingCash);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka shift'), backgroundColor: AppColors.error),
      );
    }
    if (mounted) setState(() => _isOpening = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              // Icon
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: AppColors.warningLight, borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.lock_clock, color: AppColors.warning, size: 30),
              ),
              const SizedBox(height: 20),
              const Text('Buka Shift', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.gray900)),
              const SizedBox(height: 6),
              Text('Toko: ${widget.store.name}', style: const TextStyle(color: AppColors.gray500, fontSize: 14)),
              const SizedBox(height: 32),

              // Info box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.infoLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                ),
                child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.info_outline, color: AppColors.info, size: 18),
                  SizedBox(width: 10),
                  Expanded(child: Text(
                    'Kas pembuka adalah uang tunai yang sudah ada di laci kasir sebelum mulai berjualan (modal kembalian).',
                    style: TextStyle(color: AppColors.info, fontSize: 13),
                  )),
                ]),
              ),
              const SizedBox(height: 24),

              // Cash input
              const Text('Kas Pembuka (IDR)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.gray700)),
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
                onChanged: (v) => setState(() => _openingCash = double.tryParse(v) ?? 0),
              ),

              // Quick amounts
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [0, 100000, 200000, 500000].map((amount) => ActionChip(
                  label: Text(amount == 0 ? 'Rp 0' : currency.format(amount.toDouble()), style: const TextStyle(fontSize: 12)),
                  onPressed: () {
                    _cashCtrl.text = amount.toString();
                    setState(() => _openingCash = amount.toDouble());
                  },
                  backgroundColor: AppColors.gray100,
                  side: BorderSide.none,
                )).toList(),
              ),

              const Spacer(),

              // Open shift button
              ElevatedButton.icon(
                onPressed: _isOpening ? null : _openShift,
                icon: _isOpening
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.play_circle_outline, size: 22),
                label: Text(_isOpening ? 'Membuka Shift...' : 'Mulai Shift — ${currency.format(_openingCash)}'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 54),
                  backgroundColor: AppColors.success,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
              // Change store — hanya untuk owner/admin, bukan employee
              Consumer(builder: (_, ref, __) {
                final user = ref.watch(authProvider).user;
                if (user?.type == 'employee') return const SizedBox.shrink();
                return OutlinedButton.icon(
                  onPressed: () => ref.read(selectedStoreProvider.notifier).state = null,
                  icon: const Icon(Icons.store_outlined, size: 18),
                  label: const Text('Ganti Toko'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 46)),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
