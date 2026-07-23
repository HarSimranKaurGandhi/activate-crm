import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Users, Package, Warehouse, Database, BarChart3, Settings, LogOut, ClipboardCheck, ListChecks, Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from './BrandLogo';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Tasks', href: '/tasks', icon: ListChecks },
  { name: 'Leads', href: '/leads', icon: Phone },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  {
    name: 'Masters',
    icon: Database,
    children: [
      { name: 'Categories', href: '/masters/categories' },
      { name: 'Users', href: '/masters/users' },
      { name: 'Brands', href: '/masters/brands' },
      { name: 'Godowns', href: '/masters/godowns' },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const role = String(user?.role?.code || user?.role?.name || '').trim().toLowerCase();
  const canManageApprovals = ['admin', 'operations'].includes(role);
  const visibleBaseNavigation = baseNavigation
    .filter((item) => (role === 'admin' ? true : !['Settings', 'Reports'].includes(item.name)))
    .map((item) => {
      if (!item.children) {
        return item;
      }

      return {
        ...item,
        children: role === 'admin'
          ? item.children
          : item.children.filter((child) =>
              !['/masters/users', '/masters/adjustments', '/masters/custom-fields'].includes(child.href)
            ),
      };
    });
  const navigation = canManageApprovals
    ? [
        ...visibleBaseNavigation.slice(0, 2),
        { name: 'Approvals', href: '/quotations/approvals', icon: ClipboardCheck },
        ...visibleBaseNavigation.slice(2),
      ]
    : visibleBaseNavigation;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href === '/quotations') {
      return location.pathname === '/quotations'
        || (
          location.pathname.startsWith('/quotations/')
          && !location.pathname.startsWith('/quotations/approvals')
        );
    }
    if (href === '/quotations/approvals') {
      return location.pathname === '/quotations/approvals';
    }
    if (location.pathname === href) {
      return true;
    }
    return location.pathname.startsWith(`${href}/`);
  };

  const renderNavigation = () => (
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
                      onClick={() => setMobileNavOpen(false)}
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
            onClick={() => setMobileNavOpen(false)}
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
  );

  return (
    <div className="crm-shell flex h-screen bg-slate-50">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`crm-sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:max-w-none ${
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-14 flex items-center justify-center px-4 border-b border-slate-200">
          <BrandLogo
            className="w-full justify-center"
            imageClassName="h-11 w-auto max-w-[10rem]"
          />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {renderNavigation()}
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
              {navigation.find(n => isActive(n.href || ''))?.name || 'Masters'}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm sm:gap-2.5 sm:px-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{String(user?.name || 'U').slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="hidden text-sm leading-tight sm:block">
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
