import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthPage from './components/AuthPage.jsx'
import LandingPage from './components/LandingPage.jsx'
import LeadFormPage from './components/LeadFormPage.jsx'
import { supabase } from './lib/supabase'

// ── L5: Register service worker for PWA ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Route detection ──
//   /l/:slug         → built-in landing page
//   custom domain /  → landing page served by hostname lookup (L2)
//   otherwise        → dashboard app
const _path = window.location.pathname;
const _host = window.location.hostname;
const _isVercel = _host.includes('vercel.app') || _host === 'localhost' || _host === '127.0.0.1';
const _leadMatch = _path.match(/^\/l\/([^/]+)/);

if (_leadMatch) {
  // /l/:slug
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LeadFormPage slug={_leadMatch[1]} />
    </StrictMode>
  );
} else if (!_isVercel && _path === '/') {
  // Custom domain root — let LeadFormPage look up by hostname
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LeadFormPage slug={null} hostname={_host} />
    </StrictMode>
  );
} else {

function Root() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setShowAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>טוען...</div>
      </div>
    );
  }

  // Logged in — render dashboard
  if (session) {
    return <App session={session} />;
  }

  // Not logged in — show landing or auth
  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
} // end else (not a lead-capture page)
