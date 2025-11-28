'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronLeft, ChevronRight, Copy, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface DataTableProps<TData> {
  columns: { name: string; dataType: string }[]
  data: TData[]
  pageSize?: number
}

function getTypeColor(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('uuid')) return 'text-purple-400'
  if (lower.includes('varchar') || lower.includes('text') || lower.includes('char'))
    return 'text-green-400'
  if (
    lower.includes('int') ||
    lower.includes('numeric') ||
    lower.includes('decimal') ||
    lower.includes('bigint')
  )
    return 'text-blue-400'
  if (lower.includes('timestamp') || lower.includes('date') || lower.includes('time'))
    return 'text-orange-400'
  if (lower.includes('bool')) return 'text-yellow-400'
  return 'text-muted-foreground'
}

function CellValue({ value, dataType }: { value: unknown; dataType: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value ?? ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic">NULL</span>
  }

  const stringValue = String(value)
  const isLong = stringValue.length > 50
  const isMono = dataType.toLowerCase().includes('uuid') || dataType.toLowerCase().includes('int')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={`text-left truncate max-w-[300px] hover:bg-accent/50 px-1 -mx-1 rounded transition-colors ${isMono ? 'font-mono text-xs' : ''}`}
          >
            {isLong ? stringValue.substring(0, 50) + '...' : stringValue}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md">
          <div className="flex items-start gap-2">
            <pre className="text-xs whitespace-pre-wrap break-all flex-1">{stringValue}</pre>
            <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={handleCopy}>
              <Copy className="size-3" />
            </Button>
          </div>
          {copied && <p className="text-xs text-green-500 mt-1">Copied!</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function DataTable<TData extends Record<string, unknown>>({
  columns: columnDefs,
  data,
  pageSize = 50
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  // Generate TanStack Table columns from column definitions
  const columns = React.useMemo<ColumnDef<TData>[]>(
    () =>
      columnDefs.map((col) => ({
        accessorKey: col.name,
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-auto py-1 px-2 -mx-2 font-medium hover:bg-accent/50"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>{col.name}</span>
            <Badge
              variant="outline"
              className={`ml-1.5 text-[9px] px-1 py-0 font-mono ${getTypeColor(col.dataType)}`}
            >
              {col.dataType}
            </Badge>
            <ArrowUpDown className="ml-1 size-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <CellValue value={getValue()} dataType={col.dataType} />
      })),
    [columnDefs]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting
    },
    initialState: {
      pagination: {
        pageSize
      }
    }
  })

  return (
    <div className="flex flex-col h-full">
      {/* Table with single scroll container */}
      <div className="flex-1 overflow-hidden border rounded-lg border-border/50">
        <div className="h-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-10 text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-accent/30 border-border/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <div className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) total
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
