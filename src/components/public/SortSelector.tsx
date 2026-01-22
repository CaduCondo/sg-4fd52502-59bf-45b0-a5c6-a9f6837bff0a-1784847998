import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export type SortOption = "newest" | "price-asc" | "price-desc" | "area-desc";

interface SortSelectorProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SortSelector({ sortBy, onSortChange }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-slate-500" />
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mais Recentes</SelectItem>
          <SelectItem value="price-asc">Menor Preço</SelectItem>
          <SelectItem value="price-desc">Maior Preço</SelectItem>
          <SelectItem value="area-desc">Maior Área</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}