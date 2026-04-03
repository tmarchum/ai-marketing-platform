import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
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
