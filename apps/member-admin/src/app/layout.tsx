import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonetraPOS - Platform POS Terlengkap untuk UMKM Indonesia",
  description: "Sistem POS lengkap untuk FnB, Laundry, dan Retail. Inventory otomatis, laporan real-time, loyalty program, dan manajemen multi-cabang dalam satu platform.",
  keywords: "POS, kasir digital, sistem kasir, UMKM, FnB, laundry, retail, inventory, laporan keuangan",
  openGraph: {
    title: "MonetraPOS - Platform POS Terlengkap untuk UMKM Indonesia",
    description: "Kelola bisnis Anda lebih mudah dengan MonetraPOS. Coba gratis 14 hari.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

