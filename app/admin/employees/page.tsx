'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, ArrowLeft, Loader2, Tag, Building2, Mail, Phone, Calendar, Shield, Plus, X, Save, Eye, EyeOff } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import { useApp } from '@/lib/AppContext';
import { getAvatarUrl } from '@/lib/utils';
import styles from '../admin.module.css';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function UserAvatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  if (url && !err) {
    return <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }} onError={() => setErr(true)} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.3 }}>
      {getInitials(name)}
    </div>
  );
}

const EMPTY_FORM = {
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  job_position: '',
  organization: '',
  employee_id: '',
  role: 'user',
};

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'admin'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Add employee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [addLoading, setAddLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setEmployees(data.users);
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!addForm.username || !addForm.password || !addForm.full_name) {
      showToast('Username, password, dan nama lengkap wajib diisi', 'error');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Karyawan berhasil ditambahkan!', 'success');
        setShowAddForm(false);
        setAddForm({ ...EMPTY_FORM });
        loadData();
      } else {
        showToast(data.error || 'Gagal menambahkan karyawan', 'error');
      }
    } catch {
      showToast('Error saat menyimpan', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const filtered = employees.filter(e => {
    const matchSearch = !search ||
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.username?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.job_position?.toLowerCase().includes(search.toLowerCase()) ||
      e.organization?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'active') return e.is_active;
    if (filter === 'inactive') return !e.is_active;
    if (filter === 'admin') return e.role === 'admin';
    return true;
  });

  const byOrg: Record<string, any[]> = {};
  filtered.forEach(e => {
    const org = e.organization || 'No Organization';
    if (!byOrg[org]) byOrg[org] = [];
    byOrg[org].push(e);
  });

  const byPosition: Record<string, any[]> = {};
  filtered.forEach(e => {
    const pos = e.job_position || 'No Position';
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(e);
  });

  const activeCount = employees.filter(e => e.is_active).length;
  const adminCount = employees.filter(e => e.role === 'admin').length;
  const orgCount = Object.keys(byOrg).length;
  const posCount = Object.keys(byPosition).length;

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <AppShell activeTab="" user={user} onLogout={handleLogout} pageTitle="Employees" onNewTask={() => {}} onNewProject={() => {}}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, background: 'white', color: '#6B7280', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                <ArrowLeft size={14} /> Admin
              </button>
              <Users size={20} style={{ color: '#6366f1' }} />
              <h1 className={styles.title}>Employees</h1>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <div className={styles.searchBox} style={{ maxWidth: 260 }}>
                <Search size={14} className={styles.searchIcon} />
                <input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
              >
                <Plus size={15} /> Tambah Karyawan
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Employees', value: employees.length, color: '#6366f1' },
              { label: 'Active', value: activeCount, color: '#10b981' },
              { label: 'Admins', value: adminCount, color: '#f59e0b' },
              { label: 'Organizations', value: orgCount, color: '#8b5cf6' },
              { label: 'Job Positions', value: posCount, color: '#3b82f6' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'DM Sans, sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className={styles.tabs}>
            {(['all', 'active', 'inactive', 'admin'] as const).map(f => (
              <button key={f} className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'all' && ` (${employees.length})`}
                {f === 'active' && ` (${activeCount})`}
                {f === 'admin' && ` (${adminCount})`}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(e => (
                <div key={e.username} className={styles.card} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '16px', cursor: 'pointer' }} onClick={() => setSelectedEmployee(e)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <UserAvatar src={e.avatar} name={e.full_name || e.username} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {e.full_name || e.username}
                        {e.role === 'admin' && <Shield size={13} style={{ color: '#f59e0b' }} />}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>@{e.username}</div>
                    </div>
                    <span style={{ padding: '2px 8px', background: e.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: e.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                      {e.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  {e.job_position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                      <Tag size={13} style={{ color: '#7c3aed' }} /> {e.job_position}
                    </div>
                  )}
                  {e.organization && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                      <Building2 size={13} style={{ color: '#8b5cf6' }} /> {e.organization}
                    </div>
                  )}
                  {e.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                      <Mail size={12} /> {e.email}
                    </div>
                  )}
                  {e.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                      <Phone size={12} /> {e.phone}
                    </div>
                  )}
                  {e.created_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                      <Calendar size={12} /> Joined {new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>

      {/* ── ADD EMPLOYEE MODAL ── */}
      {showAddForm && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className={styles.modal} style={{ width: 'min(580px,100%)' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>➕ Tambah Karyawan Baru</span>
              <button className={styles.modalClose} onClick={() => setShowAddForm(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              {/* Row 1 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Nama Lengkap *</label>
                  <input
                    placeholder="Contoh: Budi Santoso"
                    value={addForm.full_name}
                    onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Username *</label>
                  <input
                    placeholder="Contoh: budi"
                    value={addForm.username}
                    onChange={e => setAddForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                  />
                </div>
              </div>
              {/* Password */}
              <div className={styles.field}>
                <label>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={addForm.password}
                    onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                    style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', color: '#1F2937', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {/* Row 2 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="budi@perusahaan.com"
                    value={addForm.email}
                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>No. Telepon</label>
                  <input
                    placeholder="08xxxxxxxxxx"
                    value={addForm.phone}
                    onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              {/* Row 3 - Enhanced Organizational Assignment */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Primary Job Position</label>
                  <input
                    placeholder="Contoh: Business Development"
                    value={addForm.job_position}
                    onChange={e => setAddForm(p => ({ ...p, job_position: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Primary Organization</label>
                  <input
                    placeholder="Contoh: RAYANDRA ATAULLAH ARYAGUNA"
                    value={addForm.organization}
                    onChange={e => setAddForm(p => ({ ...p, organization: e.target.value }))}
                  />
                </div>
              </div>
              {/* Row 4 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Employee ID</label>
                  <input
                    placeholder="Contoh: EMP-001"
                    value={addForm.employee_id}
                    onChange={e => setAddForm(p => ({ ...p, employee_id: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>System Role</label>
                  <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              {/* Enhanced Multi-Role Assignment Info */}
              <div style={{ 
                background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.05))', 
                border: '1px solid rgba(99,102,241,0.15)', 
                borderRadius: 12, 
                padding: '16px', 
                marginTop: 12 
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 700, 
                  color: '#6366f1', 
                  marginBottom: 8,
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  📋 Multi-Role & Organizational Assignment
                </div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  color: '#6B7280', 
                  lineHeight: 1.5,
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  Setelah karyawan dibuat, Anda dapat:
                  <br />• <strong>Assign ke multiple organizational units</strong> dengan role berbeda
                  <br />• <strong>Set sebagai Leader/Manager</strong> di unit tertentu
                  <br />• <strong>Manage cross-functional roles</strong> (misal: di Business Development sebagai staff, di Ray Academy sebagai leader)
                  <br />• <strong>Track semua assignments</strong> untuk dokumentasi dan otomatisasi
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => { setShowAddForm(false); setAddForm({ ...EMPTY_FORM }); }}>Batal</button>
              <button
                className={styles.btnSave}
                onClick={handleAddEmployee}
                disabled={addLoading}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
              >
                {addLoading ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {addLoading ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Detail Modal with Organizational Assignments */}
      {selectedEmployee && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedEmployee(null)}>
          <div className={styles.modal} style={{ width: 'min(720px,100%)', maxHeight: '90vh', overflow: 'auto' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>👤 Employee Profile & Assignments</span>
              <button className={styles.modalClose} onClick={() => setSelectedEmployee(null)}>×</button>
            </div>
            
            {/* Employee Header */}
            <div className={styles.modalAvatarRow}>
              <UserAvatar src={selectedEmployee.avatar} name={selectedEmployee.full_name || selectedEmployee.username} size={72} />
              <div style={{ flex: 1 }}>
                <div className={styles.modalAvatarName}>{selectedEmployee.full_name || selectedEmployee.username}</div>
                <div className={styles.modalAvatarSub}>@{selectedEmployee.username} · {selectedEmployee.role}</div>
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  marginTop: 8, 
                  flexWrap: 'wrap' 
                }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    background: selectedEmployee.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', 
                    color: selectedEmployee.is_active ? '#059669' : '#dc2626', 
                    borderRadius: 6, 
                    fontSize: '0.75rem', 
                    fontWeight: 600 
                  }}>
                    {selectedEmployee.is_active ? '● Active' : '○ Inactive'}
                  </span>
                  {selectedEmployee.role === 'admin' && (
                    <span style={{ 
                      padding: '3px 8px', 
                      background: 'rgba(245,158,11,0.08)', 
                      color: '#f59e0b', 
                      borderRadius: 6, 
                      fontSize: '0.75rem', 
                      fontWeight: 600 
                    }}>
                      🛡️ Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: '#111827', 
                marginBottom: 12,
                fontFamily: 'DM Sans, sans-serif'
              }}>
                📋 Basic Information
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 12, 
                fontSize: '0.875rem', 
                fontFamily: 'DM Sans, sans-serif' 
              }}>
                <div style={{ 
                  background: '#F9FAFB', 
                  padding: '12px', 
                  borderRadius: 8, 
                  border: '1px solid rgba(226,232,240,0.5)' 
                }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Employee ID</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.employee_id || '-'}</div>
                </div>
                <div style={{ 
                  background: '#F9FAFB', 
                  padding: '12px', 
                  borderRadius: 8, 
                  border: '1px solid rgba(226,232,240,0.5)' 
                }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Email</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.email || '-'}</div>
                </div>
                <div style={{ 
                  background: '#F9FAFB', 
                  padding: '12px', 
                  borderRadius: 8, 
                  border: '1px solid rgba(226,232,240,0.5)' 
                }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Phone</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>{selectedEmployee.phone || '-'}</div>
                </div>
                <div style={{ 
                  background: '#F9FAFB', 
                  padding: '12px', 
                  borderRadius: 8, 
                  border: '1px solid rgba(226,232,240,0.5)' 
                }}>
                  <div style={{ color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Joined Date</div>
                  <div style={{ color: '#111827', fontWeight: 700 }}>
                    {selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Assignment */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: '#111827', 
                marginBottom: 12,
                fontFamily: 'DM Sans, sans-serif'
              }}>
                🏢 Primary Assignment
              </h3>
              <div style={{ 
                background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.05))', 
                border: '1px solid rgba(99,102,241,0.15)', 
                borderRadius: 12, 
                padding: '16px' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>Job Position</div>
                    <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.9375rem' }}>{selectedEmployee.job_position || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>Organization</div>
                    <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.9375rem' }}>{selectedEmployee.organization || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizational Unit Assignments */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 12 
              }}>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  color: '#111827', 
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  🎯 Organizational Unit Assignments
                </h3>
                <button
                  onClick={() => {
                    // Navigate to admin panel with this user selected for role management
                    router.push(`/admin?tab=organization&user=${selectedEmployee.username}`);
                    setSelectedEmployee(null);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    padding: '6px 12px', 
                    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontWeight: 600, 
                    fontSize: '0.8125rem', 
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  <Plus size={12} />
                  Manage Assignments
                </button>
              </div>
              
              {/* Placeholder for organizational assignments */}
              <div style={{ 
                background: '#F9FAFB', 
                border: '2px dashed rgba(226,232,240,0.7)', 
                borderRadius: 12, 
                padding: '24px', 
                textAlign: 'center' 
              }}>
                <div style={{ 
                  fontSize: '2rem', 
                  marginBottom: 8 
                }}>
                  🏗️
                </div>
                <div style={{ 
                  fontSize: '0.9375rem', 
                  fontWeight: 700, 
                  color: '#111827', 
                  marginBottom: 4,
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  Multi-Role Assignment System
                </div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  color: '#6B7280', 
                  lineHeight: 1.5,
                  fontFamily: 'DM Sans, sans-serif'
                }}>
                  Klik "Manage Assignments" untuk:
                  <br />• Assign ke multiple organizational units
                  <br />• Set role berbeda per unit (Staff, Leader, Manager)
                  <br />• Track cross-functional responsibilities
                  <br />• Manage leadership positions
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setSelectedEmployee(null)}>
                Close
              </button>
              <button 
                className={styles.btnSave} 
                onClick={() => { 
                  router.push(`/admin?tab=users&edit=${selectedEmployee.username}`); 
                  setSelectedEmployee(null); 
                }}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
              >
                <Tag size={14} />
                Edit Profile
              </button>
              <button 
                className={styles.btnSave} 
                onClick={() => { 
                  router.push(`/admin?tab=organization&user=${selectedEmployee.username}`); 
                  setSelectedEmployee(null); 
                }}
              >
                <Building2 size={14} />
                Manage Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileHeader title="Employees" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
