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

interface FeeExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SystemUser;
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
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadExemptions = async () => {
      if (user && open) {
        setIsLoading(true);
        const exemptions = await getUserExemptions(user.id);
        setSelectedLocations(exemptions);
        setIsLoading(false);
      }
    };
    loadExemptions();
  }, [user, open, getUserExemptions]);

  const handleToggle = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    const success = await onSave(selectedLocations);
    if (success) {
      onOpenChange(false);
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
          ) : (
            locations.map((location) => (
              <div key={location.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`location-${location.id}`}
                  checked={selectedLocations.includes(location.id)}
                  onCheckedChange={() => handleToggle(location.id)}
                />
                <Label
                  htmlFor={`location-${location.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {location.name}
                </Label>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}