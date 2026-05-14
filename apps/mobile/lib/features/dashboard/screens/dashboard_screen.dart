import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final user = auth.user;

    // Jika belum authenticated, tampilkan loading
    if (!auth.isAuthenticated) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final dashAsync = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.gray900)),
            Text('Halo, ${user?.displayName ?? 'User'}',
                style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.gray600),
            onPressed: () => ref.invalidate(dashboardProvider),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.gray600),
            onPressed: () => _showLogout(context, ref),
          ),
        ],
      ),
      body: dashAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.wifi_off, size: 56, color: AppColors.gray300),
              const SizedBox(height: 16),
              const Text('Gagal memuat data', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 8),
              Text(
                e.toString().contains('403') || e.toString().contains('401')
                    ? 'Sesi login berakhir. Silakan login ulang.'
                    : 'Periksa koneksi internet Anda.',
                style: const TextStyle(color: AppColors.gray500, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(dashboardProvider),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Coba Lagi'),
                style: ElevatedButton.styleFrom(minimumSize: const Size(160, 44)),
              ),
            ]),
          ),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Quick Action - POS
              GestureDetector(
                onTap: () => context.go('/pos'),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryDark],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: const Row(children: [
                    Icon(Icons.point_of_sale, color: Colors.white, size: 32),
                    SizedBox(width: 16),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Buka POS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      Text('Mulai transaksi baru', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ])),
                    Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 18),
                  ]),
                ),
              ),
              const SizedBox(height: 20),

              // Stats
              const Text('Ringkasan Hari Ini', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.gray800)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.6,
                children: [
                  _StatCard(label: 'Penjualan', value: currency.format(data.todaySales), icon: Icons.trending_up, color: AppColors.success),
                  _StatCard(label: 'Transaksi', value: '${data.todayTransactions}', icon: Icons.receipt_long, color: AppColors.primary),
                  _StatCard(label: 'Produk', value: '${data.totalProducts}', icon: Icons.inventory_2, color: AppColors.warning),
                  _StatCard(label: 'Pelanggan', value: '${data.totalCustomers}', icon: Icons.people, color: const Color(0xFF8B5CF6)),
                ],
              ),
              const SizedBox(height: 20),

              // Quick Actions
              const Text('Menu Cepat', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.gray800)),
              const SizedBox(height: 12),
              Row(children: [
                _QuickAction(icon: Icons.inventory_2_outlined, label: 'Produk', onTap: () => context.go('/products')),
                const SizedBox(width: 10),
                _QuickAction(icon: Icons.people_outlined, label: 'Pelanggan', onTap: () => context.go('/customers')),
                const SizedBox(width: 10),
                _QuickAction(icon: Icons.warehouse_outlined, label: 'Inventori', onTap: () => context.go('/inventory')),
                const SizedBox(width: 10),
                _QuickAction(icon: Icons.receipt_long_outlined, label: 'Transaksi', onTap: () => context.go('/transactions')),
              ]),
              const SizedBox(height: 20),

              // Recent Transactions
              if (data.recentTransactions.isNotEmpty) ...[
                const Text('Transaksi Terbaru', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.gray800)),
                const SizedBox(height: 12),
                ...data.recentTransactions.map((tx) => _TxTile(tx: tx, currency: currency)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showLogout(BuildContext context, WidgetRef ref) {
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

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: color, size: 20),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.gray900)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
        ]),
      ]),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.gray200),
          ),
          child: Column(children: [
            Icon(icon, color: AppColors.primary, size: 22),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.gray700, fontWeight: FontWeight.w500)),
          ]),
        ),
      ),
    );
  }
}

class _TxTile extends StatelessWidget {
  final Map<String, dynamic> tx;
  final NumberFormat currency;
  const _TxTile({required this.tx, required this.currency});

  @override
  Widget build(BuildContext context) {
    final status = tx['status'] ?? '';
    final isCompleted = status == 'completed';
    final statusColor = isCompleted ? AppColors.success : AppColors.warning;
    final total = double.tryParse(tx['total']?.toString() ?? '0') ?? 0;
    final date = (tx['createdAt']?.toString() ?? '').length >= 10 ? tx['createdAt'].toString().substring(0, 10) : '-';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Row(children: [
        Container(
          width: 38, height: 38,
          decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.receipt, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tx['transactionNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Text(date, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(currency.format(total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(isCompleted ? 'Selesai' : status,
                style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.w500)),
          ),
        ]),
      ]),
    );
  }
}
