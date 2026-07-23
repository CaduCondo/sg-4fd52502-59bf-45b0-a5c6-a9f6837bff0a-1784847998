import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { LocationFilter } from "@/components/public/LocationFilter";
import { PropertyPublicCard } from "@/components/public/PropertyPublicCard";
import { PropertyListCard } from "@/components/public/PropertyListCard";
import { PropertyCardSkeleton } from "@/components/public/PropertyCardSkeleton";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { ViewModeToggle } from "@/components/public/ViewModeToggle";
import { SortSelector } from "@/components/public/SortSelector";
import { usePublicProperties } from "@/hooks/usePublicProperties";
import { SortOption } from "@/components/public/SortSelector";
import { Input } from "@/components/ui/input";
import { Search, Home, Building2, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { siteConfig } from "@/services/configService";

const INITIAL_LOAD = 6; // 2 linhas × 3 cards
const LOAD_MORE = 3; // Carrega 3 cards por vez (1 linha)

export default function PublicHomePage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("random");
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { properties, loading, error } = usePublicProperties({
    location: selectedLocation,
    sort: sortBy
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(INITIAL_LOAD);
  }, [selectedLocation, debouncedSearchTerm, sortBy]);

  // Filter properties by search term (memoized)
  const filteredProperties = useMemo(() => {
    if (!debouncedSearchTerm) return properties;

    const search = debouncedSearchTerm.toLowerCase();
    return properties.filter((prop) => {
      return (
        prop.complement?.toLowerCase().includes(search) ||
        prop.description?.toLowerCase().includes(search) ||
        prop.city?.toLowerCase().includes(search) ||
        prop.neighborhood?.toLowerCase().includes(search) ||
        prop.location?.toLowerCase().includes(search) ||
        prop.type?.toLowerCase().includes(search)
      );
    });
  }, [properties, debouncedSearchTerm]);

  // Properties to display (with pagination)
  const displayedProperties = useMemo(() => 
    filteredProperties.slice(0, displayCount),
    [filteredProperties, displayCount]
  );
  
  const hasMore = displayCount < filteredProperties.length;

  // Extract unique locations for filter (memoized)
  const uniqueLocations = useMemo(() => {
    const locationMap = new Map<string, {id: string;name: string;city: string;neighborhood: string;}>();

    properties.forEach((prop) => {
      if (prop.locationId && prop.location && !locationMap.has(prop.locationId)) {
        locationMap.set(prop.locationId, {
          id: prop.locationId,
          name: prop.location,
          city: prop.city || "",
          neighborhood: prop.neighborhood || ""
        });
      }
    });

    return Array.from(locationMap.values());
  }, [properties]);

  // Infinite scroll com Intersection Observer
  useEffect(() => {
    if (loading || !hasMore) return;

    const loadMore = () => {
      if (isLoadingMore) return;
      
      setIsLoadingMore(true);
      
      // Simular pequeno delay para UX suave
      setTimeout(() => {
        setDisplayCount(prev => prev + LOAD_MORE);
        setIsLoadingMore(false);
      }, 300);
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, isLoadingMore]);

  return (
    <>
      

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <PublicHeader />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-8 md:py-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTM2IDQyYzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTE4IDE0YzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTE4IDQyYzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10" />
          
          <div className="container relative mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Encontre o Imóvel
                <br />
                <span className="text-orange-400">Perfeito para Você</span>
              </h1>
              <p className="text-base md:text-lg text-blue-100 mb-6">
                Apartamentos e imóveis comerciais em diversas localidades
              </p>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por bairro, cidade ou nome do imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-5 text-base rounded-full shadow-2xl border-0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="border-b bg-white shadow-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <LocationFilter
                locations={uniqueLocations}
                selectedLocation={selectedLocation}
                onLocationChange={setSelectedLocation}
              />
              
              <div className="flex gap-3 items-center">
                <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            </div>
          </div>
        </section>

        {/* Properties Grid/List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
                {[...Array(6)].map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
                  <Home className="h-10 w-10 text-red-400" />
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                  Erro ao carregar imóveis
                </h3>
                <p className="text-slate-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6">
                  <Home className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-slate-600">
                  Tente ajustar os filtros ou fazer uma nova busca
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-3xl font-bold text-slate-900">
                    Imóveis Disponíveis
                  </h2>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">
                      {filteredProperties.length}{" "}
                      {filteredProperties.length === 1 ? "imóvel" : "imóveis"}
                    </span>
                  </div>
                </div>

                {viewMode === "grid" ? (
                  <>
                    {/* Grid 3 colunas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {displayedProperties.map((property, index) => (
                        <PropertyPublicCard
                          key={property.id}
                          property={property}
                          priority={index < 6}
                          index={index}
                        />
                      ))}
                    </div>

                    {/* Sentinel para infinite scroll */}
                    {hasMore && (
                      <div ref={sentinelRef} className="flex justify-center mt-12 py-8">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-sm font-medium">Carregando mais imóveis...</span>
                        </div>
                      </div>
                    )}

                    {/* Indicador de progresso */}
                    {displayedProperties.length < filteredProperties.length && (
                      <div className="text-center mt-6 text-slate-600 text-sm">
                        Mostrando {displayedProperties.length} de {filteredProperties.length} imóveis
                      </div>
                    )}

                    {/* Mensagem final quando todos carregados */}
                    {!hasMore && filteredProperties.length > INITIAL_LOAD && (
                      <div className="text-center mt-12 py-6 border-t">
                        <p className="text-slate-500 text-sm">
                          ✨ Você viu todos os {filteredProperties.length} imóveis disponíveis
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    {displayedProperties.map((property) => (
                      <PropertyListCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-16 mt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Logo e Descrição */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <span className="font-display text-2xl font-bold text-white">
                    {siteConfig.name}
                  </span>
                </div>
                <p className="text-slate-400 mb-4">
                  {siteConfig.description}
                </p>
              </div>

              {/* Contato */}
              <div>
                <h4 className="font-display text-lg font-bold text-white mb-4">
                  Entre em Contato
                </h4>
                <div className="space-y-3">
                  <a
                    href={`tel:${siteConfig.contact.phone}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="h-5 w-5 text-blue-400" />
                    {siteConfig.contact.phone}
                  </a>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
                  >
                    <Mail className="h-5 w-5 text-blue-400" />
                    {siteConfig.contact.email}
                  </a>
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin className="h-5 w-5 text-blue-400" />
                    {siteConfig.contact.address}
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-slate-800 pt-8 text-center">
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* WhatsApp Floating Button */}
        <WhatsAppButton />
      </div>
    </>
  );
}