'use client'

import { useState, useMemo } from 'react'
import {
  ChevronRight,
  Clock,
  HardDrive,
  Rows3,
  AlertTriangle,
  Activity,
  BarChart3,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// PostgreSQL EXPLAIN JSON plan node structure
interface PlanNode {
  'Node Type': string
  'Parallel Aware'?: boolean
  'Async Capable'?: boolean
  'Join Type'?: string
  'Startup Cost'?: number
  'Total Cost'?: number
  'Plan Rows'?: number
  'Plan Width'?: number
  'Actual Startup Time'?: number
  'Actual Total Time'?: number
  'Actual Rows'?: number
  'Actual Loops'?: number
  Output?: string[]
  Filter?: string
  'Rows Removed by Filter'?: number
  'Index Cond'?: string
  'Index Name'?: string
  'Relation Name'?: string
  Schema?: string
  Alias?: string
  'Hash Cond'?: string
  'Sort Key'?: string[]
  'Sort Method'?: string
  'Sort Space Used'?: number
  'Sort Space Type'?: string
  'Shared Hit Blocks'?: number
  'Shared Read Blocks'?: number
  'Shared Dirtied Blocks'?: number
  'Shared Written Blocks'?: number
  'Local Hit Blocks'?: number
  'Local Read Blocks'?: number
  'Temp Read Blocks'?: number
  'Temp Written Blocks'?: number
  'I/O Read Time'?: number
  'I/O Write Time'?: number
  Plans?: PlanNode[]
}

interface ExplainPlan {
  Plan: PlanNode
  'Planning Time'?: number
  'Execution Time'?: number
  Triggers?: unknown[]
}

interface ExecutionPlanViewerProps {
  plan: ExplainPlan[]
  durationMs: number
  onClose: () => void
}

// Get node type color and icon
function getNodeTypeInfo(nodeType: string): { color: string; bgColor: string } {
  const type = nodeType.toLowerCase()

  if (type.includes('seq scan')) {
    return { color: 'text-orange-500', bgColor: 'bg-orange-500/10' }
  }
  if (type.includes('index') || type.includes('bitmap')) {
    return { color: 'text-green-500', bgColor: 'bg-green-500/10' }
  }
  if (type.includes('hash') || type.includes('merge') || type.includes('nested')) {
    return { color: 'text-blue-500', bgColor: 'bg-blue-500/10' }
  }
  if (type.includes('sort') || type.includes('aggregate') || type.includes('group')) {
    return { color: 'text-purple-500', bgColor: 'bg-purple-500/10' }
  }
  if (type.includes('limit') || type.includes('result')) {
    return { color: 'text-gray-500', bgColor: 'bg-gray-500/10' }
  }

  return { color: 'text-muted-foreground', bgColor: 'bg-muted' }
}

// Calculate the percentage of total cost for a node
function calculateCostPercentage(nodeCost: number, totalCost: number): number {
  if (totalCost === 0) return 0
  return Math.round((nodeCost / totalCost) * 100)
}

// Get warning indicators for potential issues
function getNodeWarnings(node: PlanNode): string[] {
  const warnings: string[] = []

  // Check for sequential scans on tables (potential index candidate)
  if (node['Node Type'] === 'Seq Scan' && (node['Actual Rows'] ?? 0) > 1000) {
    warnings.push('Sequential scan on large table - consider adding an index')
  }

  // Check for high filter removals (inefficient filtering)
  if (node['Rows Removed by Filter'] && node['Actual Rows']) {
    const ratio =
      node['Rows Removed by Filter'] / (node['Actual Rows'] + node['Rows Removed by Filter'])
    if (ratio > 0.9) {
      warnings.push('High filter selectivity - index may improve performance')
    }
  }

  // Check for row estimate vs actual mismatch
  if (node['Plan Rows'] && node['Actual Rows']) {
    const estimate = node['Plan Rows']
    const actual = node['Actual Rows']
    if (actual > 0 && (estimate / actual > 10 || actual / estimate > 10)) {
      warnings.push('Row estimate significantly off - consider ANALYZE')
    }
  }

  // Check for sorts spilling to disk
  if (node['Sort Space Type'] === 'Disk') {
    warnings.push('Sort spilling to disk - consider increasing work_mem')
  }

  return warnings
}

// Plan Node Component
function PlanNodeView({
  node,
  depth,
  totalCost,
  maxTime
}: {
  node: PlanNode
  depth: number
  totalCost: number
  maxTime: number
}) {
  const [isOpen, setIsOpen] = useState(depth < 3)
  const { color, bgColor } = getNodeTypeInfo(node['Node Type'])
  const costPercentage = calculateCostPercentage(node['Total Cost'] ?? 0, totalCost)
  const timePercentage = maxTime > 0 ? ((node['Actual Total Time'] ?? 0) / maxTime) * 100 : 0
  const warnings = getNodeWarnings(node)
  const hasChildren = node.Plans && node.Plans.length > 0

  return (
    <div className={cn('relative', depth > 0 && 'ml-6 border-l border-border/50 pl-4')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="py-1.5">
          <CollapsibleTrigger asChild>
            <button className="group flex items-start gap-2 w-full text-left hover:bg-muted/50 rounded p-1.5 -ml-1.5 transition-colors">
              {hasChildren ? (
                <ChevronRight
                  className={cn(
                    'size-4 mt-0.5 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-90'
                  )}
                />
              ) : (
                <span className="w-4 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn('font-mono text-xs', color, bgColor)}>
                    {node['Node Type']}
                  </Badge>

                  {node['Relation Name'] && (
                    <span className="text-xs text-muted-foreground">
                      on{' '}
                      <span className="font-medium text-foreground">
                        {node['Schema'] ? `${node['Schema']}.` : ''}
                        {node['Relation Name']}
                      </span>
                      {node['Alias'] && node['Alias'] !== node['Relation Name'] && (
                        <span className="text-muted-foreground"> as {node['Alias']}</span>
                      )}
                    </span>
                  )}

                  {node['Index Name'] && (
                    <span className="text-xs text-muted-foreground">
                      using{' '}
                      <span className="font-medium text-foreground">{node['Index Name']}</span>
                    </span>
                  )}

                  {node['Join Type'] && (
                    <Badge variant="outline" className="text-[10px]">
                      {node['Join Type']}
                    </Badge>
                  )}

                  {warnings.length > 0 && <AlertTriangle className="size-3.5 text-yellow-500" />}
                </div>

                {/* Metrics Row */}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {node['Actual Rows'] !== undefined && (
                    <span className="flex items-center gap-1">
                      <Rows3 className="size-3" />
                      <span className="font-mono">{node['Actual Rows'].toLocaleString()}</span> rows
                      {node['Actual Loops'] && node['Actual Loops'] > 1 && (
                        <span className="text-muted-foreground/70"> x{node['Actual Loops']}</span>
                      )}
                    </span>
                  )}

                  {node['Actual Total Time'] !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className="font-mono">{node['Actual Total Time'].toFixed(2)}</span> ms
                    </span>
                  )}

                  {node['Total Cost'] !== undefined && (
                    <span className="flex items-center gap-1">
                      <Activity className="size-3" />
                      cost: <span className="font-mono">{node['Total Cost'].toFixed(0)}</span>
                      <span className="text-muted-foreground/70">({costPercentage}%)</span>
                    </span>
                  )}

                  {node['Shared Hit Blocks'] !== undefined && (
                    <span className="flex items-center gap-1">
                      <HardDrive className="size-3" />
                      hits: <span className="font-mono">{node['Shared Hit Blocks']}</span>
                      {node['Shared Read Blocks'] ? (
                        <span className="text-orange-500">reads: {node['Shared Read Blocks']}</span>
                      ) : null}
                    </span>
                  )}
                </div>

                {/* Cost Bar */}
                {timePercentage > 0 && (
                  <div className="mt-1.5 w-full max-w-[200px]">
                    <Progress
                      value={timePercentage}
                      className={cn(
                        'h-1.5',
                        timePercentage > 50
                          ? '[&>div]:bg-red-500'
                          : timePercentage > 25
                            ? '[&>div]:bg-yellow-500'
                            : '[&>div]:bg-green-500'
                      )}
                    />
                  </div>
                )}

                {/* Filter/Condition Info */}
                {(node['Filter'] || node['Index Cond'] || node['Hash Cond']) && (
                  <div className="mt-1.5 text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                    {node['Filter'] && <div>Filter: {node['Filter']}</div>}
                    {node['Index Cond'] && <div>Index Cond: {node['Index Cond']}</div>}
                    {node['Hash Cond'] && <div>Hash Cond: {node['Hash Cond']}</div>}
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] text-yellow-600 dark:text-yellow-500"
                      >
                        <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          {hasChildren && (
            <CollapsibleContent>
              {node.Plans!.map((childNode, index) => (
                <PlanNodeView
                  key={index}
                  node={childNode}
                  depth={depth + 1}
                  totalCost={totalCost}
                  maxTime={maxTime}
                />
              ))}
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </div>
  )
}

export function ExecutionPlanViewer({ plan, durationMs, onClose }: ExecutionPlanViewerProps) {
  const rootPlan = plan[0]?.Plan
  const planningTime = plan[0]?.['Planning Time']
  const executionTime = plan[0]?.['Execution Time']

  // Calculate totals for percentage calculations
  const { totalCost, maxTime } = useMemo(() => {
    if (!rootPlan) return { totalCost: 0, maxTime: 0 }

    function getMaxTime(node: PlanNode): number {
      let max = node['Actual Total Time'] ?? 0
      if (node.Plans) {
        for (const child of node.Plans) {
          max = Math.max(max, getMaxTime(child))
        }
      }
      return max
    }

    return {
      totalCost: rootPlan['Total Cost'] ?? 0,
      maxTime: getMaxTime(rootPlan)
    }
  }, [rootPlan])

  if (!rootPlan) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No execution plan available
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <span className="font-medium text-sm">Query Execution Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {planningTime !== undefined && (
              <span>
                Planning:{' '}
                <span className="font-mono text-foreground">{planningTime.toFixed(2)}ms</span>
              </span>
            )}
            {executionTime !== undefined && (
              <span>
                Execution:{' '}
                <span className="font-mono text-foreground">{executionTime.toFixed(2)}ms</span>
              </span>
            )}
            <span>
              Total: <span className="font-mono text-foreground">{durationMs}ms</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-2 border-b border-border/40 flex items-center gap-4 text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">Total Cost:</span>
          <span className="font-mono font-medium">{totalCost.toFixed(0)}</span>
        </div>
        {rootPlan['Actual Rows'] !== undefined && (
          <div className="flex items-center gap-1.5">
            <Rows3 className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">Rows:</span>
            <span className="font-mono font-medium">
              {rootPlan['Actual Rows'].toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Plan Tree */}
      <div className="flex-1 overflow-auto p-4">
        <PlanNodeView node={rootPlan} depth={0} totalCost={totalCost} maxTime={maxTime} />
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border/40 flex items-center gap-4 text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <div className="size-2 rounded bg-orange-500" />
          Seq Scan
        </span>
        <span className="flex items-center gap-1">
          <div className="size-2 rounded bg-green-500" />
          Index Scan
        </span>
        <span className="flex items-center gap-1">
          <div className="size-2 rounded bg-blue-500" />
          Join
        </span>
        <span className="flex items-center gap-1">
          <div className="size-2 rounded bg-purple-500" />
          Sort/Aggregate
        </span>
      </div>
    </div>
  )
}
