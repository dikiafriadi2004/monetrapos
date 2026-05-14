import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

/// Numpad dialog untuk input jumlah uang
class NumpadDialog extends StatefulWidget {
  final String title;
  final double initialValue;
  final double? minValue;

  const NumpadDialog({
    super.key,
    required this.title,
    this.initialValue = 0,
    this.minValue,
  });

  @override
  State<NumpadDialog> createState() => _NumpadDialogState();
}

class _NumpadDialogState extends State<NumpadDialog> {
  String _input = '';

  @override
  void initState() {
    super.initState();
    if (widget.initialValue > 0) {
      _input = widget.initialValue.toInt().toString();
    }
  }

  void _tap(String val) {
    setState(() {
      if (val == 'C') {
        _input = '';
      } else if (val == '⌫') {
        if (_input.isNotEmpty) _input = _input.substring(0, _input.length - 1);
      } else if (_input.length < 12) {
        if (val == '0' && _input.isEmpty) return;
        _input += val;
      }
    });
  }

  double get _value => double.tryParse(_input) ?? 0;

  @override
  Widget build(BuildContext context) {
    final formatted = _value > 0
        ? 'Rp ${_value.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}'
        : 'Rp 0';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.gray100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(formatted,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.gray900),
                  textAlign: TextAlign.right),
            ),
            const SizedBox(height: 16),
            // Numpad
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 1.8,
              children: [
                ...['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((k) => _NumKey(
                  label: k,
                  onTap: () => _tap(k),
                  isSpecial: k == 'C' || k == '⌫',
                )),
              ],
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Batal'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    final min = widget.minValue;
                    if (min != null && _value < min) return;
                    Navigator.pop(context, _value);
                  },
                  child: const Text('OK'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

class _NumKey extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool isSpecial;
  const _NumKey({required this.label, required this.onTap, this.isSpecial = false});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSpecial ? AppColors.gray200 : AppColors.gray100,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Center(
          child: Text(label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isSpecial ? AppColors.gray700 : AppColors.gray900,
              )),
        ),
      ),
    );
  }
}
