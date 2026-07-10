import { generateExpectedPayments } from "../paymentService";

describe("generateExpectedPayments", () => {
  describe("Cenários de Vencimento Antecipado", () => {
    test("Cenário 1: Dia início < dia vencimento (mesmo mês, proporcional)", () => {
      const result = generateExpectedPayments({
        rentalId: "test-rental-1",
        startDate: "2026-07-01",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(3);
      
      // Primeira parcela: 01/07 até 05/07 (4 dias)
      expect(result[0]).toMatchObject({
        reference_month: "07",
        reference_year: "2026",
        due_date: "2026-07-05",
        installment: 1,
        total_installments: 3,
      });
      expect(result[0].expected_amount).toBeCloseTo(200, 2); // (1500/30) * 4

      // Segunda parcela: mês integral
      expect(result[1]).toMatchObject({
        reference_month: "08",
        reference_year: "2026",
        due_date: "2026-08-05",
        expected_amount: 1500,
        installment: 2,
        total_installments: 3,
      });

      // Terceira parcela: proporcional até dia 5
      expect(result[2]).toMatchObject({
        reference_month: "09",
        reference_year: "2026",
        due_date: "2026-09-05",
        installment: 3,
        total_installments: 3,
      });
      expect(result[2].expected_amount).toBeCloseTo(250, 2); // (1500/30) * 5
    });

    test("Cenário 2: Dia início > dia vencimento (mês seguinte, proporcional) - BUG CORRIGIDO", () => {
      // Este era o bug: início dia 10/07, vencimento dia 5
      // Deve criar primeiro recebimento em AGOSTO, não julho
      const result = generateExpectedPayments({
        rentalId: "test-rental-2",
        startDate: "2026-07-10",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(2);
      
      // Primeira parcela: 10/07 até 05/08 (26 dias)
      // 10/07 até 31/07 = 22 dias
      // 01/08 até 04/08 = 4 dias
      // Total = 26 dias
      expect(result[0]).toMatchObject({
        reference_month: "08", // MÊS SEGUINTE
        reference_year: "2026",
        due_date: "2026-08-05",
        installment: 1,
        total_installments: 2,
      });
      expect(result[0].expected_amount).toBeCloseTo(1300, 2); // (1500/30) * 26

      // Segunda parcela: proporcional até dia 5 de setembro
      expect(result[1]).toMatchObject({
        reference_month: "09",
        reference_year: "2026",
        due_date: "2026-09-05",
        installment: 2,
        total_installments: 2,
      });
      expect(result[1].expected_amount).toBeCloseTo(250, 2); // (1500/30) * 5
    });

    test("Cenário 3: Dia início = dia vencimento (mês seguinte, integral)", () => {
      const result = generateExpectedPayments({
        rentalId: "test-rental-3",
        startDate: "2026-07-05",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(2);
      
      // Primeira parcela: mês integral (agosto)
      expect(result[0]).toMatchObject({
        reference_month: "08",
        reference_year: "2026",
        due_date: "2026-08-05",
        expected_amount: 1500,
        installment: 1,
        total_installments: 2,
      });

      // Segunda parcela: proporcional (5 dias)
      expect(result[1]).toMatchObject({
        reference_month: "09",
        reference_year: "2026",
        due_date: "2026-09-05",
        installment: 2,
        total_installments: 2,
      });
      expect(result[1].expected_amount).toBeCloseTo(250, 2);
    });
  });

  describe("Testes com Garagem", () => {
    test("Primeiro recebimento proporcional deve incluir garagem proporcional", () => {
      const result = generateExpectedPayments({
        rentalId: "test-rental-garage",
        startDate: "2026-07-10",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: true,
        garageValue: 300,
      });

      // Primeira parcela: 26 dias
      // Aluguel: (1500/30) * 26 = 1300
      // Garagem: (300/30) * 26 = 260
      // Total: 1560
      expect(result[0].expected_amount).toBeCloseTo(1560, 2);
      expect(result[0].breakdown).toHaveLength(2);
      expect(result[0].breakdown[0].description).toContain("Aluguel");
      expect(result[0].breakdown[0].amount).toBeCloseTo(1300, 2);
      expect(result[0].breakdown[1].description).toContain("Garagem");
      expect(result[0].breakdown[1].amount).toBeCloseTo(260, 2);
    });

    test("Recebimento integral deve incluir garagem integral", () => {
      const result = generateExpectedPayments({
        rentalId: "test-rental-garage-full",
        startDate: "2026-07-01",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: true,
        garageValue: 300,
      });

      // Segunda parcela (agosto) deve ser integral
      expect(result[1].expected_amount).toBe(1800); // 1500 + 300
      expect(result[1].breakdown).toHaveLength(2);
      expect(result[1].breakdown[0].amount).toBe(1500);
      expect(result[1].breakdown[1].amount).toBe(300);
    });
  });

  describe("Cálculo de Dias Proporcionais", () => {
    test("Verificar contagem de dias quando início > vencimento", () => {
      // Início: 25/07, Vencimento: dia 5
      // 25/07 até 31/07 = 7 dias (incluindo dia 25)
      // 01/08 até 04/08 = 4 dias
      // Total = 11 dias
      const result = generateExpectedPayments({
        rentalId: "test-days",
        startDate: "2026-07-25",
        endDate: "2026-08-05",
        monthlyRent: 3000,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].reference_month).toBe("08");
      // 11 dias: (3000/30) * 11 = 1100
      expect(result[0].expected_amount).toBeCloseTo(1100, 2);
    });

    test("Verificar contagem quando início < vencimento", () => {
      // Início: 02/07, Vencimento: dia 5
      // 02/07 até 05/07 (não-inclusivo) = 3 dias
      const result = generateExpectedPayments({
        rentalId: "test-days-2",
        startDate: "2026-07-02",
        endDate: "2026-08-05",
        monthlyRent: 3000,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result[0].reference_month).toBe("07");
      // 3 dias: (3000/30) * 3 = 300
      expect(result[0].expected_amount).toBeCloseTo(300, 2);
    });
  });

  describe("Ajuste de Datas para Meses Especiais", () => {
    test("Vencimento dia 31 em fevereiro deve ajustar para dia 28", () => {
      const result = generateExpectedPayments({
        rentalId: "test-feb",
        startDate: "2026-01-15",
        endDate: "2026-03-31",
        monthlyRent: 1500,
        paymentDay: 31,
        hasGarage: false,
      });

      // Fevereiro não tem dia 31, deve ajustar para 28
      const febPayment = result.find(p => p.reference_month === "02");
      expect(febPayment?.due_date).toBe("2026-02-28");
    });

    test("Vencimento dia 31 em abril deve ajustar para dia 30", () => {
      const result = generateExpectedPayments({
        rentalId: "test-april",
        startDate: "2026-03-15",
        endDate: "2026-05-31",
        monthlyRent: 1500,
        paymentDay: 31,
        hasGarage: false,
      });

      // Abril tem 30 dias
      const aprPayment = result.find(p => p.reference_month === "04");
      expect(aprPayment?.due_date).toBe("2026-04-30");
    });

    test("Vencimento dia 15 deve funcionar em qualquer mês", () => {
      const result = generateExpectedPayments({
        rentalId: "test-15",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        monthlyRent: 1500,
        paymentDay: 15,
        hasGarage: false,
      });

      // Todos os meses devem ter dia 15
      result.forEach(payment => {
        expect(payment.due_date).toContain("-15");
      });
    });
  });

  describe("Contratos de Diferentes Durações", () => {
    test("Contrato de 1 mês apenas", () => {
      const result = generateExpectedPayments({
        rentalId: "test-1month",
        startDate: "2026-07-10",
        endDate: "2026-07-25",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].reference_month).toBe("08");
      // 10/07 até 25/07 = 16 dias (incluindo início, excluindo fim)
      // Mas como vencimento é dia 5 do próximo mês e fim é antes disso,
      // o cálculo é: 10/07 até 31/07 (22 dias) + 01/08 até 04/08 (4 dias) = 26 dias
      // Mas o fim do contrato é 25/07, então são apenas 16 dias no total
      // A lógica considera até o próximo vencimento, então seria proporcional até 05/08
      expect(result[0].installment).toBe(1);
      expect(result[0].total_installments).toBe(1);
    });

    test("Contrato de 12 meses", () => {
      const result = generateExpectedPayments({
        rentalId: "test-12months",
        startDate: "2026-01-05",
        endDate: "2027-01-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      // Início = vencimento, então começa integral no mês seguinte
      expect(result).toHaveLength(12);
      expect(result[0].reference_month).toBe("02");
      expect(result[11].reference_month).toBe("01");
      expect(result[11].reference_year).toBe("2027");
    });
  });

  describe("Validação de Estrutura dos Recebimentos", () => {
    test("Todos os recebimentos devem ter campos obrigatórios", () => {
      const result = generateExpectedPayments({
        rentalId: "test-structure",
        startDate: "2026-07-10",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      result.forEach(payment => {
        expect(payment).toHaveProperty("rental_id");
        expect(payment).toHaveProperty("reference_month");
        expect(payment).toHaveProperty("reference_year");
        expect(payment).toHaveProperty("due_date");
        expect(payment).toHaveProperty("expected_amount");
        expect(payment).toHaveProperty("status");
        expect(payment).toHaveProperty("breakdown");
        expect(payment).toHaveProperty("installment");
        expect(payment).toHaveProperty("total_installments");
        expect(payment.status).toBe("pending");
        expect(Array.isArray(payment.breakdown)).toBe(true);
      });
    });

    test("Numeração de parcelas deve ser sequencial", () => {
      const result = generateExpectedPayments({
        rentalId: "test-sequential",
        startDate: "2026-07-01",
        endDate: "2026-12-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      const totalInstallments = result.length;
      
      result.forEach((payment, index) => {
        expect(payment.installment).toBe(index + 1);
        expect(payment.total_installments).toBe(totalInstallments);
      });
    });

    test("Reference month deve ter padding (01-12)", () => {
      const result = generateExpectedPayments({
        rentalId: "test-padding",
        startDate: "2026-01-15",
        endDate: "2026-09-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      result.forEach(payment => {
        expect(payment.reference_month).toMatch(/^\d{2}$/);
        expect(payment.reference_month.length).toBe(2);
      });
    });
  });

  describe("Virada de Ano", () => {
    test("Contrato atravessando virada de ano", () => {
      const result = generateExpectedPayments({
        rentalId: "test-year-change",
        startDate: "2026-11-15",
        endDate: "2027-02-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      // Deve ter recebimentos em 2026 e 2027
      const years2026 = result.filter(p => p.reference_year === "2026");
      const years2027 = result.filter(p => p.reference_year === "2027");
      
      expect(years2026.length).toBeGreaterThan(0);
      expect(years2027.length).toBeGreaterThan(0);

      // Verificar ordem cronológica
      const decPayment = result.find(p => p.reference_month === "12" && p.reference_year === "2026");
      const janPayment = result.find(p => p.reference_month === "01" && p.reference_year === "2027");
      
      expect(decPayment).toBeDefined();
      expect(janPayment).toBeDefined();
      
      if (decPayment && janPayment) {
        expect(decPayment.installment).toBeLessThan(janPayment.installment);
      }
    });
  });

  describe("Edge Cases", () => {
    test("Contrato começando e terminando no mesmo dia de vencimento", () => {
      const result = generateExpectedPayments({
        rentalId: "test-same-day",
        startDate: "2026-07-05",
        endDate: "2026-08-05",
        monthlyRent: 1500,
        paymentDay: 5,
        hasGarage: false,
      });

      // Início = vencimento, primeira parcela no mês seguinte integral
      expect(result).toHaveLength(1);
      expect(result[0].reference_month).toBe("08");
      expect(result[0].expected_amount).toBe(1500);
    });

    test("Contrato muito curto (menos de 30 dias, início > vencimento)", () => {
      const result = generateExpectedPayments({
        rentalId: "test-short",
        startDate: "2026-07-20",
        endDate: "2026-08-03",
        monthlyRent: 3000,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].reference_month).toBe("08");
      // 20/07 até 31/07 = 12 dias
      // 01/08 até 03/08 = 3 dias (não-inclusivo do fim)
      // Total deveria considerar até o vencimento (05/08)
      // Mas o contrato termina em 03/08, então o último dia é 03
      // A função gera até o próximo vencimento, então seria proporcional
    });

    test("Valor zerado deve retornar recebimentos com valor 0", () => {
      const result = generateExpectedPayments({
        rentalId: "test-zero",
        startDate: "2026-07-01",
        endDate: "2026-08-05",
        monthlyRent: 0,
        paymentDay: 5,
        hasGarage: false,
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach(payment => {
        expect(payment.expected_amount).toBe(0);
      });
    });
  });
});