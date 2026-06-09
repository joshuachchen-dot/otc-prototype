import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { signIn } from 'next-auth/react';

const DEMO_CREDS = [
  { role: 'Investor',     username: 'investor', password: 'investor123', color: '#6366f1', desc: 'View your fund position, subscribe & redeem' },
  { role: 'Fund Manager', username: 'manager',  password: 'manager123',  color: '#00c9a7', desc: 'Post NAV, manage OTC trades, full access' },
  { role: 'Auditor',      username: 'auditor',  password: 'auditor123',  color: '#f59e0b', desc: 'Download on-chain audit exports' },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M18 9C18 4.029 13.971 0 9 0S0 4.029 0 9c0 4.488 3.291 8.208 7.594 8.892V11.61H5.309V9h2.285V7.017c0-2.257 1.344-3.504 3.403-3.504.985 0 2.016.176 2.016.176v2.216h-1.136c-1.119 0-1.468.695-1.468 1.408V9h2.496l-.399 2.61H10.41v6.282C14.709 17.208 18 13.488 18 9z" fill="#1877F2"/>
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const { next, error } = router.query;

  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [busy, setBusy]             = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);
  const [err, setErr]               = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  useEffect(() => {
    if (error === 'access_denied') setErr('You do not have access to that page.');
    else if (error === 'OAuthSignin' || error === 'OAuthCallback') setErr('Social sign-in failed. Check that OAuth credentials are configured in .env.local.');
    else if (error) setErr('Sign-in error. Please try again.');
  }, [error]);

  // Fetch which social providers are configured
  useEffect(() => {
    fetch('/api/auth/providers')
      .then(r => r.ok ? r.json() : {})
      .then((providers: Record<string, unknown>) => {
        setAvailableProviders(Object.keys(providers).filter(k => k !== 'credentials'));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Login failed.'); return; }
      const dest = typeof next === 'string' && next.startsWith('/') ? next : data.redirect;
      window.location.href = dest;
    } catch {
      setErr('Network error — is the server running?');
    } finally {
      setBusy(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'facebook') {
    setSocialBusy(provider);
    setErr(null);
    const dest = typeof next === 'string' && next.startsWith('/') ? next : '/investor';
    // Route through social-bridge so an archon_session cookie is set after OAuth.
    await signIn(provider, { callbackUrl: `/api/auth/social-bridge?next=${encodeURIComponent(dest)}` });
    setSocialBusy(null);
  }

  function fillCreds(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setErr(null);
  }

  const googleEnabled   = availableProviders.includes('google');
  const facebookEnabled = availableProviders.includes('facebook');

  return (
    <>
      <Head>
        <title>Login — Archon</title>
      </Head>

      <div
        style={{
          minHeight: 'calc(100vh - 60px)',
          background: 'linear-gradient(180deg,#fff 0%,#f5f5f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>

          {/* ── Left: login form ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[1.4px] mb-4" style={{ color: '#c0c0c8' }}>
              Secure Access
            </p>
            <h1
              className="font-extrabold text-[#1d1d1f]"
              style={{ fontSize: 40, letterSpacing: -1.2, lineHeight: 1.1, marginBottom: 12 }}
            >
              Sign in to<br />Archon.
            </h1>
            <p style={{ fontSize: 15, color: '#86868b', marginBottom: 36, lineHeight: 1.6 }}>
              Role-gated access. Use the demo credentials on the right to explore each portal.
            </p>

            {/* Social login buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {/* Google */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={!googleEnabled || socialBusy === 'google'}
                  title={!googleEnabled ? 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local to enable' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1.5px solid #e5e5ea',
                    background: googleEnabled ? '#fff' : '#fafafa',
                    fontSize: 14,
                    fontWeight: 600,
                    color: googleEnabled ? '#1d1d1f' : '#aaa',
                    cursor: googleEnabled ? 'pointer' : 'not-allowed',
                    transition: 'border-color 0.15s',
                    opacity: socialBusy === 'google' ? 0.6 : 1,
                  }}
                >
                  <GoogleIcon />
                  {socialBusy === 'google' ? 'Redirecting…' : 'Continue with Google'}
                  {!googleEnabled && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#bbb', marginLeft: 4 }}>(not configured)</span>
                  )}
                </button>
              </div>

              {/* Facebook */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={!facebookEnabled || socialBusy === 'facebook'}
                  title={!facebookEnabled ? 'Add FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET to .env.local to enable' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1.5px solid #e5e5ea',
                    background: facebookEnabled ? '#fff' : '#fafafa',
                    fontSize: 14,
                    fontWeight: 600,
                    color: facebookEnabled ? '#1877F2' : '#aaa',
                    cursor: facebookEnabled ? 'pointer' : 'not-allowed',
                    transition: 'border-color 0.15s',
                    opacity: socialBusy === 'facebook' ? 0.6 : 1,
                  }}
                >
                  <FacebookIcon />
                  {socialBusy === 'facebook' ? 'Redirecting…' : 'Continue with Facebook'}
                  {!facebookEnabled && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#bbb', marginLeft: 4 }}>(not configured)</span>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: '#e5e5ea' }} />
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>or sign in with credentials</span>
              <div style={{ flex: 1, height: 1, background: '#e5e5ea' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {err && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: 14 }}>
                  {err}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="investor / manager / auditor"
                  autoComplete="username"
                  required
                  style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e5ea', fontSize: 15, outline: 'none', background: '#fff', color: '#1d1d1f' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e5ea', fontSize: 15, outline: 'none', background: '#fff', color: '#1d1d1f' }}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: 8,
                  padding: '14px 0',
                  borderRadius: 980,
                  background: busy ? '#86868b' : '#1d1d1f',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  border: 'none',
                  cursor: busy ? 'default' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* ── Right: demo credentials ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#86868b', marginBottom: 4 }}>
              Demo Credentials — click to auto-fill
            </p>

            {DEMO_CREDS.map(c => (
              <button
                key={c.username}
                onClick={() => fillCreds(c.username, c.password)}
                style={{
                  textAlign: 'left',
                  padding: '20px 24px',
                  borderRadius: 18,
                  border: username === c.username ? `2px solid ${c.color}` : '1.5px solid #e5e5ea',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: username === c.username ? `0 0 0 3px ${c.color}22` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{c.role}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#86868b' }}>
                    user: <span style={{ fontFamily: 'monospace', color: '#1d1d1f', fontWeight: 600 }}>{c.username}</span>
                  </span>
                  <span style={{ fontSize: 12, color: '#86868b' }}>
                    pass: <span style={{ fontFamily: 'monospace', color: '#1d1d1f', fontWeight: 600 }}>{c.password}</span>
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>{c.desc}</p>
              </button>
            ))}

            <p style={{ fontSize: 12, color: '#c0c0c8', marginTop: 4, lineHeight: 1.6 }}>
              Beta access. Credentials are pre-configured for demonstration.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
