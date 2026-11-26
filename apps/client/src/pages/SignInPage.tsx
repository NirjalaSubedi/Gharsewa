import { BriefcaseBusiness, House, MapPin } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type UserRole = 'taker' | 'provider';
type Coordinates = { latitude: number; longitude: number };

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

function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (geolocationError) => {
        const message =
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : geolocationError.code === geolocationError.POSITION_UNAVAILABLE
              ? 'Your current location is unavailable.'
              : geolocationError.code === geolocationError.TIMEOUT
                ? 'Location request timed out.'
                : 'Unable to get your location.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export default function SignInPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [signupStep, setSignupStep] = useState<'role' | 'details' | 'verify' | 'complete' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [citizenshipPhoto, setCitizenshipPhoto] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLocationError('');
    setIsSubmitting(true);

    try {
      let coordinates: Coordinates | undefined;
      try {
        coordinates = await getCurrentCoordinates();
      } catch (locationFailure) {
        setLocationError(
          `${locationFailure instanceof Error ? locationFailure.message : 'Unable to get your location.'} Continuing without location.`
        );
      }

      const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(coordinates ?? {}) })
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
      window.location.assign('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRole) {
      setError('Choose an account type to continue');
      return;
    }
    if ((latitude.trim() === '') !== (longitude.trim() === '')) {
      setLatitude('');
      setLongitude('');
    }

    setError('');
    setLocationError('');
    setIsSubmitting(true);

    try {
      let coordinates: Coordinates | undefined;
      if (latitude.trim() && longitude.trim()) {
        coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
      } else {
        try {
          coordinates = await getCurrentCoordinates();
          setLatitude(String(coordinates.latitude));
          setLongitude(String(coordinates.longitude));
        } catch (locationFailure) {
          setLocationError(
            `${locationFailure instanceof Error ? locationFailure.message : 'Unable to get your location.'} Continuing without location.`
          );
        }
      }

      const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          role: selectedRole,
          ...(coordinates ?? {}),
          ...(location.trim() ? { location: location.trim() } : {}),
          ...(selectedRole === 'provider' ? { citizenshipPhoto: citizenshipPhoto.trim() } : {})
        })
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String(payload.error)
            : 'Unable to create account';
        throw new Error(errorMessage);
      }

      if (typeof payload !== 'object' || payload === null || !('email' in payload) || typeof payload.email !== 'string') {
        throw new Error('Invalid response from the server');
      }

      setSignupEmail(payload.email);
      setSuccessMessage('A verification code has been sent to your email.');
      setSignupStep('verify');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGetLocation() {
    setLocationError('');
    setIsLocating(true);
    getCurrentCoordinates()
      .then(({ latitude: currentLatitude, longitude: currentLongitude }) => {
        setLatitude(String(currentLatitude));
        setLongitude(String(currentLongitude));
      })
      .catch((locationFailure: unknown) => {
        setLocationError(locationFailure instanceof Error ? locationFailure.message : 'Unable to get your location.');
      })
      .finally(() => setIsLocating(false));
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, otp })
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String(payload.error)
            : 'Unable to verify email';
        throw new Error(errorMessage);
      }

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('message' in payload) ||
        typeof payload.message !== 'string' ||
        !('token' in payload) ||
        (typeof payload.token !== 'string' && payload.token !== null)
      ) {
        throw new Error('Invalid response from the server');
      }

      if (payload.token) {
        localStorage.setItem('gharsewaToken', payload.token);
        window.location.assign('/');
        return;
      }

      setSuccessMessage(payload.message);
      setSignupStep('complete');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to verify email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8fc] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        {signupStep === 'role' ? (
          <>
            <h1 className="text-center text-2xl font-bold text-slate-900">Create an account</h1>
            <p className="mt-1 text-center text-sm text-slate-600">Choose how you want to use GharSewa.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('taker');
                  setSignupStep('details');
                  setError('');
                }}
                aria-pressed={selectedRole === 'taker'}
                className="flex flex-col items-center rounded-xl border border-slate-200 p-5 text-center transition hover:border-[#2148b5] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2148b5]"
              >
                <House aria-hidden="true" className="mb-3 h-8 w-8 text-[#2148b5]" />
                <span className="font-semibold text-slate-900">Taker</span>
                <span className="mt-1 text-sm text-slate-600">Book services</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('provider');
                  setSignupStep('details');
                  setError('');
                }}
                aria-pressed={selectedRole === 'provider'}
                className="flex flex-col items-center rounded-xl border border-slate-200 p-5 text-center transition hover:border-[#2148b5] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2148b5]"
              >
                <BriefcaseBusiness aria-hidden="true" className="mb-3 h-8 w-8 text-[#2148b5]" />
                <span className="font-semibold text-slate-900">Provider</span>
                <span className="mt-1 text-sm text-slate-600">Offer your services</span>
              </button>
            </div>
          </>
        ) : signupStep === 'details' && selectedRole ? (
          <>
            <button
              type="button"
              onClick={() => {
                setSignupStep('role');
                setError('');
              }}
              className="mb-4 text-sm font-medium text-[#2148b5] hover:underline"
            >
              Change account type
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Create {selectedRole === 'taker' ? 'Taker' : 'Provider'} account
            </h1>
            <p className="mt-1 text-sm text-slate-600">Enter your details to get started.</p>

            <form onSubmit={handleRegister} className="mt-6">
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                maxLength={255}
                required
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
              />

              <label htmlFor="signup-password" className="mt-4 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
              />

              <label htmlFor="signup-location" className="mt-4 block text-sm font-medium text-slate-700">
                Location <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="signup-location"
                type="text"
                autoComplete="address-level2"
                minLength={2}
                maxLength={255}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
              />

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#2148b5] hover:underline disabled:opacity-60"
              >
                <MapPin aria-hidden="true" size={16} />
                {isLocating ? 'Getting location...' : 'Use my current location'}
              </button>
              {locationError && <p role="alert" className="mt-2 text-sm text-red-600">{locationError}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-latitude" className="block text-sm font-medium text-slate-700">
                    Latitude <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="signup-latitude"
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
                  />
                </div>
                <div>
                  <label htmlFor="signup-longitude" className="block text-sm font-medium text-slate-700">
                    Longitude <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="signup-longitude"
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
                  />
                </div>
              </div>

              {selectedRole === 'provider' && (
                <>
                  <label htmlFor="signup-citizenship-photo" className="mt-4 block text-sm font-medium text-slate-700">
                    Citizenship photo URL
                  </label>
                  <input
                    id="signup-citizenship-photo"
                    type="url"
                    maxLength={500}
                    required
                    value={citizenshipPhoto}
                    onChange={(event) => setCitizenshipPhoto(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
                  />
                </>
              )}

              {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
              {locationError && <p role="status" className="mt-3 text-sm text-amber-700">{locationError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || isLocating}
                className="mt-5 w-full rounded-lg bg-[#2148b5] px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </>
        ) : signupStep === 'verify' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
            <p className="mt-1 text-sm text-slate-600">{successMessage} Enter the 6-digit code sent to {signupEmail}.</p>
            <form onSubmit={handleVerifyEmail} className="mt-6">
              <label htmlFor="signup-otp" className="block text-sm font-medium text-slate-700">
                Verification code
              </label>
              <input
                id="signup-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2148b5]"
              />
              {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-lg bg-[#2148b5] px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Verifying...' : 'Verify email'}
              </button>
            </form>
          </>
        ) : signupStep === 'complete' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Email verified</h1>
            <p className="mt-2 text-sm text-slate-600">{successMessage}</p>
            <a href="/signin" className="mt-5 block text-center text-sm font-medium text-[#2148b5] hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
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
              {locationError && <p role="status" className="mt-3 text-sm text-amber-700">{locationError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-lg bg-[#2148b5] px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setSignupStep('role');
                  setError('');
                  setSuccessMessage('');
                  setSignupEmail('');
                  setSignupPassword('');
                  setLocation('');
                  setLatitude('');
                  setLongitude('');
                  setLocationError('');
                  setCitizenshipPhoto('');
                  setOtp('');
                }}
                className="font-medium text-[#2148b5] hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        )}

        {signupStep === null && (
          <a href="/" className="mt-5 block text-center text-sm font-medium text-[#2148b5] hover:underline">
            Back to home
          </a>
        )}
      </section>
    </main>
  );
}
