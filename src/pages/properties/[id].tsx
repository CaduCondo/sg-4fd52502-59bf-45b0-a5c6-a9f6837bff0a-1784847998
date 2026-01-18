import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Save } from "lucide-react";
import { Property, Location } from "@/types";
import { propertyService } from "@/services";
import { locationService } from "@/services/locationService";
import { applyCepMask, applyRealMask } from "@/lib/masks";

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    locationId: "",
    location: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    rentValue: "",
    description: "",
    status: "available" as "available" | "occupied" | "unavailable",
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProperty(id);
      loadLocations();
    }
  }, [id]);

  const loadLocations = async () => {
    try {
      const locationsData = await locationService.getAll();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const data = await propertyService.getById(propertyId);
      
      if (data) {
        setProperty(data);
        setFormData({
          locationId: "",
          location: data.location || "",
          cep: applyCepMask(data.cep || ""),
          address: data.address || "",
          number: data.number || "",
          complement: data.complement || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          rentValue: applyRealMask(data.rentValue?.toString() || "0"),
          description: data.description || "",
          status: data.status || "available",
        });
      }
    } catch (error) {
      console.error("Error loading property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o imóvel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
}