import { Document, Page, Text, View, StyleSheet, PDFViewer, Font } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { Payment, Rental, Property, Tenant } from "@/types";

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 12,
    color: '#666666'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 5
  },
  label: {
    width: '30%',
    fontSize: 12,
    fontWeight: 'bold'
  },
  value: {
    width: '70%',
    fontSize: 12
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999'
  }
});

interface ReceiptDataProps {
  tenantName: string;
  propertyAddress: string;
  amount: number;
  referenceMonth: string;
  paymentDate: string;
  ownerName: string;
}

const ReceiptDocument = ({ tenantName, propertyAddress, amount, referenceMonth, paymentDate, ownerName }: ReceiptDataProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>RECIBO DE PAGAMENTO</Text>
        <Text style={styles.subtitle}>{ownerName}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Pagador:</Text>
          <Text style={styles.value}>{tenantName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Imóvel:</Text>
          <Text style={styles.value}>{propertyAddress}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Referência:</Text>
          <Text style={styles.value}>{referenceMonth}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Data do Pagamento:</Text>
          <Text style={styles.value}>{formatDate(paymentDate)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Valor:</Text>
          <Text style={styles.value}>{formatCurrency(amount)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Este recibo serve como comprovante de pagamento para o mês de referência citado.</Text>
      </View>
    </Page>
  </Document>
);

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose?: () => void;
  isOpen?: boolean;
  trigger?: React.ReactNode;
}

export function PaymentReceipt({ payment, rental, property, tenant, onClose, isOpen, trigger }: PaymentReceiptProps) {
  // Preparar dados para o recibo
  const receiptData: ReceiptDataProps = {
    tenantName: tenant.name,
    propertyAddress: `${property.location} ${property.complement ? `- ${property.complement}` : ''}`,
    amount: payment.paidAmount || 0,
    referenceMonth: `${payment.referenceMonth}/${payment.referenceYear}`,
    paymentDate: payment.paymentDate || new Date().toISOString(),
    ownerName: "Imobiliária Demo" // Idealmente viria das configs
  };

  // Se for usado como modal controlado (isOpen passado)
  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <PDFViewer width="100%" height="100%" className="border-0 rounded-md">
            <ReceiptDocument {...receiptData} />
          </PDFViewer>
        </DialogContent>
      </Dialog>
    );
  }

  // Se for usado com trigger
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Gerar Recibo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <PDFViewer width="100%" height="100%" className="border-0 rounded-md">
          <ReceiptDocument {...receiptData} />
        </PDFViewer>
      </DialogContent>
    </Dialog>
  );
}