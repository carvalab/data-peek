// Export utilities for CSV, JSON, and Excel formats

export interface ExportOptions {
  filename: string
  format: 'csv' | 'json' | 'xlsx'
}

export interface ExportData {
  columns: { name: string; dataType: string }[]
  rows: Record<string, unknown>[]
}

// Convert value to CSV-safe string
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

  // Escape if contains comma, newline, or double quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

// Export data to CSV format
export function exportToCSV(data: ExportData): string {
  const headers = data.columns.map((col) => escapeCSVValue(col.name)).join(',')
  const rows = data.rows.map((row) =>
    data.columns.map((col) => escapeCSVValue(row[col.name])).join(',')
  )
  return [headers, ...rows].join('\n')
}

// Export data to JSON format
export function exportToJSON(data: ExportData, pretty: boolean = true): string {
  const jsonData = data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    data.columns.forEach((col) => {
      obj[col.name] = row[col.name]
    })
    return obj
  })
  return pretty ? JSON.stringify(jsonData, null, 2) : JSON.stringify(jsonData)
}

// Trigger download in browser
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export and download CSV
export function downloadCSV(data: ExportData, filename: string): void {
  const csv = exportToCSV(data)
  downloadFile(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv')
}

// Export and download JSON
export function downloadJSON(data: ExportData, filename: string): void {
  const json = exportToJSON(data)
  downloadFile(json, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json')
}

// Generate default filename based on timestamp and optional table name
export function generateExportFilename(tableName?: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
  return tableName ? `${tableName}_${timestamp}` : `query_result_${timestamp}`
}
