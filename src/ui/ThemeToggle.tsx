import { useTheme } from '../theme'

/** One button, everywhere the same: sun in the dark, moon in the light. */
export function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? 'Helles Design' : 'Dunkles Design'}
      title={dark ? 'Helles Design' : 'Dunkles Design'}
    >
      {dark ? '☀' : '☾'}
    </button>
  )
}
