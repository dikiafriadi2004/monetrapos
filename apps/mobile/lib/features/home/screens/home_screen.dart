import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

// ─── Nav items ────────────────────────────────────────────────────────────────

class _NavItem {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String? permission;

  const _NavItem({
    required this.path,
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.permission,
  });
}

const _allNavItems = [
  _NavItem(path: '/', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard_rounded, label: 'Dashboard'),
  _NavItem(path: '/pos', icon: Icons.point_of_sale_outlined, activeIcon: Icons.point_of_sale_rounded, label: 'POS', permission: 'pos.create_transaction'),
  _NavItem(path: '/transactions', icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Transaksi', permission: 'finance.view_transactions'),
  _NavItem(path: '/customers', icon: Icons.people_outline_rounded, activeIcon: Icons.people_rounded, label: 'Pelanggan', permission: 'customer.view'),
  _NavItem(path: '/settings', icon: Icons.settings_outlined, activeIcon: Icons.settings_rounded, label: 'Pengaturan'),
];

// ─── HomeScreen ───────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerWidget {
  final Widget child;
  const HomeScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final auth = ref.watch(authProvider);
    final permissions = auth.user?.permissions ?? [];
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 768;

    // Filter nav items berdasarkan permission
    final visibleItems = _allNavItems.where((item) {
      if (item.permission == null) return true;
      return permissions.contains(item.permission);
    }).toList();

    // Cari index aktif
    int activeIndex = 0;
    for (int i = 0; i < visibleItems.length; i++) {
      final path = visibleItems[i].path;
      if (path == '/' && location == '/') {
        activeIndex = i;
        break;
      } else if (path != '/' && location.startsWith(path)) {
        activeIndex = i;
        break;
      }
    }

    if (isTablet) {
      return _TabletLayout(items: visibleItems, activeIndex: activeIndex, child: child);
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(
        items: visibleItems,
        activeIndex: activeIndex,
        onTap: (i) => context.go(visibleItems[i].path),
      ),
    );
  }
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

class _BottomNav extends StatelessWidget {
  final List<_NavItem> items;
  final int activeIndex;
  final void Function(int) onTap;

  const _BottomNav({required this.items, required this.activeIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.gray200, width: 0.5)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final isActive = i == activeIndex;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  splashColor: AppColors.primaryLight,
                  highlightColor: Colors.transparent,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: Icon(
                          isActive ? item.activeIcon : item.icon,
                          key: ValueKey(isActive),
                          color: isActive ? AppColors.primary : AppColors.gray400,
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isActive ? FontWeight.w700 : FontWeight.normal,
                          color: isActive ? AppColors.primary : AppColors.gray400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

// ─── Tablet Layout ────────────────────────────────────────────────────────────

class _TabletLayout extends StatelessWidget {
  final Widget child;
  final List<_NavItem> items;
  final int activeIndex;

  const _TabletLayout({required this.child, required this.items, required this.activeIndex});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          Container(
            width: 72,
            decoration: const BoxDecoration(
              color: AppColors.white,
              border: Border(right: BorderSide(color: AppColors.gray200, width: 0.5)),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  // Logo
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.point_of_sale_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(height: 24),
                  ...List.generate(items.length, (i) {
                    final item = items[i];
                    final isActive = i == activeIndex;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Tooltip(
                        message: item.label,
                        child: InkWell(
                          onTap: () => context.go(item.path),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(
                              color: isActive ? AppColors.primaryLight : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              isActive ? item.activeIcon : item.icon,
                              color: isActive ? AppColors.primary : AppColors.gray400,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}
