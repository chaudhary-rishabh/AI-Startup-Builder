'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/integrations', label: 'Integrations' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname()
  return (
    <div className="flex min-h-[calc(100vh-100px)] bg-bg">
      <nav className="w-[200px] shrink-0 border-r border-divider bg-sidebar px-2 py-6">
        <p className="mb-3 px-2 text-[10px] font-medium uppercase tracking-wide text-muted">Settings</p>
        <ul className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex h-9 items-center rounded-md px-4 text-sm hover:bg-divider ${
                    active ? 'border-l-[3px] border-brand bg-divider font-medium text-heading' : 'text-muted'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="min-w-0 flex-1 bg-card">{children}</div>
    </div>
  )
}
