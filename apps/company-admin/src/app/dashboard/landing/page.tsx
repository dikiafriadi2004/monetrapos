"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import {
  Globe, Save, Eye, EyeOff, RefreshCcw, ChevronDown, ChevronUp,
  Loader2, Plus, Trash2, GripVertical, Sparkles
} from 'lucide-react';

interface LandingSection {
  id: string;
  section: string;
  title: string;
  content: Record<string, any>;
  isVisible: boolean;
  sortOrder: number;
}

const SECTION_ICONS: Record<string, string> = {
  hero: '🎯', stats: '📊', features: '⚡', how_it_works: '🔄',
  testimonials: '💬', faq: '❓', cta: '🚀', footer: '📋',
};

export default function LandingEditorPage() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('hero');

  useEffect(() => { fetchSections(); }, []);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/landing/admin/all');
      setSections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch landing sections:', err);
      toast.error('Failed to load landing content');
    } finally { setLoading(false); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.post('/landing/admin/seed');
      toast.success('Default content seeded!');
      await fetchSections();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to seed content');
    } finally { setSeeding(false); }
  };

  const handleSave = async (section: LandingSection) => {
    setSaving(section.section);
    try {
      await api.patch(`/landing/admin/${section.section}`, {
        content: section.content,
        isVisible: section.isVisible,
        title: section.title,
      });
      toast.success(`${section.title} saved`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally { setSaving(null); }
  };

  const handleToggleVisible = async (section: LandingSection) => {
    const updated = { ...section, isVisible: !section.isVisible };
    setSections(prev => prev.map(s => s.section === section.section ? updated : s));
    try {
      await api.patch(`/landing/admin/${section.section}`, { isVisible: updated.isVisible });
      toast.success(updated.isVisible ? 'Section shown' : 'Section hidden');
    } catch (err: any) {
      toast.error('Failed to update visibility');
      setSections(prev => prev.map(s => s.section === section.section ? section : s));
    }
  };

  const updateContent = (sectionKey: string, newContent: Record<string, any>) => {
    setSections(prev => prev.map(s =>
      s.section === sectionKey ? { ...s, content: newContent } : s
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe size={24} className="text-indigo-600" /> Landing Page Editor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Edit konten landing page yang ditampilkan ke calon pelanggan</p>
        </div>
        <div className="flex gap-2">
          <a href={process.env.NEXT_PUBLIC_MEMBER_URL || 'http://localhost:4403'} target="_blank" rel="noopener noreferrer"
            className="btn btn-outline btn-sm">
            <Eye size={14} /> Preview
          </a>
          {sections.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="btn btn-primary btn-sm">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Seed Default Content
            </button>
          )}
          <button onClick={fetchSections} className="btn btn-outline btn-sm">
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="card p-12 text-center">
          <Globe size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada konten</h3>
          <p className="text-sm text-gray-500 mb-6">Klik tombol di bawah untuk mengisi konten default landing page</p>
          <button onClick={handleSeed} disabled={seeding} className="btn btn-primary mx-auto">
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate Default Content
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.section} className={`card overflow-hidden transition-all ${!section.isVisible ? 'opacity-60' : ''}`}>
              {/* Section Header */}
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === section.section ? null : section.section)}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{SECTION_ICONS[section.section] || '📄'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{section.title}</p>
                    <p className="text-xs text-gray-400 font-mono">{section.section}</p>
                  </div>
                  {!section.isVisible && (
                    <span className="badge badge-gray text-xs">Hidden</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleToggleVisible(section)}
                    className={`btn btn-sm ${section.isVisible ? 'btn-outline' : 'btn-secondary'}`}
                    title={section.isVisible ? 'Hide section' : 'Show section'}>
                    {section.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => handleSave(section)} disabled={saving === section.section}
                    className="btn btn-primary btn-sm">
                    {saving === section.section ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                  <div className="text-gray-400">
                    {expanded === section.section ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Section Editor */}
              {expanded === section.section && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50">
                  <SectionEditor
                    section={section}
                    onChange={(newContent) => updateContent(section.section, newContent)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section-specific editors ─────────────────────────────────────────────────
function SectionEditor({ section, onChange }: { section: LandingSection; onChange: (c: Record<string, any>) => void }) {
  const c = section.content;
  const set = (key: string, val: any) => onChange({ ...c, [key]: val });

  switch (section.section) {
    case 'hero':
      return (
        <div className="space-y-4">
          <Field label="Badge Text" value={c.badge} onChange={v => set('badge', v)} />
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} textarea />
          <Field label="Sub-headline" value={c.subheadline} onChange={v => set('subheadline', v)} textarea />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA Primary Text" value={c.ctaPrimary?.text} onChange={v => set('ctaPrimary', { ...c.ctaPrimary, text: v })} />
            <Field label="CTA Primary URL" value={c.ctaPrimary?.url} onChange={v => set('ctaPrimary', { ...c.ctaPrimary, url: v })} />
            <Field label="CTA Secondary Text" value={c.ctaSecondary?.text} onChange={v => set('ctaSecondary', { ...c.ctaSecondary, text: v })} />
            <Field label="CTA Secondary URL" value={c.ctaSecondary?.url} onChange={v => set('ctaSecondary', { ...c.ctaSecondary, url: v })} />
          </div>
          <Field label="Hero Image URL" value={c.imageUrl} onChange={v => set('imageUrl', v)} placeholder="https://..." />
          <Field label="Demo Video URL (YouTube embed)" value={c.videoUrl} onChange={v => set('videoUrl', v)} placeholder="https://youtube.com/embed/..." />
        </div>
      );

    case 'stats':
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Statistics Items</p>
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-center bg-white rounded-lg p-3 border border-gray-200">
              <Field label="Value" value={item.value} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], value: v }; set('items', items); }} />
              <Field label="Label" value={item.label} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], label: v }; set('items', items); }} />
              <button onClick={() => set('items', c.items.filter((_: any, j: number) => j !== i))} className="btn btn-ghost btn-icon btn-sm text-red-500 self-end mb-1"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => set('items', [...(c.items || []), { value: '', label: '' }])} className="btn btn-outline btn-sm"><Plus size={14} /> Add Stat</button>
        </div>
      );

    case 'features':
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} />
          <Field label="Sub-headline" value={c.subheadline} onChange={v => set('subheadline', v)} textarea />
          <p className="text-sm font-medium text-gray-700 mt-4">Feature Items</p>
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Feature {i + 1}</span>
                <button onClick={() => set('items', c.items.filter((_: any, j: number) => j !== i))} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={item.title} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], title: v }; set('items', items); }} />
                <Field label="Icon (Lucide name)" value={item.icon} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], icon: v }; set('items', items); }} placeholder="e.g. ShoppingCart" />
              </div>
              <Field label="Description" value={item.description} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], description: v }; set('items', items); }} textarea />
              <Field label="Color" value={item.color} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], color: v }; set('items', items); }} placeholder="indigo, emerald, amber..." />
            </div>
          ))}
          <button onClick={() => set('items', [...(c.items || []), { icon: '', title: '', description: '', color: 'indigo' }])} className="btn btn-outline btn-sm"><Plus size={14} /> Add Feature</button>
        </div>
      );

    case 'how_it_works':
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} />
          <Field label="Sub-headline" value={c.subheadline} onChange={v => set('subheadline', v)} textarea />
          <p className="text-sm font-medium text-gray-700 mt-4">Steps</p>
          {(c.steps || []).map((step: any, i: number) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Step {i + 1}</span>
                <button onClick={() => set('steps', c.steps.filter((_: any, j: number) => j !== i))} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number" value={step.number} onChange={v => { const steps = [...c.steps]; steps[i] = { ...steps[i], number: v }; set('steps', steps); }} placeholder="01" />
                <Field label="Icon (Lucide name)" value={step.icon} onChange={v => { const steps = [...c.steps]; steps[i] = { ...steps[i], icon: v }; set('steps', steps); }} />
              </div>
              <Field label="Title" value={step.title} onChange={v => { const steps = [...c.steps]; steps[i] = { ...steps[i], title: v }; set('steps', steps); }} />
              <Field label="Description" value={step.description} onChange={v => { const steps = [...c.steps]; steps[i] = { ...steps[i], description: v }; set('steps', steps); }} textarea />
            </div>
          ))}
          <button onClick={() => set('steps', [...(c.steps || []), { number: '', icon: '', title: '', description: '' }])} className="btn btn-outline btn-sm"><Plus size={14} /> Add Step</button>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} />
          <Field label="Sub-headline" value={c.subheadline} onChange={v => set('subheadline', v)} textarea />
          <p className="text-sm font-medium text-gray-700 mt-4">Testimonials</p>
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Testimonial {i + 1}</span>
                <button onClick={() => set('items', c.items.filter((_: any, j: number) => j !== i))} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={item.name} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], name: v }; set('items', items); }} />
                <Field label="Role / Business" value={item.role} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], role: v }; set('items', items); }} />
                <Field label="Avatar URL" value={item.avatar} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], avatar: v }; set('items', items); }} placeholder="https://..." />
                <div className="form-group">
                  <label className="form-label">Rating (1-5)</label>
                  <input type="number" className="form-input" min={1} max={5} value={item.rating} onChange={e => { const items = [...c.items]; items[i] = { ...items[i], rating: Number(e.target.value) }; set('items', items); }} />
                </div>
              </div>
              <Field label="Testimonial Content" value={item.content} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], content: v }; set('items', items); }} textarea />
              <Field label="Business Type" value={item.businessType} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], businessType: v }; set('items', items); }} placeholder="FnB, Retail, Laundry..." />
            </div>
          ))}
          <button onClick={() => set('items', [...(c.items || []), { name: '', role: '', avatar: '', rating: 5, content: '', businessType: '' }])} className="btn btn-outline btn-sm"><Plus size={14} /> Add Testimonial</button>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} />
          <p className="text-sm font-medium text-gray-700 mt-4">FAQ Items</p>
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">FAQ {i + 1}</span>
                <button onClick={() => set('items', c.items.filter((_: any, j: number) => j !== i))} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
              </div>
              <Field label="Question" value={item.question} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], question: v }; set('items', items); }} />
              <Field label="Answer" value={item.answer} onChange={v => { const items = [...c.items]; items[i] = { ...items[i], answer: v }; set('items', items); }} textarea />
            </div>
          ))}
          <button onClick={() => set('items', [...(c.items || []), { question: '', answer: '' }])} className="btn btn-outline btn-sm"><Plus size={14} /> Add FAQ</button>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChange={v => set('headline', v)} />
          <Field label="Sub-headline" value={c.subheadline} onChange={v => set('subheadline', v)} textarea />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA Primary Text" value={c.ctaPrimary?.text} onChange={v => set('ctaPrimary', { ...c.ctaPrimary, text: v })} />
            <Field label="CTA Primary URL" value={c.ctaPrimary?.url} onChange={v => set('ctaPrimary', { ...c.ctaPrimary, url: v })} />
            <Field label="CTA Secondary Text" value={c.ctaSecondary?.text} onChange={v => set('ctaSecondary', { ...c.ctaSecondary, text: v })} />
            <Field label="CTA Secondary URL" value={c.ctaSecondary?.url} onChange={v => set('ctaSecondary', { ...c.ctaSecondary, url: v })} />
          </div>
          <Field label="Note (small text below buttons)" value={c.note} onChange={v => set('note', v)} placeholder="e.g. Tidak perlu kartu kredit..." />
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name" value={c.companyName} onChange={v => set('companyName', v)} />
            <Field label="Tagline" value={c.tagline} onChange={v => set('tagline', v)} />
            <Field label="Email" value={c.email} onChange={v => set('email', v)} />
            <Field label="Phone" value={c.phone} onChange={v => set('phone', v)} />
            <Field label="WhatsApp URL" value={c.whatsapp} onChange={v => set('whatsapp', v)} placeholder="https://wa.me/62..." />
            <Field label="Address" value={c.address} onChange={v => set('address', v)} />
          </div>
          <p className="text-sm font-medium text-gray-700 mt-2">Social Links</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Instagram" value={c.socialLinks?.instagram} onChange={v => set('socialLinks', { ...c.socialLinks, instagram: v })} />
            <Field label="Facebook" value={c.socialLinks?.facebook} onChange={v => set('socialLinks', { ...c.socialLinks, facebook: v })} />
            <Field label="YouTube" value={c.socialLinks?.youtube} onChange={v => set('socialLinks', { ...c.socialLinks, youtube: v })} />
          </div>
          <Field label="Copyright Text" value={c.copyright} onChange={v => set('copyright', v)} />
        </div>
      );

    default:
      return (
        <div>
          <p className="text-sm text-gray-500 mb-3">Raw JSON Editor</p>
          <textarea
            className="form-input font-mono text-xs"
            rows={12}
            value={JSON.stringify(c, null, 2)}
            onChange={e => {
              try { onChange(JSON.parse(e.target.value)); } catch { /* invalid JSON */ }
            }}
          />
        </div>
      );
  }
}

function Field({ label, value, onChange, textarea, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {textarea ? (
        <textarea className="form-input text-sm" rows={3} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className="form-input text-sm" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
