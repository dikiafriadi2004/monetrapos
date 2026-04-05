import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LandingSectionType {
  HERO = 'hero',
  FEATURES = 'features',
  HOW_IT_WORKS = 'how_it_works',
  TESTIMONIALS = 'testimonials',
  FAQ = 'faq',
  CTA = 'cta',
  FOOTER = 'footer',
  STATS = 'stats',
}

@Entity('landing_contents')
export class LandingContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  section: string; // e.g. 'hero', 'features', 'testimonials'

  @Column({ type: 'varchar', length: 200 })
  title: string; // Section display name for admin

  @Column({ type: 'json' })
  content: Record<string, any>; // Flexible JSON content per section

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
