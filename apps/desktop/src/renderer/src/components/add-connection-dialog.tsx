'use client'

import { useState } from 'react'
import { Loader2, Database, CheckCircle2, XCircle, Link, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { useConnectionStore } from '@/stores'

interface AddConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type InputMode = 'manual' | 'connection-string'

function parseConnectionString(connectionString: string): {
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl: boolean
} | null {
  try {
    // Handle postgresql:// or postgres:// URLs
    const url = new URL(connectionString)

    if (!url.protocol.startsWith('postgres')) {
      return null
    }

    const host = url.hostname || 'localhost'
    const port = url.port || '5432'
    const database = url.pathname.replace(/^\//, '') || 'postgres'
    const user = url.username || 'postgres'
    const password = decodeURIComponent(url.password || '')

    // Check for SSL in query params
    const sslParam = url.searchParams.get('sslmode') || url.searchParams.get('ssl')
    const ssl = sslParam ? !['disable', 'false', '0'].includes(sslParam.toLowerCase()) : false

    return { host, port, database, user, password, ssl }
  } catch {
    return null
  }
}

export function AddConnectionDialog({ open, onOpenChange }: AddConnectionDialogProps) {
  const addConnection = useConnectionStore((s) => s.addConnection)

  const [inputMode, setInputMode] = useState<InputMode>('manual')
  const [connectionString, setConnectionString] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('5432')
  const [database, setDatabase] = useState('')
  const [user, setUser] = useState('postgres')
  const [password, setPassword] = useState('')
  const [ssl, setSsl] = useState(false)

  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value)
    setParseError(null)

    if (!value.trim()) {
      return
    }

    const parsed = parseConnectionString(value)
    if (parsed) {
      setHost(parsed.host)
      setPort(parsed.port)
      setDatabase(parsed.database)
      setUser(parsed.user)
      setPassword(parsed.password)
      setSsl(parsed.ssl)
    } else {
      setParseError('Invalid connection string format')
    }
  }

  const resetForm = () => {
    setInputMode('manual')
    setConnectionString('')
    setParseError(null)
    setName('')
    setHost('localhost')
    setPort('5432')
    setDatabase('')
    setUser('postgres')
    setPassword('')
    setSsl(false)
    setTestResult(null)
    setTestError(null)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const getConnectionConfig = () => ({
    id: crypto.randomUUID(),
    name: name || `${host}/${database}`,
    host,
    port: parseInt(port, 10),
    database,
    user,
    password: password || undefined,
    ssl
  })

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    setTestError(null)

    try {
      const config = getConnectionConfig()
      const result = await window.api.db.connect(config)

      if (result.success) {
        setTestResult('success')
      } else {
        setTestResult('error')
        setTestError(result.error || 'Connection failed')
      }
    } catch (error) {
      setTestResult('error')
      setTestError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const config = getConnectionConfig()

      // Save to persistent storage
      const result = await window.api.connections.add(config)

      if (result.success && result.data) {
        // Add to local store
        addConnection(result.data)
        handleClose()
      } else {
        setTestResult('error')
        setTestError(result.error || 'Failed to save connection')
      }
    } catch (error) {
      setTestResult('error')
      setTestError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  const isValid =
    inputMode === 'connection-string'
      ? connectionString && !parseError && host && port && database && user
      : host && port && database && user

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Add Connection
          </SheetTitle>
          <SheetDescription>
            Add a new PostgreSQL database connection. Your credentials are stored securely on your
            device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-4 px-4">
          {/* Input Mode Toggle */}
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                inputMode === 'manual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings2 className="size-4" />
              Manual
            </button>
            <button
              type="button"
              onClick={() => setInputMode('connection-string')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                inputMode === 'connection-string'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link className="size-4" />
              Connection String
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Connection Name
            </label>
            <Input
              id="name"
              placeholder="My Database"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Defaults to host/database if empty.
            </p>
          </div>

          {inputMode === 'connection-string' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="connection-string" className="text-sm font-medium">
                Connection String
              </label>
              <Input
                id="connection-string"
                placeholder="postgresql://user:password@host:5432/database"
                value={connectionString}
                onChange={(e) => handleConnectionStringChange(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: postgresql://user:password@host:port/database
              </p>
              {parseError && <p className="text-xs text-destructive">{parseError}</p>}
              {connectionString && !parseError && (
                <div className="rounded-md bg-muted p-3 text-xs">
                  <p className="font-medium mb-1">Parsed values:</p>
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>Host:</span>
                    <span className="font-mono">{host}</span>
                    <span>Port:</span>
                    <span className="font-mono">{port}</span>
                    <span>Database:</span>
                    <span className="font-mono">{database}</span>
                    <span>User:</span>
                    <span className="font-mono">{user}</span>
                    <span>Password:</span>
                    <span className="font-mono">{password ? '••••••••' : '(none)'}</span>
                    <span>SSL:</span>
                    <span className="font-mono">{ssl ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="host" className="text-sm font-medium">
                  Host
                </label>
                <Input
                  id="host"
                  placeholder="localhost"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="port" className="text-sm font-medium">
                  Port
                </label>
                <Input
                  id="port"
                  type="number"
                  placeholder="5432"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="database" className="text-sm font-medium">
                  Database
                </label>
                <Input
                  id="database"
                  placeholder="postgres"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="user" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="user"
                  placeholder="postgres"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="ssl"
                  type="checkbox"
                  checked={ssl}
                  onChange={(e) => setSsl(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <label htmlFor="ssl" className="text-sm font-medium">
                  Use SSL
                </label>
              </div>
            </>
          )}

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                testResult === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Connection successful!
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  {testError}
                </>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={!isValid || isTesting}>
            {isTesting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Connection'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
