'use client'

import * as React from 'react'
import {
  ChevronRight,
  Columns3,
  Key,
  RefreshCw,
  Table2,
  Database as SchemaIcon,
  Loader2,
  XCircle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConnectionStore, useQueryStore } from '@/stores'
import type { TableInfo } from '@shared/index'

function DataTypeBadge({ type }: { type: string }) {
  const getTypeColor = (t: string): string => {
    const lower = t.toLowerCase()
    if (lower.includes('uuid')) return 'bg-purple-500/10 text-purple-500'
    if (lower.includes('varchar') || lower.includes('text') || lower.includes('char'))
      return 'bg-green-500/10 text-green-500'
    if (
      lower.includes('int') ||
      lower.includes('numeric') ||
      lower.includes('decimal') ||
      lower.includes('bigint')
    )
      return 'bg-blue-500/10 text-blue-500'
    if (lower.includes('timestamp') || lower.includes('date') || lower.includes('time'))
      return 'bg-orange-500/10 text-orange-500'
    if (lower.includes('bool')) return 'bg-yellow-500/10 text-yellow-500'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <Badge variant="outline" className={`text-[10px] px-1 py-0 font-mono ${getTypeColor(type)}`}>
      {type}
    </Badge>
  )
}

export function SchemaExplorer() {
  const schemas = useConnectionStore((s) => s.schemas)
  const isLoadingSchema = useConnectionStore((s) => s.isLoadingSchema)
  const schemaError = useConnectionStore((s) => s.schemaError)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const fetchSchemas = useConnectionStore((s) => s.fetchSchemas)
  const loadTableData = useQueryStore((s) => s.loadTableData)

  const [expandedSchemas, setExpandedSchemas] = React.useState<Set<string>>(
    new Set(schemas.map((s) => s.name))
  )
  const [expandedTables, setExpandedTables] = React.useState<Set<string>>(new Set())

  // Update expanded schemas when schemas change
  React.useEffect(() => {
    setExpandedSchemas(new Set(schemas.map((s) => s.name)))
    setExpandedTables(new Set())
  }, [schemas])

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev)
      if (next.has(schemaName)) {
        next.delete(schemaName)
      } else {
        next.add(schemaName)
      }
      return next
    })
  }

  const toggleTable = (tableKey: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(tableKey)) {
        next.delete(tableKey)
      } else {
        next.add(tableKey)
      }
      return next
    })
  }

  const handleTableClick = (schemaName: string, table: TableInfo) => {
    if (!activeConnectionId) return
    loadTableData(schemaName, table, activeConnectionId)
  }

  const handleRefresh = () => {
    if (!activeConnectionId) return
    fetchSchemas()
  }

  if (!activeConnectionId) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Schema</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-xs text-muted-foreground text-center">
            Select a connection to browse schema
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (isLoadingSchema) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Schema</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (schemaError) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>
          Schema
          <SidebarGroupAction onClick={handleRefresh} title="Retry">
            <RefreshCw className="size-3.5" />
          </SidebarGroupAction>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-xs text-destructive text-center">
            <XCircle className="size-4 mx-auto mb-2" />
            {schemaError}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        Schema
        <SidebarGroupAction onClick={handleRefresh} title="Refresh schema">
          <RefreshCw className="size-3.5" />
        </SidebarGroupAction>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {schemas.length === 0 ? (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              No schemas found
            </div>
          ) : (
            schemas.map((schema) => (
              <Collapsible
                key={schema.name}
                open={expandedSchemas.has(schema.name)}
                onOpenChange={() => toggleSchema(schema.name)}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <ChevronRight
                        className={`size-4 transition-transform ${expandedSchemas.has(schema.name) ? 'rotate-90' : ''}`}
                      />
                      <SchemaIcon className="size-4 text-muted-foreground" />
                      <span>{schema.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                        {schema.tables.length}
                      </Badge>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {schema.tables.map((table) => {
                        const tableKey = `${schema.name}.${table.name}`
                        return (
                          <Collapsible
                            key={tableKey}
                            open={expandedTables.has(tableKey)}
                            onOpenChange={() => toggleTable(tableKey)}
                          >
                            <SidebarMenuSubItem>
                              <div className="flex items-center">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-5 p-0 mr-1">
                                    <ChevronRight
                                      className={`size-3 transition-transform ${expandedTables.has(tableKey) ? 'rotate-90' : ''}`}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                                <SidebarMenuSubButton
                                  onClick={() => handleTableClick(schema.name, table)}
                                  className="flex-1"
                                >
                                  <Table2
                                    className={`size-3.5 ${table.type === 'view' ? 'text-purple-500' : 'text-muted-foreground'}`}
                                  />
                                  <span className="flex-1">{table.name}</span>
                                  {table.type === 'view' && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 text-purple-500"
                                    >
                                      view
                                    </Badge>
                                  )}
                                </SidebarMenuSubButton>
                              </div>
                              <CollapsibleContent>
                                <div className="ml-6 border-l border-border/50 pl-2 py-1 space-y-0.5">
                                  {table.columns.map((column) => (
                                    <TooltipProvider key={column.name}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1.5 py-0.5 px-1 text-xs text-muted-foreground hover:bg-accent/50 rounded cursor-default">
                                            {column.isPrimaryKey ? (
                                              <Key className="size-3 text-yellow-500" />
                                            ) : (
                                              <Columns3 className="size-3" />
                                            )}
                                            <span
                                              className={
                                                column.isPrimaryKey
                                                  ? 'font-medium text-foreground'
                                                  : ''
                                              }
                                            >
                                              {column.name}
                                            </span>
                                            {!column.isNullable && !column.isPrimaryKey && (
                                              <span className="text-red-400 text-[10px]">*</span>
                                            )}
                                            <DataTypeBadge type={column.dataType} />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="text-xs">
                                          <div className="space-y-1">
                                            <div>
                                              <span className="text-muted-foreground">Type: </span>
                                              {column.dataType}
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">
                                                Nullable:{' '}
                                              </span>
                                              {column.isNullable ? 'Yes' : 'No'}
                                            </div>
                                            {column.isPrimaryKey && (
                                              <div className="text-yellow-500">Primary Key</div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </SidebarMenuSubItem>
                          </Collapsible>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
