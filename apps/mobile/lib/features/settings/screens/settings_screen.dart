import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../pos/providers/pos_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final store = ref.watch(selectedStoreProvider);
    final shift = ref.watch(activeShiftProvider);
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        title: const Text('Pengaturan', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── User Card ──────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF3730A3)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                child: Text(
                  user?.displayName.isNotEmpty == true ? user!.displayName[0].toUpperCase() : '?',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(user?.name ?? '-',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                Text(user?.email ?? '-',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    (user?.role ?? '-').toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                  ),
                ),
              ])),
            ]),
          ),
          const SizedBox(height: 24),

          // ── Toko & Shift ───────────────────────────────────────────────
          _sectionTitle('Toko & Shift'),
          _tile(
            icon: Icons.store_outlined,
            title: 'Toko Aktif',
            subtitle: store?.name ?? 'Belum dipilih',
            trailing: store != null
                ? TextButton(
                    onPressed: () => ref.read(selectedStoreProvider.notifier).state = null,
                    child: const Text('Ganti', style: TextStyle(fontSize: 13)),
                  )
                : null,
          ),
          if (shift != null)
            _tile(
              icon: Icons.access_time_rounded,
              iconColor: AppColors.success,
              title: 'Shift Aktif',
              subtitle: 'Dibuka: ${_formatTime(shift.startTime)}',
              trailing: TextButton(
                onPressed: () => _confirmCloseShift(context, ref),
                child: const Text('Tutup', style: TextStyle(color: AppColors.error, fontSize: 13)),
              ),
            )
          else
            _tile(
              icon: Icons.access_time_rounded,
              iconColor: AppColors.gray400,
              title: 'Shift',
              subtitle: 'Tidak ada shift aktif',
            ),

          const SizedBox(height: 16),

          // ── Printer ────────────────────────────────────────────────────
          _sectionTitle('Printer'),
          _tile(
            icon: Icons.print_outlined,
            title: 'Konfigurasi Printer',
            subtitle: 'Bluetooth, USB, atau Network',
            onTap: () => context.push('/settings/printer'),
          ),

          const SizedBox(height: 16),

          // ── Aplikasi ───────────────────────────────────────────────────
          _sectionTitle('Aplikasi'),
          _tile(
            icon: Icons.info_outline_rounded,
            title: 'Versi',
            subtitle: 'MonetraPOS v1.0.0',
          ),

          const SizedBox(height: 32),

          // ── Logout ─────────────────────────────────────────────────────
          SizedBox(
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () => _confirmLogout(context, ref),
              icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
              label: const Text('Keluar dari Akun', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _formatTime(String t) {
    try {
      return t.length >= 16 ? t.substring(0, 16).replaceAll('T', ' ') : t;
    } catch (_) {
      return t;
    }
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title.toUpperCase(),
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.gray400, letterSpacing: 0.8),
        ),
      );

  Widget _tile({
    required IconData icon,
    required String title,
    String? subtitle,
    Color? iconColor,
    Widget? trailing,
    VoidCallback? onTap,
  }) =>
      Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.gray200),
        ),
        child: ListTile(
          leading: Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: (iconColor ?? AppColors.primary).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor ?? AppColors.primary, size: 18),
          ),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
          subtitle: subtitle != null
              ? Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.gray500))
              : null,
          trailing: trailing ??
              (onTap != null
                  ? const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.gray400)
                  : null),
          onTap: onTap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          dense: true,
        ),
      );

  void _confirmCloseShift(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CloseShiftSettingsSheet(ref: ref),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Keluar', style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text('Yakin ingin keluar dari aplikasi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              // Logout setelah dialog ditutup
              Future.microtask(() => ref.read(authProvider.notifier).logout());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}

class _CloseShiftSettingsSheet extends StatefulWidget {
  final WidgetRef ref;
  const _CloseShiftSettingsSheet({required this.ref});

  @override
  State<_CloseShiftSettingsSheet> createState() => _CloseShiftSettingsSheetState();
}

class _CloseShiftSettingsSheetState extends State<_CloseShiftSettingsSheet> {
  final _cashCtrl = TextEditingController();
  double _closingCash = 0;
  bool _isClosing = false;
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void dispose() { _cashCtrl.dispose(); super.dispose(); }

  Future<void> _close() async {
    setState(() => _isClosing = true);
    final success = await widget.ref.read(activeShiftProvider.notifier).closeShift(_closingCash);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Shift berhasil ditutup' : 'Gagal menutup shift'),
        backgroundColor: success ? AppColors.success : AppColors.error,
      ));
    }
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
          const Text('Tutup Shift', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          const Text('Kas Penutup (IDR)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: _cashCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(prefixText: 'Rp ', hintText: '0'),
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
            onPressed: _isClosing ? null : _close,
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
}
