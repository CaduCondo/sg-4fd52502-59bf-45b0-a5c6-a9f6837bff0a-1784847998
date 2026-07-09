import { Badge } from "@/components/ui/badge";

export function EnvironmentBadge() {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Badge 
        variant="outline" 
        className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 font-semibold shadow-lg"
      >
        🚧 Desenvolvimento
      </Badge>
    </div>
  );
}