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

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isLoginPage = state.matchedLocation == '/login';

      if (!isAuth && !isLoginPage) return '/login';
      if (isAuth && isLoginPage) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _s) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => HomeScreen(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, _s) => const DashboardScreen()),
          GoRoute(path: '/pos', builder: (_, _s) => const PosScreen()),
          GoRoute(path: '/products', builder: (_, _s) => const ProductsScreen()),
          GoRoute(path: '/transactions', builder: (_, _s) => const TransactionsScreen()),
          GoRoute(path: '/customers', builder: (_, _s) => const CustomersScreen()),
          GoRoute(path: '/inventory', builder: (_, _s) => const InventoryScreen()),
        ],
      ),
    ],
  );
});
