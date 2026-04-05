'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ShoppingCart, Package, Users, BarChart3, UtensilsCrossed, Shirt,
  Store, Shield, CheckCircle, Star, ChevronDown, ChevronUp, Menu, X,
  ArrowRight, Play, Zap, TrendingUp, Clock, HeadphonesIcon, Award,
  UserPlus, Settings, Phone, Mail,
  Loader2, MessageCircle, Play as YoutubeIcon, Share2 as Instagram, Globe as Facebook
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

const ICON_MAP: Record<string, any> = {
  ShoppingCart, Package, Users, BarChart3, UtensilsCrossed, Shirt,
  Store, Shield, CheckCircle, Star, Zap, TrendingUp, Clock,
  HeadphonesIcon, Award, UserPlus, Settings, ArrowRight,
};

function Icon({ name, ...props }: { name: string; [k: string]: any }) {
  const C = ICON_MAP[name];
  return C ? <C {...props} /> : null;
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
  pink: 'bg-pink-100 text-pink-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function LandingPage() {
  const [content, setContent] = useState<Record<string, any>>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/landing`).then(r => r.data).catch(() => ({})),
      axios.get(`${API_URL}/subscription-plans/with-durations`).then(r => r.data).catch(() => []),
    ]).then(([c, p]) => {
      setContent(c);
      setPlans(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, []);

  const hero = content.hero || {};
  const stats = content.stats || {};
  const features = content.features || {};
  const howItWorks = content.how_it_works || {};
  const testimonials = content.testimonials || {};
  const faq = content.faq || {};
  const cta = content.cta || {};
  const footer = content.footer || {};

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">{footer.companyName || 'MonetraPOS'}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {[['Fitur', '#features'], ['Cara Kerja', '#how-it-works'], ['Harga', '#pricing'], ['Testimoni', '#testimonials'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={href} href={href} className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-700 hover:text-indigo-600'}`}>{label}</a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Masuk</Link>
              <Link href="/register" className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                Coba Gratis
              </Link>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {[['Fitur', '#features'], ['Cara Kerja', '#how-it-works'], ['Harga', '#pricing'], ['Testimoni', '#testimonials'], ['FAQ', '#faq']].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">{label}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Link href="/login" className="flex-1 text-center text-sm font-medium text-gray-600 border border-gray-300 rounded-lg py-2">Masuk</Link>
              <Link href="/register" className="flex-1 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg py-2">Coba Gratis</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {hero.badge && (
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                <Zap size={14} />
                {hero.badge}
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              {hero.headline || 'Kelola Bisnis Anda Lebih Mudah'}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-10 max-w-3xl mx-auto">
              {hero.subheadline || 'Platform POS lengkap untuk bisnis Anda'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={hero.ctaPrimary?.url || '/register'}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-base">
                {hero.ctaPrimary?.text || 'Coba Gratis 14 Hari'} <ArrowRight size={18} />
              </Link>
              {hero.videoUrl ? (
                <button onClick={() => setVideoOpen(true)}
                  className="inline-flex items-center gap-2 text-gray-700 font-semibold px-6 py-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white text-base">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Play size={14} className="text-indigo-600 ml-0.5" />
                  </div>
                  {hero.ctaSecondary?.text || 'Lihat Demo'}
                </button>
              ) : (
                <a href={hero.ctaSecondary?.url || '#features'}
                  className="inline-flex items-center gap-2 text-gray-700 font-semibold px-6 py-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white text-base">
                  {hero.ctaSecondary?.text || 'Pelajari Lebih Lanjut'} <ChevronDown size={16} />
                </a>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-4">Tidak perlu kartu kredit &bull; Setup dalam 5 menit &bull; Cancel kapan saja</p>
          </div>

          {hero.imageUrl && (
            <div className="mt-16 relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" style={{top:'60%'}} />
              <img src={hero.imageUrl} alt="MonetraPOS Dashboard" className="w-full rounded-2xl shadow-2xl border border-gray-200" />
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      {stats.items?.length > 0 && (
        <section className="py-12 bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.items.map((item: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="text-3xl lg:text-4xl font-extrabold text-indigo-600 mb-1">{item.value}</div>
                  <div className="text-sm text-gray-500 font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
              {features.headline || 'Fitur Lengkap untuk Bisnis Anda'}
            </h2>
            <p className="text-lg text-gray-600">{features.subheadline}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(features.items || []).map((f: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${COLOR_MAP[f.color] || COLOR_MAP.indigo}`}>
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
              {howItWorks.headline || 'Mulai dalam 3 Langkah Mudah'}
            </h2>
            <p className="text-lg text-gray-600">{howItWorks.subheadline}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-indigo-200 to-indigo-200" />
            {(howItWorks.steps || []).map((step: any, i: number) => (
              <div key={i} className="relative text-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 relative z-10">
                  <Icon name={step.icon} size={32} />
                </div>
                <div className="absolute top-0 right-1/4 w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Harga Transparan, Tanpa Biaya Tersembunyi</h2>
            <p className="text-lg text-gray-600">Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Upgrade atau downgrade kapan saja.</p>
          </div>
          {plans.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Loader2 size={32} className="animate-spin mx-auto mb-3" />
              <p>Memuat paket harga...</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-6 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
              {plans.map((plan: any, i: number) => {
                const isPopular = plan.isPopular;
                return (
                  <div key={plan.id} className={`relative rounded-2xl p-8 flex flex-col ${isPopular ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105' : 'bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all'}`}>
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow">
                        PALING POPULER
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                      <p className={`text-sm mb-4 ${isPopular ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.description}</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-extrabold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                          {plan.priceMonthly === 0 ? 'Gratis' : fmt(plan.priceMonthly)}
                        </span>
                        {plan.priceMonthly > 0 && <span className={`text-sm ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>/bulan</span>}
                      </div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {[
                        `${plan.maxStores === -1 ? 'Unlimited' : plan.maxStores} Outlet`,
                        `${plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} User`,
                        `${plan.maxEmployees === -1 ? 'Unlimited' : plan.maxEmployees} Karyawan`,
                        `${plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts?.toLocaleString('id-ID')} Produk`,
                        ...(plan.features && typeof plan.features === 'object' && !Array.isArray(plan.features)
                          ? Object.entries(plan.features).filter(([, v]) => v).map(([k]) => {
                              const labels: Record<string, string> = {
                                pos: 'Point of Sale (POS)',
                                pos_terminal: 'POS Terminal',
                                inventory: 'Manajemen Inventori',
                                customers: 'Manajemen Pelanggan',
                                employees: 'Manajemen Karyawan',
                                reports: 'Laporan & Analitik',
                                receipt_printing: 'Cetak Struk',
                                multiStore: 'Multi-Outlet',
                                multi_store: 'Multi-Outlet',
                                loyaltyProgram: 'Program Loyalitas',
                                customer_loyalty: 'Program Loyalitas',
                                api: 'Akses API',
                                api_access: 'Akses API',
                                customReceipt: 'Custom Struk',
                                prioritySupport: 'Priority Support',
                                priority_support: 'Priority Support',
                                whiteLabel: 'White Label',
                                white_label: 'White Label',
                                mobile_app: 'Aplikasi Mobile',
                                fnb: 'Modul F&B',
                                laundry: 'Modul Laundry',
                                kds: 'Kitchen Display (KDS)',
                                online_ordering: 'Pemesanan Online',
                                delivery_management: 'Manajemen Pengiriman',
                                email_support: 'Support Email',
                                phone_support: 'Support Telepon',
                                dedicated_manager: 'Dedicated Manager',
                                custom_domain: 'Custom Domain',
                                custom_integrations: 'Integrasi Custom',
                              };
                              return labels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            })
                          : []),
                      ].map((feat: string, j: number) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm">
                          <CheckCircle size={16} className={isPopular ? 'text-indigo-200 flex-shrink-0' : 'text-emerald-500 flex-shrink-0'} />
                          <span className={isPopular ? 'text-indigo-100' : 'text-gray-600'}>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Duration options */}
                    {Array.isArray(plan.durations) && plan.durations.length > 0 && (
                      <div className="mb-6">
                        <p className={`text-xs font-semibold mb-2 ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>OPSI DURASI</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[...plan.durations].sort((a: any, b: any) => a.durationMonths - b.durationMonths).map((d: any) => (
                            <div key={d.durationMonths} className={`text-center rounded-lg py-1.5 px-2 text-xs ${isPopular ? 'bg-indigo-500' : 'bg-gray-50 border border-gray-200'}`}>
                              <div className={`font-bold ${isPopular ? 'text-white' : 'text-gray-800'}`}>{fmt(d.finalPrice)}</div>
                              <div className={`${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>
                                {d.durationMonths} bln{d.discountPercentage > 0 ? ` (-${d.discountPercentage}%)` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link href="/register"
                      className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${isPopular ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {plan.priceMonthly === 0 ? 'Mulai Gratis' : 'Pilih Paket Ini'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center text-sm text-gray-400 mt-8">Semua paket sudah termasuk support 24/7 dan update fitur gratis</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      {testimonials.items?.length > 0 && (
        <section id="testimonials" className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">{testimonials.headline}</h2>
              <p className="text-lg text-gray-600">{testimonials.subheadline}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.items.map((t: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6 text-sm italic">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {t.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                    {t.businessType && (
                      <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{t.businessType}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faq.items?.length > 0 && (
        <section id="faq" className="py-20 lg:py-28 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">{faq.headline}</h2>
            </div>
            <div className="space-y-3">
              {faq.items.map((item: any, i: number) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-gray-900 text-sm pr-4">{item.question}</span>
                    {openFaq === i ? <ChevronUp size={18} className="text-indigo-600 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-indigo-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            {cta.headline || 'Siap Mengembangkan Bisnis Anda?'}
          </h2>
          <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">{cta.subheadline}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={cta.ctaPrimary?.url || '/register'}
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 font-bold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-all shadow-lg text-base">
              {cta.ctaPrimary?.text || 'Mulai Gratis Sekarang'} <ArrowRight size={18} />
            </Link>
            {cta.ctaSecondary?.url && (
              <a href={cta.ctaSecondary.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-base">
                <MessageCircle size={18} /> {cta.ctaSecondary?.text || 'Hubungi Sales'}
              </a>
            )}
          </div>
          {cta.note && <p className="text-indigo-300 text-sm mt-6">{cta.note}</p>}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-white" />
                </div>
                <span className="font-bold text-white text-lg">{footer.companyName || 'MonetraPOS'}</span>
              </div>
              <p className="text-sm leading-relaxed mb-5">{footer.tagline}</p>
              <div className="space-y-2 text-sm">
                {footer.email && <div className="flex items-center gap-2"><Mail size={14} />{footer.email}</div>}
                {footer.phone && <div className="flex items-center gap-2"><Phone size={14} />{footer.phone}</div>}
                {footer.address && <div className="flex items-center gap-2"><Store size={14} />{footer.address}</div>}
              </div>
              <div className="flex gap-3 mt-5">
                {footer.socialLinks?.instagram && <a href={footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors"><Instagram size={16} /></a>}
                {footer.socialLinks?.facebook && <a href={footer.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors"><Facebook size={16} /></a>}
                {footer.socialLinks?.youtube && <a href={footer.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors"><YoutubeIcon size={16} /></a>}
              </div>
            </div>
            {footer.links?.product?.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Produk</h4>
                <ul className="space-y-2.5">
                  {footer.links.product.map((l: any, i: number) => (
                    <li key={i}><a href={l.url} className="text-sm hover:text-white transition-colors">{l.label}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {footer.links?.company?.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Perusahaan</h4>
                <ul className="space-y-2.5">
                  {footer.links.company.map((l: any, i: number) => (
                    <li key={i}><a href={l.url} className="text-sm hover:text-white transition-colors">{l.label}</a></li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Akun</h4>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="text-sm hover:text-white transition-colors">Masuk</Link></li>
                <li><Link href="/register" className="text-sm hover:text-white transition-colors">Daftar</Link></li>
                {footer.links?.legal?.map((l: any, i: number) => (
                  <li key={i}><a href={l.url} className="text-sm hover:text-white transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">{footer.copyright || `© ${new Date().getFullYear()} MonetraPOS. All rights reserved.`}</p>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Semua sistem berjalan normal</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── VIDEO MODAL ── */}
      {videoOpen && hero.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setVideoOpen(false)}>
          <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVideoOpen(false)} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <X size={18} />
            </button>
            <iframe src={hero.videoUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}


