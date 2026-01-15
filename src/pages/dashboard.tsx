"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { propertyStorage, tenantStorage, rentalStorage, paymentStorage, configStorage } from "@/lib/storage";
import { DashboardStats } from "@/types";
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Home, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency } from "@/lib/masks";
import { StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    rentedProperties: 0,
    availableProperties: 0,
    totalTenants: 0,
    paidThisMonth: 0,
    unpaidThisMonth: 0,
    totalRevenue: 0,
    adminFee: 0,
    dueThisMonth: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setMounted(true);
    calculateStats();
  }, [router]);

  const calculateStats = () => {
    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    const rentals = rentalStorage.getAll();
    const payments = paymentStorage.getAll();
    const config = configStorage.get();

    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = currentDate.getFullYear().toString();

    // Filter payments for current month
    const currentMonthPayments = payments.filter(
      (p) => p.referenceMonth === currentMonth && p.referenceYear === currentYear
    );

    // Total de Imóveis Cadastrados
    const totalProperties = properties.length;

    // Imóveis Ocupados (status = "occupied")
    const rentedProperties = properties.filter(p => p.status === "occupied").length;

    // Imóveis Vagos (status = "available")
    const availableProperties = properties.filter(p => p.status === "available").length;

    // Total de Inquilinos Ativos (isActive = true)
    const totalTenants = tenants.filter(t => t.isActive).length;

    // Pagamentos Recebidos (status = "paid") - contagem de locações
    const paidThisMonth = currentMonthPayments.filter(p => p.status === "paid").length;

    // Pagamentos Pendentes (status = "pending" ou "partial") - contagem de locações
    const unpaidThisMonth = currentMonthPayments.filter(
      p => p.status === "pending" || p.status === "partial"
    ).length;

    // Recebidos do Mês - Soma dos valores pagos (status = "paid")
    const totalRevenue = currentMonthPayments
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    // Taxa de Administração - Mesmo cálculo da tela financeiro
    const adminFeePercentage = config.adminFeePercentage / 100;
    const adminFee = totalRevenue * adminFeePercentage;

    // Prestes a Vencer - Locações do mês corrente ainda não quitadas
    const dueThisMonth = currentMonthPayments.filter(
      p => p.status !== "paid"
    ).length;

    setStats({
      totalProperties,
      rentedProperties,
      availableProperties,
      totalTenants,
      paidThisMonth,
      unpaidThisMonth,
      totalRevenue,
      adminFee,
      dueThisMonth,
    });
  };

  if (!mounted) {
    return null;
  }

  const statCards = [
    {
      title: "Total de Imóveis",
      value: stats.totalProperties,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/properties",
      description: "Imóveis cadastrados",
    },
    {
      title: "Imóveis Ocupados",
      value: stats.rentedProperties,
      icon: Home,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/properties?status=occupied",
      description: "Imóveis alugados",
    },
    {
      title: "Imóveis Vagos",
      value: stats.availableProperties,
      icon: Building2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      link: "/properties?status=available",
      description: "Disponíveis para locação",
    },
    {
      title: "Total de Inquilinos",
      value: stats.totalTenants,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      link: "/tenants",
      description: "Inquilinos ativos",
    },
    {
      title: "Pagamentos Recebidos",
      value: stats.paidThisMonth,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/payments?status=paid",
      description: "Locações pagas este mês",
    },
    {
      title: "Pagamentos Pendentes",
      value: stats.unpaidThisMonth,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      link: "/payments?status=pending",
      description: "Aguardando pagamento",
    },
    {
      title: "Recebidos do Mês",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      link: "/financial",
      description: "Total recebido",
      isValue: true,
    },
    {
      title: "Taxa Administração",
      value: formatCurrency(stats.adminFee),
      icon: TrendingUp,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      link: "/financial",
      description: "Comissão do mês",
      isValue: true,
    },
  ];

  return (
    <>
      <SEO 
        title="Dashboard - ImóvelControl"
        description="Painel de controle e métricas do sistema"
      />
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-2">Visão geral do sistema de gerenciamento</p>
          </div>

          <StaggerContainer staggerDelay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, index) => (
                <StaggerItem key={index}>
                  <Link href={card.link}>
                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          {card.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform`}>
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                          {card.isValue ? card.value : card.value}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{card.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>

          {/* Prestes a Vencer Card */}
          {stats.dueThisMonth > 0 && (
            <StaggerContainer staggerDelay={0.1}>
              <StaggerItem>
                <Link href="/payments?status=pending">
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-amber-200 bg-amber-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-lg font-semibold text-amber-900">
                          Prestes a Vencer
                        </CardTitle>
                        <CardDescription className="text-amber-700">
                          Locações a vencer no mês corrente que ainda não foram quitadas
                        </CardDescription>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-100">
                        <Clock className="h-6 w-6 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-amber-900">
                          {stats.dueThisMonth}
                        </div>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                          Pendentes
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            </StaggerContainer>
          )}
        </div>
      </Layout>
    </>
  );
}