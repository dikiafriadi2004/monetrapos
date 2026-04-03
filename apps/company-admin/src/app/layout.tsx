import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonetRAPOS - Company Admin",
  description: "Company Admin Portal for MonetRAPOS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
