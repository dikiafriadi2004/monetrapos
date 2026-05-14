import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/pos/screens/pos_screen.dart';
import '../../features/products/screens/products_screen.dart';
import '../../features/transactions/screens/transactions_screen.dart';
import '../../features/customers/screens/customers_screen.dart';
import '../../features/inventory/screens/inventory_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/settings/screens/printer_settings_screen.dart';
import '../../features/dashboard/providers/dashboard_provider.dart';
import '../../features/pos/providers/pos_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final loc = state.matchedLocation;
      final isAuthPage = loc == '/login';

      if (isLoading) return null;

      if (!isAuth && !isAuthPage) return '/login';

      if (isAuth && isAuthPage) {
        Future.microtask(() {
          ref.invalidate(dashboardProvider);
          ref.invalidate(storesProvider);
          ref.invalidate(posProductsProvider);
          ref.invalidate(categoriesProvider);
          ref.invalidate(paymentMethodsProvider);
        });
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => HomeScreen(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/pos', builder: (_, __) => const PosScreen()),
          GoRoute(path: '/products', builder: (_, __) => const ProductsScreen()),
          GoRoute(path: '/transactions', builder: (_, __) => const TransactionsScreen()),
          GoRoute(path: '/customers', builder: (_, __) => const CustomersScreen()),
          GoRoute(path: '/inventory', builder: (_, __) => const InventoryScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
          GoRoute(path: '/settings/printer', builder: (_, __) => const PrinterSettingsScreen()),
        ],
      ),
    ],
  );
});
