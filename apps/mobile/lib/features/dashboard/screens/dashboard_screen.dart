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
    final dashAsync = ref.watch(dashboardProvider);
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(
              'Selamat datang, ${auth.user?['name'] ?? ''}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(dashboardProvider),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: dashAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
              const SizedBox(height: 8),
              Text(e.toString()),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(dashboardProvider),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Quick Action - POS
              InkWell(
                onTap: () => context.go('/pos'),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, AppTheme.primaryDark],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.point_of_sale, color: Colors.white, size: 32),
                      SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Buka POS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('Mulai transaksi baru', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        ],
                      ),
                      Spacer(),
                      Icon(Icons.arrow_forward_ios, color: Colors.white70),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Stats Grid
              const Text('Ringkasan Hari Ini', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _StatCard(
                    label: 'Penjualan',
                    value: currency.format(data.todaySales),
                    icon: Icons.trending_up,
                    color: AppTheme.secondary,
                  ),
                  _StatCard(
                    label: 'Transaksi',
                    value: data.todayTransactions.toString(),
                    icon: Icons.receipt_long,
                    color: AppTheme.primary,
                  ),
                  _StatCard(
                    label: 'Produk',
                    value: data.totalProducts.toString(),
                    icon: Icons.inventory_2,
                    color: AppTheme.warning,
                  ),
                  _StatCard(
                    label: 'Pelanggan',
                    value: data.totalCustomers.toString(),
                    icon: Icons.people,
                    color: const Color(0xFF8B5CF6),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Quick Actions
              const Text('Menu Cepat', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Row(
                children: [
                  _QuickAction(icon: Icons.inventory_2_outlined, label: 'Produk', onTap: () => context.go('/products')),
                  const SizedBox(width: 12),
                  _QuickAction(icon: Icons.people_outlined, label: 'Pelanggan', onTap: () => context.go('/customers')),
                  const SizedBox(width: 12),
                  _QuickAction(icon: Icons.warehouse_outlined, label: 'Inventori', onTap: () => context.go('/inventory')),
                  const SizedBox(width: 12),
                  _QuickAction(icon: Icons.receipt_long_outlined, label: 'Transaksi', onTap: () => context.go('/transactions')),
                ],
              ),
              const SizedBox(height: 20),

              // Recent Transactions
              if (data.recentTransactions.isNotEmpty) ...[
                const Text('Transaksi Terbaru', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                ...data.recentTransactions.map((tx) => _TransactionTile(tx: tx, currency: currency)),
              ],
            ],
          ),
        ),
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 24),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
              ],
            ),
          ],
        ),
      ),
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
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              children: [
                Icon(icon, color: AppTheme.primary, size: 24),
                const SizedBox(height: 4),
                Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF374151))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Map<String, dynamic> tx;
  final NumberFormat currency;

  const _TransactionTile({required this.tx, required this.currency});

  @override
  Widget build(BuildContext context) {
    final status = tx['status'] ?? '';
    final statusColor = status == 'completed' ? AppTheme.secondary : AppTheme.warning;
    final total = double.tryParse(tx['total']?.toString() ?? '0') ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.receipt, color: AppTheme.primary, size: 20),
        ),
        title: Text(tx['transactionNumber'] ?? '-', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        subtitle: Text(tx['createdAt']?.toString().substring(0, 10) ?? '-', style: const TextStyle(fontSize: 12)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(currency.format(total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(status, style: TextStyle(fontSize: 10, color: statusColor)),
            ),
          ],
        ),
      ),
    );
  }
}
