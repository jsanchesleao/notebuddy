import { HashRouter } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeProvider'
import { AppShell } from './app/AppShell'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ThemeProvider>
  )
}
