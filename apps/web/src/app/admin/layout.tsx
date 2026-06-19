import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, TrendingUp, Scale, LogOut } from 'lucide-react';

const ADMIN_COOKIE = 'admin_session';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

function isAuthed() {
  const store = cookies();
  return store.get(ADMIN_COOKIE)?.value === PASSWORD;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) redirect('/admin/login');

  return (
    <div className="flex min-h-screen bg-(--color-bg)">
      {/* Sidebar */}
      <nav className="w-56 flex-shrink-0 bg-(--color-surface) border-r border-(--color-muted)/10 flex flex-col" aria-label="Admin navigation">
        <div className="px-4 py-5 border-b border-(--color-muted)/10">
          <span className="font-bold text-(--color-fg)">LoanWizard Admin</span>
        </div>
        <ul className="flex-1 py-4 px-2 flex flex-col gap-1" role="list">
          <NavItem href="/admin" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem href="/admin/sessions" icon={<Users size={16} />} label="Sessions" />
          <NavItem href="/admin/drift" icon={<TrendingUp size={16} />} label="Drift" />
          <NavItem href="/admin/fairness" icon={<Scale size={16} />} label="Fairness" />
        </ul>
        <div className="px-4 py-4 border-t border-(--color-muted)/10">
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="flex items-center gap-2 text-sm text-(--color-muted) hover:text-(--color-danger) transition-colors w-full">
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-(--color-muted) hover:bg-(--color-muted)/10 hover:text-(--color-fg) transition-colors"
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </Link>
    </li>
  );
}
