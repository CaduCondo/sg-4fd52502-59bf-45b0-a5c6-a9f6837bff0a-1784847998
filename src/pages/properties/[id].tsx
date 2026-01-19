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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Save } from "lucide-react";
import { Property, Location } from "@/types";
import { getById as getPropertyById } from "@/services/propertyService";
import { getLocationById, getAll as getAllLocations } from "@/services/locationService";
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Ocupado
          </Badge>
        );
      case "available":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Vago
          </Badge>
        );
      case "unavailable":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Indisponível
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProperty(id);
      loadLocations();
    }
  }, [id]);

  const loadLocations = async () => {
    try {
      const locationsData = await getAllLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const data = await getPropertyById(propertyId);
      
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