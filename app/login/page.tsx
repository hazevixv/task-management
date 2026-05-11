'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, AlertCircle } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 150));
        // Force full page navigation to trigger AppContext re-init
        window.location.href = '/';
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="url(#gradient)" />
            <path d="M14 24L21 31L34 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>InYourTask</h1>
        <p className={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoFocus
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <Lock size={20} className={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={styles.input}
              />
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={styles.signInBtn}>
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className={styles.demo}>
          <p className={styles.demoTitle}>Demo Account</p>
          <div className={styles.demoInfo}>
            <span>Username: <strong>taufik</strong></span>
            <span>Password: <strong>raytask123</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
