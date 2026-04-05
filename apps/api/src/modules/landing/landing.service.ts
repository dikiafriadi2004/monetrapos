import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingContent } from './landing-content.entity';

// Default content structure per section
const DEFAULT_CONTENTS: Record<string, any> = {
  hero: {
    badge: 'Platform POS #1 untuk UMKM Indonesia',
    headline: 'Kelola Bisnis Anda Lebih Mudah dengan MonetraPOS',
    subheadline:
      'Sistem POS lengkap untuk FnB, Laundry, dan Retail. Inventory otomatis, laporan real-time, dan manajemen pelanggan dalam satu platform.',
    ctaPrimary: { text: 'Coba Gratis 14 Hari', url: '/register' },
    ctaSecondary: { text: 'Lihat Demo', url: '#demo' },
    imageUrl: '',
    videoUrl: '',
  },
  stats: {
    items: [
      { value: '10.000+', label: 'Bisnis Aktif' },
      { value: '99.9%', label: 'Uptime' },
      { value: '50M+', label: 'Transaksi Diproses' },
      { value: '4.9/5', label: 'Rating Pelanggan' },
    ],
  },
  features: {
    headline: 'Semua yang Anda Butuhkan dalam Satu Platform',
    subheadline:
      'Dari kasir hingga laporan keuangan, MonetraPOS hadir dengan fitur lengkap untuk semua jenis bisnis.',
    items: [
      {
        icon: 'ShoppingCart',
        title: 'Point of Sale (POS)',
        description:
          'Kasir digital yang cepat dan mudah digunakan. Support barcode scanner, split payment, dan hold transaction.',
        color: 'indigo',
      },
      {
        icon: 'Package',
        title: 'Manajemen Inventori',
        description:
          'Pantau stok secara real-time, notifikasi stok menipis, transfer antar cabang, dan stock opname digital.',
        color: 'emerald',
      },
      {
        icon: 'Users',
        title: 'Loyalty Program',
        description:
          'Tingkatkan retensi pelanggan dengan program poin, tier membership, dan reward otomatis.',
        color: 'amber',
      },
      {
        icon: 'BarChart3',
        title: 'Laporan & Analitik',
        description:
          'Laporan penjualan, profit & loss, performa karyawan, dan analitik pelanggan dalam satu dashboard.',
        color: 'blue',
      },
      {
        icon: 'UtensilsCrossed',
        title: 'Modul FnB',
        description:
          'Manajemen meja, Kitchen Display System (KDS), modifier menu, dan split bill untuk restoran.',
        color: 'orange',
      },
      {
        icon: 'Shirt',
        title: 'Modul Laundry',
        description:
          'Tracking order laundry, checklist item, jadwal pickup & delivery, dan manajemen service type.',
        color: 'purple',
      },
      {
        icon: 'Store',
        title: 'Multi-Cabang',
        description:
          'Kelola banyak outlet dari satu dashboard. Laporan konsolidasi dan manajemen staf per cabang.',
        color: 'pink',
      },
      {
        icon: 'Shield',
        title: 'Keamanan Data',
        description:
          'Data terenkripsi, backup otomatis, dan kontrol akses berbasis role untuk setiap karyawan.',
        color: 'slate',
      },
    ],
  },
  how_it_works: {
    headline: 'Mulai dalam 3 Langkah Mudah',
    subheadline: 'Tidak perlu keahlian teknis. Setup dalam hitungan menit.',
    steps: [
      {
        number: '01',
        title: 'Daftar & Pilih Plan',
        description:
          'Buat akun gratis, pilih paket yang sesuai kebutuhan bisnis Anda, dan lakukan pembayaran.',
        icon: 'UserPlus',
      },
      {
        number: '02',
        title: 'Setup Bisnis Anda',
        description:
          'Tambahkan produk, konfigurasi toko, undang karyawan, dan atur metode pembayaran.',
        icon: 'Settings',
      },
      {
        number: '03',
        title: 'Mulai Berjualan',
        description:
          'Gunakan POS di kasir, pantau laporan real-time, dan kembangkan bisnis Anda.',
        icon: 'TrendingUp',
      },
    ],
  },
  testimonials: {
    headline: 'Dipercaya oleh Ribuan Pebisnis Indonesia',
    subheadline: 'Bergabunglah dengan komunitas pebisnis yang sudah merasakan manfaatnya.',
    items: [
      {
        name: 'Budi Santoso',
        role: 'Owner, Warung Makan Pak Budi',
        avatar: '',
        rating: 5,
        content:
          'MonetraPOS benar-benar mengubah cara saya mengelola warung. Sekarang saya bisa pantau omzet dari HP kapan saja. Stok tidak pernah habis tiba-tiba lagi!',
        businessType: 'FnB',
      },
      {
        name: 'Siti Rahayu',
        role: 'Owner, Laundry Bersih Jaya',
        avatar: '',
        rating: 5,
        content:
          'Fitur tracking laundry sangat membantu. Pelanggan bisa tahu status cuciannya, dan saya tidak perlu catat manual lagi. Omzet naik 30% dalam 3 bulan!',
        businessType: 'Laundry',
      },
      {
        name: 'Ahmad Fauzi',
        role: 'Owner, Toko Elektronik Fauzi',
        avatar: '',
        rating: 5,
        content:
          'Inventory management-nya luar biasa. Saya punya 3 cabang dan semuanya bisa dipantau dari satu dashboard. Laporan keuangannya juga sangat detail.',
        businessType: 'Retail',
      },
    ],
  },
  faq: {
    headline: 'Pertanyaan yang Sering Ditanyakan',
    items: [
      {
        question: 'Apakah ada masa percobaan gratis?',
        answer:
          'Ya! Kami menawarkan trial gratis 14 hari tanpa perlu kartu kredit. Anda bisa mencoba semua fitur premium selama periode trial.',
      },
      {
        question: 'Berapa banyak pengguna yang bisa saya tambahkan?',
        answer:
          'Tergantung paket yang Anda pilih. Paket Starter mendukung hingga 3 pengguna, Professional hingga 10 pengguna, dan Enterprise tidak terbatas.',
      },
      {
        question: 'Apakah data saya aman?',
        answer:
          'Keamanan data adalah prioritas kami. Semua data dienkripsi dengan SSL/TLS, backup otomatis setiap hari, dan server kami berlokasi di Indonesia.',
      },
      {
        question: 'Bisakah saya menggunakan di banyak cabang?',
        answer:
          'Ya! MonetraPOS mendukung multi-cabang. Anda bisa mengelola semua outlet dari satu dashboard dengan laporan konsolidasi.',
      },
      {
        question: 'Metode pembayaran apa yang didukung?',
        answer:
          'Kami mendukung Cash, QRIS, Transfer Bank, EDC/Debit Card, dan berbagai e-wallet. Semua bisa dikonfigurasi sesuai kebutuhan bisnis Anda.',
      },
      {
        question: 'Bagaimana jika saya butuh bantuan?',
        answer:
          'Tim support kami siap membantu 24/7 via WhatsApp, email, dan live chat. Kami juga menyediakan dokumentasi lengkap dan video tutorial.',
      },
    ],
  },
  cta: {
    headline: 'Siap Mengembangkan Bisnis Anda?',
    subheadline:
      'Bergabunglah dengan 10.000+ pebisnis yang sudah mempercayakan manajemen bisnis mereka kepada MonetraPOS.',
    ctaPrimary: { text: 'Mulai Gratis Sekarang', url: '/register' },
    ctaSecondary: { text: 'Hubungi Sales', url: 'https://wa.me/6281234567890' },
    note: 'Tidak perlu kartu kredit • Setup dalam 5 menit • Cancel kapan saja',
  },
  footer: {
    companyName: 'MonetraPOS',
    tagline: 'Platform POS terlengkap untuk UMKM Indonesia',
    email: 'support@monetrapos.com',
    phone: '+62 812-3456-7890',
    whatsapp: 'https://wa.me/6281234567890',
    address: 'Jakarta, Indonesia',
    socialLinks: {
      instagram: 'https://instagram.com/monetrapos',
      facebook: 'https://facebook.com/monetrapos',
      youtube: 'https://youtube.com/@monetrapos',
    },
    links: {
      product: [
        { label: 'Fitur', url: '#features' },
        { label: 'Harga', url: '#pricing' },
        { label: 'Demo', url: '#demo' },
        { label: 'Changelog', url: '/changelog' },
      ],
      company: [
        { label: 'Tentang Kami', url: '/about' },
        { label: 'Blog', url: '/blog' },
        { label: 'Karir', url: '/careers' },
        { label: 'Kontak', url: '/contact' },
      ],
      legal: [
        { label: 'Kebijakan Privasi', url: '/privacy' },
        { label: 'Syarat & Ketentuan', url: '/terms' },
      ],
    },
    copyright: `© ${new Date().getFullYear()} MonetraPOS. All rights reserved.`,
  },
};

@Injectable()
export class LandingService {
  constructor(
    @InjectRepository(LandingContent)
    private readonly repo: Repository<LandingContent>,
  ) {}

  /** Get all visible sections (public) */
  async getPublicContent(): Promise<Record<string, any>> {
    const sections = await this.repo.find({
      where: { isVisible: true },
      order: { sortOrder: 'ASC' },
    });

    const result: Record<string, any> = {};
    for (const s of sections) {
      result[s.section] = s.content;
    }
    return result;
  }

  /** Get all sections for admin */
  async getAllSections(): Promise<LandingContent[]> {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  /** Get single section */
  async getSection(section: string): Promise<LandingContent> {
    const found = await this.repo.findOne({ where: { section } });
    if (!found) throw new NotFoundException(`Section '${section}' not found`);
    return found;
  }

  /** Update section content */
  async updateSection(
    section: string,
    data: { content?: Record<string, any>; isVisible?: boolean; sortOrder?: number; title?: string },
  ): Promise<LandingContent> {
    let record = await this.repo.findOne({ where: { section } });
    if (!record) throw new NotFoundException(`Section '${section}' not found`);

    if (data.content !== undefined) record.content = data.content;
    if (data.isVisible !== undefined) record.isVisible = data.isVisible;
    if (data.sortOrder !== undefined) record.sortOrder = data.sortOrder;
    if (data.title !== undefined) record.title = data.title;

    return this.repo.save(record);
  }

  /** Seed default content if not exists */
  async seedDefaults(): Promise<void> {
    const sections = [
      { section: 'hero', title: 'Hero Section', sortOrder: 1 },
      { section: 'stats', title: 'Statistics', sortOrder: 2 },
      { section: 'features', title: 'Features', sortOrder: 3 },
      { section: 'how_it_works', title: 'How It Works', sortOrder: 4 },
      { section: 'testimonials', title: 'Testimonials', sortOrder: 5 },
      { section: 'faq', title: 'FAQ', sortOrder: 6 },
      { section: 'cta', title: 'Call to Action', sortOrder: 7 },
      { section: 'footer', title: 'Footer', sortOrder: 8 },
    ];

    for (const s of sections) {
      const exists = await this.repo.findOne({ where: { section: s.section } });
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            ...s,
            content: DEFAULT_CONTENTS[s.section] || {},
            isVisible: true,
          }),
        );
      }
    }
  }
}

