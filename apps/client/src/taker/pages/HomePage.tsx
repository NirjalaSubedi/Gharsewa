import { useState } from 'react';
import { MapPin, Search, Zap } from 'lucide-react';

const popularSearches = ['Leaking tap', 'Deep cleaning', 'Wiring fix', 'Bridal makeup'];

const highlights = [
  { title: 'Verified', detail: 'local service providers' },
  { title: 'Itahari + Dharan', detail: 'home help close to you' },
  { title: 'AI estimates', detail: 'understand costs before booking' },
  { title: 'Simple booking', detail: 'trusted help, made easier' }
];

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [nearMe, setNearMe] = useState(false);

  return (
    <main className="bg-slate-950 text-white">
      <section
        id="services"
        className="relative flex min-h-[calc(100svh-6.125rem)] items-center justify-center overflow-hidden bg-slate-950 px-4 py-2 sm:px-6 lg:px-8"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(2, 8, 23, 0.24), rgba(2, 8, 23, 0.42)), url('/assets/bgImage.png')"
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-blue-50 shadow-lg backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
            Trusted home services near you
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            Ghar ko kaam,
            <br />
            bharosa sahit.
          </h1>
          <p className="mx-auto mt-2 max-w-3xl text-base leading-relaxed text-blue-100/90 sm:text-lg">
            Nepal&apos;s hyper-local home service marketplace. Describe the job in Nepali or English,
            get an AI price estimate, and find trusted local professionals.
          </p>

          <div
            id="ai-estimate"
            className="mx-auto mt-5 max-w-5xl rounded-[1.6rem] bg-white p-2 shadow-2xl shadow-black/30 sm:rounded-full"
          >
            <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="home-service-search" className="sr-only">
                Describe the home service you need
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-3 sm:px-4">
                <Search size={21} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  id="home-service-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Fix leaking kitchen sink in Itahari..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-800 outline-none placeholder:text-slate-500 sm:py-3.5"
                />
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  aria-pressed={nearMe}
                  onClick={() => setNearMe(!nearMe)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-4"
                >
                  <MapPin size={18} aria-hidden="true" />
                  Near Me
                  <span
                    className={`relative h-5 w-9 rounded-full transition ${
                      nearMe ? 'bg-[#2148b5]' : 'bg-slate-300'
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                        nearMe ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#2148b5] px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-800 sm:px-6 sm:text-base"
                >
                  <Zap size={18} fill="currentColor" aria-hidden="true" />
                  Find taskers
                </button>
              </div>
            </div>
          </div>

          <div id="providers" className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-sm font-semibold text-blue-100">Popular:</span>
            {popularSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSearch(item)}
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-blue-50 backdrop-blur transition hover:border-blue-300/60 hover:bg-blue-400/20"
              >
                {item}
              </button>
            ))}
          </div>

          <div
            id="how-it-works"
            className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-3 text-left sm:mt-8 sm:grid-cols-4 sm:gap-4"
          >
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md sm:px-5 sm:py-4"
              >
                <p className="text-base font-bold text-white sm:text-lg">{item.title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-blue-100/80 sm:text-sm">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
