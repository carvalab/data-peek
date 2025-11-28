import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link
} from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { AppSidebar } from '@/components/app-sidebar'
import { NavActions } from '@/components/nav-actions'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { QueryEditor } from '@/components/query-editor'
import { useConnectionStore } from '@/stores'

// Root Layout
function RootLayout() {
  const activeConnection = useConnectionStore((s) => s.getActiveConnection())

  return (
    <ThemeProvider defaultTheme="dark" storageKey="data-peek-theme">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="titlebar-drag-region flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger className="titlebar-no-drag" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <span className="text-sm font-medium text-muted-foreground">data-peek</span>
              {activeConnection && (
                <>
                  <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                  />
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${activeConnection.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    <span className="text-sm text-foreground">{activeConnection.name}</span>
                  </div>
                </>
              )}
            </div>
            <div className="titlebar-no-drag ml-auto px-3">
              <NavActions />
            </div>
          </header>

          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}

// Settings Page
function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      <div className="space-y-6 max-w-2xl">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h2 className="text-lg font-medium mb-2">General</h2>
          <p className="text-sm text-muted-foreground">
            Application settings will be available here in a future update.
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h2 className="text-lg font-medium mb-2">Connections</h2>
          <p className="text-sm text-muted-foreground">
            Manage your database connections and credentials.
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h2 className="text-lg font-medium mb-2">Editor</h2>
          <p className="text-sm text-muted-foreground">
            Customize the query editor appearance and behavior.
          </p>
        </div>
      </div>
    </div>
  )
}

// Create routes
const rootRoute = createRootRoute({
  component: RootLayout
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: QueryEditor
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
})

// Create route tree
const routeTree = rootRoute.addChildren([indexRoute, settingsRoute])

// Create router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Use memory history for Electron (no URL bar)
  history: undefined
})

// Type declaration for router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
