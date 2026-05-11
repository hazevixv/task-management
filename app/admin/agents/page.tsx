'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Search, ArrowLeft, Loader2, Plus, X, Save, Edit2, Trash2, Users, Camera, Power, Tag, Briefcase } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import styles from '../admin.module.css';

function AgentAvatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  if (url && !err) {
    return <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }} onError={() => setErr(true)} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.3 }}>
      <Bot size={size * 0.4} />
    </div>
  );
}

function AgentCard({ agent: a, uploadingFor, onEdit, onDelete, onToggle, onUpload }: {
  agent: any;
  uploadingFor: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', background: 'white', border: `1px solid ${a.is_active ? 'rgba(226,232,240,0.6)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 180ms', opacity: a.is_active ? 1 : 0.75 }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <AgentAvatar src={a.avatar} name={a.name} size={48} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFor === a.agent_id}
            style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#10b981', border: '2px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            title="Ganti avatar"
          >
            {uploadingFor === a.agent_id ? <Loader2 size={10} style={{ animation: 'spin 800ms linear infinite' }} /> : <Camera size={10} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {a.name}
            {a.is_personal
              ? <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', borderRadius: 4, fontWeight: 700 }}>Personal</span>
              : <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 4, fontWeight: 700 }}>Worker</span>
            }
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{a.role || 'AI Assistant'}</div>
        </div>
        <span style={{ padding: '2px 8px', background: a.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: a.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
          {a.is_active ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {/* Description */}
      {a.description && (
        <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.description}
        </div>
      )}

      {/* System prompt preview */}
      {a.system_prompt && (
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace', background: '#F9FAFB', borderRadius: 6, padding: '6px 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {a.system_prompt}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
          {a.model || 'gemini-2.5-flash'}
        </span>
        {a.is_personal && a.owner_full_name && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
            <Users size={11} /> {a.owner_full_name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button
          onClick={onEdit}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, background: 'white', color: '#374151', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <Edit2 size={13} /> Edit
        </button>
        <button
          onClick={onToggle}
          title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', border: `1px solid ${a.is_active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, background: a.is_active ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', color: a.is_active ? '#d97706' : '#059669', cursor: 'pointer' }}
        >
          <Power size={13} />
        </button>
        <button
          onClick={onDelete}
          title="Hapus"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, background: 'rgba(239,68,68,0.05)', color: '#dc2626', cursor: 'pointer' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  description: '',
  role: '',
  system_prompt: '',
  knowledge_base: '',
  model: 'gemini-2.5-flash',
  is_personal: false,
};

export default function AdminAgentsPage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'worker' | 'personal'>('all');

  // Create agent form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit agent
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    loadData();
  }, [authChecked, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.success) setAgents(data.agents);
    } catch {
      showToast('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!createForm.name || !createForm.system_prompt) {
      showToast('Nama dan System Prompt wajib diisi', 'error');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('AI Agent berhasil dibuat!', 'success');
        setShowCreateForm(false);
        setCreateForm({ ...EMPTY_FORM });
        loadData();
      } else {
        showToast(data.error || 'Gagal membuat agent', 'error');
      }
    } catch {
      showToast('Error saat menyimpan', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Yakin ingin menghapus agent "${agentName}"? Ini akan menghapus semua data terkait.`)) return;
    try {
      const res = await fetch(`/api/admin/agents?agent_id=${encodeURIComponent(agentId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Agent berhasil dihapus', 'success');
        loadData();
      } else {
        showToast(data.error || 'Gagal menghapus', 'error');
      }
    } catch {
      showToast('Error saat menghapus', 'error');
    }
  };

  const handleToggleActive = async (agent: any) => {
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.agent_id, is_active: agent.is_active ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(agent.is_active ? 'Agent dinonaktifkan' : 'Agent diaktifkan', 'success');
        setAgents(prev => prev.map(a => a.agent_id === agent.agent_id ? { ...a, is_active: agent.is_active ? 0 : 1 } : a));
      }
    } catch {
      showToast('Error', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Agent berhasil diupdate!', 'success');
        setAgents(prev => prev.map(a => a.agent_id === editItem.agent_id ? { ...a, ...editItem } : a));
        setEditItem(null);
      } else {
        showToast(data.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Error saat menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File, agentId: string) => {
    setUploadingFor(agentId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('agentId', agentId);
      const res = await fetch('/api/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        showToast('Avatar updated!', 'success');
        setAgents(prev => prev.map(a => a.agent_id === agentId ? { ...a, avatar: data.avatarPath } : a));
        if (editItem?.agent_id === agentId) setEditItem((p: any) => ({ ...p, avatar: data.avatarPath }));
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setUploadingFor(null);
    }
  };

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.role?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'worker') return !a.is_personal;
    if (filter === 'personal') return a.is_personal;
    return true;
  });

  const workerAgents = agents.filter(a => !a.is_personal);
  const personalAgents = agents.filter(a => a.is_personal);
  const activeCount = agents.filter(a => a.is_active).length;

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell activeTab="" user={user} onLogout={handleLogout} pageTitle="AI Agents" onNewTask={() => {}} onNewProject={() => {}}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, background: 'white', color: '#6B7280', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                <ArrowLeft size={14} /> Admin
              </button>
              <Bot size={20} style={{ color: '#10b981' }} />
              <h1 className={styles.title}>AI Agents</h1>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <div className={styles.searchBox} style={{ maxWidth: 260 }}>
                <Search size={14} className={styles.searchIcon} />
                <input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
              >
                <Plus size={15} /> Buat AI Agent
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Agents', value: agents.length, color: '#10b981' },
              { label: 'Worker AI', value: workerAgents.length, color: '#3b82f6' },
              { label: 'Personal AI', value: personalAgents.length, color: '#8b5cf6' },
              { label: 'Active', value: activeCount, color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'DM Sans, sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className={styles.tabs}>
            {(['all', 'worker', 'personal'] as const).map(f => (
              <button key={f} className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' && `All (${agents.length})`}
                {f === 'worker' && `🤖 Worker AI (${workerAgents.length})`}
                {f === 'personal' && `👤 Personal AI (${personalAgents.length})`}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
              <Bot size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Belum ada agent</div>
              <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Klik "Buat AI Agent" untuk menambahkan</div>
            </div>
          ) : (
            <>
              {/* Worker AI Section */}
              {(filter === 'all' || filter === 'worker') && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Briefcase size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>🤖 Worker AI</div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>Bisa di-assign ke job position — muncul di chat semua karyawan dengan role tersebut</div>
                    </div>
                    <span style={{ marginLeft: 'auto', padding: '3px 10px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                      {filtered.filter(a => !a.is_personal).length} agents
                    </span>
                  </div>
                  {filtered.filter(a => !a.is_personal).length === 0 ? (
                    <div style={{ padding: '20px', background: 'rgba(59,130,246,0.04)', border: '1px dashed rgba(59,130,246,0.3)', borderRadius: 12, textAlign: 'center', color: '#6B7280', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                      Belum ada Worker AI. Buat agent baru dengan tipe "Worker AI".
                    </div>
                  ) : (
                    <div className={styles.grid}>
                      {filtered.filter(a => !a.is_personal).map(a => (
                        <AgentCard
                          key={a.agent_id}
                          agent={a}
                          uploadingFor={uploadingFor}
                          onEdit={() => setEditItem({ ...a })}
                          onDelete={() => handleDeleteAgent(a.agent_id, a.name)}
                          onToggle={() => handleToggleActive(a)}
                          onUpload={(file) => handleAvatarUpload(file, a.agent_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Personal AI Section */}
              {(filter === 'all' || filter === 'personal') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>👤 Personal AI</div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>AI assistant pribadi — hanya muncul untuk owner-nya saja</div>
                    </div>
                    <span style={{ marginLeft: 'auto', padding: '3px 10px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                      {filtered.filter(a => a.is_personal).length} agents
                    </span>
                  </div>
                  {filtered.filter(a => a.is_personal).length === 0 ? (
                    <div style={{ padding: '20px', background: 'rgba(139,92,246,0.04)', border: '1px dashed rgba(139,92,246,0.3)', borderRadius: 12, textAlign: 'center', color: '#6B7280', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
                      Belum ada Personal AI.
                    </div>
                  ) : (
                    <div className={styles.grid}>
                      {filtered.filter(a => a.is_personal).map(a => (
                        <AgentCard
                          key={a.agent_id}
                          agent={a}
                          uploadingFor={uploadingFor}
                          onEdit={() => setEditItem({ ...a })}
                          onDelete={() => handleDeleteAgent(a.agent_id, a.name)}
                          onToggle={() => handleToggleActive(a)}
                          onUpload={(file) => handleAvatarUpload(file, a.agent_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>

      {/* ── EDIT AGENT MODAL ── */}
      {editItem && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setEditItem(null)}>
          <div className={styles.modal} style={{ width: 'min(680px,100%)', maxHeight: '90vh' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>✏️ Edit Agent: {editItem.name}</span>
              <button className={styles.modalClose} onClick={() => setEditItem(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Nama Agent *</label>
                  <input value={editItem.name || ''} onChange={e => setEditItem((p: any) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Role / Spesialisasi</label>
                  <input value={editItem.role || ''} onChange={e => setEditItem((p: any) => ({ ...p, role: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Deskripsi</label>
                <textarea value={editItem.description || ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div className={styles.field}>
                <label>System Prompt *</label>
                <textarea value={editItem.system_prompt || ''} onChange={e => setEditItem((p: any) => ({ ...p, system_prompt: e.target.value }))} rows={5} style={{ resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: '0.8125rem' }} />
              </div>
              <div className={styles.field}>
                <label>Knowledge Base</label>
                <textarea value={editItem.knowledge_base || ''} onChange={e => setEditItem((p: any) => ({ ...p, knowledge_base: e.target.value }))} rows={3} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem' }} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Model AI</label>
                  <select value={editItem.model || 'gemini-2.5-flash'} onChange={e => setEditItem((p: any) => ({ ...p, model: e.target.value }))}>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select value={editItem.is_active ? '1' : '0'} onChange={e => setEditItem((p: any) => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Tipe Agent</label>
                <select value={editItem.is_personal ? 'personal' : 'worker'} onChange={e => setEditItem((p: any) => ({ ...p, is_personal: e.target.value === 'personal' ? 1 : 0 }))}>
                  <option value="worker">🤖 Worker AI</option>
                  <option value="personal">👤 Personal AI</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditItem(null)}>Batal</button>
              <button className={styles.btnSave} onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE AGENT MODAL ── */}
      {showCreateForm && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className={styles.modal} style={{ width: 'min(680px,100%)', maxHeight: '90vh' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>🤖 Buat AI Agent Baru</span>
              <button className={styles.modalClose} onClick={() => setShowCreateForm(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              {/* Row 1 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Nama Agent *</label>
                  <input
                    placeholder="Contoh: Content Writer AI"
                    value={createForm.name}
                    onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Role / Spesialisasi</label>
                  <input
                    placeholder="Contoh: Content Writer"
                    value={createForm.role}
                    onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className={styles.field}>
                <label>Deskripsi Singkat</label>
                <textarea
                  placeholder="Jelaskan fungsi dan keahlian AI agent ini..."
                  value={createForm.description}
                  onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  style={{ resize: 'vertical', minHeight: 60 }}
                />
              </div>

              {/* System Prompt */}
              <div className={styles.field}>
                <label>System Prompt * (Instruksi AI)</label>
                <textarea
                  placeholder="You are a professional content writer with expertise in SEO, storytelling, and engaging copy. Help users..."
                  value={createForm.system_prompt}
                  onChange={e => setCreateForm(p => ({ ...p, system_prompt: e.target.value }))}
                  rows={5}
                  style={{ resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
              </div>

              {/* Knowledge Base */}
              <div className={styles.field}>
                <label>Knowledge Base (Opsional)</label>
                <textarea
                  placeholder="Tambahkan konteks, data, atau panduan khusus untuk agent ini..."
                  value={createForm.knowledge_base}
                  onChange={e => setCreateForm(p => ({ ...p, knowledge_base: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 80, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
              </div>

              {/* Row 2 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Model AI</label>
                  <select value={createForm.model} onChange={e => setCreateForm(p => ({ ...p, model: e.target.value }))}>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Cepat)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Akurat)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Tipe Agent</label>
                  <select value={createForm.is_personal ? 'personal' : 'worker'} onChange={e => setCreateForm(p => ({ ...p, is_personal: e.target.value === 'personal' }))}>
                    <option value="worker">🤖 Worker AI (Untuk semua user dengan role tertentu)</option>
                    <option value="personal">👤 Personal AI (Khusus untuk 1 user)</option>
                  </select>
                </div>
              </div>

              {/* Info box */}
              <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(5,150,105,0.06))', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 14px', fontSize: '0.8125rem', color: '#047857', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                <strong>💡 Tips:</strong> Worker AI bisa di-assign ke job position di tab "Roles & Delivery" di Admin Panel. Personal AI hanya muncul untuk owner-nya saja.
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => { setShowCreateForm(false); setCreateForm({ ...EMPTY_FORM }); }}>Batal</button>
              <button
                className={styles.btnSave}
                onClick={handleCreateAgent}
                disabled={createLoading}
              >
                {createLoading ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {createLoading ? 'Membuat...' : 'Buat Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileHeader title="AI Agents" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
