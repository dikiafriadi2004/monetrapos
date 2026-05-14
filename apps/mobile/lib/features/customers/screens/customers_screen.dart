import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final _customersSearchProvider = StateProvider<String>((ref) => '');

final _customersProvider = FutureProvider<List<CustomerModel>>((ref) async {
  final search = ref.watch(_customersSearchProvider);
  final api = ApiClient();
  final params = <String, dynamic>{'limit': 100};
  if (search.isNotEmpty) params['search'] = search;
  final res = await api.dio.get('/customers', queryParameters: params);
  final list = res.data is List ? res.data : (res.data['data'] ?? []);
  return (list as List).map((e) => CustomerModel.fromJson(e)).toList();
});

// ─── Screen ───────────────────────────────────────────────────────────────────

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});
  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _searchCtrl = TextEditingController();
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(_customersProvider);
    final search = ref.watch(_customersSearchProvider);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Pelanggan'),
        actions: [
          IconButton(icon: const Icon(Icons.person_add_outlined), onPressed: () => _showForm(context, null)),
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(_customersProvider)),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Cari nama, telepon, email...',
              prefixIcon: const Icon(Icons.search, size: 18),
              isDense: true,
              suffixIcon: search.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () {
                      _searchCtrl.clear();
                      ref.read(_customersSearchProvider.notifier).state = '';
                    })
                  : null,
            ),
            onChanged: (v) => ref.read(_customersSearchProvider.notifier).state = v,
          ),
        ),
        Expanded(
          child: customersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 8),
              Text(e.toString()),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => ref.invalidate(_customersProvider),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(120, 40)),
                  child: const Text('Coba Lagi')),
            ])),
            data: (customers) {
              if (customers.isEmpty) {
                return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.people_outline, size: 56, color: AppColors.gray300),
                  const SizedBox(height: 12),
                  Text(search.isNotEmpty ? 'Pelanggan "$search" tidak ditemukan' : 'Belum ada pelanggan',
                      style: const TextStyle(color: AppColors.gray500)),
                  if (search.isEmpty) ...[
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _showForm(context, null),
                      icon: const Icon(Icons.person_add, size: 18),
                      label: const Text('Tambah Pelanggan'),
                      style: ElevatedButton.styleFrom(minimumSize: const Size(180, 44)),
                    ),
                  ],
                ]));
              }
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(_customersProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: customers.length,
                  itemBuilder: (_, i) => _CustomerCard(
                    customer: customers[i],
                    currency: currency,
                    onTap: () => _showDetail(context, customers[i]),
                  ),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }

  void _showDetail(BuildContext context, CustomerModel c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => _CustomerDetailSheet(
        customer: c,
        currency: currency,
        onEdit: () {
          Navigator.of(sheetCtx).pop();
          _showForm(context, c);
        },
      ),
    );
  }

  void _showForm(BuildContext context, CustomerModel? customer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CustomerFormSheet(
        customer: customer,
        onSaved: () => ref.invalidate(_customersProvider),
      ),
    );
  }
}

// ─── Customer Card ────────────────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final CustomerModel customer;
  final NumberFormat currency;
  final VoidCallback onTap;
  const _CustomerCard({required this.customer, required this.currency, required this.onTap});

  Color get _tierColor {
    switch (customer.loyaltyTier) {
      case 'platinum': return const Color(0xFF8B5CF6);
      case 'gold': return AppColors.warning;
      case 'silver': return const Color(0xFF94A3B8);
      default: return AppColors.gray400;
    }
  }

  @override
  Widget build(BuildContext context) {
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
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primaryLight,
            child: Text(customer.name.isNotEmpty ? customer.name[0].toUpperCase() : '?',
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(customer.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            if (customer.phone != null || customer.email != null)
              Text(customer.phone ?? customer.email ?? '', style: const TextStyle(fontSize: 12, color: AppColors.gray500)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Row(children: [
              Icon(Icons.star, size: 14, color: _tierColor),
              const SizedBox(width: 3),
              Text('${customer.loyaltyPoints} pts', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _tierColor)),
            ]),
            if (customer.loyaltyTier != null)
              Text(customer.loyaltyTier!.toUpperCase(),
                  style: TextStyle(fontSize: 10, color: _tierColor, fontWeight: FontWeight.w500)),
          ]),
        ]),
      ),
    );
  }
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

class _CustomerDetailSheet extends StatelessWidget {
  final CustomerModel customer;
  final NumberFormat currency;
  final VoidCallback onEdit;
  const _CustomerDetailSheet({required this.customer, required this.currency, required this.onEdit});

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
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Row(children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primaryLight,
              child: Text(customer.name[0].toUpperCase(),
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 22)),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(customer.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
              if (customer.phone != null) Text(customer.phone!, style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
              if (customer.email != null) Text(customer.email!, style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
            ])),
            IconButton(icon: const Icon(Icons.edit_outlined), onPressed: onEdit),
          ]),
        ),
        const Divider(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            _StatBox(label: 'Poin', value: '${customer.loyaltyPoints}', icon: Icons.star, color: AppColors.warning),
            const SizedBox(width: 12),
            _StatBox(label: 'Total Belanja', value: currency.format(customer.totalSpent), icon: Icons.shopping_bag_outlined, color: AppColors.primary),
            const SizedBox(width: 12),
            _StatBox(label: 'Tier', value: customer.loyaltyTier?.toUpperCase() ?? 'REGULAR', icon: Icons.workspace_premium_outlined, color: AppColors.success),
          ]),
        ),
        const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: SafeArea(top: false, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
            child: const Text('Tutup'),
          )),
        ),
      ]),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatBox({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color), maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.gray500)),
      ]),
    ));
  }
}

// ─── Form Sheet ───────────────────────────────────────────────────────────────

class _CustomerFormSheet extends ConsumerStatefulWidget {
  final CustomerModel? customer;
  final VoidCallback onSaved;
  const _CustomerFormSheet({this.customer, required this.onSaved});

  @override
  ConsumerState<_CustomerFormSheet> createState() => _CustomerFormSheetState();
}

class _CustomerFormSheetState extends ConsumerState<_CustomerFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.customer != null) {
      _nameCtrl.text = widget.customer!.name;
      _phoneCtrl.text = widget.customer!.phone ?? '';
      _emailCtrl.text = widget.customer!.email ?? '';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose(); _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ApiClient();
      final data = {'name': _nameCtrl.text.trim(), 'phone': _phoneCtrl.text.trim(), 'email': _emailCtrl.text.trim()};
      if (widget.customer != null) {
        await api.dio.patch('/customers/${widget.customer!.id}', data: data);
      } else {
        await api.dio.post('/customers', data: data);
      }
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.customer != null ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan'),
              backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal: $e'), backgroundColor: AppColors.error),
      );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
        child: Form(
          key: _formKey,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.customer != null ? 'Edit Pelanggan' : 'Tambah Pelanggan',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Nama *', prefixIcon: Icon(Icons.person_outline, size: 18)),
              validator: (v) => v == null || v.isEmpty ? 'Nama wajib diisi' : null,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(labelText: 'Telepon', prefixIcon: Icon(Icons.phone_outlined, size: 18)),
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined, size: 18)),
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _save(),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.customer != null ? 'Simpan Perubahan' : 'Tambah Pelanggan'),
            ),
          ]),
        ),
      ),
    );
  }
}
