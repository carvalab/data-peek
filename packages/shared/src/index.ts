export interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  fields: {
    name: string;
    dataTypeID: number;
  }[];
  rowCount: number;
  durationMs: number;
}

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Schema Types - Shared across all DB adapters
// ============================================

/**
 * Column metadata for a table or view
 * Compatible with: PostgreSQL, MySQL, SQLite
 */
export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  /** Column position in the table (1-indexed) */
  ordinalPosition: number;
}

/**
 * Table or view metadata
 */
export interface TableInfo {
  name: string;
  type: 'table' | 'view';
  columns: ColumnInfo[];
  /** Estimated row count (if available) */
  estimatedRowCount?: number;
}

/**
 * Schema/namespace metadata
 * Note: SQLite doesn't have schemas, will use 'main' as default
 */
export interface SchemaInfo {
  name: string;
  tables: TableInfo[];
}

/**
 * Complete database schema structure
 */
export interface DatabaseSchema {
  schemas: SchemaInfo[];
  /** When the schema was last fetched */
  fetchedAt: number;
}
