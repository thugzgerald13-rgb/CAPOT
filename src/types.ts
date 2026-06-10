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

export interface CashReceiptDetail {
  id: string;
  date: string;
  receiptType: 'Provisional' | 'Collection' | 'Official';
  receiptNo: string;
  buyerName: string;
  buyerTin?: string;
  amount: number;
  paymentMethod: 'Cash' | 'Check' | 'Bank Transfer';
  checkNo?: string;
  bankName?: string;
  desc?: string;
  status: 'Active' | 'Replaced' | 'Returned';
  replacedByReceiptId?: string;
  twasRate?: number;
  twasAmount?: number;
  atcCode?: string;
  invoiceId?: string;
}

export interface DepositSlip {
  id: string;
  date: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  receiptIds: string[];
  cashAmount: number;
  checksAmount: number;
  checkDetails?: Array<{ checkNo: string; bank: string; amount: number }>;
  totalAmount: number;
  cashDenominations?: Record<string, number>;
}

export interface CustomerDeposit {
  id: string;
  date: string;
  customerName: string;
  customerTin: string;
  amount: number;
  status: 'Unapplied' | 'Applied';
  appliedSaleId?: string;
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
  receipts?: CashReceiptDetail[];
  depositSlips?: DepositSlip[];
  customerDeposits?: CustomerDeposit[];
  customerMemos?: DebitCreditMemo[];
  memos?: DebitCreditMemo[];
  bankBalance?: number;
  auditLogs?: AuditLogEntry[];
  fixedAssets?: FixedAsset[];
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

export interface AuditLogEntry {
  id: string;
  timestamp: string;      // ISO format string
  userEmail: string;     // User email of worker executing the action
  userRole: string;      // Role of the user
  action: 'Add' | 'Update' | 'Delete' | 'Import' | 'Export' | 'View';
  section: string;       // e.g. 'Cash Receipts' | 'Cash Disbursements' | 'Purchases Journal' | 'General Journal' | 'General Ledger' | 'Sales' | 'Expenses' | 'Chart of Accounts' | 'TIN Library' | 'System'
  details: string;       // human description of what was changed/done
  originalData?: string;  // string representation for rollback/verification
  newData?: string;       // string representation of updated state
}

export interface AssetTransferRecord {
  id: string;
  date: string;
  fromCustodian: string;
  toCustodian: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
}

export interface FixedAsset {
  id: string; // unique code/tag No.
  name: string;
  category: string;
  acquisitionDate: string; // YYYY-MM-DD
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYrs: number;
  depreciationMethod: 'StraightLine' | 'DecliningBalance' | 'DoubleDeclining' | 'SumOfYearsDigits';
  decliningRate?: number; // rate for Declining Balance (e.g. 0.20 for 20%), if not standard
  custodian: string;
  location: string;
  status: 'Active' | 'Transferred' | 'Disposed' | 'Abandoned';
  disposalDate?: string;
  disposalValue?: number;
  disposalGainLoss?: number;
  disposalReason?: string;
  transferHistory?: AssetTransferRecord[];
}


