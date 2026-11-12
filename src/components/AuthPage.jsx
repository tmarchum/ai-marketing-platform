import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage({ onBack }) {
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('נשלח אליך מייל אימות. בדוק את תיבת הדואר.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('נשלח אליך מייל לאיפוס סיסמה.');
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' :
               err.message === 'User already registered' ? 'המשתמש כבר רשום. נסה להתחבר.' :
               err.message || 'שגיאה');
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(/provider|not enabled/i.test(error.message || '')
        ? 'התחברות עם Google עדיין לא הופעלה במערכת'
        : (error.message || 'שגיאה'));
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px', width: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl',
      }}>
        {/* Back to landing */}
        {onBack && <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontSize: 12,
          fontWeight: 600, marginBottom: 12, display: 'block', fontFamily: 'inherit',
        }}>← חזרה לדף הראשי</button>}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
            AI Marketing Platform
          </h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
            {mode === 'login' ? 'התחבר לחשבון שלך' :
             mode === 'signup' ? 'צור חשבון חדש' :
             'איפוס סיסמה'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }}>
              אימייל
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0',
                fontSize: 14, outline: 'none', boxSizing: 'border-box', direction: 'ltr',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#8B5CF6'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }}>
                סיסמה
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required={mode !== 'forgot'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box', direction: 'ltr',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#8B5CF6'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>
          )}

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '8px 12px', marginBottom: 12, color: '#DC2626', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
              padding: '8px 12px', marginBottom: 12, color: '#16A34A', fontSize: 12,
            }}>
              {message}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: loading ? '#a78bfa' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            }}
          >
            {loading ? '...' :
             mode === 'login' ? 'התחבר' :
             mode === 'signup' ? 'הירשם' :
             'שלח מייל איפוס'}
          </button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: '#aaa', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
              <span>או</span>
              <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
            </div>
            <button
              type="button" onClick={handleGoogle}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: '1.5px solid #e0e0e0',
                background: '#fff', color: '#333', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
              </svg>
              המשך עם Google
            </button>
          </>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#888' }}>
          {mode === 'login' && <>
            <span>אין לך חשבון? </span>
            <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              הירשם
            </button>
            <span style={{ margin: '0 8px' }}>|</span>
            <button onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              שכחתי סיסמה
            </button>
          </>}
          {mode === 'signup' && <>
            <span>יש לך חשבון? </span>
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              התחבר
            </button>
          </>}
          {mode === 'forgot' && <>
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              חזור להתחברות
            </button>
          </>}
        </div>
      </div>
    </div>
  );
}
