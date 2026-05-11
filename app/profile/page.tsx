'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Briefcase, Building2, Phone, FileText, Camera, Save, X, Loader2 } from 'lucide-react';
import AppShell from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import PageLoader from '@/components/PageLoader';
import Toast from '@/components/Toast';
import ImageCropper from '@/components/ImageCropper';
import { useApp } from '@/lib/AppContext';
import { getDisplayName, getAvatarUrl } from '@/lib/utils';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, authChecked, toast, handleLogout, showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    job_position: '',
    organization: '',
    bio: '',
    phone: '',
    avatar: ''
  });

  const nav = (t: string) => router.push(t === 'overview' ? '/' : `/${t === 'ai' ? 'ai-assistant' : t}`);

  useEffect(() => {
    if (!authChecked || !user) return;
    loadProfile();
  }, [authChecked, user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/profile');
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setFormData({
          full_name: data.profile.full_name || '',
          email: data.profile.email || '',
          job_position: data.profile.job_position || '',
          organization: data.profile.organization || '',
          bio: data.profile.bio || '',
          phone: data.profile.phone || '',
          avatar: data.profile.avatar || ''
        });
      } else {
        showToast(data.error || 'Failed to load profile', 'error');
      }
    } catch (err) {
      showToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate
    if (!formData.full_name.trim()) {
      showToast('Full name is required', 'error');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast('Invalid email format', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        setProfile(data.profile);
        showToast('Profile updated successfully', 'success');
        
        // Reload page to update user context
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        job_position: profile.job_position || '',
        organization: profile.organization || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        avatar: profile.avatar || ''
      });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    // Show cropper instead of uploading directly
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropperSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropperSrc(null);
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      const res = await fetch('/api/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar: data.avatarPath }));
        setProfile((prev: any) => prev ? { ...prev, avatar: data.avatarPath } : prev);
        showToast('Avatar updated!', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload error', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!authChecked) return <PageLoader />;

  const displayName = profile ? getDisplayName(profile.full_name) : '';
  const avatarUrl = profile ? getAvatarUrl(profile.avatar) : '/default-avatar.png';

  return (
    <>
      <AppShell 
        activeTab="profile" 
        user={user} 
        onLogout={handleLogout} 
        pageTitle="Profile"
        onNewTask={() => router.push('/tasks')} 
        onNewProject={() => router.push('/projects')}
      >
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={32} className={styles.spinning} />
              <p>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className={styles.header}>
                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    <img src={avatarUrl} alt={displayName} className={styles.avatar} onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                    <button
                      className={styles.avatarBtn}
                      title="Change avatar"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? <Loader2 size={16} className={styles.spinning} /> : <Camera size={16} />}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                        e.target.value = '';
                      }}
                    />                  </div>
                  <div className={styles.headerInfo}>
                    <h1>{displayName}</h1>
                    <p className={styles.username}>@{profile?.username}</p>
                    {profile?.employee_id && (
                      <p className={styles.employeeId}>ID: {profile.employee_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className={styles.form}>
                <div className={styles.section}>
                  <h2>Personal Information</h2>
                  
                  <div className={styles.field}>
                    <label>
                      <User size={16} />
                      Full Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={e => handleChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                    <small>This will be displayed as your name throughout the app</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Mail size={16} />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                    />
                    <small>Used for notifications and direct messages</small>
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Phone size={16} />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                </div>

                <div className={styles.section}>
                  <h2>Work Information</h2>
                  
                  <div className={styles.field}>
                    <label>
                      <Briefcase size={16} />
                      Job Position
                    </label>
                    <input
                      type="text"
                      value={formData.job_position}
                      onChange={e => handleChange('job_position', e.target.value)}
                      placeholder="e.g., Creative Director, IT Support"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Building2 size={16} />
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={e => handleChange('organization', e.target.value)}
                      placeholder="e.g., RAYANDRA ATAULLAH ARYAGUNA"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <FileText size={16} />
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={e => handleChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                    <small>A brief description about you and your role</small>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.actions}>
                  <button 
                    className={styles.btnCancel} 
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button 
                    className={styles.btnSave} 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className={styles.spinning} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>

      <MobileHeader title="Profile" user={user} onLogout={handleLogout} />
      <BottomNav activeTab="profile" onTabChange={nav} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Image Cropper Modal */}
      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          onCrop={handleCropComplete}
          onCancel={() => setCropperSrc(null)}
          outputSize={400}
        />
      )}}
    </>
  );
}
