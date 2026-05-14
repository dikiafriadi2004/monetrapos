import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';

/// Konfigurasi printer
class PrinterConfig {
  final String type; // 'bluetooth' | 'network'
  final String? bluetoothAddress;
  final String? bluetoothName;
  final String? networkIp;
  final int networkPort;
  final int paperWidth;

  const PrinterConfig({
    required this.type,
    this.bluetoothAddress,
    this.bluetoothName,
    this.networkIp,
    this.networkPort = 9100,
    this.paperWidth = 58,
  });

  factory PrinterConfig.fromJson(Map<String, dynamic> j) => PrinterConfig(
        type: j['type'] ?? 'bluetooth',
        bluetoothAddress: j['bluetoothAddress'],
        bluetoothName: j['bluetoothName'],
        networkIp: j['networkIp'],
        networkPort: j['networkPort'] ?? 9100,
        paperWidth: j['paperWidth'] ?? 58,
      );

  Map<String, dynamic> toJson() => {
        'type': type, 'bluetoothAddress': bluetoothAddress,
        'bluetoothName': bluetoothName, 'networkIp': networkIp,
        'networkPort': networkPort, 'paperWidth': paperWidth,
      };
}

/// Stub BluetoothInfo untuk kompatibilitas
class BluetoothInfo {
  final String name;
  final String macAdress;
  const BluetoothInfo({required this.name, required this.macAdress});
}

class PrinterService {
  static final PrinterService _instance = PrinterService._();
  factory PrinterService() => _instance;
  PrinterService._();

  PrinterConfig? _config;
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  void setConfig(PrinterConfig config) => _config = config;
  PrinterConfig? get config => _config;

  /// Scan Bluetooth — placeholder, akan diimplementasi dengan plugin
  Future<List<BluetoothInfo>> scanBluetoothPrinters() async {
    debugPrint('Bluetooth printing: install flutter_bluetooth_serial untuk mengaktifkan');
    return [];
  }

  Future<bool> connectBluetooth(String macAddress) async => false;
  Future<bool> get isBluetoothConnected async => false;

  Future<PrintResult> printReceipt({
    required TransactionModel transaction,
    required String storeName,
    String? storeAddress,
    String? storePhone,
    String? footerText,
    bool isReprint = false,
  }) async {
    if (_config == null) {
      return PrintResult(success: false, message: 'Printer belum dikonfigurasi');
    }
    // TODO: Implement actual printing when bluetooth package is available
    debugPrint('Print receipt: ${transaction.transactionNumber}');
    return PrintResult(success: true, message: 'Struk dicetak (simulasi)');
  }
}

class PrintResult {
  final bool success;
  final String message;
  const PrintResult({required this.success, required this.message});
}
