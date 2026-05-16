import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Users, Package, Database, BarChart3, Settings, LogOut, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from './BrandLogo';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <BrandLogo imageClassName="h-8" textClassName="text-sm tracking-[0.22em]" />
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              if (item.children) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setMastersOpen(!mastersOpen)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        location.pathname.startsWith('/masters')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
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
                      <div className="mt-1 ml-11 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={`block px-3 py-2 text-sm rounded-lg transition-all ${
                              isActive(child.href)
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
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
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <BrandLogo imageClassName="h-10" textClassName="text-base tracking-[0.22em]" />
            <div className="h-10 w-px bg-gray-200" />
            <h1 className="text-xl font-semibold text-gray-900">
              {navigation.find(n => isActive(n.href || ''))?.name || 'Masters'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{String(user?.name || 'U').slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.name || 'User'}</div>
                <div className="text-gray-500">{user?.email || ''}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
