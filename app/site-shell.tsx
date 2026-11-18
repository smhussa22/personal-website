'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { Header } from './header'
import { Footer, ThemeSwitch } from './footer'

// Most pages use the narrow personal-site layout. The Maroof Street demo is a full dashboard, so it gets its own wide
// layout with a slim top bar (a home button and the theme switch) instead of the site header and footer.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  if (path?.startsWith('/maroof-street')) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5">
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <div className="flex">
            <ThemeSwitch />
          </div>
        </nav>
        {children}
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-screen-sm flex-1 px-4 pt-20">
      <Header />
      {children}
      <Footer />
    </div>
  )
}
