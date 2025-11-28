import { ElectronAPI } from '@electron-toolkit/preload'
import type { ConnectionConfig, IpcResponse, DatabaseSchema, EditBatch, EditResult } from '@shared/index'

interface DataPeekApi {
  connections: {
    list: () => Promise<IpcResponse<ConnectionConfig[]>>
    add: (connection: ConnectionConfig) => Promise<IpcResponse<ConnectionConfig>>
    update: (connection: ConnectionConfig) => Promise<IpcResponse<ConnectionConfig>>
    delete: (id: string) => Promise<IpcResponse<void>>
  }
  db: {
    connect: (config: ConnectionConfig) => Promise<IpcResponse<void>>
    query: (config: ConnectionConfig, query: string) => Promise<IpcResponse<unknown>>
    schemas: (config: ConnectionConfig) => Promise<IpcResponse<DatabaseSchema>>
    execute: (config: ConnectionConfig, batch: EditBatch) => Promise<IpcResponse<EditResult>>
    previewSql: (batch: EditBatch) => Promise<IpcResponse<Array<{ operationId: string; sql: string }>>>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DataPeekApi
  }
}
