import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'botana-theme'

function paint(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = dark ? '#16120c' : '#f6ead3'
}

export function ThemeToggle() {
  // The inline script in index.html sets the class before paint; reading it
  // keeps the first render in sync with the current theme.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    paint(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // Private mode: the visual toggle still works for this visit.
    }
  }

  return (
    <button
      id="theme-toggle"
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title="Modo claro / oscuro"
    >
      {dark ? <Sun size={19} strokeWidth={2} aria-hidden="true" /> : <Moon size={19} strokeWidth={2} aria-hidden="true" />}
    </button>
  )
}
