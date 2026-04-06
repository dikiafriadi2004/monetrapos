import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './feature.entity';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
  ) {}

  async create(dto: CreateFeatureDto): Promise<Feature> {
    const feature = this.featureRepo.create({ ...dto, companyId: 'platform' });
    return this.featureRepo.save(feature);
  }

  async findAll(): Promise<Feature[]> {
    return this.featureRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Feature> {
    const feature = await this.featureRepo.findOne({ where: { id } });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  async update(id: string, dto: UpdateFeatureDto): Promise<Feature> {
    const feature = await this.findOne(id);
    Object.assign(feature, dto);
    return this.featureRepo.save(feature);
  }

  async remove(id: string): Promise<void> {
    const feature = await this.findOne(id);
    await this.featureRepo.remove(feature);
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { code: 'pos_terminal', name: 'POS Terminal', description: 'Point of sale terminal untuk transaksi kasir', icon: '💳' },
      { code: 'inventory', name: 'Inventory Management', description: 'Manajemen stok produk dan pergerakan barang', icon: '📦' },
      { code: 'basic_reports', name: 'Basic Reports', description: 'Laporan penjualan dan ringkasan harian', icon: '📊' },
      { code: 'advanced_reports', name: 'Advanced Reports', description: 'Laporan lanjutan: P&L, employee performance, customer analytics', icon: '📈' },
      { code: 'receipt_printing', name: 'Receipt Printing', description: 'Cetak struk thermal dan A4', icon: '🖨️' },
      { code: 'customer_loyalty', name: 'Customer Loyalty', description: 'Program loyalitas pelanggan dengan tier dan poin', icon: '⭐' },
      { code: 'multi_store', name: 'Multi Store', description: 'Kelola lebih dari satu cabang/toko', icon: '🏪' },
      { code: 'kds', name: 'Kitchen Display System', description: 'Tampilan dapur untuk order FnB', icon: '🍳' },
      { code: 'fnb_module', name: 'F&B Module', description: 'Manajemen meja, order, dan split bill untuk restoran', icon: '🍽️' },
      { code: 'laundry_module', name: 'Laundry Module', description: 'Manajemen order laundry, checklist, dan jadwal', icon: '👕' },
      { code: 'mobile_app', name: 'Mobile App', description: 'Akses via aplikasi mobile iOS dan Android', icon: '📱' },
      { code: 'api_access', name: 'API Access', description: 'Akses REST API untuk integrasi custom', icon: '🔌' },
      { code: 'email_support', name: 'Email Support', description: 'Dukungan teknis via email', icon: '📧' },
      { code: 'phone_support', name: 'Phone Support', description: 'Dukungan teknis via telepon', icon: '📞' },
      { code: 'priority_support', name: 'Priority Support', description: 'Dukungan prioritas dengan response time < 1 jam', icon: '🚀' },
      { code: 'dedicated_manager', name: 'Dedicated Account Manager', description: 'Account manager khusus untuk bisnis Anda', icon: '👤' },
      { code: 'white_label', name: 'White Label', description: 'Branding custom dengan logo dan warna bisnis Anda', icon: '🎨' },
      { code: 'custom_domain', name: 'Custom Domain', description: 'Gunakan domain sendiri untuk akses sistem', icon: '🌐' },
      { code: 'online_ordering', name: 'Online Ordering', description: 'Terima order online dari pelanggan', icon: '🛒' },
      { code: 'delivery_management', name: 'Delivery Management', description: 'Manajemen pengiriman dan kurir', icon: '🚚' },
      { code: 'custom_integrations', name: 'Custom Integrations', description: 'Integrasi custom dengan sistem pihak ketiga', icon: '⚙️' },
    ];

    for (const data of defaults) {
      const existing = await this.featureRepo.findOne({ where: { code: data.code } });
      if (!existing) {
        await this.featureRepo.save(
          this.featureRepo.create({ ...data, isActive: true, companyId: 'platform' }),
        );
      }
    }
  }
}
