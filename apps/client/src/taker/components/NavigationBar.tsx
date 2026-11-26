import { useEffect, useState } from 'react';
import { Menu, MessageSquare, UserRound, X } from 'lucide-react';

interface UserProfile {
  id: number;
  email: string;
  location?: string | null;
  role: 'taker' | 'provider' | 'admin';
  is_email_verified?: boolean;
  verification_status?: string | null;
  created_at?: string | null;
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === 'number' &&
    typeof profile.email === 'string' &&
    (profile.role === 'taker' || profile.role === 'provider' || profile.role === 'admin')
  );
}

const links = [
  { label: 'Services', href: '#services' },
  { label: 'AI Estimate', href: '#ai-estimate' },
  { label: 'Providers', href: '#providers' },
  { label: 'How it works', href: '#how-it-works' }
];

export default function NavigationBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('gharsewaToken'));
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!profileOpen || !authToken) return;

    const controller = new AbortController();
    const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
    setProfileLoading(true);
    setProfileError('');

    async function loadProfile() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof payload === 'object' && payload !== null && 'error' in payload
              ? String(payload.error)
              : `Unable to load profile (HTTP ${response.status})`;
          throw new Error(message);
        }

        if (!isUserProfile(payload)) {
          throw new Error('Invalid profile response from the server');
        }

        setProfile(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          setProfileError(error instanceof Error ? error.message : 'Unable to load profile');
        }
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [authToken, profileOpen]);

  function handleSignOut() {
    localStorage.removeItem('gharsewaToken');
    setAuthToken(null);
    setProfile(null);
    setProfileOpen(false);
  }

  function renderProfileDropdown() {
    if (!profileOpen) return null;

    return (
      <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-sm font-normal text-slate-700 shadow-xl">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Profile</h2>
        {profileLoading ? (
          <p role="status" className="py-2 text-slate-500">Loading profile...</p>
        ) : profileError ? (
          <p role="alert" className="py-2 text-red-600">{profileError}</p>
        ) : profile ? (
          <div className="space-y-2">
            <p className="break-all font-medium text-slate-900">{profile.email}</p>
            <p><span className="text-slate-500">Account type:</span> {profile.role}</p>
            {profile.location && (
              <p><span className="text-slate-500">Location:</span> {profile.location}</p>
            )}
            {typeof profile.is_email_verified === 'boolean' && (
              <p>
                <span className="text-slate-500">Email:</span>{' '}
                {profile.is_email_verified ? 'Verified' : 'Not verified'}
              </p>
            )}
            {profile.role === 'provider' && profile.verification_status && (
              <p>
                <span className="text-slate-500">Provider status:</span> {profile.verification_status}
              </p>
            )}
            {profile.created_at && (
              <p>
                <span className="text-slate-500">Member since:</span>{' '}
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full rounded-lg border-t border-slate-100 pt-3 text-left font-semibold text-slate-700 hover:text-[#2148b5]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#f4f8fc]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2 lg:px-6">
        <a href="/" className="flex shrink-0 items-center gap-3" aria-label="GharSewa home">
          <img
            src="/assets/gharsewalogo.png"
            alt=""
            className="h-20 w-20 rounded-xl object-contain"
          />
          <span className="leading-tight">
            <span className="block text-2xl font-bold tracking-tight text-slate-900">GharSewa</span>
            <span className="block text-xs font-semibold tracking-[0.2em] text-blue-600">
              GHAR KO SEVA
            </span>
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label={profileOpen ? 'Close profile menu' : 'Open profile menu'}
                  aria-expanded={profileOpen}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#2148b5] hover:text-[#2148b5]"
                >
                  <UserRound size={21} />
                </button>
                {renderProfileDropdown()}
              </div>
            </>
          ) : (
            <a
              href="/signin"
              className="rounded-xl bg-[#2148b5] px-4 py-2 text-white transition hover:bg-blue-800"
            >
              Sign in
            </a>
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
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(!profileOpen)}
                    aria-label={profileOpen ? 'Close profile menu' : 'Open profile menu'}
                    aria-expanded={profileOpen}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-blue-50"
                  >
                    <UserRound size={19} />
                    Profile
                  </button>
                  {renderProfileDropdown()}
                </div>
              </>
            ) : (
              <a
                href="/signin"
                className="mt-1 rounded-lg bg-[#2148b5] px-3 py-2 text-left font-semibold text-white"
              >
                Sign in
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
