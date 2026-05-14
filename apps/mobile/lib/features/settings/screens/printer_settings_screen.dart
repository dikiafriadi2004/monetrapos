import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/printer_service.dart';

class PrinterSettingsScreen extends ConsumerStatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  ConsumerState<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends ConsumerState<PrinterSettingsScreen> {
  List<BluetoothInfo> _devices = [];
  bool _scanning = false;
  bool _connecting = false;
  String? _connectedAddress;
  int _paperWidth = 58;
  String _printerType = 'bluetooth';

  final _printer = PrinterService();

  @override
  void initState() {
    super.initState();
    final config = _printer.config;
    if (config != null) {
      _printerType = config.type;
      _connectedAddress = config.bluetoothAddress;
      _paperWidth = config.paperWidth;
    }
  }

  Future<void> _scan() async {
    setState(() { _scanning = true; _devices = []; });
    try {
      final devices = await _printer.scanBluetoothPrinters();
      setState(() => _devices = devices);
    } finally {
      setState(() => _scanning = false);
    }
  }

  Future<void> _connect(BluetoothInfo device) async {
    setState(() => _connecting = true);
    try {
      final success = await _printer.connectBluetooth(device.macAdress);
      if (success) {
        _printer.setConfig(PrinterConfig(
          type: 'bluetooth',
          bluetoothAddress: device.macAdress,
          bluetoothName: device.name,
          paperWidth: _paperWidth,
        ));
        setState(() => _connectedAddress = device.macAdress);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Terhubung ke ${device.name}'), backgroundColor: AppColors.success),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Gagal terhubung'), backgroundColor: AppColors.error),
          );
        }
      }
    } finally {
      setState(() => _connecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(title: const Text('Pengaturan Printer')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Printer type
          _SectionCard(
            title: 'Tipe Printer',
            child: Column(children: [
              _RadioTile(
                title: 'Bluetooth',
                subtitle: 'Printer thermal bluetooth (paling umum)',
                icon: Icons.bluetooth,
                value: 'bluetooth',
                groupValue: _printerType,
                onChanged: (v) => setState(() => _printerType = v!),
              ),
              _RadioTile(
                title: 'Network (TCP/IP)',
                subtitle: 'Printer terhubung via WiFi/LAN',
                icon: Icons.wifi,
                value: 'network',
                groupValue: _printerType,
                onChanged: (v) => setState(() => _printerType = v!),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Paper width
          _SectionCard(
            title: 'Lebar Kertas',
            child: Row(children: [
              Expanded(child: _PaperChip(label: '58mm', value: 58, selected: _paperWidth == 58, onTap: () => setState(() => _paperWidth = 58))),
              const SizedBox(width: 12),
              Expanded(child: _PaperChip(label: '80mm', value: 80, selected: _paperWidth == 80, onTap: () => setState(() => _paperWidth = 80))),
            ]),
          ),
          const SizedBox(height: 16),

          // Bluetooth devices
          if (_printerType == 'bluetooth') ...[
            _SectionCard(
              title: 'Perangkat Bluetooth',
              action: ElevatedButton.icon(
                onPressed: _scanning ? null : _scan,
                icon: _scanning
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.search, size: 16),
                label: Text(_scanning ? 'Mencari...' : 'Scan'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(0, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
              ),
              child: _devices.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          _scanning ? 'Mencari perangkat...' : 'Tap "Scan" untuk mencari printer',
                          style: const TextStyle(color: AppColors.gray500),
                        ),
                      ),
                    )
                  : Column(
                      children: _devices.map((d) {
                        final isConnected = d.macAdress == _connectedAddress;
                        return ListTile(
                          leading: Icon(Icons.print, color: isConnected ? AppColors.success : AppColors.gray500),
                          title: Text(d.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                          subtitle: Text(d.macAdress, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                          trailing: isConnected
                              ? const Chip(
                                  label: Text('Terhubung', style: TextStyle(fontSize: 11, color: AppColors.success)),
                                  backgroundColor: AppColors.successLight,
                                  side: BorderSide.none,
                                )
                              : ElevatedButton(
                                  onPressed: _connecting ? null : () => _connect(d),
                                  style: ElevatedButton.styleFrom(
                                    minimumSize: const Size(80, 32),
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                  ),
                                  child: const Text('Hubungkan', style: TextStyle(fontSize: 12)),
                                ),
                        );
                      }).toList(),
                    ),
            ),
          ],

          const SizedBox(height: 24),
          // Info
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.infoLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.info_outline, color: AppColors.info, size: 16),
                SizedBox(width: 8),
                Text('Printer yang Didukung', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.info, fontSize: 13)),
              ]),
              SizedBox(height: 8),
              Text('• Printer thermal Bluetooth (ESC/POS)\n• Printer thermal USB (via OTG)\n• Printer thermal Network (TCP/IP port 9100)\n• Printer bawaan mesin EDC (via SDK)',
                  style: TextStyle(color: AppColors.info, fontSize: 12, height: 1.6)),
            ]),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? action;
  const _SectionCard({required this.title, required this.child, this.action});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Row(children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.gray700)),
            const Spacer(),
            ?action,
          ]),
        ),
        const Divider(height: 16),
        Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 14), child: child),
      ]),
    );
  }
}

class _RadioTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final String value;
  final String groupValue;
  final ValueChanged<String?> onChanged;

  const _RadioTile({
    required this.title, required this.subtitle, required this.icon,
    required this.value, required this.groupValue, required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    return RadioListTile<String>(
      value: value,
      groupValue: groupValue,
      onChanged: onChanged,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      secondary: Icon(icon, color: selected ? AppColors.primary : AppColors.gray400),
      activeColor: AppColors.primary,
      contentPadding: EdgeInsets.zero,
    );
  }
}

class _PaperChip extends StatelessWidget {
  final String label;
  final int value;
  final bool selected;
  final VoidCallback onTap;
  const _PaperChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryLight : AppColors.gray100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? AppColors.primary : AppColors.gray200, width: selected ? 2 : 1),
        ),
        child: Column(children: [
          Icon(Icons.receipt_long, color: selected ? AppColors.primary : AppColors.gray400, size: 24),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? AppColors.primary : AppColors.gray600)),
        ]),
      ),
    );
  }
}
