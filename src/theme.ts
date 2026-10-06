/**
 * Light or dark, chosen by the student and remembered per browser.
 *
 * The choice lives as `data-theme` on <html>, which is all the stylesheet
 * looks at — see the `[data-theme="dark"]` token block in styles.css. With
 * no saved choice the OS preference wins, and keeps winning if it changes
 * while the tab is open. index.html applies the same rule inline before the
 * first paint, so a dark-mode student never sees a white flash on load.
 */

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'netzwerk-trainer:theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

export function currentTheme(): Theme {
  return saved() ?? (media().matches ? 'dark' : 'light')
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    apply(theme)
  }, [theme])

  // Follow the OS only while the student hasn't picked for themselves.
  useEffect(() => {
    const mq = media()
    const onChange = () => {
      if (!saved()) setTheme(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // A disabled localStorage just means the choice lasts until reload.
    }
    setTheme(next)
  }

  return [theme, toggle]
}
