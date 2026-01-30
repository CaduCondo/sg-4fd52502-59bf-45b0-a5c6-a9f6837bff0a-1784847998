import { useState, useEffect } from "react";
import { SystemUser, Location } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface FeeExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser;
  locations: Location[];
  onSave: (locationIds: string[]) => Promise<boolean>;
  getUserExemptions: (userId: string) => Promise<string[]>;
}

export function FeeExemptionDialog({
  open,
  onOpenChange,
  user,
  locations,
  onSave,
  getUserExemptions,
}: FeeExemptionDialogProps) {
  const { toast } = useToast();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const loadExemptions = async () => {
      if (user && open && !hasLoaded) {
        setIsLoading(true);
        try {
          const exemptions = await getUserExemptions(user.id);
          setSelectedLocations(exemptions);
          setHasLoaded(true);
        } catch (error) {
          console.error("Erro ao carregar isenções:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as isenções.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadExemptions();
  }, [user, open, hasLoaded, getUserExemptions, toast]);

  // Reset quando o dialog fechar
  useEffect(() => {
    if (!open) {
      setHasLoaded(false);
    }
  }, [open]);

  const handleToggle = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const success = await onSave(selectedLocations);
      if (success) {
        toast({
          title: "Sucesso",
          description: "Isenções de taxa salvas com sucesso!",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível salvar as isenções.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar isenções:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar as isenções de taxa.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Isenção de Taxa</DialogTitle>
          <DialogDescription>
            Selecione os locais onde {user?.name} está isento da taxa de administração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum local cadastrado.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                  <Checkbox
                    id={`location-${location.id}`}
                    checked={selectedLocations.includes(location.id)}
                    onCheckedChange={() => handleToggle(location.id)}
                  />
                  <Label
                    htmlFor={`location-${location.id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {location.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}