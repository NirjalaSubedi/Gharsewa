import { BriefcaseBusiness, House } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type UserRole = 'taker' | 'provider';

type LoginResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
};

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null || !('user' in value)) {
    return false;
  }

  const response = value as { token?: unknown; user?: unknown };
  if (typeof response.token !== 'string' || typeof response.user !== 'object' || response.user === null) {
    return false;
  }

  const user = response.user as { id?: unknown; email?: unknown; role?: unknown };
  return typeof user.id === 'number' && typeof user.email === 'string' && typeof user.role === 'string';
}

export default function SignInPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

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

      if (payload.user.role !== selectedRole) {
        const accountType = payload.user.role === 'provider' ? 'Provider' : 'Taker';
        throw new Error(`This account is registered as a ${accountType}. Select the matching account type to sign in.`);
      }

      localStorage.setItem('gharsewaToken', payload.token);
      window.location.assign('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8fc] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        {!selectedRole ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedRole('taker')}
                className="flex flex-col items-center rounded-xl border border-slate-200 p-5 text-center transition hover:border-[#2148b5] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2148b5]"
              >
                <House aria-hidden="true" className="mb-3 h-8 w-8 text-[#2148b5]" />
                <span className="font-semibold text-slate-900">Taker</span>
                <span className="mt-1 text-sm text-slate-600">Book services</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('provider')}
                className="flex flex-col items-center rounded-xl border border-slate-200 p-5 text-center transition hover:border-[#2148b5] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2148b5]"
              >
                <BriefcaseBusiness aria-hidden="true" className="mb-3 h-8 w-8 text-[#2148b5]" />
                <span className="font-semibold text-slate-900">Provider</span>
                <span className="mt-1 text-sm text-slate-600">Offer your services</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Sign in as {selectedRole === 'taker' ? 'Taker' : 'Provider'}</h1>
            <p className="mt-1 text-sm text-slate-600">Sign in to your GharSewa account.</p>

            <form onSubmit={handleSubmit} className="mt-6">
              <label htmlFor="sign-in-email" className="block text-sm font-medium text-slate-700">
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

              {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-lg bg-[#2148b5] px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </>
        )}

        <a href="/" className="mt-5 block text-center text-sm font-medium text-[#2148b5] hover:underline">
          Back to home
        </a>
      </section>
    </main>
  );
}
