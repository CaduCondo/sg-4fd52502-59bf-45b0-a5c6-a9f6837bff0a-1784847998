import { useState } from "react";
import Head from "next/head";
import { PublicHeader } from "@/components/public/PublicHeader";
import { LocationFilter } from "@/components/public/LocationFilter";
import { PropertyPublicCard } from "@/components/public/PropertyPublicCard";
import { usePublicProperties } from "@/hooks/usePublicProperties";
import { Input } from "@/components/ui/input";
import { Search, Home, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicHome() {
  const {
    properties,
    locations,
    selectedLocation,
    setSelectedLocation,
    searchTerm,
    setSearchTerm,
    isLoading
  } = usePublicProperties();

  return (
    <>
      <Head>
        <title>Imóveis Premium - Encontre seu novo lar</title>
        <meta
          name="description"
          content="Encontre o imóvel perfeito para você. Apartamentos, casas e imóveis comerciais disponíveis para locação." />

      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <PublicHeader />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTM2IDQyYzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTE4IDE0YzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6TTE4IDQyYzAtMS4xMDUuODk1LTIgMi0yaDJjMS4xMDUgMCAyIC44OTUgMiAydjJjMCAxLjEwNS0uODk1IDItMiAyaC0yYy0xLjEwNSAwLTItLjg5NS0yLTJ2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10" />
          
          <div className="container relative mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Encontre o Imóvel
                <br />
                <span className="text-orange-400">Perfeito para Você</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8">Apartamentos e imóveis comerciais em diversas localidades

              </p>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por bairro, cidade ou nome do imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg rounded-full shadow-2xl border-0" />

              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <LocationFilter
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation} />

          </div>
        </section>

        {/* Properties Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {isLoading ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) =>
              <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
              )}
              </div> :
            properties.length === 0 ?
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
              </div> :

            <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-3xl font-bold text-slate-900">
                    Imóveis Disponíveis
                  </h2>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">
                      {properties.length}{" "}
                      {properties.length === 1 ? "imóvel" : "imóveis"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {properties.map((property) =>
                <PropertyPublicCard key={property.id} property={property} />
                )}
                </div>
              </>
            }
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Imóveis Premium
                </h3>
              </div>
              <p className="text-slate-400 mb-6">
                Gerenciamento profissional de imóveis
              </p>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} Imóveis Premium. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>);

}