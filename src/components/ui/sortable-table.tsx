import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  render?: (item: T) => React.ReactNode;
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

export function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  getRowClassName,
  emptyMessage = "Nenhum item encontrado.",
}: SortableTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={`${column.className || ""} ${column.headerClassName || ""}`}>
                {column.sortable !== false ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => onSort(column.key)}
                  >
                    <span>{column.label}</span>
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow
              key={index}
              onClick={() => onRowClick?.(item)}
              className={`${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} ${getRowClassName?.(item) || ""}`}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={`${column.className || ""} ${column.cellClassName || ""}`}>
                  {column.render ? column.render(item) : item[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}