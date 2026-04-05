import 'package:flutter_test/flutter_test.dart';
import 'package:monetrapos_mobile/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MonetraPOSApp()));
    expect(find.byType(MonetraPOSApp), findsOneWidget);
  });
}
