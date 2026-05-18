'use client'

import { useState, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type Row,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: Row<TData>) => void
  selectable?: boolean
  virtualized?: boolean
  emptyTitle?: string
  emptyDescription?: string
  stickyHeader?: boolean
  className?: string
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  pagination,
  onRowClick,
  selectable = false,
  virtualized = false,
  emptyTitle = 'No results',
  emptyDescription = 'No data matches your current filters.',
  stickyHeader = true,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const selectionColumn: ColumnDef<TData> = {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <input
        type="checkbox"
        className="rounded border-border"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="rounded border-border"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label={`Select row ${row.index + 1}`}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }

  const allColumns = selectable ? [selectionColumn, ...columns] : columns

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    manualPagination: !!pagination,
  })

  const rows = table.getRowModel().rows

  const rowVirtualizer = useVirtualizer({
    count: virtualized ? rows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
    enabled: virtualized,
  })

  const virtualRows = virtualized ? rowVirtualizer.getVirtualItems() : null
  const totalSize = virtualized ? rowVirtualizer.getTotalSize() : 0

  const renderRows = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {allColumns.map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (!rows.length) {
      return (
        <TableRow>
          <TableCell colSpan={allColumns.length} className="h-48">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              className="py-8"
            />
          </TableCell>
        </TableRow>
      )
    }

    if (virtualized && virtualRows) {
      return (
        <>
          {virtualRows.length > 0 && (
            <TableRow style={{ height: `${virtualRows[0].start}px` }}>
              <TableCell />
            </TableRow>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null
            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer')}
                style={{ height: `${virtualRow.size}px` }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          <TableRow style={{ height: `${totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)}px` }}>
            <TableCell />
          </TableRow>
        </>
      )
    }

    return rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() ? 'selected' : undefined}
        onClick={() => onRowClick?.(row)}
        className={cn(onRowClick && 'cursor-pointer')}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={tableContainerRef}
        className={cn(
          'rounded-card border border-border overflow-auto',
          virtualized && 'max-h-[600px]'
        )}
      >
        <Table>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className={cn(
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-text-primary transition-colors'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-text-muted">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="size-3.5" aria-hidden="true" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="size-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{renderRows()}</TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && !loading && rows.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-text-muted">
            Showing{' '}
            <span className="font-medium text-text-secondary">
              {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{' '}
            of <span className="font-medium text-text-secondary">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5) {
                if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
              }
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => pagination.onPageChange(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pagination.page === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
