import { useState } from 'react';
import { Menu, MessageSquare, X } from 'lucide-react';

type LoginResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
};

const links = [
  { label: 'Services', href: '#services' },
  { label: 'AI Estimate', href: '#ai-estimate' },
  { label: 'Providers', href: '#providers' },
  { label: 'How it works', href: '#how-it-works' }
];

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null || !('user' in value)) {
    return false;
  }

  const response = value as { token?: unknown; user?: unknown };
  if (typeof response.token !== 'string' || typeof response.user !== 'object' || response.user === null) {
    return false;
  }

  const user = response.user as { id?: unknown; email?: unknown; role?: unknown };
  return (
    typeof user.id === 'number' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  );
}

export default function NavigationBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('gharsewaToken'));
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInError('');
    setIsSigningIn(true);

    try {
      const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String(payload.error)
            : 'Unable to sign in';
        throw new Error(errorMessage);
      }

      if (!isLoginResponse(payload)) {
        throw new Error('Invalid response from the server');
      }

      localStorage.setItem('gharsewaToken', payload.token);
      setAuthToken(payload.token);
      setSignInOpen(false);
      setPassword('');
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem('gharsewaToken');
    setAuthToken(null);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#f4f8fc]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2 lg:px-6">
        <a href="/" className="flex shrink-0 items-center gap-3" aria-label="GharSewa home">
          <img
            src="/assets/gharsewalogo.png"
            alt=""
            className="h-20 w-20 rounded-xl object-contain"
          />
          <span className="leading-tight">
            <span className="block text-2xl font-bold tracking-tight text-slate-900">GharSewa</span>
            <span className="block text-xs font-semibold tracking-[0.2em] text-blue-600">GHAR KO SEVA</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-base font-semibold text-slate-700 lg:flex">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:text-[#2148b5]">
              {link.label}
            </a>
          ))}
          {authToken ? (
            <>
              <a
                id="messages"
                href="#messages"
                className="flex items-center gap-2 rounded-xl bg-[#2148b5] px-4 py-2 text-white transition hover:bg-blue-800"
              >
                <MessageSquare size={18} />
                <span>Messages</span>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-1 text-sm">
                  2
                </span>
              </a>
              <button type="button" onClick={handleSignOut} className="text-sm hover:text-[#2148b5]">
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="rounded-xl bg-[#2148b5] px-4 py-2 text-white transition hover:bg-blue-800"
            >
              Sign in
            </button>
          )}
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 lg:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 px-4 py-2 lg:hidden">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2148b5]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {authToken ? (
              <>
                <a
                  id="messages"
                  href="#messages"
                  className="mt-1 flex items-center gap-2 rounded-lg bg-[#2148b5] px-3 py-2 font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <MessageSquare size={18} />
                  Messages
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-1 text-sm">
                    2
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2 text-left font-semibold text-slate-700 hover:bg-blue-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSignInOpen(true);
                  setMenuOpen(false);
                }}
                className="mt-1 rounded-lg bg-[#2148b5] px-3 py-2 text-left font-semibold text-white"
              >
                Sign in
              </button>
            )}
          </div>
        </nav>
      )}

      {signInOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4">
          <form
            onSubmit={handleSignIn}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            aria-labelledby="sign-in-title"
          >
            <button
              type="button"
              aria-label="Close sign-in form"
              onClick={() => setSignInOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
            <h2 id="sign-in-title" className="text-2xl font-bold text-slate-900">Sign in</h2>
            <label htmlFor="sign-in-email" className="mt-5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
            />
            <label htmlFor="sign-in-password" className="mt-4 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
            />
            {signInError && <p role="alert" className="mt-3 text-sm text-red-600">{signInError}</p>}
            <button
              type="submit"
              disabled={isSigningIn}
              className="mt-5 w-full rounded-lg bg-[#2148b5] px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {isSigningIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
