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
