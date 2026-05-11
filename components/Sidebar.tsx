'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Activity, Bell, BrainCircuit, CalendarDays, CheckSquare, FolderKanban,
  LayoutGrid, LogOut, MessageCircle, Plus, RefreshCw, Search, Sparkles, UserRound, Shield
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  user?: any;
  onLogout?: () => void;
  onRefresh?: () => void;
  pageTitle?: string;
  topbarRight?: React.ReactNode;
  children: React.ReactNode;
  onNewTask?: () => void;
  onNewProject?: () => void;
}

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',      icon: LayoutGrid,    path: '/' },
  { id: 'projects',  label: 'Projects',       icon: FolderKanban,  path: '/projects' },
  { id: 'tasks',     label: 'Tasks',          icon: CheckSquare,   path: '/tasks' },
  { id: 'calendar',  label: 'Calendar',       icon: CalendarDays,  path: '/calendar' },
  { id: 'tracking',  label: 'Tracking',       icon: Activity,      path: '/tracking' },
  { id: 'chat',      label: 'Chat',           icon: MessageCircle, path: '/chat' },
  { id: 'ai',        label: 'AI Assistant',   icon: Sparkles,      path: '/ai-assistant' },
  { id: 'brain',     label: 'Settings',       icon: BrainCircuit,  path: '/brain' },
];

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AppShell({
  activeTab, user, onLogout, onRefresh, pageTitle, topbarRight, children, onNewTask, onNewProject
}: SidebarProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const loadNotifCount = async () => {
      try {
        const res = await fetch('/api/notifications?unread=1&limit=1');
        const data = await res.json();
        if (data.success) setUnreadNotifs(data.unreadCount || 0);
      } catch {}
    };
    loadNotifCount();
    const interval = setInterval(loadNotifCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <button className={styles.brand} onClick={() => router.push('/')}>
          <div className={styles.brandMark}>
            <img src="/logo.png" alt="Raymaizing" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px', padding: '5px' }} />
          </div>
          <div>
            <div className={styles.brandName}>InYourTask</div>
            <div className={styles.brandSub}>Task Management</div>
          </div>
        </button>

        {/* Nav */}
        <nav className={styles.navSection}>
          <div className={styles.navLabel}>Menu</div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                onClick={() => router.push(item.path)}
              >
                <span className={styles.navIcon}><Icon size={16} /></span>
                {item.label}
              </button>
            );
          })}
          {/* Admin link - only for admins */}
          {user?.role === 'admin' && (
            <>
              <div className={styles.navLabel} style={{ marginTop: 8 }}>Admin</div>
              <button
                className={`${styles.navItem} ${activeTab === 'admin' ? styles.navItemActive : ''}`}
                onClick={() => router.push('/admin')}
              >
                <span className={styles.navIcon}><Shield size={16} /></span>
                Admin Panel
              </button>
              <button
                className={`${styles.navItem} ${activeTab === 'admin-employees' ? styles.navItemActive : ''}`}
                onClick={() => router.push('/admin/employees')}
              >
                <span className={styles.navIcon}><UserRound size={16} /></span>
                Employees
              </button>
            </>
          )}
        </nav>

        <div className={styles.divider} />

        {/* Actions Section - Refresh & Notifications */}
        <div className={styles.actionsSection}>
          {onRefresh && (
            <button className={styles.actionBtn} onClick={onRefresh} title="Refresh data">
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          )}
          <button className={styles.actionBtn} title="Notifications" onClick={() => router.push('/notifications')} style={{ position: 'relative' }}>
            <Bell size={15} />
            <span>Notifications</span>
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 8, minWidth: 18, height: 18, padding: '0 4px', background: '#ef4444', color: 'white', borderRadius: 999, fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
                {unreadNotifs > 99 ? '99+' : unreadNotifs}
              </span>
            )}
          </button>

          {/* New Task & Project buttons - below notifications */}
          <div className={styles.createButtons}>
            {onNewTask && (
              <button className={`${styles.createBtn} ${styles.createBtnTask}`} onClick={onNewTask} title="New Task">
                <Plus size={14} />
                <span>Task</span>
              </button>
            )}
            {onNewProject && (
              <button className={`${styles.createBtn} ${styles.createBtnProject}`} onClick={onNewProject} title="New Project">
                <Plus size={14} />
                <span>Project</span>
              </button>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        {/* User */}
        <div className={styles.userSection}>
          {user && (
            <div className={styles.userCard}>
              <div className={styles.userAvatar} onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
                {user.avatar ? (
                  <img src={`/uploads/${user.avatar}`} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : getInitials(user.full_name || user.username)}
              </div>
              <div className={styles.userInfo} onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
                <div className={styles.userName}>{user.full_name || user.username}</div>
                <div className={styles.userRole}>{user.role}</div>
              </div>
              {user.role === 'admin' && (
                <button className={styles.logoutBtn} onClick={() => router.push('/admin')} title="Admin Panel" style={{ marginRight: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </button>
              )}
              {onLogout && (
                <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
                  <LogOut size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        {/* Content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
