import { useState } from 'react';
import { Menu, MessageSquare, X } from 'lucide-react';

const links = [
  { label: 'Services', href: '#services' },
  { label: 'AI Estimate', href: '#ai-estimate' },
  { label: 'Providers', href: '#providers' },
  { label: 'How it works', href: '#how-it-works' }
];

export default function NavigationBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#f4f8fc]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 lg:px-9">
        <a href="/" className="flex shrink-0 items-center gap-3" aria-label="GharSewa home">
          <img
            src="/assets/gharsewalogo.png"
            alt=""
            className="h-20 w-20 rounded-xl object-contain"
          />
          <span className="leading-tight">
            <span className="block text-2xl font-bold tracking-tight text-slate-900">GharSewa</span>
            <span className="mt-1 block text-xs font-semibold tracking-[0.2em] text-blue-600">GHAR KO SEVA</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-base font-semibold text-slate-700 lg:flex">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:text-[#2148b5]">
              {link.label}
            </a>
          ))}
          <a
            href="#messages"
            className="flex items-center gap-2 rounded-xl bg-[#2148b5] px-5 py-3 text-white transition hover:bg-blue-800"
          >
            <MessageSquare size={18} />
            <span>Messages</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-1 text-sm">
              2
            </span>
          </a>
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
        <nav className="border-t border-slate-200 px-5 py-3 lg:hidden">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2148b5]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#messages"
              className="mt-1 flex items-center gap-2 rounded-lg bg-[#2148b5] px-3 py-2.5 font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              <MessageSquare size={18} />
              Messages
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-1 text-sm">
                2
              </span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
