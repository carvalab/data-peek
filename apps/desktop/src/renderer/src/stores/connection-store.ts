import { create } from 'zustand'
import { ConnectionConfig, SchemaInfo, TableInfo, ColumnInfo } from '@shared/index'

export interface Connection {
  id: string
  name: string
  host: string
  port: number
  database: string
  user: string
  password?: string
  ssl?: boolean
}

export interface ConnectionWithStatus extends Connection {
  isConnected: boolean
  isConnecting: boolean
  error?: string
}

// Re-export shared types for convenience
export type Column = ColumnInfo
export type Table = TableInfo
export type Schema = SchemaInfo

interface ConnectionState {
  // Connection management
  connections: ConnectionWithStatus[]
  activeConnectionId: string | null
  isInitialized: boolean

  // Schema for active connection
  schemas: Schema[]
  isLoadingSchema: boolean
  schemaError: string | null

  // Actions
  initializeConnections: () => Promise<void>
  setConnections: (connections: ConnectionWithStatus[]) => void
  addConnection: (connection: Connection) => void
  removeConnection: (id: string) => Promise<void>
  updateConnection: (id: string, updates: Partial<Connection>) => Promise<void>

  setActiveConnection: (id: string | null) => void
  setConnectionStatus: (
    id: string,
    status: Partial<Pick<ConnectionWithStatus, 'isConnected' | 'isConnecting' | 'error'>>
  ) => void

  setSchemas: (schemas: Schema[]) => void
  setLoadingSchema: (loading: boolean) => void
  fetchSchemas: (connectionId?: string) => Promise<void>

  // Computed
  getActiveConnection: () => ConnectionWithStatus | null
}

// Helper to convert ConnectionConfig to ConnectionWithStatus
const toConnectionWithStatus = (config: ConnectionConfig): ConnectionWithStatus => ({
  ...config,
  isConnected: false,
  isConnecting: false
})

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Initial state
  connections: [],
  activeConnectionId: null,
  isInitialized: false,
  schemas: [],
  isLoadingSchema: false,
  schemaError: null,

  // Actions
  initializeConnections: async () => {
    if (get().isInitialized) return

    try {
      const result = await window.api.connections.list()
      if (result.success && result.data) {
        set({
          connections: result.data.map(toConnectionWithStatus),
          isInitialized: true
        })
      } else {
        console.error('Failed to load connections:', result.error)
        set({ isInitialized: true })
      }
    } catch (error) {
      console.error('Failed to initialize connections:', error)
      set({ isInitialized: true })
    }
  },

  setConnections: (connections) => set({ connections }),

  addConnection: (connection) =>
    set((state) => ({
      connections: [
        ...state.connections,
        { ...connection, isConnected: false, isConnecting: false }
      ]
    })),

  removeConnection: async (id) => {
    try {
      const result = await window.api.connections.delete(id)
      if (result.success) {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId
        }))
      } else {
        console.error('Failed to delete connection:', result.error)
      }
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  },

  updateConnection: async (id, updates) => {
    const connection = get().connections.find((c) => c.id === id)
    if (!connection) return

    const updated = { ...connection, ...updates }
    try {
      const result = await window.api.connections.update(updated)
      if (result.success) {
        set((state) => ({
          connections: state.connections.map((c) => (c.id === id ? { ...c, ...updates } : c))
        }))
      } else {
        console.error('Failed to update connection:', result.error)
      }
    } catch (error) {
      console.error('Failed to update connection:', error)
    }
  },

  setActiveConnection: (id) => {
    set({ activeConnectionId: id })

    // Fetch schemas when connection changes
    if (id) {
      get().fetchSchemas(id)
    } else {
      set({ schemas: [], schemaError: null })
    }
  },

  fetchSchemas: async (connectionId?: string) => {
    const id = connectionId ?? get().activeConnectionId
    if (!id) return

    const connection = get().connections.find((c) => c.id === id)
    if (!connection) return

    set({ isLoadingSchema: true, schemas: [], schemaError: null })

    try {
      const result = await window.api.db.schemas(connection)

      if (result.success && result.data) {
        set({
          schemas: result.data.schemas,
          isLoadingSchema: false,
          schemaError: null
        })
      } else {
        set({
          schemas: [],
          isLoadingSchema: false,
          schemaError: result.error || 'Failed to fetch schemas'
        })
      }
    } catch (error) {
      console.error('Failed to fetch schemas:', error)
      set({
        schemas: [],
        isLoadingSchema: false,
        schemaError: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  setConnectionStatus: (id, status) =>
    set((state) => ({
      connections: state.connections.map((c) => (c.id === id ? { ...c, ...status } : c))
    })),

  setSchemas: (schemas) => set({ schemas }),
  setLoadingSchema: (loading) => set({ isLoadingSchema: loading }),

  getActiveConnection: () => {
    const state = get()
    return state.connections.find((c) => c.id === state.activeConnectionId) || null
  }
}))
