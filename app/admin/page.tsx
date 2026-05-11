'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Bot, Camera, Save, X, Search, Shield, Edit2, Loader2, Plus, RefreshCw, Tag, Trash2, Power, Briefcase } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import OrganizationalChart from '@/components/OrganizationalChart';
import { useApp } from '@/lib/AppContext';
import SearchableSelect from '@/components/SearchableSelect';
import { getAvatarUrl } from '@/lib/utils';
import styles from './admin.module.css';

type Tab = 'users' | 'agents' | 'roles' | 'organization';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function AvatarDisplay({ src, name, size = 48, isAI = false }: { src?: string | null; name: string; size?: number; isAI?: boolean }) {
  const [err, setErr] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  if (url && !err) {
    return <img src={url} alt={name} width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }} onError={() => setErr(true)} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: isAI ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.3 }}>
      {isAI ? <Bot size={size * 0.4} /> : getInitials(name)}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();
  const [tab, setTab] = useState<Tab>('users');
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{ type: 'user' | 'agent'; id: string } | null>(null);

  // Roles state
  const [positions, setPositions] = useState<string[]>([]);
  const [roleCounts, setRoleCounts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedAgentForRole, setSelectedAgentForRole] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // User organizational assignments modal
  const [showUserOrgModal, setShowUserOrgModal] = useState(false);
  const [userOrgTarget, setUserOrgTarget] = useState<any>(null);
  const [userOrgAssignments, setUserOrgAssignments] = useState<any[]>([]);
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [addingOrgUnit, setAddingOrgUnit] = useState('');
  const [addingOrgRole, setAddingOrgRole] = useState('staff');
  const [addingIsPrimary, setAddingIsPrimary] = useState(false);
  const [userOrgLoading, setUserOrgLoading] = useState(false);
  const [orgUnitSearch, setOrgUnitSearch] = useState(''); // NEW: Search state

  // Agent roles modal
  const [showAgentRolesModal, setShowAgentRolesModal] = useState(false);
  const [agentRolesTarget, setAgentRolesTarget] = useState<any>(null);
  const [agentRoleAssignments, setAgentRoleAssignments] = useState<string[]>([]);
  const [addingAgentRole, setAddingAgentRole] = useState('');

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    
    // Handle URL parameters for direct navigation
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const userParam = urlParams.get('user');
    
    if (tabParam && ['users', 'agents', 'roles', 'organization'].includes(tabParam)) {
      setTab(tabParam as Tab);
      setActiveTab(tabParam as Tab);
    }
    
    // If user parameter is provided, we'll handle it in the organization tab
    if (userParam && tabParam === 'organization') {
      // This will be handled by the OrganizationalChart component
      console.log('Direct navigation to manage assignments for user:', userParam);
    }
    
    loadData();
    loadRolesData();
    loadOrgUnits();
    // Auto-sync primary info on admin page load (silent)
    fetch('/api/admin/sync-primary-info', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.success && d.results?.length > 0) loadData(); })
      .catch(() => {});
  }, [authChecked, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, aRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/agents')]);
      const uData = await uRes.json();
      const aData = await aRes.json();
      if (uData.success) setUsers(uData.users);
      if (aData.success) setAgents(aData.agents);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  const loadOrgUnits = async () => {
    try {
      const res = await fetch('/api/organization/tree');
      const data = await res.json();
      if (data.success && data.flatList) {
        setOrgUnits(data.flatList);
      }
    } catch (error) {
      console.error('Failed to load org units:', error);
    }
  };

  const loadRolesData = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
        setAssignments(data.assignments || []);
        setRoleCounts(data.roleCounts || []);
      }
    } catch { showToast('Failed to load roles', 'error'); }
    finally { setRolesLoading(false); }
  };

  const syncJobPositions = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/user-roles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync_job_positions' }) });
      const data = await res.json();
      if (data.success) { showToast(`✅ ${data.message}`, 'success'); loadRolesData(); }
      else showToast(data.error || 'Sync failed', 'error');
    } catch { showToast('Error syncing', 'error'); }
    finally { setSyncing(false); }
  };

  const assignAgentToRole = async () => {
    if (!selectedPosition || !selectedAgentForRole) { showToast('Pilih role dan agent', 'error'); return; }
    try {
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: selectedAgentForRole, role_name: selectedPosition }) });
      const data = await res.json();
      if (data.success) { showToast('Agent berhasil di-assign ke role!', 'success'); setSelectedAgentForRole(''); loadRolesData(); }
      else showToast(data.error || 'Failed', 'error');
    } catch { showToast('Error assigning agent', 'error'); }
  };

  const removeAgentFromRole = async (agentId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/admin/roles?agent_id=${encodeURIComponent(agentId)}&role_name=${encodeURIComponent(roleName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Agent removed from role', 'success'); loadRolesData(); }
    } catch { showToast('Error removing', 'error'); }
  };

  // ── User organizational assignments ──
  const openUserOrgModal = async (u: any) => {
    setUserOrgTarget(u); 
    setUserOrgLoading(true); 
    setShowUserOrgModal(true);
    
    try {
      // Get all organizational assignments for this user
      const res = await fetch(`/api/admin/user-org-assignments?username=${u.username}`);
      const data = await res.json();
      if (data.success) {
        setUserOrgAssignments(data.assignments || []);
        
        // Auto-sync primary info if user has primary assignment but job_position/organization is missing
        const hasPrimary = data.assignments?.some((a: any) => a.is_primary);
        const needsSync = hasPrimary && (!u.job_position || u.organization === 'Unknown Company' || !u.organization);
        if (needsSync) {
          // Trigger sync silently
          fetch('/api/admin/sync-primary-info', { method: 'POST' })
            .then(r => r.json())
            .then(d => { if (d.success) loadData(); })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error('Failed to load org assignments:', error);
    }
    
    setUserOrgLoading(false);
  };

  const addOrgAssignmentToUser = async () => {
    if (!addingOrgUnit || !userOrgTarget) return;
    
    try {
      const res = await fetch('/api/admin/team-members', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          org_unit_id: addingOrgUnit, 
          username: userOrgTarget.username,
          role: addingOrgRole,
          is_primary: addingIsPrimary
        }) 
      });
      const data = await res.json();
      
      if (data.success) {
        showToast('Assignment added!', 'success'); 
        setAddingOrgUnit('');
        setAddingOrgRole('staff');
        setAddingIsPrimary(false);
        // Reload assignments and user data if primary was set
        openUserOrgModal(userOrgTarget);
        if (addingIsPrimary) {
          loadData();
        }
      } else {
        showToast(data.error || 'Failed to add assignment', 'error');
      }
    } catch { 
      showToast('Error adding assignment', 'error'); 
    }
  };

  const removeOrgAssignmentFromUser = async (orgUnitId: number) => {
    if (!userOrgTarget) return;
    
    try {
      const res = await fetch(
        `/api/admin/team-members?org_unit_id=${orgUnitId}&username=${encodeURIComponent(userOrgTarget.username)}`, 
        { method: 'DELETE' }
      );
      const data = await res.json();
      
      if (data.success) { 
        showToast('Assignment removed', 'success'); 
        setUserOrgAssignments(prev => prev.filter(a => a.org_unit_id !== orgUnitId)); 
      } else {
        showToast(data.error || 'Failed to remove', 'error');
      }
    } catch { 
      showToast('Error removing assignment', 'error'); 
    }
  };

  const updateOrgAssignmentRole = async (orgUnitId: number, newRole: string, isPrimary: boolean = false) => {
    if (!userOrgTarget) return;
    
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_unit_id: orgUnitId,
          username: userOrgTarget.username,
          role: newRole,
          is_primary: isPrimary
        })
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(`${isPrimary ? 'Primary assignment updated!' : `Role updated to ${newRole}!`}`, 'success');
        // Update local state
        setUserOrgAssignments(prev => prev.map(a => 
          a.org_unit_id === orgUnitId ? { ...a, role: newRole, is_primary: isPrimary } : 
          isPrimary ? { ...a, is_primary: false } : a // Remove primary from others if this is set as primary
        ));
        
        // If this is set as primary, reload user data to update job_position and organization
        if (isPrimary) {
          loadData();
        }
      } else {
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Error updating assignment', 'error');
    }
  };

  // ── User roles (for AI agent delivery) ──
  const openUserRolesModal = async (u: any) => {
    // This is now redirected to organizational assignments
    openUserOrgModal(u);
  };

  // ── Agent roles modal ──
  const openAgentRolesModal = (a: any) => {
    setAgentRolesTarget(a);
    const currentRoles = assignments.filter(x => x.agent_id === a.agent_id).map(x => x.role_name);
    setAgentRoleAssignments(currentRoles);
    setAddingAgentRole('');
    setShowAgentRolesModal(true);
  };

  const addRoleToAgent = async () => {
    if (!addingAgentRole || !agentRolesTarget) return;
    try {
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: agentRolesTarget.agent_id, role_name: addingAgentRole }) });
      const data = await res.json();
      if (data.success) {
        showToast('Role assigned!', 'success');
        setAgentRoleAssignments(prev => [...prev, addingAgentRole]);
        setAddingAgentRole('');
        loadRolesData();
      } else showToast(data.error || 'Failed', 'error');
    } catch { showToast('Error', 'error'); }
  };

  const removeRoleFromAgent = async (roleName: string) => {
    if (!agentRolesTarget) return;
    try {
      const res = await fetch(`/api/admin/roles?agent_id=${encodeURIComponent(agentRolesTarget.agent_id)}&role_name=${encodeURIComponent(roleName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Role removed', 'success');
        setAgentRoleAssignments(prev => prev.filter(r => r !== roleName));
        loadRolesData();
      }
    } catch { showToast('Error', 'error'); }
  };

  // ── Avatar upload ──
  const handleAvatarUpload = async (file: File, type: 'user' | 'agent', id: string) => {
    setUploadingFor(id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (type === 'user') fd.append('targetUsername', id); else fd.append('agentId', id);
      const res = await fetch('/api/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        showToast('Avatar updated!', 'success');
        if (type === 'user') { setUsers(prev => prev.map(u => u.username === id ? { ...u, avatar: data.avatarPath } : u)); if (editItem?.username === id) setEditItem((p: any) => ({ ...p, avatar: data.avatarPath })); }
        else { setAgents(prev => prev.map(a => a.agent_id === id ? { ...a, avatar: data.avatarPath } : a)); if (editItem?.agent_id === id) setEditItem((p: any) => ({ ...p, avatar: data.avatarPath })); }
      } else showToast(data.error || 'Upload failed', 'error');
    } catch { showToast('Upload error', 'error'); }
    finally { setUploadingFor(null); }
  };

  const triggerUpload = (type: 'user' | 'agent', id: string) => { setPendingUploadTarget({ type, id }); fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadTarget) return;
    handleAvatarUpload(file, pendingUploadTarget.type, pendingUploadTarget.id);
    e.target.value = '';
  };

  // ── Save user ──
  const saveUser = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
      const data = await res.json();
      if (data.success) { showToast('User updated!', 'success'); setUsers(prev => prev.map(u => u.username === editItem.username ? { ...u, ...editItem } : u)); setEditItem(null); }
      else showToast(data.error || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  // ── Save agent ──
  const saveAgent = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) });
      const data = await res.json();
      if (data.success) { showToast('Agent updated!', 'success'); setAgents(prev => prev.map(a => a.agent_id === editItem.agent_id ? { ...a, ...editItem } : a)); setEditItem(null); }
      else showToast(data.error || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  // ── Toggle agent active ──
  const toggleAgentActive = async (a: any) => {
    try {
      const res = await fetch('/api/admin/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: a.agent_id, is_active: a.is_active ? 0 : 1 }) });
      const data = await res.json();
      if (data.success) { showToast(a.is_active ? 'Agent dinonaktifkan' : 'Agent diaktifkan', 'success'); setAgents(prev => prev.map(x => x.agent_id === a.agent_id ? { ...x, is_active: a.is_active ? 0 : 1 } : x)); }
    } catch { showToast('Error', 'error'); }
  };

  // ── Delete agent ──
  const deleteAgent = async (a: any) => {
    if (!confirm(`Hapus agent "${a.name}"? Semua data terkait akan dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/agents?agent_id=${encodeURIComponent(a.agent_id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Agent dihapus', 'success'); setAgents(prev => prev.filter(x => x.agent_id !== a.agent_id)); }
      else showToast(data.error || 'Gagal menghapus', 'error');
    } catch { showToast('Error', 'error'); }
  };

  const filteredUsers = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()));
  const filteredAgents = agents.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.role?.toLowerCase().includes(search.toLowerCase()));

  if (!authChecked) return <PageLoader />;

  // ── Agent card component (inline) ──
  const AgentCard = ({ a }: { a: any }) => {
    const workerRoles = assignments.filter(x => x.agent_id === a.agent_id).map(x => x.role_name);
    return (
      <div style={{ background: 'white', border: `1px solid ${a.is_personal ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`, borderLeft: `4px solid ${a.is_personal ? '#8b5cf6' : '#3b82f6'}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: a.is_active ? 1 : 0.65, transition: 'all 180ms' }}>
        {/* Top */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AvatarDisplay src={a.avatar} name={a.name} size={52} isAI />
            <button onClick={() => triggerUpload('agent', a.agent_id)} disabled={uploadingFor === a.agent_id} style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#10b981', border: '2px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }} title="Ganti avatar">
              {uploadingFor === a.agent_id ? <Loader2 size={10} className={styles.spin} /> : <Camera size={10} />}
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {a.name}
              {a.is_personal
                ? <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', borderRadius: 4, fontWeight: 700 }}>Personal</span>
                : <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 4, fontWeight: 700 }}>Worker</span>
              }
              <span style={{ marginLeft: 'auto', padding: '2px 8px', background: a.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: a.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>
                {a.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>{a.role || 'AI Assistant'} · {a.model}</div>
            {a.is_personal && a.owner_full_name && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: 1 }}>Owner: {a.owner_full_name}</div>}
          </div>
        </div>

        {/* Description */}
        {a.description && <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.description}</div>}

        {/* System prompt preview */}
        {a.system_prompt && (
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace', background: '#F9FAFB', borderRadius: 6, padding: '6px 8px', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {a.system_prompt}
          </div>
        )}

        {/* Role tags (for worker agents) */}
        {!a.is_personal && workerRoles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {workerRoles.map(r => (
              <span key={r} style={{ fontSize: '0.7rem', padding: '2px 7px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderRadius: 4, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setEditItem({ ...a })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, background: 'white', color: '#374151', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={() => toggleAgentActive(a)} title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', border: `1px solid ${a.is_active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, background: a.is_active ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', color: a.is_active ? '#d97706' : '#059669', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <Power size={13} /> {a.is_active ? 'Deactivate' : 'Activate'}
          </button>
          {!a.is_personal && (
            <button onClick={() => openAgentRolesModal(a)} title="Assign Roles" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, background: 'rgba(124,58,237,0.05)', color: '#7c3aed', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <Tag size={13} /> Roles
            </button>
          )}
          <button onClick={() => deleteAgent(a)} title="Hapus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, background: 'rgba(239,68,68,0.05)', color: '#dc2626', cursor: 'pointer' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <AppShell activeTab="" user={user} onLogout={handleLogout} pageTitle="Admin" onNewTask={() => {}} onNewProject={() => {}}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Shield size={20} className={styles.headerIcon} />
              <h1 className={styles.title}>Admin Panel</h1>
            </div>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
            </div>
          </div>

          {/* Tabs + action button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 0 }}>
            <div className={styles.tabs} style={{ marginBottom: 0, flex: 1 }}>
              <button className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`} onClick={() => { setTab('users'); setActiveTab('users'); }}><Users size={15} /> Users ({users.length})</button>
              <button className={`${styles.tab} ${tab === 'agents' ? styles.tabActive : ''}`} onClick={() => { setTab('agents'); setActiveTab('agents'); }}><Bot size={15} /> AI Agents ({agents.filter(a => !a.is_personal).length}W · {agents.filter(a => a.is_personal).length}P)</button>
              <button className={`${styles.tab} ${tab === 'roles' ? styles.tabActive : ''}`} onClick={() => { setTab('roles'); setActiveTab('roles'); loadRolesData(); }}><Tag size={15} /> Roles & Delivery ({positions.length})</button>
              <button className={`${styles.tab} ${tab === 'organization' ? styles.tabActive : ''}`} onClick={() => { setTab('organization'); setActiveTab('organization'); }}><Briefcase size={15} /> Organization</button>
            </div>
            {tab === 'users' && (
              <button onClick={() => router.push('/admin/employees')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(99,102,241,0.3)', marginBottom: 1 }}>
                <Plus size={14} /> Tambah Karyawan
              </button>
            )}
            {tab === 'agents' && (
              <button onClick={() => router.push('/admin/agents')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(16,185,129,0.3)', marginBottom: 1 }}>
                <Plus size={14} /> Buat Agent Baru
              </button>
            )}
          </div>

          {/* ── CONTENT ── */}
          {loading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spin} /></div>
          ) : tab === 'roles' ? (
            /* ── ROLES TAB ── */
            <div>
              <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(16,185,129,0.06))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>Sync Job Positions → Roles</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: 2 }}>Otomatis sync job_position setiap karyawan ke tabel user_roles agar AI agents bisa di-deliver</div>
                </div>
                <button onClick={syncJobPositions} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1 }}>
                  {syncing ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
                  {syncing ? 'Syncing...' : 'Sync Sekarang'}
                </button>
              </div>
              <div style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>🤖 Assign AI Agent ke Job Position</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 16 }}>Pilih job position dan AI agent. Semua karyawan dengan job position tersebut akan otomatis mendapat akses ke agent itu di Chat.</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>Job Position / Role</label>
                    <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                      <option value="">-- Pilih Job Position --</option>
                      {positions.map(p => { const count = roleCounts.find((r: any) => r.job_position === p)?.user_count || 0; return <option key={p} value={p}>{p} ({count} karyawan)</option>; })}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>AI Agent</label>
                    <select value={selectedAgentForRole} onChange={e => setSelectedAgentForRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                      <option value="">-- Pilih AI Agent --</option>
                      {agents.filter(a => !a.is_personal && a.is_active).map(a => <option key={a.agent_id} value={a.agent_id}>{a.name} ({a.role})</option>)}
                    </select>
                  </div>
                  <button onClick={assignAgentToRole} disabled={!selectedPosition || !selectedAgentForRole} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: (!selectedPosition || !selectedAgentForRole) ? 'not-allowed' : 'pointer', opacity: (!selectedPosition || !selectedAgentForRole) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    <Plus size={14} /> Assign Agent
                  </button>
                </div>
              </div>
              {rolesLoading ? <div className={styles.loading}><Loader2 size={20} className={styles.spin} /></div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {positions.map(pos => {
                    const posAgents = assignments.filter((a: any) => a.role_name === pos);
                    const count = roleCounts.find((r: any) => r.job_position === pos)?.user_count || 0;
                    return (
                      <div key={pos} style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: posAgents.length > 0 ? 12 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{pos}</div>
                            <span style={{ padding: '2px 8px', background: 'rgba(16,185,129,0.08)', color: '#059669', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{count} karyawan</span>
                          </div>
                          {posAgents.length === 0 && <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>Belum ada agent</span>}
                        </div>
                        {posAgents.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {posAgents.map((a: any) => (
                              <div key={a.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                                <AvatarDisplay src={a.avatar} name={a.agent_name} size={28} isAI />
                                <div>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>{a.agent_name}</div>
                                  <div style={{ fontSize: '0.6875rem', color: '#7c3aed', fontFamily: 'DM Sans, sans-serif' }}>{a.agent_role}</div>
                                </div>
                                <button onClick={() => removeAgentFromRole(a.agent_id, pos)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 4 }} title="Remove"><X size={11} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : tab === 'users' ? (
            /* ── USERS TAB ── */
            <div>
              {/* Sync Primary Info Banner */}
              <div style={{ 
                background: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(59,130,246,0.06))', 
                border: '1px solid rgba(16,185,129,0.2)', 
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                    🔄 Sync Job Position & Organization
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2, fontFamily: 'DM Sans, sans-serif' }}>
                    Auto-fill Job Position & Organization dari primary organizational assignment
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      const res = await fetch('/api/admin/sync-primary-info', { method: 'POST' });
                      const data = await res.json();
                      if (data.success) { showToast(`✅ ${data.message}`, 'success'); loadData(); }
                      else showToast(data.error || 'Sync failed', 'error');
                    } catch { showToast('Error syncing', 'error'); }
                    finally { setSyncing(false); }
                  }}
                  disabled={syncing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.7 : 1, whiteSpace: 'nowrap' }}
                >
                  {syncing ? <Loader2 size={13} className={styles.spin} /> : <RefreshCw size={13} />}
                  {syncing ? 'Syncing...' : 'Sync Sekarang'}
                </button>
              </div>
              <div className={styles.grid}>
                {filteredUsers.map(u => (
                <div key={u.username} className={styles.card}>
                  <div className={styles.cardAvatar}>
                    <AvatarDisplay src={u.avatar} name={u.full_name || u.username} size={56} />
                    <button className={styles.avatarEditBtn} onClick={() => triggerUpload('user', u.username)} disabled={uploadingFor === u.username} title="Change avatar">
                      {uploadingFor === u.username ? <Loader2 size={12} className={styles.spin} /> : <Camera size={12} />}
                    </button>
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName}>{u.full_name || u.username}</div>
                    <div className={styles.cardSub}>@{u.username} · {u.job_position || u.role}</div>
                    <div className={styles.cardSub2}>{u.organization || u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.editBtn} onClick={() => openUserOrgModal(u)} title="Manage Organizational Assignments" style={{ color: '#7c3aed', borderColor: 'rgba(124,58,237,0.3)' }}><Briefcase size={14} /></button>
                    <button className={styles.editBtn} onClick={() => setEditItem({ ...u })}><Edit2 size={14} /></button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : tab === 'organization' ? (
            /* ── ORGANIZATION TAB ── */
            <div>
              <OrganizationalChart showToast={showToast} />
            </div>
          ) : (
            /* ── AGENTS TAB — Worker + Personal sections ── */
            <div>
              {/* Worker AI */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={15} color="white" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>🤖 Worker AI</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>Di-assign ke job position · muncul di chat semua karyawan dengan role tersebut</div>
                  </div>
                  <span style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{filteredAgents.filter(a => !a.is_personal).length} agents</span>
                </div>
                {filteredAgents.filter(a => !a.is_personal).length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.04)', border: '1px dashed rgba(59,130,246,0.25)', borderRadius: 12, textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>Belum ada Worker AI</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                    {filteredAgents.filter(a => !a.is_personal).map(a => <AgentCard key={a.agent_id} a={a} />)}
                  </div>
                )}
              </div>

              {/* Personal AI */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={15} color="white" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>👤 Personal AI</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>AI assistant pribadi · hanya muncul untuk owner-nya saja</div>
                  </div>
                  <span style={{ padding: '3px 10px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{filteredAgents.filter(a => a.is_personal).length} agents</span>
                </div>
                {filteredAgents.filter(a => a.is_personal).length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(139,92,246,0.04)', border: '1px dashed rgba(139,92,246,0.25)', borderRadius: 12, textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>Belum ada Personal AI</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                    {filteredAgents.filter(a => a.is_personal).map(a => <AgentCard key={a.agent_id} a={a} />)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── EDIT MODAL (User or Agent) ── */}
      {editItem && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setEditItem(null)}>
          <div className={styles.modal} style={{ width: 'min(620px,100%)', maxHeight: '90vh' }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editItem.username ? `✏️ Edit User: ${editItem.full_name || editItem.username}` : `✏️ Edit Agent: ${editItem.name}`}</span>
              <button className={styles.modalClose} onClick={() => setEditItem(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalAvatarRow}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <AvatarDisplay src={editItem.avatar} name={editItem.full_name || editItem.name || editItem.username} size={72} isAI={!!editItem.agent_id} />
                <button className={styles.avatarEditBtnLg} onClick={() => triggerUpload(editItem.agent_id ? 'agent' : 'user', editItem.agent_id || editItem.username)} disabled={!!uploadingFor}>
                  {uploadingFor ? <Loader2 size={14} className={styles.spin} /> : <Camera size={14} />}
                </button>
              </div>
              <div>
                <div className={styles.modalAvatarName}>{editItem.full_name || editItem.name}</div>
                <div className={styles.modalAvatarSub}>{editItem.username ? `@${editItem.username}` : (editItem.is_personal ? '👤 Personal AI' : '🤖 Worker AI')}</div>
              </div>
            </div>
            <div className={styles.modalFields}>
              {editItem.username ? (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Full Name</label><input value={editItem.full_name || ''} onChange={e => setEditItem((p: any) => ({ ...p, full_name: e.target.value }))} /></div>
                    <div className={styles.field}><label>Email</label><input value={editItem.email || ''} onChange={e => setEditItem((p: any) => ({ ...p, email: e.target.value }))} /></div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label>Job Position</label>
                      <input 
                        value={editItem.job_position || ''} 
                        readOnly 
                        disabled
                        style={{ 
                          background: '#F3F4F6', 
                          cursor: 'not-allowed',
                          color: '#6B7280'
                        }}
                        title="Auto-filled from Primary Organizational Assignment"
                      />
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>
                        🔒 Auto-filled from Primary Assignment
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label>Organization</label>
                      <input 
                        value={editItem.organization || ''} 
                        readOnly 
                        disabled
                        style={{ 
                          background: '#F3F4F6', 
                          cursor: 'not-allowed',
                          color: '#6B7280'
                        }}
                        title="Auto-filled from Company Level"
                      />
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>
                        🔒 Auto-filled from Company Level
                      </div>
                    </div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Phone</label><input value={editItem.phone || ''} onChange={e => setEditItem((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                    <div className={styles.field}><label>Employee ID</label><input value={editItem.employee_id || ''} onChange={e => setEditItem((p: any) => ({ ...p, employee_id: e.target.value }))} /></div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Role Sistem</label><select value={editItem.role || 'user'} onChange={e => setEditItem((p: any) => ({ ...p, role: e.target.value }))}><option value="user">User</option><option value="admin">Admin</option></select></div>
                    <div className={styles.field}><label>Status</label><select value={editItem.is_active ? '1' : '0'} onChange={e => setEditItem((p: any) => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}><option value="1">Active</option><option value="0">Inactive</option></select></div>
                  </div>
                  <div className={styles.field}><label>Password Baru (kosongkan jika tidak diubah)</label><input type="password" placeholder="••••••••" value={editItem.password || ''} onChange={e => setEditItem((p: any) => ({ ...p, password: e.target.value }))} /></div>
                </>
              ) : (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Nama Agent *</label><input value={editItem.name || ''} onChange={e => setEditItem((p: any) => ({ ...p, name: e.target.value }))} /></div>
                    <div className={styles.field}><label>Role / Spesialisasi</label><input value={editItem.role || ''} onChange={e => setEditItem((p: any) => ({ ...p, role: e.target.value }))} /></div>
                  </div>
                  <div className={styles.field}><label>Deskripsi</label><textarea value={editItem.description || ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></div>
                  <div className={styles.field}><label>System Prompt *</label><textarea value={editItem.system_prompt || ''} onChange={e => setEditItem((p: any) => ({ ...p, system_prompt: e.target.value }))} rows={5} style={{ resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: '0.8125rem' }} /></div>
                  <div className={styles.field}><label>Knowledge Base</label><textarea value={editItem.knowledge_base || ''} onChange={e => setEditItem((p: any) => ({ ...p, knowledge_base: e.target.value }))} rows={3} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem' }} /></div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}><label>Model AI</label><select value={editItem.model || 'gemini-2.5-flash'} onChange={e => setEditItem((p: any) => ({ ...p, model: e.target.value }))}><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option><option value="gpt-4o">GPT-4o</option><option value="gpt-4o-mini">GPT-4o Mini</option></select></div>
                    <div className={styles.field}><label>Status</label><select value={editItem.is_active ? '1' : '0'} onChange={e => setEditItem((p: any) => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}><option value="1">Active</option><option value="0">Inactive</option></select></div>
                  </div>
                  <div className={styles.field}><label>Tipe Agent</label><select value={editItem.is_personal ? 'personal' : 'worker'} onChange={e => setEditItem((p: any) => ({ ...p, is_personal: e.target.value === 'personal' ? 1 : 0 }))}><option value="worker">🤖 Worker AI</option><option value="personal">👤 Personal AI</option></select></div>
                </>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditItem(null)}>Batal</button>
              <button className={styles.btnSave} onClick={editItem.username ? saveUser : saveAgent} disabled={saving}>
                {saving ? <Loader2 size={14} className={styles.spin} /> : <Save size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENT ROLES MODAL ── */}
      {showAgentRolesModal && agentRolesTarget && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAgentRolesModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>🎯 Assign Roles: {agentRolesTarget.name}</span>
              <button className={styles.modalClose} onClick={() => setShowAgentRolesModal(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                Assign agent ini ke job position. Semua karyawan dengan job position tersebut akan otomatis mendapat akses ke agent ini di Chat.
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>Role yang sudah di-assign:</div>
                {agentRoleAssignments.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>Belum ada role</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {agentRoleAssignments.map(r => (
                      <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#7c3aed', fontFamily: 'DM Sans, sans-serif' }}>{r}</span>
                        <button onClick={() => removeRoleFromAgent(r)} style={{ width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>Tambah ke Job Position:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={addingAgentRole} onChange={e => setAddingAgentRole(e.target.value)} style={{ flex: 1, padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}>
                    <option value="">-- Pilih Job Position --</option>
                    {positions.filter(p => !agentRoleAssignments.includes(p)).map(p => {
                      const count = roleCounts.find((r: any) => r.job_position === p)?.user_count || 0;
                      return <option key={p} value={p}>{p} ({count} karyawan)</option>;
                    })}
                  </select>
                  <button onClick={addRoleToAgent} disabled={!addingAgentRole} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', cursor: !addingAgentRole ? 'not-allowed' : 'pointer', opacity: !addingAgentRole ? 0.5 : 1 }}>
                    <Plus size={14} /> Assign
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowAgentRolesModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER ORGANIZATIONAL ASSIGNMENTS MODAL ── */}
      {showUserOrgModal && userOrgTarget && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowUserOrgModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 720 }}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>🏢 Organizational Assignments: {userOrgTarget.full_name || userOrgTarget.username}</span>
              <button className={styles.modalClose} onClick={() => setShowUserOrgModal(false)}><X size={16} /></button>
            </div>
            <div className={styles.modalFields}>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 4, fontFamily: 'DM Sans, sans-serif' }}>
                Primary Job Position: <strong style={{ color: '#111827' }}>{userOrgTarget.job_position || '-'}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: 16, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                Karyawan bisa di-assign ke multiple organizational units dengan role berbeda. Setiap assignment akan menampilkan team members dari unit tersebut.
              </div>
              
              {/* Current Assignments */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                  Current Assignments ({userOrgAssignments.length})
                </div>
                {userOrgLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <Loader2 size={24} className={styles.spin} style={{ color: '#7c3aed' }} />
                  </div>
                ) : userOrgAssignments.length === 0 ? (
                  <div style={{ 
                    padding: 16, 
                    background: 'rgba(226,232,240,0.3)', 
                    border: '2px dashed rgba(226,232,240,0.7)', 
                    borderRadius: 10, 
                    textAlign: 'center', 
                    color: '#9CA3AF', 
                    fontSize: '0.875rem',
                    fontFamily: 'DM Sans, sans-serif'
                  }}>
                    Belum ada organizational assignment
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflow: 'auto' }}>
                    {userOrgAssignments.map((assignment: any) => (
                      <div 
                        key={assignment.id} 
                        style={{ 
                          background: `linear-gradient(135deg, ${assignment.color}08, ${assignment.color}15)`,
                          border: `1.5px solid ${assignment.color}30`,
                          borderRadius: 12,
                          padding: '14px 16px'
                        }}
                      >
                        {/* Unit Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `linear-gradient(135deg, ${assignment.color}, ${assignment.color}cc)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {assignment.unit_code.substring(0, 2)}
                            </div>
                            <div>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 8,
                                fontWeight: 700, 
                                fontSize: '0.9375rem', 
                                color: '#111827', 
                                fontFamily: 'DM Sans, sans-serif' 
                              }}>
                                {assignment.unit_name}
                                {assignment.is_primary && (
                                  <span style={{
                                    padding: '2px 6px',
                                    background: 'linear-gradient(135deg,#10b981,#059669)',
                                    color: 'white',
                                    borderRadius: 4,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                  }}>
                                    ⭐ PRIMARY
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                                {assignment.unit_type} · Level {assignment.level}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeOrgAssignmentFromUser(assignment.org_unit_id)}
                            style={{ 
                              padding: '4px 10px', 
                              background: 'rgba(239,68,68,0.08)', 
                              border: '1px solid rgba(239,68,68,0.25)', 
                              borderRadius: 6, 
                              color: '#dc2626', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              cursor: 'pointer',
                              fontFamily: 'DM Sans, sans-serif'
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        {/* Role and Primary Selection */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: '#374151', 
                              marginBottom: 4,
                              fontFamily: 'DM Sans, sans-serif'
                            }}>
                              Role in this unit:
                            </label>
                            <select
                              value={assignment.role || 'staff'}
                              onChange={(e) => updateOrgAssignmentRole(assignment.org_unit_id, e.target.value, assignment.is_primary)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1px solid rgba(226,232,240,0.7)',
                                borderRadius: 8,
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                background: 'white',
                                color: '#374151',
                                cursor: 'pointer',
                                fontFamily: 'DM Sans, sans-serif'
                              }}
                            >
                              <option value="staff">👤 Staff</option>
                              <option value="support">🔧 Support</option>
                              <option value="leader">👑 Leader</option>
                              <option value="manager">🎯 Manager</option>
                              <option value="owner">🏆 Owner</option>
                              <option value="direktur">💼 Direktur</option>
                            </select>
                          </div>
                          <div style={{ minWidth: 100 }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: '#374151', 
                              marginBottom: 4,
                              fontFamily: 'DM Sans, sans-serif'
                            }}>
                              Primary:
                            </label>
                            <button
                              onClick={() => updateOrgAssignmentRole(assignment.org_unit_id, assignment.role, !assignment.is_primary)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: assignment.is_primary ? '2px solid #10b981' : '1px solid rgba(226,232,240,0.7)',
                                borderRadius: 8,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: assignment.is_primary ? 'rgba(16,185,129,0.1)' : 'white',
                                color: assignment.is_primary ? '#059669' : '#6B7280',
                                cursor: 'pointer',
                                fontFamily: 'DM Sans, sans-serif',
                                textTransform: 'uppercase'
                              }}
                            >
                              {assignment.is_primary ? '⭐ YES' : '○ NO'}
                            </button>
                          </div>
                        </div>

                        {/* Team Members Preview */}
                        {assignment.team_members && assignment.team_members.length > 0 && (
                          <div style={{ 
                            paddingTop: 10, 
                            borderTop: `1px solid ${assignment.color}20` 
                          }}>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: '#6B7280', 
                              marginBottom: 6,
                              fontFamily: 'DM Sans, sans-serif'
                            }}>
                              Team Members ({assignment.team_count}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {assignment.team_members.slice(0, 5).map((member: any) => {
                                const isSupport = member.team_role === 'support';
                                const isLeader = member.team_role === 'leader' || member.team_role === 'manager' || member.team_role === 'owner' || member.team_role === 'direktur';
                                
                                return (
                                  <div 
                                    key={member.username}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '3px 8px',
                                      background: isSupport ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.7)',
                                      border: isSupport ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(226,232,240,0.5)',
                                      borderRadius: 6,
                                      fontSize: '0.7rem',
                                      color: isSupport ? '#3b82f6' : '#374151',
                                      fontFamily: 'DM Sans, sans-serif',
                                      fontWeight: isSupport ? 600 : 400
                                    }}
                                    title={`${member.full_name} - ${member.team_role}`}
                                  >
                                    {isLeader ? '👑' : isSupport ? '🔧' : '👤'}
                                    {member.full_name.split(' ')[0]}
                                  </div>
                                );
                              })}
                              {assignment.team_count > 5 && (
                                <div style={{
                                  padding: '3px 8px',
                                  background: 'rgba(124,58,237,0.1)',
                                  border: '1px solid rgba(124,58,237,0.2)',
                                  borderRadius: 6,
                                  fontSize: '0.7rem',
                                  color: '#7c3aed',
                                  fontWeight: 600,
                                  fontFamily: 'DM Sans, sans-serif'
                                }}>
                                  +{assignment.team_count - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Assignment */}
              <div style={{ 
                background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(16,185,129,0.05))', 
                border: '1.5px solid rgba(124,58,237,0.15)', 
                borderRadius: 12, 
                padding: '16px' 
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>
                  ➕ Add New Assignment
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.8125rem', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: 6,
                      fontFamily: 'DM Sans, sans-serif'
                    }}>
                      Organizational Unit:
                    </label>
                    <SearchableSelect
                      options={orgUnits
                        .filter(unit => !userOrgAssignments.find(a => a.org_unit_id === unit.id))
                        .map(unit => ({
                          value: unit.id.toString(),
                          label: `${'  '.repeat(unit.level)}${unit.unit_name}`,
                          subtitle: `${unit.unit_type} · Level ${unit.level} · ${unit.unit_code}`
                        }))}
                      value={addingOrgUnit}
                      onChange={setAddingOrgUnit}
                      placeholder="-- Pilih Organizational Unit --"
                      searchPlaceholder="Cari unit (misal: DERMOND, Finance, etc)..."
                      emptyMessage="Tidak ada unit yang tersedia"
                      maxHeight={350}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.8125rem', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: 6,
                        fontFamily: 'DM Sans, sans-serif'
                      }}>
                        Role:
                      </label>
                      <select 
                        value={addingOrgRole} 
                        onChange={e => setAddingOrgRole(e.target.value)} 
                        style={{ 
                          width: '100%', 
                          padding: '9px 12px', 
                          border: '1px solid rgba(226,232,240,0.7)', 
                          borderRadius: 10, 
                          background: 'white', 
                          fontSize: '0.875rem', 
                          fontFamily: 'DM Sans, sans-serif', 
                          color: '#1F2937' 
                        }}
                      >
                        <option value="staff">👤 Staff</option>
                        <option value="support">🔧 Support</option>
                        <option value="leader">👑 Leader</option>
                        <option value="manager">🎯 Manager</option>
                        <option value="owner">🏆 Owner</option>
                        <option value="direktur">💼 Direktur</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 120 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.8125rem', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: 6,
                        fontFamily: 'DM Sans, sans-serif'
                      }}>
                        Primary Assignment:
                      </label>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 12px',
                        border: '1px solid rgba(226,232,240,0.7)',
                        borderRadius: 10,
                        background: 'white',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif'
                      }}>
                        <input
                          type="checkbox"
                          checked={addingIsPrimary}
                          onChange={e => setAddingIsPrimary(e.target.checked)}
                          style={{ margin: 0 }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#1F2937' }}>
                          ⭐ Primary
                        </span>
                      </label>
                    </div>
                  </div>
                  <button 
                    onClick={addOrgAssignmentToUser} 
                    disabled={!addingOrgUnit} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 6, 
                      padding: '10px 16px', 
                      background: !addingOrgUnit ? '#9CA3AF' : 'linear-gradient(135deg,#10b981,#059669)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 10, 
                      fontWeight: 700, 
                      fontSize: '0.875rem', 
                      fontFamily: 'DM Sans, sans-serif', 
                      cursor: !addingOrgUnit ? 'not-allowed' : 'pointer',
                      boxShadow: !addingOrgUnit ? 'none' : '0 2px 6px rgba(16,185,129,0.25)'
                    }}
                  >
                    <Plus size={14} /> Add Assignment
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowUserOrgModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <MobileHeader title="Admin" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
