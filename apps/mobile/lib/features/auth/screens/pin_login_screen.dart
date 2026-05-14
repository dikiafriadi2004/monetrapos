import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class PinLoginScreen extends ConsumerStatefulWidget {
  const PinLoginScreen({super.key});

  @override
  ConsumerState<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends ConsumerState<PinLoginScreen> {
  String _pin = '';
  bool _loading = false;
  String? _error;
  static const int _maxPin = 6;

  void _tapKey(String key) {
    HapticFeedback.lightImpact();
    if (key == '⌫') {
      if (_pin.isNotEmpty) setState(() { _pin = _pin.substring(0, _pin.length - 1); _error = null; });
      return;
    }
    if (_pin.length >= _maxPin) return;
    setState(() { _pin += key; _error = null; });
    if (_pin.length == 4) {
      Future.delayed(const Duration(milliseconds: 150), _tryLogin);
    }
  }

  Future<void> _tryLogin() async {
    if (_pin.length < 4) return;
    setState(() => _loading = true);
    try {
      final success = await ref.read(authProvider.notifier).loginPin(_pin);
      if (success && mounted) context.go('/');
    } catch (_) {
      setState(() { _error = 'PIN salah. Coba lagi.'; _pin = ''; _loading = false; });
      HapticFeedback.heavyImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(children: [
            const Spacer(flex: 2),

            // Logo
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)]),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 6))],
              ),
              child: const Icon(Icons.pin_outlined, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            const Text('PIN Kasir', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 6),
            Text('Masukkan PIN 4-6 digit', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.5))),

            const SizedBox(height: 36),

            // PIN dots
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(_maxPin, (i) {
              final filled = i < _pin.length;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.symmetric(horizontal: 8),
                width: 14, height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _error != null
                      ? AppColors.error
                      : filled
                          ? const Color(0xFF6366F1)
                          : Colors.white.withValues(alpha: 0.15),
                ),
              );
            })),

            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
              ),
            ],

            const Spacer(),

            // Numpad
            if (_loading)
              const CircularProgressIndicator(color: Color(0xFF6366F1))
            else
              Column(children: [
                _buildRow(['1', '2', '3']),
                const SizedBox(height: 14),
                _buildRow(['4', '5', '6']),
                const SizedBox(height: 14),
                _buildRow(['7', '8', '9']),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const SizedBox(width: 80 + 14),
                  _PinKey(label: '0', onTap: () => _tapKey('0')),
                  const SizedBox(width: 14),
                  _PinKey(label: '⌫', onTap: () => _tapKey('⌫'), isDelete: true),
                ]),
              ]),

            const Spacer(flex: 2),

            // Back to email login
            TextButton.icon(
              onPressed: () => context.go('/login'),
              icon: Icon(Icons.email_outlined, size: 15, color: Colors.white.withValues(alpha: 0.4)),
              label: Text('Login dengan Email', style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 13)),
            ),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }

  Widget _buildRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: keys.map((k) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 7),
        child: _PinKey(label: k, onTap: () => _tapKey(k)),
      )).toList(),
    );
  }
}

class _PinKey extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool isDelete;
  const _PinKey({required this.label, required this.onTap, this.isDelete = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          color: isDelete
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.white.withValues(alpha: 0.08),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Center(
          child: label == '⌫'
              ? Icon(Icons.backspace_outlined, size: 22, color: Colors.white.withValues(alpha: 0.6))
              : Text(label, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w300, color: Colors.white)),
        ),
      ),
    );
  }
}
