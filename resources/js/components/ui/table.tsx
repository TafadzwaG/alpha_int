import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"

type SortState = { column: number; direction: 'asc' | 'desc' } | null
const TableSortContext = React.createContext<{
  sort: SortState; setSort: React.Dispatch<React.SetStateAction<SortState>>;
  pagination: boolean; page: number; size: number; setPage: React.Dispatch<React.SetStateAction<number>>;
  setCount: React.Dispatch<React.SetStateAction<number>>;
} | null>(null)

function cellText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(cellText).filter(Boolean).join(' ')
  if (React.isValidElement<{ children?: React.ReactNode; 'data-sort-value'?: string | number }>(node)) {
    return node.props['data-sort-value'] !== undefined ? String(node.props['data-sort-value']) : cellText(node.props.children)
  }
  return ''
}
function compareCells(left: string, right: string): number {
  const a = left.trim(); const b = right.trim()
  const numeric = (value: string) => {
    const cleaned = value.replace(/^(?:[A-Z]{3}\s*|US\$|[$£€R])/, '').replace(/,/g, '').replace(/%$/, '').trim()
    return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null
  }
  const na = numeric(a); const nb = numeric(b)
  if (na !== null && nb !== null) return na - nb
  const dateLike = (value: string) => /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3}\b)/.test(value)
  if (dateLike(a) && dateLike(b)) {
    const da = Date.parse(a.replace(/,(?=\d{4})/, ' ')); const db = Date.parse(b.replace(/,(?=\d{4})/, ' '))
    if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

type TableProps = React.HTMLAttributes<HTMLTableElement> & { pagination?: boolean }
const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, pagination = true, ...props }, ref) => {
  const [sort, setSort] = React.useState<SortState>(null)
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(10)
  const [count, setCount] = React.useState(0)
  const pages = Math.max(1, Math.ceil(count / size))
  const current = Math.min(page, pages)
  React.useEffect(() => { setPage(1) }, [sort, size])
  return <TableSortContext.Provider value={{ sort, setSort, pagination, page: current, size, setPage, setCount }}>
    <div className="relative w-full overflow-auto"><table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>
    {pagination && count >= 10 && <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
      <p className="text-muted-foreground" aria-live="polite">Showing {(current-1)*size+1}–{Math.min(current*size,count)} of {count}</p>
      <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2"><span>Rows per page</span><Select value={String(size)} onValueChange={(value)=>{setSize(Number(value));setPage(1)}}><SelectTrigger className="w-20" aria-label="Rows per page"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{[10,20,50,100].map(value=><SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
        <Button type="button" variant="secondary" size="sm" aria-label="First page" disabled={current===1} onClick={()=>setPage(1)}>First</Button>
        <Button type="button" variant="secondary" size="sm" disabled={current===1} onClick={()=>setPage(current-1)}>Previous</Button>
        <span>Page {current} of {pages}</span>
        <Button type="button" variant="secondary" size="sm" disabled={current===pages} onClick={()=>setPage(current+1)}>Next</Button>
        <Button type="button" variant="secondary" size="sm" aria-label="Last page" disabled={current===pages} onClick={()=>setPage(pages)}>Last</Button>
      </div>
    </div>}
  </TableSortContext.Provider>
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TableSortContext)
  const rows = React.Children.toArray(children)
  const isDataRow = (row: React.ReactNode) => React.isValidElement<{children?:React.ReactNode}>(row) && !React.Children.toArray(row.props.children).some(cell => React.isValidElement<{colSpan?:number}>(cell) && (cell.props.colSpan ?? 1) > 1)
  const count = rows.filter(isDataRow).length
  const identity = rows.map(row => React.isValidElement(row) ? row.key : '').join('|')
  const setCount = context?.setCount
  const setPage = context?.setPage
  React.useEffect(() => { setCount?.(count) }, [count, setCount])
  React.useEffect(() => { setPage?.(1) }, [identity, setPage])

  if (context?.sort) {
    const { column, direction } = context.sort
    const value = (row: React.ReactNode) => {
      if (!React.isValidElement<{children?: React.ReactNode}>(row)) return ''
      return cellText(React.Children.toArray(row.props.children)[column])
    }
    rows.sort((a,b) => compareCells(value(a),value(b)) * (direction === 'asc' ? 1 : -1))
  }
  return <tbody ref={ref} className={cn("[&_tr:last-child]:border-0",className)} {...props}>{context?.pagination && count > 0 ? rows.slice((context.page-1)*context.size, context.page*context.size) : rows}</tbody>
})
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { sortable?: boolean }
>(({ className, children, sortable: enableSorting = true, ...props }, forwardedRef) => {
  const context = React.useContext(TableSortContext)
  const localRef = React.useRef<HTMLTableCellElement | null>(null)
  const [column, setColumn] = React.useState(-1)
  React.useLayoutEffect(() => { setColumn(localRef.current?.cellIndex ?? -1) }, [])
  const label = cellText(children).trim()
  const sortable = Boolean(enableSorting && context && label && !/^(actions?|remove|select|#)$/i.test(label) && !props.colSpan && !props.rowSpan)
  const active = sortable && context?.sort?.column === column
  const Icon = active ? context?.sort?.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown
  return <th {...props} ref={(node) => { localRef.current = node; if(typeof forwardedRef === 'function') forwardedRef(node); else if(forwardedRef) forwardedRef.current = node }} aria-sort={sortable ? active ? context?.sort?.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined} className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",className)}>
    {sortable ? <button type="button" className="inline-flex items-center gap-1.5 rounded-sm py-2 text-inherit hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" title={`Sort ${label} on this page`} aria-label={`Sort by ${label}${active ? `, currently ${context?.sort?.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`} onClick={() => context?.setSort(previous => previous?.column === column ? previous.direction === 'asc' ? {column,direction:'desc'} : null : {column,direction:'asc'})}>{children}<Icon aria-hidden="true" className="size-3.5 shrink-0" /></button> : children}
  </th>
})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
