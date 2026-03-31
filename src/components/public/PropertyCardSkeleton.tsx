import { Card, CardContent } from "@/components/ui/card";

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full bg-slate-200 animate-pulse" />
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
        </div>
        
        <div className="flex flex-wrap gap-3 border-t pt-3">
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        
        <div className="border-t pt-3">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}