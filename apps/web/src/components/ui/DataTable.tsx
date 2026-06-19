import { cn } from '../../lib/cn';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-lg)] border border-(--color-muted)/15', className)}>
      <table className="w-full text-sm">
        <thead className="bg-(--color-muted)/5">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left px-4 py-3 font-semibold text-(--color-fg) whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-t border-(--color-muted)/10 hover:bg-(--color-muted)/5 transition-colors',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={cn('px-4 py-3 text-(--color-fg)', col.className)}>
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-(--color-muted)">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
