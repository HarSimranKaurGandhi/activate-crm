import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Users, Package, Database, BarChart3, Settings, LogOut, ClipboardCheck, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from './BrandLogo';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Tasks', href: '/tasks', icon: ListChecks },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Products', href: '/products', icon: Package },
  {
    name: 'Masters',
    icon: Database,
    children: [
      { name: 'Categories', href: '/masters/categories' },
      { name: 'Users', href: '/masters/users' },
      { name: 'Brands', href: '/masters/brands' },
      { name: 'Adjustments', href: '/masters/adjustments' },
      { name: 'Terms & Conditions', href: '/masters/terms' },
      { name: 'Custom Fields', href: '/masters/custom-fields' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mastersOpen, setMastersOpen] = useState(true);
  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();
  const canManageApprovals = ['admin', 'operations'].includes(role);
  const navigation = canManageApprovals
    ? [
        ...baseNavigation.slice(0, 2),
        { name: 'Approvals', href: '/quotations/approvals', icon: ClipboardCheck },
        ...baseNavigation.slice(2),
      ]
    : baseNavigation;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="crm-shell flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="crm-sidebar w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-14 flex items-center justify-center px-4 border-b border-slate-200">
          <BrandLogo
            className="w-full justify-center"
            imageClassName="h-11 w-auto max-w-[10rem]"
          />
        </div>

        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {navigation.map((item) => {
              if (item.children) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setMastersOpen(!mastersOpen)}
                      className={`crm-nav-item w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        location.pathname.startsWith('/masters')
                          ? 'crm-nav-active bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.name}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${mastersOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {mastersOpen && (
                      <div className="mt-1 ml-7 border-l border-slate-200 pl-3 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={`block px-3 py-1.5 text-sm rounded-md transition-all ${
                              isActive(child.href)
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`crm-nav-item flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'crm-nav-active bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-2.5 border-t border-slate-200">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-5">
          <h1 className="text-lg font-semibold text-slate-950">
            {navigation.find(n => isActive(n.href || ''))?.name || 'Masters'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{String(user?.name || 'U').slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="text-sm leading-tight">
                <div className="font-semibold text-slate-900">{user?.name || 'User'}</div>
                <div className="text-xs text-slate-500">{user?.email || ''}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="crm-main flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
