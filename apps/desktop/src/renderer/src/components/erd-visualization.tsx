'use client'

import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
  MarkerType,
  Handle
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Key, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SchemaInfo, ColumnInfo } from '@shared/index'

interface TableNodeData extends Record<string, unknown> {
  label: string
  schemaName: string
  columns: ColumnInfo[]
}

// Custom Table Node Component
function TableNode({ data }: { data: TableNodeData }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-md min-w-[200px] overflow-hidden">
      {/* Table Header */}
      <div className="bg-primary/10 px-3 py-2 border-b border-border">
        <div className="font-semibold text-sm text-foreground">{data.label}</div>
        <div className="text-[10px] text-muted-foreground">{data.schemaName}</div>
      </div>

      {/* Columns */}
      <div className="py-1">
        {data.columns.map((column) => (
          <div
            key={column.name}
            className="relative flex items-center gap-2 px-3 py-1 text-xs hover:bg-muted/50"
          >
            {/* Source handle for FK columns */}
            {column.foreignKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-source`}
                className="!bg-blue-500 !w-2 !h-2"
              />
            )}

            {/* Target handle for PK columns */}
            {column.isPrimaryKey && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-target`}
                className="!bg-yellow-500 !w-2 !h-2"
              />
            )}

            {column.isPrimaryKey ? (
              <Key className="size-3 text-yellow-500 shrink-0" />
            ) : column.foreignKey ? (
              <Key className="size-3 text-blue-500 shrink-0" />
            ) : (
              <Columns3 className="size-3 text-muted-foreground shrink-0" />
            )}

            <span className={cn('flex-1 truncate', column.isPrimaryKey && 'font-medium')}>
              {column.name}
            </span>

            <span className="text-[10px] text-muted-foreground font-mono">{column.dataType}</span>

            {!column.isNullable && !column.isPrimaryKey && (
              <span className="text-red-400 text-[10px]">*</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = {
  tableNode: TableNode
}

interface ERDVisualizationProps {
  schemas: SchemaInfo[]
}

export function ERDVisualization({ schemas }: ERDVisualizationProps) {
  // Generate nodes and edges from schema data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<TableNodeData>[] = []
    const edges: Edge[] = []
    const tablePositions = new Map<string, { x: number; y: number }>()

    // Layout calculation
    const COLUMN_GAP = 350
    const ROW_GAP = 50
    const TABLE_HEIGHT_PER_COLUMN = 24
    const TABLE_HEADER_HEIGHT = 60

    let currentX = 0
    let currentY = 0
    let maxHeightInRow = 0
    let tablesInRow = 0
    const MAX_TABLES_PER_ROW = 4

    // First pass: Create nodes and calculate positions
    schemas.forEach((schema) => {
      schema.tables.forEach((table) => {
        const tableKey = `${schema.name}.${table.name}`
        const tableHeight = TABLE_HEADER_HEIGHT + table.columns.length * TABLE_HEIGHT_PER_COLUMN

        // Position calculation with simple grid layout
        if (tablesInRow >= MAX_TABLES_PER_ROW) {
          currentX = 0
          currentY += maxHeightInRow + ROW_GAP
          maxHeightInRow = 0
          tablesInRow = 0
        }

        tablePositions.set(tableKey, { x: currentX, y: currentY })
        maxHeightInRow = Math.max(maxHeightInRow, tableHeight)
        currentX += COLUMN_GAP
        tablesInRow++

        nodes.push({
          id: tableKey,
          type: 'tableNode',
          position: { x: tablePositions.get(tableKey)!.x, y: tablePositions.get(tableKey)!.y },
          data: {
            label: table.name,
            schemaName: schema.name,
            columns: table.columns
          }
        })
      })
    })

    // Second pass: Create edges for foreign keys
    schemas.forEach((schema) => {
      schema.tables.forEach((table) => {
        const sourceTableKey = `${schema.name}.${table.name}`

        table.columns.forEach((column) => {
          if (column.foreignKey) {
            const targetTableKey = `${column.foreignKey.referencedSchema}.${column.foreignKey.referencedTable}`

            // Only create edge if target table exists in our schema
            if (tablePositions.has(targetTableKey)) {
              edges.push({
                id: `${sourceTableKey}.${column.name}->${targetTableKey}.${column.foreignKey.referencedColumn}`,
                source: sourceTableKey,
                sourceHandle: `${column.name}-source`,
                target: targetTableKey,
                targetHandle: `${column.foreignKey.referencedColumn}-target`,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#3b82f6'
                },
                label: column.foreignKey.constraintName,
                labelStyle: { fontSize: 10, fill: '#888' },
                labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.8 }
              })
            }
          }
        })
      })
    })

    return { initialNodes: nodes, initialEdges: edges }
  }, [schemas])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onInit = useCallback(() => {
    // Could add fitView here if needed
  }, [])

  if (schemas.length === 0 || initialNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tables found to visualize
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep'
        }}
      >
        <Background color="#888" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => 'var(--primary)'}
          maskColor="rgba(0, 0, 0, 0.2)"
          className="!bg-background/80"
        />
      </ReactFlow>
    </div>
  )
}
