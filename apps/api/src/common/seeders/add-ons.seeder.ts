import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddOn, AddOnCategory, AddOnPricingType, AddOnStatus } from '../../modules/add-ons/add-on.entity';

@Injectable()
export class AddOnsSeeder {
  private readonly logger = new Logger(AddOnsSeeder.name);

  constructor(
    @InjectRepository(AddOn)
    private addOnsRepository: Repository<AddOn>,
  ) {}

  async seed() {
    this.logger.log('Seeding add-ons...');

    const addOns = [
      // Integration Add-ons
      {
        slug: 'whatsapp-integration',
        name: 'WhatsApp Business Integration',
        description: 'Send receipts, notifications, and marketing messages via WhatsApp',
        long_description: 'Integrate WhatsApp Business API to send automated receipts, low stock alerts, and promotional messages to your customers.',
        category: AddOnCategory.INTEGRATION,
        pricing_type: AddOnPricingType.RECURRING,
        price: 99000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Automated receipt delivery',
          'Low stock notifications',
          'Marketing campaigns',
          'Customer support chat',
          'Broadcast messages',
        ],
        available_for_plans: [], // Available for all plans
      },
      {
        slug: 'accounting-integration',
        name: 'Accounting Software Integration',
        description: 'Sync transactions with Jurnal.id or Accurate Online',
        long_description: 'Automatically sync your POS transactions with popular accounting software like Jurnal.id and Accurate Online.',
        category: AddOnCategory.INTEGRATION,
        pricing_type: AddOnPricingType.RECURRING,
        price: 149000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Jurnal.id integration',
          'Accurate Online integration',
          'Automatic transaction sync',
          'Chart of accounts mapping',
          'Real-time updates',
        ],
        available_for_plans: [],
      },
      {
        slug: 'delivery-integration',
        name: 'Delivery App Integration',
        description: 'Integrate with GoFood, GrabFood, and other delivery platforms',
        long_description: 'Manage orders from multiple delivery platforms in one place. Sync menu, prices, and inventory automatically.',
        category: AddOnCategory.INTEGRATION,
        pricing_type: AddOnPricingType.RECURRING,
        price: 199000,
        status: AddOnStatus.ACTIVE,
        features: [
          'GoFood integration',
          'GrabFood integration',
          'Unified order management',
          'Auto menu sync',
          'Inventory sync',
        ],
        available_for_plans: [],
      },

      // Feature Add-ons
      {
        slug: 'advanced-reporting',
        name: 'Advanced Reporting & Analytics',
        description: 'Get detailed insights with advanced reports and predictive analytics',
        long_description: 'Unlock powerful analytics including cohort analysis, RFM segmentation, sales forecasting, and custom report builder.',
        category: AddOnCategory.FEATURE,
        pricing_type: AddOnPricingType.RECURRING,
        price: 79000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Cohort analysis',
          'RFM customer segmentation',
          'Sales forecasting',
          'Custom report builder',
          'Export to Excel/PDF',
        ],
        available_for_plans: [],
      },
      {
        slug: 'loyalty-program-advanced',
        name: 'Advanced Loyalty Program',
        description: 'Create tiered loyalty programs with birthday rewards and referrals',
        long_description: 'Enhance customer retention with advanced loyalty features including customer tiers, birthday rewards, referral programs, and more.',
        category: AddOnCategory.FEATURE,
        pricing_type: AddOnPricingType.RECURRING,
        price: 59000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Customer tier system',
          'Birthday rewards',
          'Referral program',
          'Points expiration',
          'Bonus point campaigns',
        ],
        available_for_plans: [],
      },
      {
        slug: 'multi-location',
        name: 'Multi-Location Management',
        description: 'Manage multiple store locations with centralized control',
        long_description: 'Perfect for businesses with multiple outlets. Get centralized inventory, consolidated reporting, and inter-store transfers.',
        category: AddOnCategory.FEATURE,
        pricing_type: AddOnPricingType.RECURRING,
        price: 299000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Unlimited store locations',
          'Centralized inventory',
          'Inter-store transfers',
          'Consolidated reporting',
          'Location-based permissions',
        ],
        available_for_plans: [],
      },

      // Support Add-ons
      {
        slug: 'priority-support',
        name: 'Priority Support',
        description: '24/7 priority support with dedicated account manager',
        long_description: 'Get VIP treatment with 24/7 priority support, dedicated account manager, and faster response times.',
        category: AddOnCategory.SUPPORT,
        pricing_type: AddOnPricingType.RECURRING,
        price: 199000,
        status: AddOnStatus.ACTIVE,
        features: [
          '24/7 priority support',
          'Dedicated account manager',
          'Response time < 1 hour',
          'Monthly business review',
          'Training sessions',
        ],
        available_for_plans: [],
      },
      {
        slug: 'onsite-training',
        name: 'On-site Training',
        description: 'Professional on-site training for your team',
        long_description: 'Get expert trainers to visit your location and train your staff on using the POS system effectively.',
        category: AddOnCategory.SUPPORT,
        pricing_type: AddOnPricingType.ONE_TIME,
        price: 2500000,
        status: AddOnStatus.ACTIVE,
        features: [
          'Full-day training session',
          'Up to 20 participants',
          'Training materials included',
          'Follow-up support (30 days)',
          'Certificate of completion',
        ],
        available_for_plans: [],
      },

      // Capacity Add-ons
      {
        slug: 'extra-users',
        name: 'Extra Users Pack',
        description: 'Add 10 more user accounts to your subscription',
        long_description: 'Need more user accounts? Add 10 additional users to your subscription.',
        category: AddOnCategory.CAPACITY,
        pricing_type: AddOnPricingType.RECURRING,
        price: 50000,
        status: AddOnStatus.ACTIVE,
        features: [
          '10 additional users',
          'Full role-based access',
          'Individual permissions',
          'Activity tracking',
        ],
        available_for_plans: [],
      },
      {
        slug: 'extra-products',
        name: 'Extra Products Pack',
        description: 'Add 1000 more products to your inventory',
        long_description: 'Expand your product catalog with 1000 additional product slots.',
        category: AddOnCategory.CAPACITY,
        pricing_type: AddOnPricingType.RECURRING,
        price: 39000,
        status: AddOnStatus.ACTIVE,
        features: [
          '1000 additional products',
          'Unlimited variants',
          'Bulk import/export',
          'Product categories',
        ],
        available_for_plans: [],
      },
    ];

    for (const addOnData of addOns) {
      const existing = await this.addOnsRepository.findOne({
        where: { slug: addOnData.slug },
      });

      if (!existing) {
        const addOn = this.addOnsRepository.create(addOnData);
        await this.addOnsRepository.save(addOn);
        this.logger.log(`Created add-on: ${addOnData.name}`);
      } else {
        this.logger.log(`Add-on already exists: ${addOnData.name}`);
      }
    }

    this.logger.log('Add-ons seeding completed');
  }
}
