import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthPage from './components/AuthPage.jsx'
import LandingPage from './components/LandingPage.jsx'
import { supabase } from './lib/supabase'

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
)
