import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../providers/pos_provider.dart';

class CustomerSearchSheet extends ConsumerStatefulWidget {
  const CustomerSearchSheet({super.key});

  @override
  ConsumerState<CustomerSearchSheet> createState() => _CustomerSearchSheetState();
}

class _CustomerSearchSheetState extends ConsumerState<CustomerSearchSheet> {
  final _searchCtrl = TextEditingController();
  List<CustomerModel> _results = [];
  bool _loading = false;
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    if (q.length < 2) { setState(() => _results = []); return; }
    setState(() { _loading = true; _query = q; });
    try {
      final api = ApiClient();
      final res = await api.dio.get('/customers', queryParameters: {'search': q, 'limit': 20});
      final list = res.data is List ? res.data : (res.data['data'] ?? []);
      setState(() => _results = (list as List).map((e) => CustomerModel.fromJson(e)).toList());
    } catch (_) {
      setState(() => _results = []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentCustomer = ref.watch(cartProvider).customer;

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.gray300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Row(children: [
              const Text('Pilih Pelanggan', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
              const Spacer(),
              if (currentCustomer != null)
                TextButton(
                  onPressed: () {
                    ref.read(cartProvider.notifier).setCustomer(null);
                    Navigator.pop(context);
                  },
                  child: const Text('Hapus', style: TextStyle(color: AppColors.error)),
                ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Cari nama, telepon, atau email...',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
              onChanged: _search,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty && _query.length >= 2
                    ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.person_search, size: 48, color: AppColors.gray300),
                        const SizedBox(height: 8),
                        Text('Pelanggan "$_query" tidak ditemukan', style: const TextStyle(color: AppColors.gray500)),
                      ]))
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (_, i) {
                          final c = _results[i];
                          final isSelected = currentCustomer?.id == c.id;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isSelected ? AppColors.primary : AppColors.gray200,
                              child: Text(c.name[0].toUpperCase(),
                                  style: TextStyle(color: isSelected ? Colors.white : AppColors.gray600, fontWeight: FontWeight.bold)),
                            ),
                            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                            subtitle: Text(c.phone ?? c.email ?? '', style: const TextStyle(fontSize: 12)),
                            trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              Text('${c.loyaltyPoints} poin', style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                              if (c.loyaltyTier != null)
                                Text(c.loyaltyTier!.toUpperCase(), style: const TextStyle(fontSize: 10, color: AppColors.gray500)),
                            ]),
                            selected: isSelected,
                            selectedTileColor: AppColors.primaryLight,
                            onTap: () {
                              ref.read(cartProvider.notifier).setCustomer(c);
                              Navigator.pop(context);
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
