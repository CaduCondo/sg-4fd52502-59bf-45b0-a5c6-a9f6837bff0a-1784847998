import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { PeriodSelector, monthNames } from "@/components/dashboard/PeriodSelector";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/masks";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Olá");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const {
    properties,
    tenants,
    rentals,
    payments,
    adminFeePercentage,
    filteredPayments,
    dueSoonPayments,
    stats,
    loadData
  } = useDashboardData(selectedMonth, selectedYear);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setGreeting(getGreeting());
      loadData();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedMonth, selectedYear, mounted]);

  const exportDashboardData = () => {
    if (!selectedMonth || !selectedYear) return;
    const monthName = monthNames[selectedMonth - 1];
    
    const exportData = {
      periodo: `${monthName} de ${selectedYear}`,
      resumo: {
        totalImoveis: stats.totalProperties,
        imoveisAlugados: stats.occupiedProperties,
        imoveisDisponiveis: stats.availableProperties,
        totalInquilinos: stats.totalTenants,
        recebimentosPendentes: stats.pendingPayments,
        recebimentosRealizados: stats.paidPayments,
      },
      financeiro: {
        receitaMensal: formatCurrency(stats.monthlyRevenue),
        taxaAdministracao: formatCurrency(stats.adminFee),
        receitaLiquida: formatCurrency(stats.netRevenue),
      },
      imoveis: properties.map(p => ({
        local: p.location,
        endereco: p.address,
        bairro: p.neighborhood,
        cidade: p.city,
        valorAluguel: formatCurrency(p.monthlyRent),
        tipo: p.type,
        status: p.status === "occupied" ? "Ocupado" : "Disponível",
      })),
      inquilinos: tenants.filter(t => t.status === "active" || t.status === "rented").map(t => ({
        nome: t.name,
        cpf: t.cpf,
        email: t.email,
        telefone: t.phone,
        status: t.status === "rented" ? "Locador" : "Ativo",
      })),
      pagamentos: filteredPayments.map(p => {
        const rental = rentals.find(r => r.id === p.rentalId);
        const property = properties.find(pr => pr.id === rental?.propertyId);
        const tenant = tenants.find(t => t.id === rental?.tenantId);
        return {
          imovel: property?.location || "N/A",
          inquilino: tenant?.name || "N/A",
          valorEsperado: formatCurrency(p.expectedAmount),
          valorPago: formatCurrency(p.paidAmount),
          dataVencimento: p.dueDate,
          dataPagamento: p.paymentDate || "N/A",
          status: p.status === "paid" ? "Pago" : p.status === "partial" ? "Parcial" : p.status === "overdue" ? "Atrasado" : "Pendente",
        };
      }),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${monthName.toLowerCase()}-${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    exportAsCSV(exportData);
  };

  const exportAsCSV = (data: any) => {
    const monthName = monthNames[selectedMonth! - 1];
    let csvContent = `Dashboard - ${monthName} de ${selectedYear}\n\n`;
    csvContent += "RESUMO GERAL\n";
    csvContent += "Métrica,Valor\n";
    csvContent += `Total de Imóveis,${data.resumo.totalImoveis}\n`;
    csvContent += `Imóveis Alugados,${data.resumo.imoveisAlugados}\n`;
    csvContent += `Imóveis Disponíveis,${data.resumo.imoveisDisponiveis}\n`;
    csvContent += `Total de Inquilinos,${data.resumo.totalInquilinos}\n`;
    csvContent += `Recebimentos Pendentes,${data.resumo.recebimentosPendentes}\n`;
    csvContent += `Recebimentos Realizados,${data.resumo.recebimentosRealizados}\n\n`;

    csvContent += "FINANCEIRO\n";
    csvContent += "Métrica,Valor\n";
    csvContent += `Receita Mensal,${data.financeiro.receitaMensal}\n`;
    csvContent += `Taxa de Administração,${data.financeiro.taxaAdministracao}\n`;
    csvContent += `Receita Líquida,${data.financeiro.receitaLiquida}\n\n`;

    csvContent += "IMÓVEIS\n";
    csvContent += "Local,Endereço,Bairro,Cidade,Valor Aluguel,Tipo,Status\n";
    data.imoveis.forEach((imovel: any) => {
      csvContent += `"${imovel.local}","${imovel.endereco}","${imovel.bairro}","${imovel.cidade}",${imovel.valorAluguel},"${imovel.tipo}","${imovel.status}"\n`;
    });
    csvContent += "\n";

    csvContent += "INQUILINOS\n";
    csvContent += "Nome,CPF,Email,Telefone,Status\n";
    data.inquilinos.forEach((inquilino: any) => {
      csvContent += `"${inquilino.nome}","${inquilino.cpf}","${inquilino.email}","${inquilino.telefone}","${inquilino.status}"\n`;
    });
    csvContent += "\n";

    csvContent += "PAGAMENTOS\n";
    csvContent += "Imóvel,Inquilino,Valor Esperado,Valor Pago,Data Vencimento,Data Pagamento,Status\n";
    data.pagamentos.forEach((pagamento: any) => {
      csvContent += `"${pagamento.imovel}","${pagamento.inquilino}",${pagamento.valorEsperado},${pagamento.valorPago},"${pagamento.dataVencimento}","${pagamento.dataPagamento}","${pagamento.status}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${monthName.toLowerCase()}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!mounted || !selectedMonth || !selectedYear) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">Carregando...</div>
      </Layout>
    );
  }

  return (
    <>
      <SEO title="Dashboard - Gerenciador de Locações" />
      <Layout>
        <div className="space-y-6">
          <WelcomeCard 
            greeting={greeting} 
            userName={user?.name?.split(" ")[0] || "Usuário"} 
          />

          <PeriodSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onExport={exportDashboardData}
          />

          <OverviewCards stats={stats} />

          <AnalyticsCharts
            stats={stats}
            adminFeePercentage={adminFeePercentage}
            selectedMonth={selectedMonth}
            filteredPayments={filteredPayments}
            dueSoonPayments={dueSoonPayments}
            monthNames={monthNames}
          />
        </div>
      </Layout>
    </>
  );
}