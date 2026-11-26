import { useEffect, useState } from 'react';
import { BadgeCheck, CalendarDays, LogOut, MapPin, Menu, MessageSquare, UserRound, X } from 'lucide-react';

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

  useEffect(() => {
    if (!profileOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('[data-profile-menu]')) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false);
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  function handleSignOut() {
    localStorage.removeItem('gharsewaToken');
    setAuthToken(null);
    setProfile(null);
    setProfileOpen(false);
  }

  function renderProfileDropdown() {
    if (!profileOpen) return null;

    return (
      <div className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-sm font-normal text-slate-700 shadow-[0_18px_50px_-16px_rgba(15,23,42,0.28)] ring-1 ring-black/5">
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2148b5] text-white shadow-md shadow-blue-900/15">
              <UserRound size={23} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">Your profile</h2>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {profile?.email ?? 'Account information'}
              </p>
            </div>
          </div>
          {profile && (
            <span className="mt-4 inline-flex rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold capitalize text-[#2148b5]">
              {profile.role} account
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          {profileLoading ? (
            <p role="status" className="flex items-center gap-2 py-1 text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#2148b5]" />
              Loading your profile...
            </p>
          ) : profileError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {profileError}
            </p>
          ) : profile ? (
            <div className="space-y-3">
              {profile.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={17} className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="truncate font-medium text-slate-800">{profile.location}</p>
                  </div>
                </div>
              )}
              {typeof profile.is_email_verified === 'boolean' && (
                <div className="flex items-center gap-3">
                  <BadgeCheck size={17} className="shrink-0 text-slate-400" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">Email status</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        profile.is_email_verified
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {profile.is_email_verified ? 'Verified' : 'Not verified'}
                    </span>
                  </div>
                </div>
              )}
              {profile.role === 'provider' && profile.verification_status && (
                <div className="flex items-center gap-3">
                  <BadgeCheck size={17} className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Provider status</p>
                    <p className="font-medium capitalize text-slate-800">{profile.verification_status}</p>
                  </div>
                </div>
              )}
              {profile.created_at && (
                <div className="flex items-center gap-3">
                  <CalendarDays size={17} className="shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Member since</p>
                    <p className="font-medium text-slate-800">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 border-t border-slate-100 px-5 py-4 text-left font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    );
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
              <div className="relative" data-profile-menu>
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
                <div className="relative mt-1" data-profile-menu>
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
