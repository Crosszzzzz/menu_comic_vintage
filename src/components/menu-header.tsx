import { restaurant } from '@/data/menu'
import { HowItWorks } from './how-it-works'
import { ThemeToggle } from './theme-toggle'

export function MenuHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="#carta" aria-label={`${restaurant.name}, ir a la carta`}>
        <span className="brand-name">{restaurant.name}</span>
        <span className="brand-tag">{restaurant.tagline}</span>
      </a>
      <div className="topbar-actions">
        <ThemeToggle />
        <HowItWorks />
      </div>
    </header>
  )
}
