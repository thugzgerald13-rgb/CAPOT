export interface TinEntry {
  id: number;
  tin: string;
  name: string;
  address?: string;
}

export interface Purchase {
  id: number;
  datMonthYear: string;
  date: string;
  paymentMethod: string;
  checkNumber: string | null;
  bankName?: string | null;
  invoiceNo: string;
  supplierName: string;
  supplierAddress: string;
  supplierTin: string;
  amount: number;
  vatType: string;
  expenseType: string;
  accountTitle: string;
  transactionDetails?: string;
  inputTax: number;
  isDatEntry?: boolean;
}

export interface Sale {
  id: number;
  date: string;
  ref: string;
  paymentType: string;
  buyerName: string;
  buyerTin: string;
  amount: number;
  desc?: string;
}

export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
}

export interface CoaAccount {
  id: string;
  name: string;
  type: string;
  parentId?: string;
}

export interface InvoicePayable {
  id: string;
  invoiceNo: string;
  poNo: string;
  rrNo: string;
  date: string;
  dueDate: string;
  supplierTin: string;
  supplierName: string;
  supplierAddress: string;
  poQty: number;
  poUnitPrice: number;
  rrQty: number;
  rrUnitPrice: number;
  viQty: number;
  viUnitPrice: number;
  amount: number;
  matchingStatus: 'Matched' | 'Discrepancy' | 'Pending';
  matchingDetails?: string;
  status: 'Hold' | 'Released';
  paymentStatus: 'Unpaid' | 'Paid' | 'Partially Paid';
  amountPaid: number;
  whtRate: number;
  whtAmount: number;
  atcCode?: string;
}

export interface CashDisbursementDetail {
  id: string;
  date: string;
  voucherNo: string;
  checkNo: string;
  bankName: string;
  payee: string;
  payeeTin?: string;
  amount: number;
  whtAmount: number;
  netAmountPaid: number;
  accountTitle: string;
  particulars: string;
  payableInvoiceId?: string;
  isReversed?: boolean;
  reversalReason?: string;
  reversalDate?: string;
  type: 'Invoice' | 'Miscellaneous' | 'Advance';
}

export interface AdvanceToSupplier {
  id: string;
  date: string;
  supplierName: string;
  supplierTin: string;
  bankName: string;
  checkNo: string;
  amount: number;
  status: 'Unapplied' | 'Applied';
  appliedInvoiceNo?: string;
}

export interface DebitCreditMemo {
  id: string;
  date: string;
  type: 'Debit' | 'Credit';
  invoiceId: string;
  amount: number;
  reason: string;
}

export interface Client {
  id: string;
  name: string; // Display name
  tin?: string;
  taxpayerClassification?: string;
  registeredName?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  tradeName?: string;
  substreet?: string;
  street?: string;
  barangay?: string;
  district?: string;
  city?: string;
  zipCode?: string;
  rdoCode?: string;
  accountingType?: 'Calendar' | 'Fiscal';
  fiscalMonthEnd?: number;
  coaFormat?: 'numeric' | 'alphanumeric';
  tinLibrary: {
    customers: TinEntry[];
    suppliers: TinEntry[];
  };
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  accounts?: CoaAccount[];
  crjColumns?: JournalColumn[];
  crjEntries?: JournalEntry[];
  cdjColumns?: JournalColumn[];
  cdjEntries?: JournalEntry[];
  pjColumns?: JournalColumn[];
  pjEntries?: JournalEntry[];
  gjColumns?: JournalColumn[];
  gjEntries?: JournalEntry[];
  glAccounts?: GeneralLedgerAccount[];
  plData?: ProfitAndLossData;
  isOwnBusiness?: boolean;
  payables?: InvoicePayable[];
  disbursements?: CashDisbursementDetail[];
  advances?: AdvanceToSupplier[];
  memos?: DebitCreditMemo[];
  bankBalance?: number;
}

export interface ProfitAndLossLine {
  id: string;
  particulars: string;
  amount: string;
}

export interface ProfitAndLossData {
  companyName: string;
  address: string;
  reportName: string;
  period: string;
  revenue: ProfitAndLossLine[];
  costOfRevenue: ProfitAndLossLine[];
  operatingExpenses: ProfitAndLossLine[];
  provisionForIncomeTax: string;
}

export interface GeneralLedgerEntry {
  id: string;
  dateDr: string;
  particularsDr: string;
  refDr: string;
  debit: string;
  dateCr: string;
  particularsCr: string;
  refCr: string;
  credit: string;
}

export interface GeneralLedgerAccount {
  id: string;
  accountTitle: string;
  entries: GeneralLedgerEntry[];
}

export interface JournalColumn {
  id: string;
  name: string;
  type: 'text' | 'number';
  category: 'Dr' | 'Cr' | 'None';
  isSystem: boolean; // if true, not deletable
}

export interface JournalEntry {
  id: string;
  values: Record<string, any>;
}

export type CashReceipt = JournalEntry;
export type CashDisbursement = JournalEntry;

export interface DatSelection {
  month: number;
  year: number;
  formatted: string;
}
