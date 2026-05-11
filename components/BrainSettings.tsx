'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Camera, FolderOpen, Gauge, ListChecks, Loader2, Plus, SlidersHorizontal, Target, Trash2, Users, X } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { getAvatarUrl } from '@/lib/utils';
import styles from './BrainSettings.module.css';

interface BrainSettingsProps {
  config: any;
  onUpdate: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  user?: any; // current logged-in user
}

type ConfigType = 'team' | 'category' | 'status' | 'priority' | 'progress';

const DEFAULT_KEYS = [
  { key: 'default_category', label: 'Default Category', type: 'category' as const },
  { key: 'default_status', label: 'Default Task Status', type: 'status' as const },
  { key: 'default_priority', label: 'Default Task Priority', type: 'priority' as const },
  { key: 'default_progress', label: 'Default Task Progress', type: 'progress' as const }
];

export default function BrainSettings({ config, onUpdate, showToast, user }: BrainSettingsProps) {
  const isAdmin = user?.role === 'admin';
  const [newValues, setNewValues] = useState<Record<ConfigType, string>>({
    team: '', category: '', status: '', priority: '', progress: ''
  });
  const [newCategoryTag, setNewCategoryTag] = useState('Lainnya'); // Tag for new category
  const [editing, setEditing] = useState<{ type: ConfigType; oldValue: string; oldTag?: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingTag, setEditingTag] = useState('Lainnya'); // Tag for editing category
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const CATEGORY_TAGS = ['Perusahaan', 'Unit Bisnis', 'Brand', 'Produk', 'Lainnya'];

  // AI Agents state
  const [agents, setAgents] = useState<any[]>([]);
  const [personalAgent, setPersonalAgent] = useState<any>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [agentForm, setAgentForm] = useState({
    name: '', description: '', role: '', system_prompt: '', knowledge_base: '', model: 'gemini-2.5-flash'
  });
  const [agentAvatarCropSrc, setAgentAvatarCropSrc] = useState<string | null>(null);
  const [uploadingAgentAvatar, setUploadingAgentAvatar] = useState(false);
  const [pendingAgentAvatar, setPendingAgentAvatar] = useState<string | null>(null);
  const agentFileInputRef = useRef<HTMLInputElement>(null);
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);

  // Role assignment state (admin only)
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleAssignAgent, setRoleAssignAgent] = useState<any>(null);
  const [allPositions, setAllPositions] = useState<string[]>([]);
  const [agentRoleAssignments, setAgentRoleAssignments] = useState<any[]>([]);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('');

  useEffect(() => {
    loadAgents();
    if (isAdmin) loadRoleData();
  }, []);

  const loadRoleData = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.success) {
        setAllPositions(data.positions);
        setAgentRoleAssignments(data.assignments);
      }
    } catch {}
  };

  const openRoleAssign = (agent: any) => {
    setRoleAssignAgent(agent);
    setSelectedRoleToAdd('');
    setShowRoleModal(true);
  };

  const addRoleToAgent = async () => {
    if (!selectedRoleToAdd || !roleAssignAgent) return;
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: roleAssignAgent.agent_id, role_name: selectedRoleToAdd })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Agent assigned to "${selectedRoleToAdd}"`, 'success');
        setSelectedRoleToAdd('');
        loadRoleData();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch {
      showToast('Error assigning role', 'error');
    }
  };

  const removeRoleFromAgent = async (agentId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/admin/roles?agent_id=${encodeURIComponent(agentId)}&role_name=${encodeURIComponent(roleName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Role removed', 'success');
        loadRoleData();
      }
    } catch {
      showToast('Error removing role', 'error');
    }
  };

  // Guard: config belum loaded
  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--tx4)', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading configuration...
        </div>
      </div>
    );
  }

  const loadAgents = async () => {
    setAgentsLoading(true);
    try {
      const res = await fetch('/api/chat/agents?settings=1');
      const data = await res.json();
      if (data.success) {
        if (isAdmin) {
          // Admin sees all non-personal agents
          setAgents(data.agents.filter((a: any) => !a.is_personal));
        } else {
          // Regular users see worker agents assigned to their roles/org units
          setAgents(data.agents.filter((a: any) => !a.is_personal));
        }
        // Personal agent for current user
        const myPersonal = data.agents.find((a: any) => a.is_personal && a.owner_username === user?.username);
        setPersonalAgent(myPersonal || null);
      }
    } catch {}
    setAgentsLoading(false);
  };

  const openNewAgent = () => {
    setEditingAgent(null);
    setPendingAgentAvatar(null);
    setAgentForm({ name: '', description: '', role: '', system_prompt: '', knowledge_base: '', model: 'gemini-2.5-flash' });
    setShowAgentModal(true);
  };

  const openEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setPendingAgentAvatar(null);
    setAgentForm({
      name: agent.name, description: agent.description || '',
      role: agent.role || '', system_prompt: agent.system_prompt,
      knowledge_base: agent.knowledge_base || '', model: agent.model || 'gemini-2.5-flash'
    });
    setShowAgentModal(true);
  };

  const handleAgentAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setAgentAvatarCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAgentAvatarCrop = async (blob: Blob) => {
    setAgentAvatarCropSrc(null);
    setUploadingAgentAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      // If editing existing agent, upload directly
      if (editingAgent) {
        fd.append('agentId', editingAgent.agent_id);
        const res = await fetch('/api/avatar', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          setPendingAgentAvatar(data.avatarPath);
          setAgents(prev => prev.map(a => a.agent_id === editingAgent.agent_id ? { ...a, avatar: data.avatarPath } : a));
          showToast('Avatar updated!', 'success');
        } else {
          showToast(data.error || 'Upload failed', 'error');
        }
      } else {
        // For new agent, store blob URL temporarily
        setPendingAgentAvatar(URL.createObjectURL(blob));
        // Store blob for later upload after agent is created
        (window as any).__pendingAgentAvatarBlob = blob;
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setUploadingAgentAvatar(false);
    }
  };

  const deleteAgent = async (agent: any) => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setDeletingAgent(agent.agent_id);
    try {
      const res = await fetch(`/api/chat/agents/${agent.agent_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Agent deleted', 'success');
        loadAgents();
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      showToast('Error deleting agent', 'error');
    } finally {
      setDeletingAgent(null);
    }
  };

  const saveAgent = async () => {
    if (!agentForm.name.trim() || !agentForm.system_prompt.trim()) {
      showToast('Name and system prompt are required', 'error');
      return;
    }
    try {
      if (editingAgent) {
        const res = await fetch(`/api/chat/agents/${editingAgent.agent_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm)
        });
        const data = await res.json();
        if (data.success) { showToast('Agent updated!', 'success'); setShowAgentModal(false); loadAgents(); }
        else showToast(data.error, 'error');
      } else {
        const res = await fetch('/api/chat/agents', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm)
        });
        const data = await res.json();
        if (data.success) {
          // Upload pending avatar if any
          const pendingBlob = (window as any).__pendingAgentAvatarBlob;
          if (pendingBlob && data.agent?.agent_id) {
            const fd = new FormData();
            fd.append('file', pendingBlob, 'avatar.jpg');
            fd.append('agentId', data.agent.agent_id);
            await fetch('/api/avatar', { method: 'POST', body: fd });
            delete (window as any).__pendingAgentAvatarBlob;
          }
          showToast('Agent created!', 'success');
          setShowAgentModal(false);
          setPendingAgentAvatar(null);
          loadAgents();
        } else showToast(data.error, 'error');
      }
    } catch { showToast('Error saving agent', 'error'); }
  };

  const toggleAgent = async (agent: any) => {
    try {
      await fetch(`/api/chat/agents/${agent.agent_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: agent.is_active ? 0 : 1 })
      });
      showToast(agent.is_active ? 'Agent deactivated' : 'Agent activated', 'success');
      loadAgents();
    } catch { showToast('Error updating agent', 'error'); }
  };

  const submitAction = async (payload: Record<string, string>, successMessage: string, errorFallback: string) => {
    const loadingKey = JSON.stringify(payload);
    setSubmittingKey(loadingKey);

    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        showToast(`Error: ${result.error || errorFallback}`, 'error');
        return;
      }

      showToast(successMessage, 'success');
      onUpdate();
    } catch {
      showToast(errorFallback, 'error');
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleAdd = async (type: ConfigType) => {
    const value = newValues[type].trim();
    if (!value) {
      showToast('Please enter a value', 'error');
      return;
    }

    const payload: any = { action: 'add', type, value };
    if (type === 'category') {
      payload.tag = newCategoryTag;
    }

    await submitAction(
      payload,
      `Added to ${type}`,
      'Error adding item'
    );

    setNewValues((current) => ({ ...current, [type]: '' }));
    setNewCategoryTag('Lainnya');
  };

  const startEdit = (type: ConfigType, currentValue: string, currentTag?: string) => {
    setEditing({ type, oldValue: currentValue, oldTag: currentTag });
    setEditingValue(currentValue);
    setEditingTag(currentTag || 'Lainnya');
  };

  const handleEditSave = async () => {
    if (!editing) return;
    const nextValue = editingValue.trim();

    if (!nextValue) {
      showToast('Value cannot be empty', 'error');
      return;
    }

    if (nextValue === editing.oldValue && (editing.type !== 'category' || editingTag === editing.oldTag)) {
      setEditing(null);
      setEditingValue('');
      setEditingTag('Lainnya');
      return;
    }

    const payload: any = { action: 'update', type: editing.type, oldValue: editing.oldValue, newValue: nextValue };
    if (editing.type === 'category') {
      payload.tag = editingTag;
    }

    await submitAction(
      payload,
      'Updated!',
      'Error updating item'
    );

    setEditing(null);
    setEditingValue('');
    setEditingTag('Lainnya');
  };

  const handleDelete = async (type: ConfigType, value: string) => {
    if (!confirm(`Delete "${value}"?`)) return;

    await submitAction(
      { action: 'delete', type, value },
      'Deleted!',
      'Error deleting item'
    );
  };

  const handleDefaultChange = async (key: string, value: string) => {
    if (!value) return;

    await submitAction(
      { action: 'default', key, value },
      'Default updated!',
      'Error updating default'
    );
  };

  const sections: Array<{
    title: string;
    type: ConfigType;
    icon: typeof Users;
    description: string;
    items: any[];
    editable: boolean;
    priority: 'high' | 'medium' | 'low';
  }> = [
    {
      title: 'Categories',
      type: 'category',
      icon: FolderOpen,
      description: 'Project categories - can have many items',
      items: config.categories || [],
      editable: true,
      priority: 'high'
    },
    {
      title: 'Team Members',
      type: 'team',
      icon: Users,
      description: 'For task assignees and project owners',
      items: config.team || [],
      editable: true,
      priority: 'medium'
    },
    {
      title: 'Status Options',
      type: 'status',
      icon: ListChecks,
      description: 'Task workflow stages (system-managed)',
      items: config.status || [],
      editable: false,
      priority: 'low'
    },
    {
      title: 'Priority Levels',
      type: 'priority',
      icon: Target,
      description: 'Task urgency levels (system-managed)',
      items: config.priority || [],
      editable: false,
      priority: 'low'
    },
    {
      title: 'Progress Levels',
      type: 'progress',
      icon: Gauge,
      description: 'Progress presets (system-managed)',
      items: config.progress || [],
      editable: false,
      priority: 'low'
    }
  ];

  // Separate editable and read-only sections
  const editableSections = sections.filter(s => s.editable);
  const readOnlySections = sections.filter(s => !s.editable);

  // Helper to get tag color
  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'Perusahaan': '#7c3aed',
      'Unit Bisnis': '#3b82f6',
      'Brand': '#ec4899',
      'Produk': '#10b981',
      'Lainnya': '#94a3b8'
    };
    return colors[tag] || colors['Lainnya'];
  };

  const optionMap: Record<ConfigType, string[]> = {
    team: (config.team || []).map((t: any) => typeof t === 'string' ? t : t.value),
    category: (config.categories || []).map((c: any) => typeof c === 'string' ? c : c.value),
    status: config.status || [],
    priority: config.priority || [],
    progress: config.progress || []
  };

  return (
    <div className={styles.layout}>
      {/* Main Editable Sections - Categories & Team */}
      <div className={styles.mainGrid}>
        {editableSections.map((section) => {
          const Icon = section.icon;
          const isCategory = section.type === 'category';
          const isTeamSection = section.type === 'team';

          // ── TEAM MEMBERS: grouped by unit ──
          if (isTeamSection) {
            const teamItems = section.items as any[];

            // Group by unit_name (for non-admin users who have unit_name field)
            // For admin, items come from brain_config without unit_name
            const hasUnitInfo = teamItems.length > 0 && teamItems[0].unit_name;

            // Build grouped structure
            let groupedUnits: Array<{ unit_name: string; unit_color?: string; members: any[] }> = [];
            if (hasUnitInfo) {
              const unitMap: Record<string, { unit_name: string; unit_color?: string; members: any[] }> = {};
              for (const item of teamItems) {
                const key = item.unit_name || 'Other';
                if (!unitMap[key]) {
                  unitMap[key] = { unit_name: key, unit_color: item.unit_color, members: [] };
                }
                // Avoid duplicate members in same unit
                if (!unitMap[key].members.find((m: any) => m.value === item.value)) {
                  unitMap[key].members.push(item);
                }
              }
              groupedUnits = Object.values(unitMap);
            }

            return (
              <section key={section.type} className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3><Icon size={18} />{section.title}</h3>
                    <p>{section.description}</p>
                  </div>
                  <span className={styles.countBadge}>
                    {hasUnitInfo
                      ? new Set(teamItems.map((t: any) => t.value)).size
                      : teamItems.length}
                  </span>
                </div>

                {teamItems.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '32px 20px',
                    color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif'
                  }}>
                    <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>No team members yet</div>
                    <div style={{ fontSize: '0.75rem' }}>
                      {isAdmin
                        ? 'Add team members below'
                        : 'You have no organizational assignments yet'}
                    </div>
                  </div>
                ) : hasUnitInfo ? (
                  // Grouped by unit (non-admin users)
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {groupedUnits.map((group) => (
                      <div key={group.unit_name}>
                        {/* Unit header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          marginBottom: 8, paddingBottom: 6,
                          borderBottom: `2px solid ${group.unit_color || '#7c3aed'}30`
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: group.unit_color || '#7c3aed', flexShrink: 0
                          }} />
                          <span style={{
                            fontSize: '0.8125rem', fontWeight: 700,
                            color: group.unit_color || '#7c3aed',
                            fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize'
                          }}>
                            {group.unit_name}
                          </span>
                          <span style={{
                            fontSize: '0.7rem', padding: '1px 7px',
                            background: `${group.unit_color || '#7c3aed'}15`,
                            color: group.unit_color || '#7c3aed',
                            borderRadius: 999, fontWeight: 600, fontFamily: 'DM Sans, sans-serif'
                          }}>
                            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {group.members.length === 0 ? (
                          <div style={{
                            padding: '10px 12px', background: 'rgba(248,250,252,0.8)',
                            borderRadius: 8, fontSize: '0.8125rem', color: '#9CA3AF',
                            fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic'
                          }}>
                            No other team members in this unit
                          </div>
                        ) : (
                          <div className={styles.list}>
                            {group.members.map((item: any) => {
                              const itemValue = item.value || '';
                              const isSupport = item.team_role === 'support';
                              const isLeader = ['leader', 'manager', 'owner', 'direktur'].includes(item.team_role);
                              return (
                                <div key={`${group.unit_name}-${itemValue}`} className={styles.item}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                      background: isSupport
                                        ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                                        : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                      overflow: 'hidden', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', color: 'white', fontWeight: 700,
                                      fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif'
                                    }}>
                                      {item.avatar ? (
                                        <img src={getAvatarUrl(item.avatar)} alt={item.full_name || itemValue}
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      ) : (
                                        (item.full_name || itemValue).charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className={styles.itemValue}>{itemValue}</span>
                                        {item.team_role && (
                                          <span style={{
                                            fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px',
                                            background: isSupport ? 'rgba(59,130,246,0.1)' : isLeader ? 'rgba(245,158,11,0.1)' : 'rgba(124,58,237,0.08)',
                                            color: isSupport ? '#3b82f6' : isLeader ? '#d97706' : '#7c3aed',
                                            borderRadius: 4, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize'
                                          }}>
                                            {isSupport ? '🔧' : isLeader ? '👑' : '👤'} {item.team_role}
                                          </span>
                                        )}
                                      </div>
                                      {item.full_name && (
                                        <div style={{
                                          fontSize: '0.75rem', color: '#6B7280',
                                          fontFamily: 'DM Sans, sans-serif', marginTop: 1,
                                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                          {item.full_name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Flat list (admin view from brain_config)
                  <div className={styles.list}>
                    {teamItems.map((item: any) => {
                      const itemValue = typeof item === 'string' ? item : (item?.value || '');
                      const teamFullName = typeof item === 'object' ? item.full_name : null;
                      const teamJobPosition = typeof item === 'object' ? item.job_position : null;
                      const teamAvatar = typeof item === 'object' ? item.avatar : null;
                      const isEditing = editing?.type === 'team' && editing.oldValue === itemValue;
                      return (
                        <div key={itemValue} className={styles.item}>
                          {isEditing ? (
                            <div className={styles.editRow}>
                              <input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} autoFocus />
                              <div className={styles.actions}>
                                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleEditSave} disabled={Boolean(submittingKey)}>Save</button>
                                <button className={styles.btn} onClick={() => { setEditing(null); setEditingValue(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                <div style={{
                                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                  overflow: 'hidden', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', color: 'white', fontWeight: 700,
                                  fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif'
                                }}>
                                  {teamAvatar ? (
                                    <img src={getAvatarUrl(teamAvatar)} alt={teamFullName || itemValue}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  ) : (
                                    (teamFullName || itemValue).charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <span className={styles.itemValue}>{itemValue}</span>
                                  {(teamFullName || teamJobPosition) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                      {teamFullName && <span style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>{teamFullName}</span>}
                                      {teamJobPosition && (
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '1px 7px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderRadius: 999, fontFamily: 'DM Sans, sans-serif' }}>
                                          {teamJobPosition}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className={styles.actions}>
                                {isAdmin && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`} onClick={() => startEdit('team', itemValue)}>Edit</button>}
                                {isAdmin && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => handleDelete('team', itemValue)}><Trash2 size={12} /></button>}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add New - Admin only */}
                {isAdmin && (
                  <div className={styles.addNew}>
                    <input
                      placeholder="Add new team member (username)"
                      value={newValues['team']}
                      onChange={(e) => setNewValues((c) => ({ ...c, team: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd('team')}
                    />
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleAdd('team')} disabled={Boolean(submittingKey)} style={{ alignSelf: 'flex-start' }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                )}
                {!isAdmin && (
                  <div style={{ padding: '10px 14px', background: 'rgba(248,250,252,0.8)', borderRadius: 8, fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', border: '1px dashed rgba(226,232,240,0.7)' }}>
                    🔒 Team members are based on your organizational assignments
                  </div>
                )}
              </section>
            );
          }

          // ── CATEGORIES (and other editable sections) ──
          return (
            <section key={section.type} className={`${styles.card} ${isCategory ? styles.cardWide : ''}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <h3>
                    <Icon size={18} />
                    {section.title}
                  </h3>
                  <p>{section.description}</p>
                </div>
                <span className={styles.countBadge}>{section.items.length}</span>
              </div>

              {/* Items Grid - More compact for categories */}
              <div className={isCategory ? styles.categoryGrid : styles.list}>
                {section.items.length === 0 ? (
                  <div className={styles.emptyState}>No items yet</div>
                ) : (
                  section.items.map((item) => {
                    const itemValue = typeof item === 'string' ? item : (item?.value || '');
                    const itemTag = (typeof item === 'object' && item !== null) ? item.tag : null;
                    const isEditing = editing?.type === section.type && editing.oldValue === itemValue;
                    
                    return (
                      <div key={itemValue} className={isCategory ? styles.categoryTag : styles.item}>
                        {isEditing ? (
                          <div className={styles.editRow}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                              <input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} autoFocus placeholder="Category name" />
                              {isCategory && (
                                <select value={editingTag} onChange={(e) => setEditingTag(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: '1px solid rgba(226,232,240,0.65)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
                                  {CATEGORY_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                </select>
                              )}
                            </div>
                            <div className={styles.actions}>
                              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleEditSave} disabled={Boolean(submittingKey)}>Save</button>
                              <button className={styles.btn} onClick={() => { setEditing(null); setEditingValue(''); setEditingTag('Lainnya'); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className={styles.itemValue}>{itemValue}</span>
                                  {isCategory && itemTag && (
                                    <span className={styles.categoryTagBadge} style={{ background: `${getTagColor(itemTag)}15`, color: getTagColor(itemTag) }}>
                                      {itemTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className={styles.actions}>
                              {isAdmin && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`} onClick={() => startEdit(section.type, itemValue, itemTag)}>Edit</button>}
                              {isAdmin && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => handleDelete(section.type, itemValue)}><Trash2 size={12} /></button>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Input - Admin only */}
              {isAdmin && (
                <div className={styles.addNew}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                    <input
                      placeholder={`Add new ${section.title.toLowerCase()}`}
                      value={newValues[section.type]}
                      onChange={(event) => setNewValues((current) => ({ ...current, [section.type]: event.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd(section.type)}
                    />
                    {isCategory && (
                      <select value={newCategoryTag} onChange={(e) => setNewCategoryTag(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: '1px solid rgba(226,232,240,0.65)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', background: 'rgba(255,255,255,0.75)' }}>
                        {CATEGORY_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                      </select>
                    )}
                  </div>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleAdd(section.type)} disabled={Boolean(submittingKey)} style={{ alignSelf: 'flex-start' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              )}
              {!isAdmin && (
                <div style={{ padding: '10px 14px', background: 'rgba(248,250,252,0.8)', borderRadius: 8, fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', border: '1px dashed rgba(226,232,240,0.7)' }}>
                  🔒 Only admins can add or edit {section.title.toLowerCase()}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Compact Row: Read-Only System Values + Default Values */}
      <div className={styles.compactRow}>
        {/* System Values - Read Only */}
        <section className={styles.compactCard}>
          <div className={styles.compactHeader}>
            <h4>System Values (Read-Only)</h4>
            <p>These values are managed by the system and cannot be edited here</p>
          </div>
          <div className={styles.systemGrid}>
            {readOnlySections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.type} className={styles.systemSection}>
                  <div className={styles.systemTitle}>
                    <Icon size={14} />
                    <span>{section.title}</span>
                    <span className={styles.systemCount}>{section.items.length}</span>
                  </div>
                  <div className={styles.systemTags}>
                    {section.items.map(item => {
                      // Handle both string and object items
                      const itemValue = typeof item === 'string' ? item : (item?.value || '');
                      return (
                        <span key={itemValue} className={styles.systemTag}>{itemValue}</span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Default Values */}
        <section className={styles.compactCard}>
          <div className={styles.compactHeader}>
            <h4>Default Values</h4>
            <p>Initial values for new tasks and projects</p>
          </div>
          <div className={styles.defaultsGrid}>
            {DEFAULT_KEYS.map((item) => (
              <label key={item.key} className={styles.defaultField}>
                <span>{item.label}</span>
                <select
                  value={config.defaults?.[item.key] || optionMap[item.type][0] || ''}
                  onChange={(event) => handleDefaultChange(item.key, event.target.value)}
                  disabled={!isAdmin || Boolean(submittingKey) || optionMap[item.type].length === 0}
                >
                  {optionMap[item.type].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!isAdmin && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(248,250,252,0.8)', borderRadius: 8, fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
              🔒 Only admins can change default values
            </div>
          )}
        </section>
      </div>

      {/* ── Personal AI Assistant ── */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} />
              My Personal AI Assistant
            </h3>
            <p>Your exclusive AI assistant that knows you personally and remembers your preferences</p>
          </div>
        </div>

        {agentsLoading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : !personalAgent ? (
          <div className={styles.emptyState}>
            <div style={{ marginBottom: 12 }}>No personal AI assistant yet.</div>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={async () => {
                try {
                  await fetch('/api/chat/init', { method: 'POST' });
                  loadAgents();
                  showToast('Personal AI assistant created!', 'success');
                } catch {
                  showToast('Error creating personal assistant', 'error');
                }
              }}
            >
              <Plus size={14} /> Create My Personal AI
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar — pakai foto user, badge bot di pojok */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}>
                {/* Priority: user avatar > agent avatar > initials */}
                {user?.avatar ? (
                  <img src={getAvatarUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    // show initials fallback
                  }} />
                ) : personalAgent.avatar ? (
                  <img src={getAvatarUrl(personalAgent.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  (user?.full_name || user?.username || '?').charAt(0).toUpperCase()
                )}
              </div>
              {/* Bot badge — purple untuk personal AI */}
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: '2.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}>
                <Bot size={12} color="white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>
                {personalAgent.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: 8 }}>
                {personalAgent.description || 'Your exclusive personal AI assistant'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ padding: '3px 10px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  🤖 Personal Assistant
                </span>
                <span style={{ padding: '3px 10px', background: personalAgent.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: personalAgent.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  {personalAgent.is_active ? '● Active' : '○ Inactive'}
                </span>
                <span style={{ padding: '3px 10px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  {personalAgent.model}
                </span>
              </div>

              {/* System prompt preview */}
              <div style={{ padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid rgba(226,232,240,0.6)', fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, marginBottom: 12 }}>
                {(personalAgent.system_prompt || '').substring(0, 150)}...
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => openEditAgent(personalAgent)}
                >
                  ✏️ Customize My AI
                </button>
                <button
                  className={styles.btn}
                  onClick={() => window.location.href = '/chat'}
                  style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  💬 Open Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Bots Assigned to You (read-only for non-admin) ── */}
      {!isAdmin && (() => {
        const assignedAgents = agents.filter(a => !a.is_personal && a.agent_id !== undefined);
        return (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bot size={18} />
                  AI Agents Tersedia Untukmu
                </h3>
                <p>Bot yang di-assign oleh admin berdasarkan divisi & job position kamu — tersedia di Chat</p>
              </div>
              <span className={styles.countBadge}>{assignedAgents.length}</span>
            </div>
            {assignedAgents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                <Bot size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>Belum ada AI Agent</div>
                <div style={{ fontSize: '0.75rem' }}>Admin belum assign AI agent ke divisi atau job position kamu</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {assignedAgents.map(agent => (
                  <div key={agent.agent_id} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      {agent.avatar ? (
                        <img src={getAvatarUrl(agent.avatar)} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <Bot size={20} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>{agent.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>{agent.role || 'AI Agent'}</div>
                      {agent.description && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{agent.description}</div>}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', background: agent.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: agent.is_active ? '#059669' : '#dc2626', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          {agent.is_active ? '● Active' : '○ Inactive'}
                        </span>
                        <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          {agent.model}
                        </span>
                        <button
                          onClick={() => window.location.href = '/chat'}
                          style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          💬 Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* AI Agents Management */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <h3>
                <Bot size={18} />
                AI Agents
              </h3>
              <p>
                {isAdmin
                  ? 'Manage all AI agents available in Chat'
                  : 'Your custom AI agents — create and manage your own agents'}
              </p>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNewAgent}>
              <Plus size={14} /> New Agent
            </button>
          </div>
        </div>

        {agentsLoading ? (
          <div className={styles.emptyState}>Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className={styles.emptyState}>
            {isAdmin
              ? 'No agents yet. Create your first AI agent.'
              : "You haven't created any custom agents yet. Click \"New Agent\" to create one."}
          </div>
        ) : (
          <div className={styles.agentGrid}>
            {agents.map(agent => {
              // Permission: admin can edit all, user can only edit agents they created
              const canEdit = isAdmin || agent.created_by === user?.username;
              return (
              <div key={agent.agent_id} className={`${styles.agentCard} ${!agent.is_active ? styles.agentInactive : ''}`}>
                <div className={styles.agentCardHeader}>
                  <div className={styles.agentAvatar} style={{ overflow: 'hidden', position: 'relative' }}>
                    {agent.avatar ? (
                      <img src={getAvatarUrl(agent.avatar)} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Bot size={18} />
                    )}
                  </div>
                  <div className={styles.agentInfo}>
                    <div className={styles.agentName}>{agent.name}</div>
                    <div className={styles.agentRole}>{agent.role || 'AI Agent'}</div>
                  </div>
                  <div className={styles.agentStatus} style={{ background: agent.is_active ? 'var(--green-bg)' : 'var(--red-bg)', color: agent.is_active ? 'var(--green)' : 'var(--red)' }}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                {agent.description && <p className={styles.agentDesc}>{agent.description}</p>}
                <div className={styles.agentPromptPreview}>
                  {agent.system_prompt.substring(0, 100)}...
                </div>
                {/* Role assignment badges (admin only) */}
                {isAdmin && (() => {
                  const assignedRoles = agentRoleAssignments.filter(a => a.agent_id === agent.agent_id);
                  return assignedRoles.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {assignedRoles.map(ar => (
                        <span key={ar.role_name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          👥 {ar.role_name}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
                <div className={styles.agentActions}>
                  {canEdit ? (
                    <>
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openEditAgent(agent)}>Edit</button>
                      <button className={`${styles.btn}`} onClick={() => toggleAgent(agent)}>
                        {agent.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {isAdmin && (
                        <button
                          className={`${styles.btn}`}
                          onClick={() => openRoleAssign(agent)}
                          title="Assign to job roles"
                          style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          👥 Roles
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => deleteAgent(agent)}
                        disabled={deletingAgent === agent.agent_id}
                        title="Delete agent"
                      >
                        {deletingAgent === agent.agent_id ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={12} />}
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                      🔒 Admin agent — read only
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Agent Modal */}
      {showAgentModal && (
        <div className={styles.agentModal} onClick={e => e.target === e.currentTarget && setShowAgentModal(false)}>
          <div className={styles.agentModalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.125rem' }}>
                {editingAgent ? 'Edit AI Agent' : 'New AI Agent'}
              </h3>
              <button className={styles.btn} onClick={() => setShowAgentModal(false)}><X size={16} /></button>
            </div>

            {/* Avatar Upload Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 16px', background: 'rgba(248,250,252,0.8)', borderRadius: 12, border: '1px solid rgba(226,232,240,0.6)' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  {(pendingAgentAvatar || editingAgent?.avatar) ? (
                    <img
                      src={pendingAgentAvatar?.startsWith('blob:') ? pendingAgentAvatar : getAvatarUrl(pendingAgentAvatar || editingAgent?.avatar)}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Bot size={28} />
                  )}
                </div>
                <button
                  onClick={() => agentFileInputRef.current?.click()}
                  disabled={uploadingAgentAvatar}
                  style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: '#10B981', border: '2px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                >
                  {uploadingAgentAvatar ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Camera size={11} />}
                </button>
                <input ref={agentFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAgentAvatarFile(f); e.target.value = ''; }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'DM Sans, sans-serif', color: '#111827' }}>{agentForm.name || 'New Agent'}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: 2 }}>{agentForm.role || 'AI Agent'}</div>
                <button onClick={() => agentFileInputRef.current?.click()} style={{ marginTop: 6, fontSize: '0.75rem', color: '#10B981', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  📷 Change Avatar
                </button>
              </div>
            </div>

            <div className={styles.agentFormGrid}>
              <div className={styles.defaultField}>
                <span>Name *</span>
                <input placeholder="e.g. Marketing AI" value={agentForm.name} onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className={styles.defaultField}>
                <span>Role</span>
                <input placeholder="e.g. Marketing Specialist" value={agentForm.role} onChange={e => setAgentForm(f => ({ ...f, role: e.target.value }))} />
              </div>
            </div>

            <div className={styles.defaultField} style={{ marginBottom: 12 }}>
              <span>Description</span>
              <input placeholder="Brief description of what this agent does" value={agentForm.description} onChange={e => setAgentForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className={styles.defaultField} style={{ marginBottom: 12 }}>
              <span>Model</span>
              <select value={agentForm.model} onChange={e => setAgentForm(f => ({ ...f, model: e.target.value }))}>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>

            <div className={styles.defaultField} style={{ marginBottom: 12 }}>
              <span>System Prompt * — Main instructions for this agent</span>
              <textarea
                rows={5}
                placeholder="You are an AI agent specialized in... You help the team with..."
                value={agentForm.system_prompt}
                onChange={e => setAgentForm(f => ({ ...f, system_prompt: e.target.value }))}
                style={{ resize: 'vertical', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', width: '100%' }}
              />
            </div>

            <div className={styles.defaultField} style={{ marginBottom: 20 }}>
              <span>Knowledge Base — Additional context this agent should remember</span>
              <textarea
                rows={4}
                placeholder="Enter specific information, FAQs, or context this agent needs to know..."
                value={agentForm.knowledge_base}
                onChange={e => setAgentForm(f => ({ ...f, knowledge_base: e.target.value }))}
                style={{ resize: 'vertical', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className={styles.btn} onClick={() => setShowAgentModal(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveAgent}>
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Avatar Cropper */}
      {agentAvatarCropSrc && (
        <ImageCropper
          imageSrc={agentAvatarCropSrc}
          onCrop={handleAgentAvatarCrop}
          onCancel={() => setAgentAvatarCropSrc(null)}
          outputSize={300}
        />
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && roleAssignAgent && (
        <div className={styles.agentModal} onClick={e => e.target === e.currentTarget && setShowRoleModal(false)}>
          <div className={styles.agentModalBox} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.125rem' }}>
                Assign Agent to Job Roles
              </h3>
              <button className={styles.btn} onClick={() => setShowRoleModal(false)}><X size={16} /></button>
            </div>

            {/* Agent info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(248,250,252,0.8)', borderRadius: 12, marginBottom: 20, border: '1px solid rgba(226,232,240,0.6)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                {roleAssignAgent.avatar ? (
                  <img src={getAvatarUrl(roleAssignAgent.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Bot size={20} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'DM Sans, sans-serif', color: '#111827' }}>{roleAssignAgent.name}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>{roleAssignAgent.role}</div>
              </div>
            </div>

            {/* Current assignments */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 }}>
                Currently assigned to:
              </div>
              {agentRoleAssignments.filter(a => a.agent_id === roleAssignAgent.agent_id).length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                  Not assigned to any role yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {agentRoleAssignments.filter(a => a.agent_id === roleAssignAgent.agent_id).map(ar => (
                    <span key={ar.role_name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                      👥 {ar.role_name}
                      <button
                        onClick={() => removeRoleFromAgent(roleAssignAgent.agent_id, ar.role_name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add new role */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 }}>
                Add to job role:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedRoleToAdd}
                  onChange={e => setSelectedRoleToAdd(e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid rgba(226,232,240,0.7)', borderRadius: 10, background: '#F9FAFB', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#1F2937' }}
                >
                  <option value="">-- Select job position --</option>
                  {allPositions
                    .filter(p => !agentRoleAssignments.some(a => a.agent_id === roleAssignAgent.agent_id && a.role_name === p))
                    .map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))
                  }
                </select>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={addRoleToAgent}
                  disabled={!selectedRoleToAdd}
                >
                  <Plus size={14} /> Assign
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                💡 Karyawan dengan job position ini akan otomatis mendapatkan akses ke agent ini
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.btn} onClick={() => setShowRoleModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
