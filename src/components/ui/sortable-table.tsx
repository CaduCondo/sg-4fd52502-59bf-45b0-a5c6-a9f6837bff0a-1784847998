import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  className?: string;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortKey: string | null;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  onRowClick?: (item: T) => void;
  getRowClassName?: (item: T) => string;
  emptyMessage?: string;
}

export function SortableTable<T extends { id: string }>({
  data,
  columns,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  getRowClassName,
  emptyMessage = "Nenhum registro encontrado."
}: SortableTableProps<T>) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-slate-100">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`${column.className || ""} ${
                  column.sortable !== false ? "cursor-pointer select-none hover:bg-slate-200 transition-colors" : ""
                }`}
                onClick={() => column.sortable !== false && onSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable !== false && (
                    <span className="text-slate-400">
                      {sortKey === column.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow
                key={item.id}
                className={`cursor-pointer transition-colors ${
                  getRowClassName ? getRowClassName(item) : ""
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}