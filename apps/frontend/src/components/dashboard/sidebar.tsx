'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@omnifit/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Activities', href: '/dashboard/activities', icon: '📊' },
  { name: 'Streaks', href: '/dashboard/streaks', icon: '🔥' },
  { name: 'Rewards', href: '/dashboard/rewards', icon: '🪙' },
  { name: 'Partners', href: '/dashboard/partners', icon: '🤝' },
  { name: 'Wallet', href: '/dashboard/wallet', icon: '💳' },
  { name: 'Profile', href: '/dashboard/profile', icon: '👤' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-card border-r">
      <div className="p-6">
        <div className="text-2xl font-bold text-gradient-primary">
          OmniFit
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}