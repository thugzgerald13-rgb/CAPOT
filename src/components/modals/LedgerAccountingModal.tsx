import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { DEFAULT_ACCOUNTS } from './ChartOfAccountsModal';
import { 
  Building2, Landmark, Settings, Sliders, DollarSign, FileText, 
  ArrowRightLeft, Percent, Layers, Plus, Calendar, RotateCcw, 
  Trash2, Play, Eye, Save, AlertCircle, HelpCircle, ChevronRight, 
  ChevronDown, HelpCircle as HelpIcon, TrendingUp, Scale, Settings2, BarChart2,
  Wallet
} from 'lucide-react';

// --- Types for Advanced G/L ---
export interface Segment {
  id: string;
  type: 'Division' | 'Department' | 'ProfitCenter';
  code: string;
  name: string;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  rateToPhp: number; // exchange rate to PHP
}

export interface ForeignTransaction {
  id: string;
  date: string;
  currency: string;
  fcAmount: number; // Foreign currency amount
  spotRate: number; // Spot rate at transaction date
  settledRate?: number; // Spot rate at settlement
  accountTitle: string;
  payee: string;
}

export interface JournalVoucherLine {
  id: string;
  accountTitle: string;
  segmentCode: string; // segment combination like "01-10-101"
  remarksCode?: string; // New field for remarks code
  remarksName?: string; // New field for remarks name
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  isRecurring: boolean;
  recurrencePeriod?: 'Monthly' | 'Quarterly';
  isReversing: boolean;
  reversalDate?: string;
  isReversed?: boolean;
  lines: JournalVoucherLine[];
}

export interface AllocationRule {
  id: string;
  sourceAccount: string;
  name: string;
  allocations: {
    segmentCode: string;
    percentage: number; // e.g. 40
  }[];
}

export interface AllocationLog {
  id: string;
  date: string;
  ruleName: string;
  sourceAccount: string;
  sourceBalance: number;
  lines: {
    segmentCode: string;
    allocatedAmount: number;
  }[];
}

export interface CustomReportSection {
  id: string;
  title: string;
  formula: string; // e.g. "REV - Opex"
  accounts: string[];
}

export interface CustomReportConfig {
  id: string;
  name: string;
  sections: CustomReportSection[];
}

export interface BudgetScenario {
  id: string;
  name: string;
  description: string;
  allocations: Record<string, number>; // Account Title -> Budget amount in PHP
}

export interface IntercompanyElimination {
  id: string;
  date: string;
  fromEntity: string;
  toEntity: string;
  amount: number;
  accountTitle: string;
  description: string;
}

export function LedgerAccountingModal() {
  const { currentClient, currentClientId, saveClient, showToast, activeModal } = useAccounting();
  const bankBalance = currentClient?.bankBalance || 500000;

  // --- Active Module Section Tab ---
  type TabType = 'segments' | 'currency' | 'journals' | 'allocations' | 'financials' | 'writer' | 'budgeting' | 'consolidation' | 'petty_cash' | 'transfers' | 'reconciliation' | 'revaluation' | 'cashflow_projection';
  const [activeTab, setActiveTab] = useState<TabType>('segments');

  // --- Core State Backed by currentClient (or local defaults) ---
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([
    { code: 'PHP', symbol: '₱', rateToPhp: 1.0 },
    { code: 'USD', symbol: '$', rateToPhp: 58.5 },
    { code: 'EUR', symbol: '€', rateToPhp: 63.2 },
    { code: 'SGD', symbol: 'S$', rateToPhp: 43.1 },
  ]);
  const [foreignLedger, setForeignLedger] = useState<ForeignTransaction[]>([]);
  const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>([]);
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>([]);
  const [allocationLogs, setAllocationLogs] = useState<AllocationLog[]>([]);
  const [customReports, setCustomReports] = useState<CustomReportConfig[]>([]);
  const [budgets, setBudgets] = useState<BudgetScenario[]>([]);
  const [intercompanyData, setIntercompanyData] = useState<IntercompanyElimination[]>([]);

  // --- New Cash Flow & Petty Cash & Transfer & Revaluation & Reconciliation States ---
  const [pettyCounters, setPettyCounters] = useState<{ id: string; name: string; balance: number; status: 'Open' | 'Closed'; manager: string; startBalance: number }[]>([
    { id: 'cnt-1', name: 'Main Corporate Counter (HQ)', balance: 15000, status: 'Open', manager: 'Ana Santos', startBalance: 15000 },
    { id: 'cnt-2', name: 'Operations & Logistics Desk', balance: 8000, status: 'Open', manager: 'John Doe', startBalance: 8000 },
  ]);
  const [activeCounterId, setActiveCounterId] = useState('cnt-1');
  const [pettyAdvances, setPettyAdvances] = useState<{ id: string; counterId: string; recipient: string; amount: number; purpose: string; date: string; status: 'Pending' | 'Liquidated'; liquidatedAmount?: number; returnedAmount?: number; receiptNo?: string }[]>([
    { id: 'adv-1', counterId: 'cnt-1', recipient: 'Lando Calrissian', amount: 3500, purpose: 'Site delivery emergency gasoline', date: '2026-06-08', status: 'Pending' },
    { id: 'adv-2', counterId: 'cnt-1', recipient: 'Leia Organa', amount: 2000, purpose: 'Courier messenger expedited documents', date: '2026-06-05', status: 'Liquidated', liquidatedAmount: 1850, returnedAmount: 150, receiptNo: 'RE-990-23' },
  ]);
  const [pettyCounterShifts, setPettyCounterShifts] = useState<{ id: string; counterId: string; shiftDate: string; openingCash: number; totalDisbursed: number; closedCash: number; actualCashCount: number; variance: number; status: 'Open' | 'Closed' }[]>([
    { id: 'sft-1', counterId: 'cnt-2', shiftDate: '2026-06-09', openingCash: 10000, totalDisbursed: 2000, closedCash: 8000, actualCashCount: 8000, variance: 0, status: 'Closed' }
  ]);
  const [bankTransfers, setBankTransfers] = useState<{ id: string; date: string; sourceBank: string; destinationBank: string; amount: number; reference: string; charge: number; status: 'Pending' | 'Completed' }[]>([
    { id: 'trf-1', date: '2026-06-06', sourceBank: 'BDO Current Account', destinationBank: 'BPI Payroll Account', amount: 120000, reference: 'TRF-909281-BDO', charge: 15, status: 'Completed' },
  ]);
  const [reconBank, setReconBank] = useState('BDO Current Account');
  const [reconProgress, setReconProgress] = useState<'idle' | 'scanning' | 'reconciled'>('idle');
  const [statementFileName, setStatementFileName] = useState('');
  const [ocrScanningSimulationLogs, setOcrScanningSimulationLogs] = useState<string[]>([]);
  const [internalLedgerTx, setInternalLedgerTx] = useState<{ id: string; date: string; ref: string; desc: string; amount: number; reconciled: boolean }[]>([
    { id: 'lt-1', date: '2026-06-01', ref: 'OR-5612', desc: 'Acme consult payout', amount: 150000, reconciled: false },
    { id: 'lt-2', date: '2026-06-03', ref: 'CV-1011', desc: 'Office supplies supplier settle', amount: -22000, reconciled: false },
    { id: 'lt-3', date: '2026-06-05', ref: 'BDO-9921', desc: 'Transfer fee intrabank', amount: -15, reconciled: false },
    { id: 'lt-4', date: '2026-06-08', ref: 'JV-Rental', desc: 'Monthly general office rental', amount: -65000, reconciled: false },
  ]);
  const [statementTx, setStatementTx] = useState<{ id: string; date: string; ref: string; desc: string; amount: number; matchedId?: string }[]>([]);
  const [revaluationRate, setRevaluationRate] = useState('59.20'); 
  const [revalueLogs, setRevalueLogs] = useState<{ id: string; date: string; account: string; foreignVal: number; oldPHPVal: number; revaluedPHPVal: number; variance: number; entryJVReference: string }[]>([]);
  const [cfTimeline, setCfTimeline] = useState<'30_days' | '60_days' | '90_days'>('30_days');
  const [cfScenario, setCfScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');

  // List of subsidiaries for consolidation
  const [subsidiaries, setSubsidiaries] = useState<{ id: string; name: string; revenue: number; assets: number; liabilities: number }[]>([
    { id: 'sub-1', name: 'Metro Manila Distribution Inc.', revenue: 1200000, assets: 3400000, liabilities: 1200000 },
    { id: 'sub-2', name: 'Cebu CyberOps Logistics Corp.', revenue: 650000, assets: 1800000, liabilities: 600000 },
  ]);

  // Load configuration from client
  useEffect(() => {
    if (currentClient) {
      const cc = currentClient as any;
      if (cc.segments) setSegments(cc.segments);
      if (cc.currencies) setCurrencies(cc.currencies);
      if (cc.foreignLedger) setForeignLedger(cc.foreignLedger);
      if (cc.journalVouchers) setJournalVouchers(cc.journalVouchers);
      if (cc.allocationRules) setAllocationRules(cc.allocationRules);
      if (cc.allocationLogs) setAllocationLogs(cc.allocationLogs);
      if (cc.customReports) setCustomReports(cc.customReports);
      if (cc.budgets) setBudgets(cc.budgets);
      if (cc.intercompanyData) setIntercompanyData(cc.intercompanyData);
      
      // New state hooks loading
      if (cc.pettyCounters) setPettyCounters(cc.pettyCounters);
      if (cc.pettyAdvances) setPettyAdvances(cc.pettyAdvances);
      if (cc.pettyCounterShifts) setPettyCounterShifts(cc.pettyCounterShifts);
      if (cc.bankTransfers) setBankTransfers(cc.bankTransfers);
      if (cc.internalLedgerTx) setInternalLedgerTx(cc.internalLedgerTx);
      if (cc.revalueLogs) setRevalueLogs(cc.revalueLogs);
    }
  }, [currentClient]);

  // --- Sync helper ---
  const syncWithFirebase = async (updates: Record<string, any>) => {
    if (!currentClient) return;
    await saveClient(currentClient.id, {
      ...currentClient,
      ...updates
    } as any);
  };

  // --- 1. SEGMENTS MANAGEMENT STATE & HANDLERS ---
  const [segType, setSegType] = useState<'Division' | 'Department' | 'ProfitCenter'>('Division');
  const [segCode, setSegCode] = useState('');
  const [segName, setSegName] = useState('');

  const handleAddSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segCode || !segName) return;
    const newSeg: Segment = { id: crypto.randomUUID(), type: segType, code: segCode, name: segName };
    const nextSegs = [...segments, newSeg];
    setSegments(nextSegs);
    await syncWithFirebase({ segments: nextSegs });
    showToast(`Segment segment ${segCode} created`);
    setSegCode('');
    setSegName('');
  };

  const handleDeleteSegment = async (id: string) => {
    const nextSegs = segments.filter(s => s.id !== id);
    setSegments(nextSegs);
    await syncWithFirebase({ segments: nextSegs });
    showToast('GL segment removed');
  };

  // Generate demo combinations for dropdowns
  const divisions = segments.filter(s => s.type === 'Division');
  const departments = segments.filter(s => s.type === 'Department');
  const profitCenters = segments.filter(s => s.type === 'ProfitCenter');

  // Multi-segment mock string builder
  const sampleSegmentCombinations = [
    { code: '01-HEAD-OP01', desc: 'Metropolitan Division / Admin Dept / General Profit Group' },
    { code: '02-NORT-EN05', desc: 'Luzon Division / Engineering Dept / Developers Profit Group' },
    { code: '03-SOUT-SA03', desc: 'Mindanao Division / Sales & Ops Dept / Retail Marketing Cost Group' },
  ];

  // --- 2. MULTI-CURRENCY HANDLERS ---
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [newCurrencyRate, setNewCurrencyRate] = useState('');
  const [fcAmountInput, setFcAmountInput] = useState('');
  const [spotRateInput, setSpotRateInput] = useState('');
  const [fcAccount, setFcAccount] = useState('Professional Fees');
  const [fcPayee, setFcPayee] = useState('');

  const handleSetCurrencyRate = async () => {
    const rate = parseFloat(newCurrencyRate);
    if (isNaN(rate) || rate <= 0) return;
    const updated = currencies.map(c => c.code === selectedCurrency ? { ...c, rateToPhp: rate } : c);
    setCurrencies(updated);
    await syncWithFirebase({ currencies: updated });
    showToast(`Reference rate updated: 1 ${selectedCurrency} = ₱${rate.toFixed(2)}`);
    setNewCurrencyRate('');
  };

  // Logging foreign currency spot invoice
  const handleLogForeignInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fcAmountInput);
    const spot = parseFloat(spotRateInput);
    if (!amt || !spot || !fcPayee) return;

    const newTx: ForeignTransaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      currency: selectedCurrency,
      fcAmount: amt,
      spotRate: spot,
      accountTitle: fcAccount,
      payee: fcPayee
    };
    const nextLedger = [...foreignLedger, newTx];
    setForeignLedger(nextLedger);
    await syncWithFirebase({ foreignLedger: nextLedger });
    showToast(`Foreign Invoice logged: ${selectedCurrency} ${amt.toLocaleString()} at rate ${spot}`);
    setFcAmountInput('');
    setSpotRateInput('');
    setFcPayee('');
  };

  const handleSettleInvoice = async (id: string, settleRate: number) => {
    const nextLedger = foreignLedger.map(tx => {
      if (tx.id === id) {
        return { ...tx, settledRate: settleRate };
      }
      return tx;
    });
    setForeignLedger(nextLedger);
    await syncWithFirebase({ foreignLedger: nextLedger });
    showToast('Foreign currency invoice transaction settlement registered.');
  };

  // --- 3. balanced JOURNAL VOUCHERS STATE & HANDLERS ---
  const [jvNo, setJvNo] = useState(`JV-2026-${String((journalVouchers.length + 1)).padStart(4, '0')}`);
  const [jvDate, setJvDate] = useState(new Date().toISOString().split('T')[0]);
  const [jvNarration, setJvNarration] = useState('');
  const [jvIsRecurring, setJvIsRecurring] = useState(false);
  const [jvRecurPeriod, setJvRecurPeriod] = useState<'Monthly' | 'Quarterly'>('Monthly');
  const [jvIsReversing, setJvIsReversing] = useState(false);
  const [jvRevDate, setJvRevDate] = useState('');

  // Individual entry Lines creator inside JV Form
  const [jvLines, setJvLines] = useState<JournalVoucherLine[]>([
    { id: 'l1', accountTitle: 'Rent Expense', segmentCode: '01-HEAD-OP01', debit: 45000, credit: 0 },
    { id: 'l2', accountTitle: 'Cash in Bank', segmentCode: '01-HEAD-OP01', debit: 0, credit: 45000 },
  ]);

  const [addLineAccount, setAddLineAccount] = useState('Rent Expense');
  const [addLineRemarks, setAddLineRemarks] = useState('');
  const [addLineSegment, setAddLineSegment] = useState('01-HEAD-OP01');
  const [addLineDebit, setAddLineDebit] = useState('');
  const [addLineCredit, setAddLineCredit] = useState('');

  const coaList = currentClient?.accounts || DEFAULT_ACCOUNTS;

  const handleAddLineToJv = () => {
    const d = parseFloat(addLineDebit) || 0;
    const c = parseFloat(addLineCredit) || 0;
    if (d === 0 && c === 0) return;

    let rCode = undefined;
    let rName = undefined;
    const selectedAccountRef = coaList.find(a => a.name === addLineAccount);
    if (addLineRemarks && selectedAccountRef && selectedAccountRef.remarks) {
       const rm = selectedAccountRef.remarks.find(r => r.code === addLineRemarks);
       if (rm) {
         rCode = rm.code;
         rName = rm.name;
       }
    }

    const newLine: JournalVoucherLine = {
      id: crypto.randomUUID(),
      accountTitle: addLineAccount,
      segmentCode: addLineSegment,
      remarksCode: rCode,
      remarksName: rName,
      debit: d,
      credit: c
    };
    setJvLines([...jvLines, newLine]);
    setAddLineDebit('');
    setAddLineCredit('');
    setAddLineRemarks('');
  };

  const handleRemoveLineFromJv = (lineId: string) => {
    setJvLines(jvLines.filter(l => l.id !== lineId));
  };

  const handleCreateJV = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate balance
    const totDr = jvLines.reduce((sum, l) => sum + l.debit, 0);
    const totCr = jvLines.reduce((sum, l) => sum + l.credit, 0);

    if (totDr !== totCr) {
      alert(`Unbalanced journal voucher is blocked. Debits (₱${totDr.toLocaleString()}) must match Credits (₱${totCr.toLocaleString()})! Difference: ₱${Math.abs(totDr - totCr).toLocaleString()}`);
      return;
    }

    const newJv: JournalVoucher = {
      id: crypto.randomUUID(),
      voucherNo: jvNo,
      date: jvDate,
      narration: jvNarration || 'System Adjusted general ledger voucher',
      isRecurring: jvIsRecurring,
      recurrencePeriod: jvIsRecurring ? jvRecurPeriod : undefined,
      isReversing: jvIsReversing,
      reversalDate: jvIsReversing ? jvRevDate : undefined,
      lines: jvLines
    };

    const nextJVs = [...journalVouchers, newJv];
    setJournalVouchers(nextJVs);
    await syncWithFirebase({ journalVouchers: nextJVs });
    showToast(`Journal voucher ${jvNo} posted successfully!`);

    // Reset Form
    setJvNo(`JV-2026-${String((nextJVs.length + 1)).padStart(4, '0')}`);
    setJvNarration('');
    setJvLines([
      { id: 'l1', accountTitle: 'Rent Expense', segmentCode: '01-HEAD-OP01', debit: 0, credit: 0 },
      { id: 'l2', accountTitle: 'Cash in Bank', segmentCode: '01-HEAD-OP01', debit: 0, credit: 0 },
    ]);
  };

  const handleReverseJv = async (id: string) => {
    const nextJVs = journalVouchers.map(jv => {
      if (jv.id === id) {
        return { ...jv, isReversed: true };
      }
      return jv;
    });
    setJournalVouchers(nextJVs);
    await syncWithFirebase({ journalVouchers: nextJVs });
    showToast('Reversing Entry generated in ledger.');
  };

  // --- 4. GL ALLOCATION POOL RULES ---
  const [allocSource, setAllocSource] = useState('Rent Expense');
  const [allocRuleName, setAllocRuleName] = useState('');
  const [allocDistributions, setAllocDistributions] = useState<{ segmentCode: string; percentage: number }[]>([
    { segmentCode: '01-HEAD-OP01', percentage: 50 },
    { segmentCode: '02-NORT-EN05', percentage: 30 },
    { segmentCode: '03-SOUT-SA03', percentage: 20 },
  ]);

  const [distSeg, setDistSeg] = useState('01-HEAD-OP01');
  const [distPct, setDistPct] = useState('');

  const handleAddDistributionRow = () => {
    const val = parseFloat(distPct);
    if (!val || val <= 0) return;
    setAllocDistributions([...allocDistributions, { segmentCode: distSeg, percentage: val }]);
    setDistPct('');
  };

  const handleSaveAllocationRule = async () => {
    const totPct = allocDistributions.reduce((sum, d) => sum + d.percentage, 0);
    if (totPct !== 100) {
      alert(`Allocations must total 100% (currently ${totPct}%). Please adjust elements.`);
      return;
    }
    const newRule: AllocationRule = {
      id: crypto.randomUUID(),
      sourceAccount: allocSource,
      name: allocRuleName || `Overhead allocation for ${allocSource}`,
      allocations: allocDistributions
    };
    const nextRules = [...allocationRules, newRule];
    setAllocationRules(nextRules);
    await syncWithFirebase({ allocationRules: nextRules });
    showToast('Overhead balance allocation rule configured.');
    setAllocRuleName('');
    setAllocDistributions([]);
  };

  const handleExecuteAllocation = async (rule: AllocationRule) => {
    // Dynamically calculate a mock balance for demonstration
    const sourceAmtRange = 120000; 
    const generatedLogs: AllocationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      ruleName: rule.name,
      sourceAccount: rule.sourceAccount,
      sourceBalance: sourceAmtRange,
      lines: rule.allocations.map(a => ({
        segmentCode: a.segmentCode,
        allocatedAmount: (sourceAmtRange * a.percentage) / 100
      }))
    };
    const nextLogs = [generatedLogs, ...allocationLogs];
    setAllocationLogs(nextLogs);
    await syncWithFirebase({ allocationLogs: nextLogs });
    showToast(`Balanced allocation executed successfully! ₱${sourceAmtRange.toLocaleString()} distributed.`);
  };

  // --- 5. REPORT DRILL DOWN STATE ---
  const [drillDownAccount, setDrillDownAccount] = useState<string | null>(null);

  // Custom static transactions mapping for drilldowns
  const reportTransactions: Record<string, { date: string; ref: string; desc: string; amount: number }[]> = {
    'Cash in Bank': [
      { date: '2026-06-01', ref: 'OR-5612', desc: 'Customer collection Acme', amount: 150000 },
      { date: '2026-06-03', ref: 'CV-1011', desc: 'Settle Office Supply payable', amount: -22000 },
      { date: '2026-06-08', ref: 'JV-Rental', desc: 'Prepaid corporate rent voucher', amount: -65000 },
    ],
    'Accounts Payable': [
      { date: '2026-06-02', ref: 'VI-1042', desc: 'Fuji office copiers leased invoice', amount: 85000 },
      { date: '2026-06-04', ref: 'VI-0925', desc: 'Supplier high-density cabling equipment', amount: 120000 },
    ],
    'Professional Fees': [
      { date: '2026-05-15', ref: 'JV-Legal', desc: 'Monthly professional billing', amount: 45000 },
      { date: '2026-05-28', ref: 'JV-Audit', desc: 'Auditor semi-annual reporting fee', amount: 80000 },
    ],
  };

  // --- 6. REPORT WRITER CONSTRUCT ---
  const [writerName, setWriterName] = useState('Core Gross Margin Report');
  const [writerSections, setWriterSections] = useState<CustomReportSection[]>([
    { id: 's1', title: 'Consultancy Revenues', formula: 'SUM', accounts: ['Professional Fees', 'Sales Income'] },
    { id: 's2', title: 'Subcontractor Costs', formula: 'SUM', accounts: ['Rent Expense', 'Repair/Maintenance'] },
  ]);

  const [lineTitle, setLineTitle] = useState('');
  const [lineFormula, setLineFormula] = useState('SUM');
  const [lineAccounts, setLineAccounts] = useState<string[]>(['Professional Fees']);

  const handleAddWriterLine = () => {
    if (!lineTitle) return;
    const newSec: CustomReportSection = {
      id: crypto.randomUUID(),
      title: lineTitle,
      formula: lineFormula,
      accounts: lineAccounts
    };
    setWriterSections([...writerSections, newSec]);
    setLineTitle('');
  };

  const handleSaveCustomReport = async () => {
    if (writerSections.length === 0) return;
    const newRep: CustomReportConfig = {
      id: crypto.randomUUID(),
      name: writerName,
      sections: writerSections
    };
    const nextReports = [...customReports, newRep];
    setCustomReports(nextReports);
    await syncWithFirebase({ customReports: nextReports });
    showToast(`Custom report structure "${writerName}" saved successfully.`);
    setWriterName('');
    setWriterSections([]);
  };

  // --- 7. BUDGET SCENARIO STATE & HANDLERS ---
  const [budgetName, setBudgetName] = useState('');
  const [budgetDesc, setBudgetDesc] = useState('');
  const [editingBudgetVals, setEditingBudgetVals] = useState<Record<string, string>>({
    'Cash in Bank': '600000',
    'Accounts Payable': '100000',
    'Professional Fees': '150000',
    'Rent Expense': '80000',
  });

  const handleCreateBudgetScenario = async () => {
    if (!budgetName) return;
    const numericVals: Record<string, number> = {};
    Object.keys(editingBudgetVals).forEach((k) => {
      numericVals[k] = parseFloat(editingBudgetVals[k]) || 0;
    });

    const newBud: BudgetScenario = {
      id: crypto.randomUUID(),
      name: budgetName,
      description: budgetDesc,
      allocations: numericVals
    };
    const nextBudgets = [...budgets, newBud];
    setBudgets(nextBudgets);
    await syncWithFirebase({ budgets: nextBudgets });
    showToast(`Budget baseline scenario "${budgetName}" established.`);
    setBudgetName('');
    setBudgetDesc('');
  };

  // --- 8. INTERCOMPANY CONSOLIDATION ELIMINATIONS ---
  const [elimFrom, setElimFrom] = useState('Metro Manila Distribution Inc.');
  const [elimTo, setElimTo] = useState('Cebu CyberOps Logistics Corp.');
  const [elimAmt, setElimAmt] = useState('');
  const [elimAcc, setElimAcc] = useState('Intercompany Transfer Revenues');
  const [elimDesc, setElimDesc] = useState('');

  const handleAddElimination = async () => {
    const amt = parseFloat(elimAmt);
    if (!amt || amt <= 0) return;

    const newElim: IntercompanyElimination = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      fromEntity: elimFrom,
      toEntity: elimTo,
      amount: amt,
      accountTitle: elimAcc,
      description: elimDesc || `Eliminate cross-entity ${elimAcc}`
    };

    const nextElime = [...intercompanyData, newElim];
    setIntercompanyData(nextElime);
    await syncWithFirebase({ intercompanyData: nextElime });
    showToast(`Elimination voucher registered: ₱${amt.toLocaleString()}`);
    setElimAmt('');
    setElimDesc('');
  };

  const handleDeleteElimination = async (id: string) => {
    const nextElime = intercompanyData.filter(x => x.id !== id);
    setIntercompanyData(nextElime);
    await syncWithFirebase({ intercompanyData: nextElime });
    showToast('Consolidation entry eliminated');
  };

  // Calculate Consolidated rollups
  const totalSubAssets = subsidiaries.reduce((sum, s) => sum + s.assets, 0);
  const totalSubLiab = subsidiaries.reduce((sum, s) => sum + s.liabilities, 0);
  const totalSubRev = subsidiaries.reduce((sum, s) => sum + s.revenue, 0);
  const totalElimAmt = intercompanyData.reduce((sum, e) => sum + e.amount, 0);

  // --- Petty Cash Form State ---
  const [advRecipient, setAdvRecipient] = useState('');
  const [advAmt, setAdvAmt] = useState('');
  const [advPurpose, setAdvPurpose] = useState('');

  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
  const [liqDisbursed, setLiqDisbursed] = useState('');
  const [liqSurrendered, setLiqSurrendered] = useState('');
  const [liqReceipt, setLiqReceipt] = useState('');

  const [physicalCashInput, setPhysicalCashInput] = useState('');

  // --- Intrabank transfer state ---
  const [trfSource, setTrfSource] = useState('BDO Current Account');
  const [trfDest, setTrfDest] = useState('BPI Savings Account');
  const [trfAmt, setTrfAmt] = useState('');
  const [trfRef, setTrfRef] = useState('');
  const [trfFee, setTrfFee] = useState('15');

  // --- Core Treasury & Cash Handlers ---
  const handleIssuePettyAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advAmt);
    if (!advRecipient || isNaN(amt) || amt <= 0 || !activeCounterId) return;

    const counter = pettyCounters.find(c => c.id === activeCounterId);
    if (!counter || counter.status === 'Closed') {
      showToast('Error: Counter shift is currently CLOSED. Re-open shift first!');
      return;
    }
    if (counter.balance < amt) {
      showToast(`Warning: Counter only has ₱${counter.balance.toLocaleString()} which is less than requested ₱${amt.toLocaleString()}`);
      return;
    }

    const newAdv = {
      id: crypto.randomUUID(),
      counterId: activeCounterId,
      recipient: advRecipient,
      amount: amt,
      purpose: advPurpose,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending' as const
    };

    const nextAdvances = [...pettyAdvances, newAdv];
    const nextCounters = pettyCounters.map(c => {
      if (c.id === activeCounterId) {
        return { ...c, balance: c.balance - amt };
      }
      return c;
    });

    setPettyAdvances(nextAdvances);
    setPettyCounters(nextCounters);
    await syncWithFirebase({ pettyAdvances: nextAdvances, pettyCounters: nextCounters });
    showToast(`Petty cash advance of ₱${amt.toLocaleString()} issued to ${advRecipient}.`);
    setAdvRecipient('');
    setAdvAmt('');
    setAdvPurpose('');
  };

  const handleLiquidateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvanceId) return;

    const adv = pettyAdvances.find(x => x.id === selectedAdvanceId);
    if (!adv) return;

    const disbursed = parseFloat(liqDisbursed) || 0;
    const surrendered = parseFloat(liqSurrendered) || 0;
    
    const totalAccounted = disbursed + surrendered;
    if (Math.abs(totalAccounted - adv.amount) > 0.01) {
      showToast(`Sum of Disbursed (₱${disbursed.toLocaleString()}) and Surrendered (₱${surrendered.toLocaleString()}) must equal Advance: ₱${adv.amount.toLocaleString()}!`);
      return;
    }

    const nextCounters = pettyCounters.map(c => {
      if (c.id === adv.counterId) {
        return { ...c, balance: c.balance + surrendered };
      }
      return c;
    });

    const nextAdvances = pettyAdvances.map(x => {
      if (x.id === selectedAdvanceId) {
        return {
          ...x,
          status: 'Liquidated' as const,
          liquidatedAmount: disbursed,
          returnedAmount: surrendered,
          receiptNo: liqReceipt || 'M-REC-92'
        };
      }
      return x;
    });

    setPettyAdvances(nextAdvances);
    setPettyCounters(nextCounters);

    // Write general journal entry automatically
    const jvNo = `JV-PC-${Math.floor(1000 + Math.random() * 9000)}`;
    const expJVLine: JournalVoucher = {
      id: crypto.randomUUID(),
      voucherNo: jvNo,
      date: new Date().toISOString().split('T')[0],
      narration: `Petty cash expense liquidation for receipt #${liqReceipt || 'N/A'}: ${adv.purpose} by ${adv.recipient}`,
      isRecurring: false,
      isReversing: false,
      lines: [
        { id: crypto.randomUUID(), accountTitle: 'Office Supplies Expense', segmentCode: '01-HEAD-OP01', debit: disbursed, credit: 0 },
        { id: crypto.randomUUID(), accountTitle: 'Petty Cash Float', segmentCode: '01-HEAD-OP01', debit: 0, credit: disbursed }
      ]
    };

    const nextJVs = [...journalVouchers, expJVLine];
    setJournalVouchers(nextJVs);

    await syncWithFirebase({ 
      pettyAdvances: nextAdvances, 
      pettyCounters: nextCounters,
      journalVouchers: nextJVs 
    });

    showToast(`Advised cash liquidated. ₱${surrendered.toLocaleString()} surrendered to petty drawer.`);
    setSelectedAdvanceId('');
    setLiqDisbursed('');
    setLiqSurrendered('');
    setLiqReceipt('');
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashCount = parseFloat(physicalCashInput);
    if (isNaN(cashCount) || !activeCounterId) return;

    const counter = pettyCounters.find(c => c.id === activeCounterId);
    if (!counter || counter.status === 'Closed') return;

    const expectedCash = counter.balance; 
    const variance = cashCount - expectedCash;

    const newShiftLog = {
      id: crypto.randomUUID(),
      counterId: activeCounterId,
      shiftDate: new Date().toISOString().split('T')[0],
      openingCash: counter.startBalance,
      totalDisbursed: counter.startBalance - expectedCash,
      closedCash: expectedCash,
      actualCashCount: cashCount,
      variance: variance,
      status: 'Closed' as const
    };

    const nextShifts = [newShiftLog, ...pettyCounterShifts];
    const nextCounters = pettyCounters.map(c => {
      if (c.id === activeCounterId) {
        return { ...c, status: 'Closed' as const, balance: 0 };
      }
      return c;
    });

    setPettyCounterShifts(nextShifts);
    setPettyCounters(nextCounters);
    await syncWithFirebase({ pettyCounterShifts: nextShifts, pettyCounters: nextCounters });
    
    if (variance === 0) {
      showToast(`Shift closed successfully. Balances matched perfectly.`);
    } else {
      showToast(`Shift closed with physical cash variance of ₱${variance.toLocaleString()}`);
    }
    setPhysicalCashInput('');
  };

  const handleOpenShift = async (counterId: string) => {
    const counter = pettyCounters.find(c => c.id === counterId);
    if (!counter) return;

    const nextCounters = pettyCounters.map(c => {
      if (c.id === counterId) {
        return { ...c, status: 'Open' as const, balance: c.startBalance };
      }
      return c;
    });

    setPettyCounters(nextCounters);
    await syncWithFirebase({ pettyCounters: nextCounters });
    showToast(`Petty counter drawer open. Float reset to limit.`);
  };

  const handleRegisterTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(trfAmt);
    const fee = parseFloat(trfFee) || 0;
    if (isNaN(amt) || amt <= 0 || !trfRef) return;

    if (trfSource === trfDest) {
      showToast('Source and Destination banks must differ!');
      return;
    }

    const newTrf = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      sourceBank: trfSource,
      destinationBank: trfDest,
      amount: amt,
      reference: trfRef,
      charge: fee,
      status: 'Completed' as const
    };

    const nextTransfers = [...bankTransfers, newTrf];
    setBankTransfers(nextTransfers);

    const withdrawTx = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      ref: trfRef,
      desc: `Withdrawal transfer to ${trfDest}`,
      amount: -(amt + fee),
      reconciled: false
    };

    const depositTx = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      ref: `${trfRef}-DEP`,
      desc: `Deposit transfer from ${trfSource}`,
      amount: amt,
      reconciled: false
    };

    const nextLedger = [...internalLedgerTx, withdrawTx, depositTx];
    setInternalLedgerTx(nextLedger);

    await syncWithFirebase({ 
      bankTransfers: nextTransfers,
      internalLedgerTx: nextLedger
    });

    showToast(`Transferred ₱${amt.toLocaleString()} successfully. Ledger cards updated.`);
    setTrfAmt('');
    setTrfRef('');
  };

  const handleTriggerStatementOCR = () => {
    if (!statementFileName) {
      showToast('Select a bank statement image first!');
      return;
    }
    setReconProgress('scanning');
    setOcrScanningSimulationLogs([]);

    const logSteps = [
      "Uploading PDF statement catalog...",
      "Reading scan layers (Paper OCR text extraction active)...",
      "Analyzing bank statement columns (Dates, References, Balances)...",
      "Running intelligent extraction on matched row elements...",
      "Statement extracted! 4 unmatched transaction lines registered."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logSteps.length) {
        setOcrScanningSimulationLogs(prev => [...prev, logSteps[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        const parsedTxs = [
          { id: 'st-1', date: '2026-06-01', ref: 'OR-5612', desc: 'ACME CONSULT PAYOUT DIRECT', amount: 150000 },
          { id: 'st-2', date: '2026-06-03', ref: 'CV-1011', desc: 'OFFICE DEPOT CHECK CLEAR', amount: -22000 },
          { id: 'st-3', date: '2026-06-05', ref: 'BDO-9921', desc: 'INTRABANK RETRIEVAL FEES', amount: -15 },
          { id: 'st-4', date: '2026-06-10', ref: 'BDO-INTEREST', desc: 'CREDIT INTEREST EARNED', amount: 350 },
        ];
        setStatementTx(parsedTxs);
        setReconProgress('reconciled');
        showToast('Intelligent paper statement OCR complete!');
      }
    }, 750);
  };

  const handleMatchReconciliation = async () => {
    let reconciledCount = 0;
    const updatedLedger = internalLedgerTx.map(lt => {
      const match = statementTx.find(st => st.ref === lt.ref && Math.abs(st.amount - lt.amount) < 0.01);
      if (match) {
        reconciledCount++;
        return { ...lt, reconciled: true };
      }
      return lt;
    });

    setInternalLedgerTx(updatedLedger);
    await syncWithFirebase({ internalLedgerTx: updatedLedger });
    showToast(`Bank Reconciliation Auto-Match Complete. Cleared ${reconciledCount} items.`);
  };

  const handlePostReconciliationServiceCharge = async () => {
    const jvNo = `JV-REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const adjustJV: JournalVoucher = {
      id: crypto.randomUUID(),
      voucherNo: jvNo,
      date: new Date().toISOString().split('T')[0],
      narration: `Interest revenue adjustment entry: Ref BDO-INTEREST`,
      isRecurring: false,
      isReversing: false,
      lines: [
        { id: crypto.randomUUID(), accountTitle: 'Cash in Bank', segmentCode: '01-HEAD-OP01', debit: 350, credit: 0 },
        { id: crypto.randomUUID(), accountTitle: 'Interest Income', segmentCode: '01-HEAD-OP01', debit: 0, credit: 350 }
      ]
    };

    const nextJVs = [...journalVouchers, adjustJV];
    setJournalVouchers(nextJVs);

    const newLedgerItem = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      ref: 'BDO-INTEREST',
      desc: 'Interest credit adjusted entry',
      amount: 350,
      reconciled: true
    };
    
    const nextLedger = [...internalLedgerTx, newLedgerItem];
    setInternalLedgerTx(nextLedger);
    
    const nextStatementTxs = statementTx.map(st => st.ref === 'BDO-INTEREST' ? { ...st, matchedId: 'adjusted' } : st);
    setStatementTx(nextStatementTxs);

    await syncWithFirebase({
      journalVouchers: nextJVs,
      internalLedgerTx: nextLedger
    });
    
    showToast(`Adjustment entry posted! Account balanced.`);
  };

  const handleExecuteFXRevaluation = async () => {
    const rateVal = parseFloat(revaluationRate);
    if (isNaN(rateVal) || rateVal <= 0) return;

    const foreignBalanceFC = 10000;
    const historicalBookingRate = 58.50; 
    const historicalBalancePHP = foreignBalanceFC * historicalBookingRate; 
    const revaluedBalancePHP = foreignBalanceFC * rateVal; 
    const varianceGainLoss = revaluedBalancePHP - historicalBalancePHP; 

    const newLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      account: 'USD Foreign Reserve Cash Asset Bank holding (1002-USD)',
      foreignVal: foreignBalanceFC,
      oldPHPVal: historicalBalancePHP,
      revaluedPHPVal: revaluedBalancePHP,
      variance: varianceGainLoss,
      entryJVReference: `JV-REVAL-${Math.floor(100 + Math.random() * 900)}`
    };

    const nextLogs = [newLog, ...revalueLogs];
    setRevalueLogs(nextLogs);

    const isGain = varianceGainLoss >= 0;
    const absDiff = Math.abs(varianceGainLoss);

    const jvNo = newLog.entryJVReference;
    const revalJV: JournalVoucher = {
      id: crypto.randomUUID(),
      voucherNo: jvNo,
      date: new Date().toISOString().split('T')[0],
      narration: `FX Spot month-end adjustment to spot rate ₱${rateVal.toFixed(2)}`,
      isRecurring: false,
      isReversing: true, 
      reversalDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lines: [
        { 
          id: crypto.randomUUID(), 
          accountTitle: 'USD Cash Bank Holdings Asset', 
          segmentCode: '01-HEAD-OP01', 
          debit: isGain ? absDiff : 0, 
          credit: isGain ? 0 : absDiff 
        },
        { 
          id: crypto.randomUUID(), 
          accountTitle: 'Unrealized FX Translation Gain/Loss', 
          segmentCode: '01-HEAD-OP01', 
          debit: isGain ? 0 : absDiff, 
          credit: isGain ? absDiff : 0 
        }
      ]
    };

    const nextJVs = [...journalVouchers, revalJV];
    setJournalVouchers(nextJVs);
    await syncWithFirebase({ revalueLogs: nextLogs, journalVouchers: nextJVs });
    
    showToast(`Revalued holding USD assets. FX difference of ₱${varianceGainLoss.toLocaleString()} adjusted.`);
  };

  if (!currentClient || activeModal !== 'ledger_suite') return null;

  return (
    <Modal
      id="ledger_suite"
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 font-sans" />
          <span className="font-sans font-black tracking-tight self-center">Corporate G/L & Custom Reports Suite</span>
        </div>
      }
      maxWidth="max-w-7xl"
    >
      <div className="grid grid-cols-12 gap-6 min-h-[580px] font-sans text-slate-800 dark:text-slate-100">
        
        {/* Visual G/L Tab Sub-Side Navigation Rail */}
        <div className="col-span-12 md:col-span-3 border-r border-slate-200 dark:border-slate-800 pr-4 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 px-2">Advanced Modules</p>
          
          <button
            onClick={() => setActiveTab('segments')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'segments' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-slate-500" />
            Flexible Segments (CoA)
          </button>

          <button
            onClick={() => setActiveTab('currency')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'currency' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <DollarSign className="w-4 h-4 shrink-0 text-slate-500" />
            Multi-Currency Spot Room
          </button>

          <button
            onClick={() => setActiveTab('journals')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'journals' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
            Vouchers & Reversals
          </button>

          <button
            onClick={() => setActiveTab('allocations')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'allocations' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Percent className="w-4 h-4 shrink-0 text-slate-500" />
            GL Balance Allocations
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'financials' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <FileText className="w-4 h-4 shrink-0 text-slate-500" />
            Full Financial Statements
          </button>

          <button
            onClick={() => setActiveTab('writer')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'writer' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Settings2 className="w-4 h-4 shrink-0 text-slate-500" />
            Financial Report Writer
          </button>

          <button
            onClick={() => setActiveTab('budgeting')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'budgeting' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-slate-500" />
            Budget Variance Panel
          </button>

          <button
            onClick={() => setActiveTab('consolidation')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'consolidation' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-500" />
            Corporate Consolidation
          </button>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4 mb-2 px-2">Treasury & Cash Ops</p>

          <button
            onClick={() => setActiveTab('petty_cash')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'petty_cash' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Wallet className="w-4 h-4 shrink-0 text-slate-500" />
            Petty Cash & Shifts
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'transfers' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <ArrowRightLeft className="w-4 h-4 shrink-0 text-slate-500" />
            Intrabank Fund Transfers
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'reconciliation' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Landmark className="w-4 h-4 shrink-0 text-slate-500" />
            OCR Bank Reconciliation
          </button>

          <button
            onClick={() => setActiveTab('revaluation')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'revaluation' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <RotateCcw className="w-4 h-4 shrink-0 text-slate-500" />
            FX Month Revaluation
          </button>

          <button
            onClick={() => setActiveTab('cashflow_projection')}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'cashflow_projection' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <BarChart2 className="w-4 h-4 shrink-0 text-slate-500" />
            Cash Flow Projections
          </button>
        </div>


        {/* Visual G/L Panel Workspace Module Content */}
        <div className="col-span-12 md:col-span-9 flex flex-col overflow-y-auto max-h-[80vh] px-2">
          
          {/* TAB 1: CHART OF ACCOUNTS FLEXIBLE SEGMENTS */}
          {activeTab === 'segments' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Flexible Segment-Based Chart of Accounts</h4>
                <p className="text-xs text-slate-500">Sub-divide your legal general ledger accounts by divisions, engineering/operational departments, and internal profit/cost centers.</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                <form onSubmit={handleAddSegment} className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Add General Ledger Segment</span>
                  
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">Segment Category</label>
                    <select
                      value={segType}
                      onChange={e => setSegType(e.target.value as any)}
                      className="form-select w-full text-xs"
                    >
                      <option value="Division">Segment 1: Division (Company Location)</option>
                      <option value="Department">Segment 2: Department (Resource Team)</option>
                      <option value="ProfitCenter">Segment 3: Profit / Cost Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">Segment Unique Identifier (Code)</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 01, NORTH, DEV-OPS"
                      value={segCode}
                      onChange={e => setSegCode(e.target.value)}
                      className="form-input w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">Segment Display Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Luzon Regional HQ"
                      value={segName}
                      onChange={e => setSegName(e.target.value)}
                      className="form-input w-full text-xs"
                    />
                  </div>

                  <button type="submit" className="mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all">
                    <Plus className="w-4 h-4" /> Register Segment Identifier
                  </button>
                </form>

                <div className="col-span-12 md:col-span-7 flex flex-col gap-3">
                  <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-indigo-600 font-extrabold block mb-1">SAMPLE SEGMENT COMBINED KEY GENERATION</span>
                    <p className="text-[11px] text-slate-500 mb-2">Each actual financial record is tagged dynamically with a combined key using format <code>{"[ACCOUNT]-[DIV]-[DEP]-[CENTER]"}</code>.</p>
                    <div className="flex flex-col gap-2">
                      {sampleSegmentCombinations.map((combo, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-150 p-2.5 rounded-xl flex justify-between items-center text-xs">
                          <code className="font-bold text-slate-700 dark:text-slate-300">{combo.code}</code>
                          <span className="text-slate-400 scale-95">{combo.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 font-mono">Code</th>
                          <th className="p-2.5">Segment Name</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {segments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">No custom division or department segments created yet. Build one in the form!</td>
                          </tr>
                        ) : (
                          segments.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{s.type}</td>
                              <td className="p-2.5 font-mono text-indigo-600 font-black">{s.code}</td>
                              <td className="p-2.5 text-slate-500">{s.name}</td>
                              <td className="p-2.5 text-center">
                                <button onClick={() => handleDeleteSegment(s.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 2: MULTI-CURRENCY CONVERTER */}
          {activeTab === 'currency' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight mb-1">Multi-Currency Spot Room</h4>
                  <p className="text-xs text-slate-500">Track cross-border supply chains. Spot transaction records are settled using dynamic live Exchange rates.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    className="form-select text-xs py-1.5"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="New Spot Rate to PHP"
                    value={newCurrencyRate}
                    onChange={e => setNewCurrencyRate(e.target.value)}
                    className="form-input text-xs py-1.5 w-32"
                  />
                  <button onClick={handleSetCurrencyRate} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                    Set Rate
                  </button>
                </div>
              </div>

              {/* Exchange rates display row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currencies.map(c => (
                  <div key={c.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center text-center">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">{c.code} EXCHANGE RATE</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono">
                      1.00 {c.code} = ₱{c.rateToPhp.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Log foreign currency transaction ledger */}
              <div className="grid grid-cols-12 gap-5">
                <form onSubmit={handleLogForeignInvoice} className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Log Currency Denominated Purchase/Fee</span>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Asset Currency</label>
                    <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="form-select w-full text-xs">
                      {currencies.filter(c => c.code !== 'PHP').map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Payee Name</label>
                    <input required type="text" placeholder="e.g. AWS Cloud Services" value={fcPayee} onChange={e => setFcPayee(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Foreign Amount</label>
                      <input required type="number" placeholder="AWS dollars" value={fcAmountInput} onChange={e => setFcAmountInput(e.target.value)} className="form-input text-xs w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Spot Contract Rate</label>
                      <input required type="number" placeholder="e.g. 58.45" value={spotRateInput} onChange={e => setSpotRateInput(e.target.value)} className="form-input text-xs w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">GL Classification</label>
                    <select value={fcAccount} onChange={e => setFcAccount(e.target.value)} className="form-select w-full text-xs">
                      <option value="Professional Fees">Professional Fees</option>
                      <option value="Rent Expense">Rent Expense</option>
                      <option value="Repair/Maintenance">Repair and Maintenance</option>
                    </select>
                  </div>

                  <button type="submit" className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all mt-2 flex items-center justify-center gap-1">
                    <Save className="w-4 h-4" /> Log Spot Record
                  </button>
                </form>

                {/* Ledger entries with dynamic realized FX Gains & Losses computation */}
                <div className="col-span-12 md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden self-start">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                        <th className="p-3">Foreign Amount / Payee</th>
                        <th className="p-3">PHP Base Total</th>
                        <th className="p-3">Settle State</th>
                        <th className="p-3 text-right">Realized FX Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                      {foreignLedger.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-5 text-center text-slate-400">No multi-currency foreign purchases mapped yet. Add a contract purchase above!</td>
                        </tr>
                      ) : (
                        foreignLedger.map(tx => {
                          const basePHP = tx.fcAmount * tx.spotRate;
                          const currentRate = currencies.find(c => c.code === tx.currency)?.rateToPhp || tx.spotRate;
                          const currentPHPVal = tx.fcAmount * currentRate;
                          const settledPHP = tx.settledRate ? tx.fcAmount * tx.settledRate : currentPHPVal;
                          
                          // Realized loss/gain computation
                          // For a liability/expense, if settle PHP is less than spot contract, we pay less, representing a Gain!
                          const difference = basePHP - settledPHP;
                          const isGain = difference >= 0;

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/40">
                              <td className="p-3 font-mono">
                                <span className="font-bold text-indigo-700 dark:text-indigo-400">{tx.currency} {tx.fcAmount.toLocaleString()}</span>
                                <p className="text-[10px] text-slate-400">To: {tx.payee}</p>
                              </td>
                              <td className="p-3 text-slate-500 font-mono">
                                ₱{basePHP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                <p className="text-[10px]">Spot Rate: {tx.spotRate}</p>
                              </td>
                              <td className="p-3">
                                {tx.settledRate ? (
                                  <div>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-full">Settled</span>
                                    <p className="text-[10px] text-slate-400 mt-1">Settle Rate: {tx.settledRate}</p>
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5 items-center">
                                    <input
                                      type="number"
                                      placeholder="Settle rate"
                                      className="w-16 form-input text-[10px] py-0.5 font-mono"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSettleInvoice(tx.id, parseFloat((e.target as any).value) || 0);
                                        }
                                      }}
                                    />
                                    <p className="text-[9px] text-slate-400 leading-3">Press Enter to settle</p>
                                  </div>
                                )}
                              </td>
                              <td className={`p-3 text-right font-bold font-mono ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isGain ? '+' : ''}₱{difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                <p className="text-[10px] text-slate-400 font-normal">{isGain ? 'FX Realized Gain' : 'FX Realized Loss'}</p>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* TAB 3: JOURNAL VOUCHERS AND REVERSALS */}
          {activeTab === 'journals' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Corporate balanced Journal Vouchers (JV)</h4>
                <p className="text-xs text-slate-500">Assemble double-entry adjustments. Toggle automatic "Reversing Journals" (which flip debit/credits on the opening period) or "Recurring Vouchers".</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                
                {/* Journal entry balance controller form */}
                <form onSubmit={handleCreateJV} className="col-span-12 md:col-span-6 bg-white dark:bg-slate-950 border border-indigo-100 p-5 rounded-2xl flex flex-col gap-3">
                  <h5 className="font-bold text-xs text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> Assemble Balanced J/V Voucher
                  </h5>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Voucher ID Reference</label>
                      <input required type="text" value={jvNo} onChange={e => setJvNo(e.target.value)} className="form-input text-xs w-full font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Ledger Entry Date</label>
                      <input required type="date" value={jvDate} onChange={e => setJvDate(e.target.value)} className="form-input text-xs w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Narration/Description</label>
                    <input required type="text" placeholder="Adjustment explanation details" value={jvNarration} onChange={e => setJvNarration(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  {/* AUTOMATION CHECKBOXES */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={jvIsRecurring} onChange={e => setJvIsRecurring(e.target.checked)} className="form-checkbox text-indigo-600 rounded" />
                        <span>Recurring Voucher</span>
                      </label>
                      {jvIsRecurring && (
                        <select value={jvRecurPeriod} onChange={e => setJvRecurPeriod(e.target.value as any)} className="form-select py-0.5 px-2 text-[10px] mt-1 w-28">
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                        </select>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={jvIsReversing} onChange={e => setJvIsReversing(e.target.checked)} className="form-checkbox text-indigo-600 rounded" />
                        <span>Auto-Reversing</span>
                      </label>
                      {jvIsReversing && (
                        <input type="date" value={jvRevDate} onChange={e => setJvRevDate(e.target.value)} className="form-input py-0.5 px-2 text-[10px] mt-1 w-32" />
                      )}
                    </div>
                  </div>

                  {/* Lines constructor table inside forms */}
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 flex flex-col gap-2">
                    <span className="text-[10.5px] font-extrabold text-slate-500">Voucher Journal Lines</span>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-2.5 rounded-xl flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <select value={addLineAccount} onChange={e => { setAddLineAccount(e.target.value); setAddLineRemarks(''); }} className="form-select text-[10px] py-1 max-w-[140px]">
                          <option value="">Select Account</option>
                          {coaList.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                        {(() => {
                           const selAcc = coaList.find(a => a.name === addLineAccount);
                           if (selAcc && selAcc.remarks && selAcc.remarks.length > 0) {
                             return (
                               <select value={addLineRemarks} onChange={e => setAddLineRemarks(e.target.value)} className="form-select text-[10px] py-1 max-w-[120px]">
                                 <option value="">No Remarks</option>
                                 {selAcc.remarks.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
                               </select>
                             );
                           }
                           return null;
                        })()}
                        <select value={addLineSegment} onChange={e => setAddLineSegment(e.target.value)} className="form-select text-[10px] py-1 max-w-[120px]">
                          <option value="01-HEAD-OP01">01 Metro</option>
                          <option value="02-NORT-EN05">02 Luzon</option>
                          <option value="03-SOUT-SA03">03 Davao</option>
                        </select>
                        <input type="number" placeholder="Dr ₱" value={addLineDebit} onChange={e => setAddLineDebit(e.target.value)} className="form-input text-[10px] py-1 w-20 font-mono" />
                        <input type="number" placeholder="Cr ₱" value={addLineCredit} onChange={e => setAddLineCredit(e.target.value)} className="form-input text-[10px] py-1 w-20 font-mono" />
                        <button type="button" onClick={handleAddLineToJv} className="px-3 py-1 bg-slate-800 text-white hover:bg-slate-700 text-[10px] font-black rounded-lg">
                          + Line
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-xl text-[11px] flex flex-col gap-1.5 font-mono">
                      {jvLines.map((line, ix) => (
                        <div key={line.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-150">
                          <div>
                            <p className="font-extrabold text-slate-700 dark:text-slate-300 text-[10.5px]">
                               {line.accountTitle}
                               {line.remarksCode && <span className="ml-1 text-[9px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">[{line.remarksCode}] {line.remarksName}</span>}
                            </p>
                            <p className="text-[9px] text-slate-400">Seg: {line.segmentCode}</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            {line.debit > 0 && <span className="text-emerald-600 font-bold">Dr: ₱{line.debit.toLocaleString()}</span>}
                            {line.credit > 0 && <span className="text-rose-600 font-bold">Cr: ₱{line.credit.toLocaleString()}</span>}
                            <button type="button" onClick={() => handleRemoveLineFromJv(line.id)} className="text-red-500 font-black hover:text-red-700 px-1">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-xs font-bold font-mono px-1 py-1 text-slate-600">
                      <span>Debit Total: ₱{jvLines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}</span>
                      <span>Credit Total: ₱{jvLines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1">
                    <Save className="w-4 h-4" /> Post balanced Voucher
                  </button>
                </form>

                {/* Voucher Log list & reversing button */}
                <div className="col-span-12 md:col-span-6 flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700">Posted Voucher Records</span>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                          <th className="p-2.5">Voucher / Dates</th>
                          <th className="p-2.5">Narration / Details</th>
                          <th className="p-2.5 text-right">Debit/Credit Sum</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {journalVouchers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">No custom adjusting journal vouchers posted yet. Post your first voucher in the form.</td>
                          </tr>
                        ) : (
                          journalVouchers.map(jv => {
                            const lineTotal = jv.lines.reduce((sum, l) => sum + l.debit, 0);
                            return (
                              <tr key={jv.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5">
                                  <p className="font-extrabold font-mono text-slate-800 dark:text-slate-100">{jv.voucherNo}</p>
                                  <p className="text-[10px] text-slate-400">Date: {jv.date}</p>
                                  {jv.isRecurring && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold block mt-1 w-max">Recurring</span>}
                                  {jv.isReversing && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-bold block mt-1 w-max">Reversing</span>}
                                </td>
                                <td className="p-2.5">
                                  <p className="text-slate-700 dark:text-slate-300 leading-tight">{jv.narration}</p>
                                  <div className="mt-1 flex flex-col gap-0.5 font-mono scale-90 origin-left text-[9px] text-slate-400">
                                    {jv.lines.map((l, x) => (
                                      <p key={x}>
                                        {l.accountTitle} 
                                        {l.remarksCode && <span className="mx-1 text-blue-500">[{l.remarksCode}]</span>}
                                        ({l.debit > 0 ? `Dr ₱${l.debit}` : `Cr ₱${l.credit}`})
                                      </p>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-100 font-mono">
                                  ₱{lineTotal.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  {jv.isReversing && !jv.isReversed ? (
                                    <button
                                      onClick={() => handleReverseJv(jv.id)}
                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[10px] font-bold border border-amber-200"
                                    >
                                      Reverse
                                    </button>
                                  ) : jv.isReversed ? (
                                    <span className="text-slate-400 line-through text-[10px]">Reversed Entry</span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">Standard</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: GL BALANCE ALLOCATIONS */}
          {activeTab === 'allocations' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Upfront & Period-End G/L Balances Allocation</h4>
                  <p className="text-xs text-slate-500">Distribute master overhead bills (e.g. rent, electricity) to child division branches using percentage pools.</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Set Overhead Allocation Rule</span>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Source General Ledger Account</label>
                    <select value={allocSource} onChange={e => setAllocSource(e.target.value)} className="form-select w-full text-xs">
                      <option value="Rent Expense">Rent Expense</option>
                      <option value="Professional Fees">Professional Fees</option>
                      <option value="Repair/Maintenance">Repair & Maintenance Expenses</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Rule/Combination Name</label>
                    <input required type="text" placeholder="e.g. Rent Allocation north/south" value={allocRuleName} onChange={e => setAllocRuleName(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  {/* Allocation percentage compiler */}
                  <div className="border border-slate-200 p-2.5 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400">PERCENTAGE ALLOCATION RATIOS</span>
                    <div className="flex gap-2">
                      <select value={distSeg} onChange={e => setDistSeg(e.target.value)} className="form-select text-[10px] py-1">
                        <option value="01-HEAD-OP01">01 Metro</option>
                        <option value="02-NORT-EN05">02 Luzon</option>
                        <option value="03-SOUT-SA03">03 Davao</option>
                      </select>
                      <input
                        type="number"
                        placeholder="%"
                        value={distPct}
                        onChange={e => setDistPct(e.target.value)}
                        className="form-input text-[10px] py-1 w-16 text-center font-mono"
                      />
                      <button type="button" onClick={handleAddDistributionRow} className="px-3 bg-slate-800 text-white rounded text-[10px]">
                        Add
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 font-mono text-[10px] mt-2 bg-slate-100 p-2 rounded-lg">
                      {allocDistributions.map((row, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700">
                          <span>{row.segmentCode}</span>
                          <span className="font-extrabold text-indigo-700">{row.percentage}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 text-right">Total: {allocDistributions.reduce((sum, d) => sum + d.percentage, 0)}% (Goal: 100%)</p>
                  </div>

                  <button onClick={handleSaveAllocationRule} className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 shadow">
                    <Save className="w-4 h-4" /> Configure Allocator
                  </button>
                </div>

                {/* Allocation rules & execution history */}
                <div className="col-span-12 md:col-span-7 flex flex-col gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                          <th className="p-3">Source Account & Rule</th>
                          <th className="p-3">Allocation Splitting ratios</th>
                          <th className="p-3 text-center">Trigger Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {allocationRules.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400">No custom overhead allocation pool rules exist. Configure high-density splits!</td>
                          </tr>
                        ) : (
                          allocationRules.map(rule => (
                            <tr key={rule.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <p className="font-extrabold text-slate-800 dark:text-slate-100">{rule.name}</p>
                                <p className="text-[10px] text-slate-400">Class: {rule.sourceAccount}</p>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1.5 text-[10px] font-mono">
                                  {rule.allocations.map((a, j8) => (
                                    <span key={j8} className="bg-indigo-50 border border-indigo-150 p-1 rounded">
                                      {a.segmentCode}: {a.percentage}%
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleExecuteAllocation(rule)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 mx-auto"
                                >
                                  <Play className="w-3 h-3" /> Run Allocation
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl self-start w-full">
                    <span className="text-[10px] text-slate-500 font-black block mb-2">ALLOCATION EXECUTION LOG (UPFRONT/PERIOD-END)</span>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                      {allocationLogs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No allocation logs recorded yet.</p>
                      ) : (
                        allocationLogs.map(log => (
                          <div key={log.id} className="bg-white dark:bg-slate-900 border border-slate-150 text-[11px] p-2 rounded-xl">
                            <div className="flex justify-between font-bold">
                              <span>{log.ruleName} ({log.date})</span>
                              <span className="text-indigo-600 font-mono">Cost base: ₱{log.sourceBalance.toLocaleString()}</span>
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-slate-400 grid grid-cols-3 gap-1">
                              {log.lines.map((l, x8) => (
                                <p key={x8}>{l.segmentCode}: ₱{l.allocatedAmount.toLocaleString()}</p>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 5: DRILL DOWN FINANCIAL STATEMENTS */}
          {activeTab === 'financials' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Interactive Financial Statements with Ledger Drill Down</h4>
                <p className="text-xs text-slate-500">Inspect live accounting loops. Click on highlighted balances below to explore underlying source ledger transactions instantly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Balance Sheet Column */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm self-start">
                  <h5 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 pb-2 flex justify-between">
                    <span>BALANCE SHEET</span>
                    <span className="text-[10px] text-slate-400">As of June 30, 2026</span>
                  </h5>
                  
                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Assets</p>
                      <div className="flex justify-between items-center py-1 bg-amber-50 hover:bg-amber-100/50 p-1.5 rounded-lg cursor-pointer transition-colors" onClick={() => setDrillDownAccount('Cash in Bank')}>
                        <span className="font-semibold text-blue-700 dark:text-blue-400 underline">Cash in Bank</span>
                        <span className="font-mono font-bold">₱{bankBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 mt-1">
                        <span className="text-slate-600">Equipment & Tech Assets</span>
                        <span className="font-mono">₱450,000</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Liabilities</p>
                      <div className="flex justify-between items-center py-1 bg-amber-50 hover:bg-amber-100/50 p-1.5 rounded-lg cursor-pointer transition-colors" onClick={() => setDrillDownAccount('Accounts Payable')}>
                        <span className="font-semibold text-blue-700 dark:text-blue-400 underline">Accounts Payable</span>
                        <span className="font-mono font-bold">₱120,000</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Equity</p>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Retained Earnings</span>
                        <span className="font-mono">₱{ (bankBalance + 450000 - 120000).toLocaleString() }</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Income Statement Column */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm self-start">
                  <h5 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 pb-2 flex justify-between">
                    <span>INCOME STATEMENT</span>
                    <span className="text-[10px] text-slate-400">Quarter ended June 2026</span>
                  </h5>

                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Revenues</p>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Sales Revenues</span>
                        <span className="font-mono">₱650,000</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Expenses</p>
                      <div className="flex justify-between items-center py-1 bg-amber-50 hover:bg-amber-100/50 p-1.5 rounded-lg cursor-pointer transition-colors" onClick={() => setDrillDownAccount('Professional Fees')}>
                        <span className="font-semibold text-blue-700 dark:text-blue-400 underline">Professional Fees</span>
                        <span className="font-mono font-bold">₱125,000</span>
                      </div>
                      <div className="flex justify-between items-center py-1 mt-1">
                        <span className="text-slate-600">Rent & Office Overhead</span>
                        <span className="font-mono">₱65,000</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center py-1">
                        <span className="font-extrabold text-slate-850">Net profit before taxes</span>
                        <span className="font-mono font-black text-emerald-600">₱460,000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Flow Statement Column */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm self-start">
                  <h5 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 pb-2 flex justify-between">
                    <span>CASH FLOW STATEMENT</span>
                    <span className="text-[10px] text-slate-400">For 2026 Season</span>
                  </h5>

                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Operating Activities</p>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Customer Receipts</span>
                        <span className="font-mono text-emerald-600">₱720,000</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Operating Expenses Outflow</span>
                        <span className="font-mono text-rose-600">-₱185,000</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-400 tracking-wider text-[10px] uppercase">Financing Activities</p>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Proceeds from Loans</span>
                        <span className="font-mono">₱150,000</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center py-1">
                        <span className="font-extrabold text-indigo-700">Net Increase in Cash</span>
                        <span className="font-mono font-black text-emerald-600">₱685,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Dynamic Drill Down Details Modal overlays or drawers */}
              {drillDownAccount && (
                <div className="bg-slate-50 dark:bg-indigo-950/20 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-indigo-100 dark:border-indigo-900/30 pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-extrabold text-indigo-800 dark:text-indigo-400">Ledger drill down transactions: {drillDownAccount}</span>
                    </div>
                    <button onClick={() => setDrillDownAccount(null)} className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded-md font-bold">
                      Close drill down
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold">
                          <th className="p-2">Date</th>
                          <th className="p-2">Reference ID</th>
                          <th className="p-2">Narration / Particulars</th>
                          <th className="p-2 text-right">Amount (PHP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportTransactions[drillDownAccount] ? (
                          reportTransactions[drillDownAccount].map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="p-2">{t.date}</td>
                              <td className="p-2 font-mono font-bold text-slate-600">{t.ref}</td>
                              <td className="p-2 text-slate-500">{t.desc}</td>
                              <td className={`p-2 text-right font-mono font-semibold ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {t.amount < 0 ? '-' : ''}₱{Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">No matching general ledger transactions found for {drillDownAccount}.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* TAB 6: FINANCIAL REPORT WRITER */}
          {activeTab === 'writer' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-tight mb-1">Financial Report Writer Configuration</h4>
                <p className="text-xs text-slate-500">Build bespoke board-level reporting packets. Drag-and-drop or select GL account components and configure formulas manually.</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700">Bespoke Report Configuration</span>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Custom Report Name</label>
                    <input required type="text" placeholder="e.g. EBITDA Margin Analysis" value={writerName} onChange={e => setWriterName(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  {/* Add Row block */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex flex-col gap-2.5">
                    <span className="text-[10px] font-black text-slate-400">ADD REPORT LINE</span>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Section/Line Title</label>
                      <input type="text" placeholder="e.g. Overhead & Facilities" value={lineTitle} onChange={e => setLineTitle(e.target.value)} className="form-input text-xs w-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Line Formula/Type</label>
                        <select value={lineFormula} onChange={e => setLineFormula(e.target.value)} className="form-select text-[10px] py-1 w-full">
                          <option value="SUM">SUM (Totals all mapped accounts)</option>
                          <option value="SUBTRACT">SUBTRACT (Subtract child components)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Map to Balance Accounts</label>
                        <select
                          multiple
                          value={lineAccounts}
                          onChange={e => setLineAccounts(Array.from(e.target.selectedOptions).map((opt) => (opt as HTMLOptionElement).value))}
                          className="form-select text-[10px] py-1 w-full h-12"
                        >
                          <option value="Cash in Bank">Cash in Bank</option>
                          <option value="Accounts Payable">Accounts Payable</option>
                          <option value="Rent Expense">Rent Expense</option>
                          <option value="Professional Fees">Professional Fees</option>
                        </select>
                        <span className="text-[8px] text-slate-400 block mt-0.5">Ctrl+Click to choose multiple</span>
                      </div>
                    </div>

                    <button type="button" onClick={handleAddWriterLine} className="py-1 px-3 bg-slate-800 text-white rounded text-[10px] font-bold">
                      Add Line to Custom Report
                    </button>
                  </div>

                  <button onClick={handleSaveCustomReport} className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 shadow">
                    <Save className="w-4 h-4" /> Save Bespoke Report Config
                  </button>
                </div>

                {/* Structured user customized report layout preview */}
                <div className="col-span-12 md:col-span-7 flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-slate-700">Customized Report Canvas Preview</span>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-3 self-start w-full">
                    <h5 className="text-center font-black text-sm text-slate-800 dark:text-slate-100 border-b border-slate-200 pb-2">{writerName || 'Unsaved Master Report'}</h5>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      {writerSections.map((sec, idxe) => (
                        <div key={sec.id} className="border-b border-dashed border-slate-150 p-2 text-xs flex justify-between items-center bg-white dark:bg-slate-800 rounded-xl">
                          <div>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300">{sec.title}</span>
                            <p className="text-[9px] text-slate-400">Accounts: {sec.accounts.join(', ')} ({sec.formula})</p>
                          </div>
                          <div>
                            <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded font-bold">₱{(idxe === 0 ? 125000 + 650000 : 125000).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Configured Report Listing */}
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">SAVED CONFIGURATIONS</span>
                    {customReports.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom templates compiled yet.</p>
                    ) : (
                      customReports.map(rep => (
                        <div key={rep.id} className="bg-white dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-extrabold text-indigo-700 dark:text-indigo-400">{rep.name}</p>
                            <p className="text-[10px] text-slate-500">{rep.sections.length} tailored lines defined</p>
                          </div>
                          <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Open Custom
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 7: BUDGET SCENARIOS VARIANCE PANEL */}
          {activeTab === 'budgeting' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Corporate Scenario Budget & Variance Panel</h4>
                <p className="text-xs text-slate-500">Track variance comparisons across custom target scenarios (such as "Conservative baseline Spending" vs. "Q4 Growth expansion spending").</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-700">Compile Budget Target Baseline</span>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Scenario Title</label>
                    <input required type="text" placeholder="e.g. Q3 Conservative Baseline" value={budgetName} onChange={e => setBudgetName(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Scenario Details</label>
                    <input type="text" placeholder="Operating goals on revenue models" value={budgetDesc} onChange={e => setBudgetDesc(e.target.value)} className="form-input text-xs w-full" />
                  </div>

                  {/* Input form budget grid */}
                  <div className="border border-slate-150 p-3 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">TARGET ALLOCATIONS BY ACCOUNT</span>
                    {Object.entries(editingBudgetVals).map(([acName, spend]) => (
                      <div key={acName} className="flex justify-between items-center text-xs">
                        <span>{acName}</span>
                        <input
                          type="number"
                          value={spend}
                          onChange={(e) => {
                            setEditingBudgetVals({
                              ...editingBudgetVals,
                              [acName]: e.target.value
                            });
                          }}
                          className="w-24 form-input py-0.5 px-1.5 font-mono text-right text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <button onClick={handleCreateBudgetScenario} className="py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow">
                    Create Budget Model
                  </button>
                </div>

                {/* Compare Table */}
                <div className="col-span-12 md:col-span-7 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-750">Actual spend vs budget baseline Variance indicators</span>
                  
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden self-start w-full">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold">
                          <th className="p-2.5">Ledger Account</th>
                          <th className="p-2.5 text-right font-mono">Actual Net Val</th>
                          <th className="p-2.5 text-right font-mono">Budget target</th>
                          <th className="p-2.5 text-right font-mono">Difference %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                        {Object.keys(editingBudgetVals).map((ac) => {
                          const bgValue = editingBudgetVals[ac];
                          const actualMapValue = ac === 'Cash in Bank' ? bankBalance : ac === 'Accounts Payable' ? 120000 : ac === 'Professional Fees' ? 125000 : 65000;
                          const bgNumeric = parseFloat(bgValue) || 1;
                          const diff = actualMapValue - bgNumeric;
                          const diffPct = (diff / bgNumeric) * 100;
                          
                          return (
                            <tr key={ac} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{ac}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-200">₱{actualMapValue.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-200">₱{bgNumeric.toLocaleString()}</td>
                              <td className={`p-2.5 text-right font-mono font-black ${diffPct < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                                <p className="text-[9px] font-normal text-slate-400">{diffPct < 0 ? 'Under Budget' : 'Exceeded target'}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Scenarios lists */}
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">COMPACT SCENARIO FILES</span>
                    {budgets.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No active scenarios formulated. Compile a baseline target in the form!</p>
                    ) : (
                      budgets.map(b => (
                        <div key={b.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100">{b.name}</span>
                            <p className="text-[10px] text-slate-400">{b.description || 'Target baseline scenario'}</p>
                          </div>
                          <button
                            onClick={() => {
                              const strVals: Record<string, string> = {};
                              Object.keys(b.allocations).forEach((k) => {
                                strVals[k] = String(b.allocations[k]);
                              });
                              setEditingBudgetVals(strVals);
                              showToast(`Loaded scenario ${b.name}`);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded"
                          >
                            Apply Active
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 9: PETTY CASH & SHIFTS */}
          {activeTab === 'petty_cash' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-tight mb-1">Corporate Petty Cash Counters & Expense Liquidation</h4>
                <p className="text-xs text-slate-500">Track multi-counter cashier floats. Hand out cash advances, record actual receipts, calculate surrender cash flows, and log shortages or overages on shift handovers.</p>
              </div>

              {/* Counter list rollups */}
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Petty Counters & Shifts</span>
                  <div className="flex flex-col gap-2">
                    {pettyCounters.map(cnt => (
                      <button
                        key={cnt.id}
                        onClick={() => setActiveCounterId(cnt.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          activeCounterId === cnt.id
                            ? 'bg-blue-50 border-blue-200 dark:bg-slate-800 dark:border-blue-800'
                            : 'bg-white border-slate-150 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{cnt.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            cnt.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {cnt.status}
                          </span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] text-slate-500 mt-2">
                          <span>Custodian: {cnt.manager}</span>
                          <span className="font-extrabold text-blue-700 dark:text-blue-400">Balance: ₱{cnt.balance.toLocaleString()}</span>
                        </div>

                        {cnt.status === 'Closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShift(cnt.id);
                            }}
                            className="mt-2.5 w-full py-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all"
                          >
                            Re-open Counter Shift (Refloat)
                          </button>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Shift Closing Form */}
                  {pettyCounters.find(c => c.id === activeCounterId)?.status === 'Open' && (
                    <form onSubmit={handleCloseShift} className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 mt-2 flex flex-col gap-3">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Close Current Shift Floor</span>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Physical End Cash Count (PHP)</label>
                        <input
                          required
                          type="number"
                          placeholder="₱ Counted"
                          value={physicalCashInput}
                          onChange={e => setPhysicalCashInput(e.target.value)}
                          className="form-input text-xs w-full font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Expected: ₱{pettyCounters.find(c => c.id === activeCounterId)?.balance.toLocaleString()}</p>
                      </div>

                      <button
                        type="submit"
                        className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        Lock Drawers & Log Shift
                      </button>
                    </form>
                  )}
                </div>

                {/* Left/Right Columns for Advance / Liquidation */}
                <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Issue Petty Cash Advance */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl flex flex-col gap-3">
                    <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">1. Issue Cash Advance Voucher</span>
                    
                    <form onSubmit={handleIssuePettyAdvance} className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Recipient name</label>
                        <input
                          required
                          type="text"
                          placeholder="Employee / Vendor name"
                          value={advRecipient}
                          onChange={e => setAdvRecipient(e.target.value)}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Amount Approved (PHP)</label>
                        <input
                          required
                          type="number"
                          placeholder="₱ Approved limit"
                          value={advAmt}
                          onChange={e => setAdvAmt(e.target.value)}
                          className="form-input text-xs w-full font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Purpose of payout</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Operational reasons of cash usage..."
                          value={advPurpose}
                          onChange={e => setAdvPurpose(e.target.value)}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      <button
                        type="submit"
                        className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow"
                      >
                        Approve & Handout Cash
                      </button>
                    </form>
                  </div>

                  {/* Column 2: Expense Liquidation Form */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl flex flex-col gap-3">
                    <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">2. Liquidation & Balance Surrender</span>

                    <form onSubmit={handleLiquidateAdvance} className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Select Unliquidated Advance</label>
                        <select
                          value={selectedAdvanceId}
                          onChange={e => {
                            setSelectedAdvanceId(e.target.value);
                            const found = pettyAdvances.find(a => a.id === e.target.value);
                            if (found) {
                              setLiqDisbursed(String(found.amount));
                              setLiqSurrendered('0');
                            }
                          }}
                          className="form-select text-xs w-full"
                        >
                          <option value="">-- Choose Pending Advance --</option>
                          {pettyAdvances.filter(a => a.status === 'Pending').map(adv => (
                            <option key={adv.id} value={adv.id}>
                              {adv.recipient} (₱{adv.amount.toLocaleString()} - {adv.purpose})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedAdvanceId && (
                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 text-[10.5px] flex flex-col gap-1 text-slate-600">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Reconcile details:</span>
                          <p>Origin Advance: ₱{pettyAdvances.find(x => x.id === selectedAdvanceId)?.amount.toLocaleString()}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Disbursed Business Cost</label>
                          <input
                            required
                            type="number"
                            placeholder="₱ Disbursed"
                            value={liqDisbursed}
                            onChange={e => setLiqDisbursed(e.target.value)}
                            className="form-input text-xs w-full font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Cash Surrendered/Returned</label>
                          <input
                            required
                            type="number"
                            placeholder="₱ Surrendered"
                            value={liqSurrendered}
                            onChange={e => setLiqSurrendered(e.target.value)}
                            className="form-input text-xs w-full font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Expense Receipt Reference No.</label>
                        <input
                          required
                          type="text"
                          placeholder="Official OR / Invoice number"
                          value={liqReceipt}
                          onChange={e => setLiqReceipt(e.target.value)}
                          className="form-input text-xs w-full"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedAdvanceId}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow disabled:opacity-50"
                      >
                        Reconcile Liquidation
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Petty Cash Registers and shifts closed logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-150 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Registered Advances Ledger</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10.5px]">
                      <th className="p-3">Recipent / Purpose</th>
                      <th className="p-3 text-center">Date Handed</th>
                      <th className="p-3 text-right">Advance Float</th>
                      <th className="p-3 text-right">Expenses Disbursed</th>
                      <th className="p-3 text-right">Cash Surrendered</th>
                      <th className="p-3 text-center">Invoice OR</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {pettyAdvances.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100">
                        <td className="p-3">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100">{a.recipient}</span>
                          <p className="text-[10.5px] text-slate-400 leading-tight">{a.purpose}</p>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">{a.date}</td>
                        <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-400 font-extrabold">₱{a.amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-350">{a.liquidatedAmount ? `₱${a.liquidatedAmount.toLocaleString()}` : '-'}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-bold">{a.returnedAmount ? `₱${a.returnedAmount.toLocaleString()}` : '-'}</td>
                        <td className="p-3 text-center font-mono text-slate-500 font-bold">{a.receiptNo || '-'}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                            a.status === 'Liquidated' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* shift closing record history logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-150">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Shift Handover & Cashier Count logs</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10.5px]">
                      <th className="p-3">Shift Date / Counter</th>
                      <th className="p-3 text-right">Initial Float</th>
                      <th className="p-3 text-right">Accumulated Cost Settlements</th>
                      <th className="p-3 text-right">Expected Drawer Balance</th>
                      <th className="p-3 text-right">Actual Physical Cash Counted</th>
                      <th className="p-3 text-right">Cash shortage / overage variance</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {pettyCounterShifts.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="p-3">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100">Shift - {s.shiftDate}</span>
                          <p className="text-[10px] text-slate-400">HQ Petty Counter</p>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">₱{s.openingCash.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-500">- ₱{s.totalDisbursed.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-600">₱{s.closedCash.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-900 dark:text-white font-extrabold">₱{s.actualCashCount.toLocaleString()}</td>
                        <td className={`p-3 text-right font-mono font-black ${
                          s.variance === 0 ? 'text-emerald-700' : s.variance < 0 ? 'text-rose-600' : 'text-blue-700'
                        }`}>
                          {s.variance === 0 ? '₱0.00' : s.variance < 0 ? `-₱${Math.abs(s.variance).toLocaleString()}` : `+₱${s.variance.toLocaleString()}`}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase bg-slate-100 text-slate-700">CLOSED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 10: INTRABANK BANK TRANSFERS */}
          {activeTab === 'transfers' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-tight mb-1">Corporate Intrabank Funding Transfers</h4>
                <p className="text-xs text-slate-500">Authorize transfers across corporate treasury accounts. This registers dual ledger cards instantly, booking matching withdrawals & cash deposits simultaneously.</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                {/* Transfer Creation Panel */}
                <div className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-250 p-5 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 block uppercase mb-1">Register treasury transfer</span>
                  
                  <form onSubmit={handleRegisterTransfer} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Source Bank Account</label>
                      <select value={trfSource} onChange={e => setTrfSource(e.target.value)} className="form-select text-xs w-full">
                        <option value="BDO Savings Account">BDO Savings Account (PHP)</option>
                        <option value="BPI Savings Account">BPI Savings Account (PHP)</option>
                        <option value="Metrobank Corporate Account">Metrobank Corporate Account (PHP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Target Destination Bank Account</label>
                      <select value={trfDest} onChange={e => setTrfDest(e.target.value)} className="form-select text-xs w-full">
                        <option value="BPI Savings Account">BPI Savings Account (PHP)</option>
                        <option value="BDO Savings Account">BDO Savings Account (PHP)</option>
                        <option value="Metrobank Corporate Account">Metrobank Corporate Account (PHP)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Transfer Amount (PHP)</label>
                        <input
                          required
                          type="number"
                          placeholder="₱ Amount"
                          value={trfAmt}
                          onChange={e => setTrfAmt(e.target.value)}
                          className="form-input text-xs w-full font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Transfer Charge Fee</label>
                        <input
                          required
                          type="number"
                          placeholder="₱ Charge fee"
                          value={trfFee}
                          onChange={e => setTrfFee(e.target.value)}
                          className="form-input text-xs w-full font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Bank Reference / Confirmation No.</label>
                      <input
                        required
                        type="text"
                        placeholder="Ref code / InstaPay ID"
                        value={trfRef}
                        onChange={e => setTrfRef(e.target.value)}
                        className="form-input text-xs w-full"
                      />
                    </div>

                    <button
                      type="submit"
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all flex items-center justify-center gap-1"
                    >
                      Process Transfer Funds
                    </button>
                  </form>
                </div>

                {/* historical recorded transfers */}
                <div className="col-span-12 md:col-span-7 flex flex-col gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-150">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Authorized Transfer Registry Logs</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10px]">
                          <th className="p-3">Transferred Route Date</th>
                          <th className="p-3">Reference No.</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-right">Clearing Fee</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {bankTransfers.map(bt => (
                          <tr key={bt.id} className="hover:bg-slate-50 border-b border-slate-100 text-[11px]">
                            <td className="p-3">
                              <span className="font-extrabold text-slate-800 dark:text-slate-100">{bt.sourceBank} → {bt.destinationBank}</span>
                              <p className="text-[9.5px] text-slate-400 font-mono">Date Processed: {bt.date}</p>
                            </td>
                            <td className="p-3 font-mono text-slate-500">{bt.reference}</td>
                            <td className="p-3 text-right font-mono text-blue-700 font-extrabold">₱{bt.amount.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-slate-400">₱{bt.charge.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase bg-emerald-100 text-emerald-800">
                                {bt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 11: AUTOMATIC BANK RECONCILIATION & STATEMENT OCR */}
          {activeTab === 'reconciliation' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-tight mb-1">Automatic OCR Statement Bank Reconciliation</h4>
                <p className="text-xs text-slate-500">Scan paper statements dynamically via OCR or upload bank files. Our auto-matching ledger comparisons will balance off receipts, transactions, and post service fees.</p>
              </div>

              {/* Upload interface */}
              <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-2xl border border-slate-250 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase">Select Target Account and Bank Statement</span>
                  
                  <div className="flex flex-col gap-3">
                    <select
                      value={reconBank}
                      onChange={e => setReconBank(e.target.value)}
                      className="form-select text-xs w-full bg-white dark:bg-slate-900"
                    >
                      <option value="BDO Current Account">BDO Current Account (PHP - Main Float)</option>
                      <option value="BPI Savings Account">BPI Savings Account (PHP - Payroll Float)</option>
                    </select>

                    <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all bg-white dark:bg-slate-900 relative">
                      <Landmark className="w-8 h-8 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Drag or click paper statements / PDF</span>
                      
                      <input
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setStatementFileName(file.name);
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                      />
                      {statementFileName && (
                        <p className="text-[10px] font-mono text-emerald-600 font-extrabold mt-1">✓ Ready File: {statementFileName}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scan controller logs */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[140px] text-xs font-mono text-green-400 flex flex-col justify-between shadow-inner">
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[110px]">
                    {ocrScanningSimulationLogs.length === 0 ? (
                      <span className="text-zinc-600 italic">No OCR statement scanner running. Upload papers and triggers below...</span>
                    ) : (
                      ocrScanningSimulationLogs.map((lg, i) => (
                        <p key={i} className="text-[10px] leading-tight">🤖 [INFO] &gt; {lg}</p>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex justify-between gap-2.5">
                    <button
                      onClick={handleTriggerStatementOCR}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-slate-950 text-xs font-bold rounded-lg transition-all"
                    >
                      Extract OCR Statement
                    </button>
                    {reconProgress === 'reconciled' && (
                      <button
                        onClick={handleMatchReconciliation}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Auto-Match Ledger Cards
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Match Matching Panels columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                
                {/* Column 1: Internal Ledger pending items */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 border-b border-indigo-150 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-indigo-800 dark:text-indigo-400">1. ERP General Ledger Cash Book Cards</span>
                    <span className="text-[9.5px] text-slate-400 uppercase">INTERNAL ERP</span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10px]">
                        <th className="p-2.5">Date / Description</th>
                        <th className="p-2.5 text-center">Reference NO</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Audit Clear</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {internalLedgerTx.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="p-2.5">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100">{tx.desc}</span>
                            <p className="text-[9.5px] text-slate-400 font-mono">Date: {tx.date}</p>
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{tx.ref}</td>
                          <td className={`p-2.5 text-right font-mono ${tx.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            ₱{tx.amount.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              tx.reconciled ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {tx.reconciled ? 'Reconciled' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Column 2: Statement ledger matching board */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-blue-50 dark:bg-slate-950/20 border-b border-blue-150 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-blue-800 dark:text-blue-400">2. Extracted Scanned statement list</span>
                    <span className="text-[9.5px] text-slate-400 uppercase font-bold">OCR PARSED</span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10px]">
                        <th className="p-2.5">Statement Detail</th>
                        <th className="p-2.5 text-center">Ref Doc</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Matched</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {statementTx.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">Unscanned banks elements. Run OCR statement extractor above.</td>
                        </tr>
                      ) : (
                        statementTx.map(st => {
                          const isMatched = internalLedgerTx.find(lt => lt.ref === st.ref && lt.reconciled) || st.matchedId === 'adjusted';
                          return (
                            <tr key={st.id} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="p-2.5">
                                <span className="font-extrabold text-slate-800 dark:text-slate-100">{st.desc}</span>
                                <p className="text-[9.5px] text-slate-400 font-mono">Date: {st.date}</p>
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{st.ref}</td>
                              <td className={`p-2.5 text-right font-mono ${st.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                ₱{st.amount.toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center">
                                {isMatched ? (
                                  <span className="text-[9.5px] text-green-600 font-extrabold uppercase">✓ MATCH-100%</span>
                                ) : (
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    <span className="text-[8.5px] text-rose-500 font-extrabold uppercase">✖ UNMATCHED</span>
                                    {st.ref === 'BDO-INTEREST' && (
                                      <button
                                        onClick={handlePostReconciliationServiceCharge}
                                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[8.5px] rounded border"
                                      >
                                        Adjust missing
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}


          {/* TAB 12: MONTH END FOREIGN CURRENCY REVALUATION */}
          {activeTab === 'revaluation' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-tight mb-1">Month-End Foreign Currency Asset & Liability Revaluation</h4>
                <p className="text-xs text-slate-500">Calculate currency translation adjustments at month-end spot reference rates. This automatically generates adjusting journal entries for unrealized exchange variances.</p>
              </div>

              {/* FX Controller card */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase">Input Active Valuation Spot rates</span>
                  
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Target currency revalued</label>
                      <select className="form-select text-xs w-full">
                        <option value="USD">USD - United States Dollar ($)</option>
                        <option value="EUR">EUR - European Euro (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">BSP Spot Reference rate (to 1 PHP)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={revaluationRate}
                        onChange={e => setRevaluationRate(e.target.value)}
                        className="form-input text-xs w-full font-mono"
                      />
                    </div>

                    <button
                      onClick={handleExecuteFXRevaluation}
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
                    >
                      Post FX Translation adjustment
                    </button>
                  </div>
                </div>

                {/* Live math revaluation panel preview */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-150 flex flex-col gap-3 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Valuation Comparison breakdown</span>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 text-[10.5px]">Holdings reserve:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-100">$10,000.00 USD</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 text-[10.5px]">Historical cost (at ₱58.50):</span>
                      <span className="font-mono text-slate-800 dark:text-slate-100">₱585,000.00 PHP</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 text-[10.5px]">Revalued holding PHP value (at ₱{parseFloat(revaluationRate || '0').toFixed(2)}):</span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400 font-extrabold">₱{(10000 * (parseFloat(revaluationRate) || 0)).toLocaleString()} PHP</span>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-150 flex justify-between items-center mt-2.5">
                      <div>
                        <span className="font-bold text-emerald-800 dark:text-emerald-400 text-[10.5px]">Unrealized FX adjustment</span>
                        <p className="text-[9.5px] text-slate-400 font-sans">Automatic JV posted</p>
                      </div>
                      <span className="font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">
                        +₱{((10000 * (parseFloat(revaluationRate) || 0)) - 585000).toLocaleString()} PHP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical FX adjustment tables */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-150">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">FX Month-End adjustment Journal History</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10.5px]">
                      <th className="p-3">Calculation Date</th>
                      <th className="p-3">Target Asset Denominated Account</th>
                      <th className="p-3 text-right">Holdings FC</th>
                      <th className="p-3 text-right">Old PHP Cost</th>
                      <th className="p-3 text-right">Revalued PHP Bal</th>
                      <th className="p-3 text-right">Unrealized profit change</th>
                      <th className="p-3 text-center">Ref JV NO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {revalueLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-5 text-center text-slate-400">No revaluation adjusting journals recorded yet.</td>
                      </tr>
                    ) : (
                      revalueLogs.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="p-3 font-mono text-slate-500">{l.date}</td>
                          <td className="p-3 font-extrabold text-slate-800 dark:text-slate-100">{l.account}</td>
                          <td className="p-3 text-right font-mono text-indigo-700">${l.foreignVal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-slate-400">₱{l.oldPHPVal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-850 dark:text-white">₱{l.revaluedPHPVal.toLocaleString()}</td>
                          <td className={`p-3 text-right font-mono font-black ${l.variance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {l.variance >= 0 ? `+₱${l.variance.toLocaleString()}` : `-₱${Math.abs(l.variance).toLocaleString()}`}
                          </td>
                          <td className="p-3 text-center text-slate-500 font-extrabold font-mono">{l.entryJVReference}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 13: FORWARD CASH FLOW PROJECTIONS */}
          {activeTab === 'cashflow_projection' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-tight mb-1">Corporate Projected Cash Flow Projections</h4>
                <p className="text-xs text-slate-500">Forecast weekly treasury inflows and outflows over 30, 60, or 90 days. Configure scenarios adjusting Accounts Receivable collection efficiency.</p>
              </div>

              {/* Cash Flow Controller selectors and metrics */}
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-950 border border-slate-200 p-4 rounded-2xl flex flex-col gap-4">
                  <span className="text-[10.5px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase">Scenario Configurator parameters</span>
                  
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Forecast Horizon Timeline</label>
                    <select
                      value={cfTimeline}
                      onChange={e => setCfTimeline(e.target.value as any)}
                      className="form-select text-xs w-full"
                    >
                      <option value="30_days">30 Days (Weekly breakdown)</option>
                      <option value="60_days">60 Days (Bi-weekly breakdown)</option>
                      <option value="90_days">90 Days (Monthly breakdown)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">A/R Collection Scenario Profile</label>
                    <select
                      value={cfScenario}
                      onChange={e => setCfScenario(e.target.value as any)}
                      className="form-select text-xs w-full"
                    >
                      <option value="conservative">Conservative (75% AR collection efficiency)</option>
                      <option value="moderate">Moderate Scenario (100% AR matching speed)</option>
                      <option value="optimistic">Optimistic Strategy (120% collection speed)</option>
                    </select>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-xl border border-indigo-150 text-[10.5px] text-slate-600">
                    <span className="font-bold text-indigo-700 block mb-1">Formula Note:</span>
                    <p className="leading-relaxed">Starting Bank Balance + (Expected AR Cash Inflow * scenario multiplier) - Vendor AP Outflow = Projected Cash reserve by period end.</p>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Starting Treasury Cash</span>
                      <p className="text-[9.5px] text-slate-400 mb-2">Cash bank float + petty Cash</p>
                    </div>
                    <span className="font-mono text-lg font-black text-slate-800 dark:text-slate-100">
                      ₱{(bankBalance + 23000).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Expected Inflows (Collections)</span>
                      <p className="text-[9.5px] text-slate-400 mb-2">Unpaid credit receivables</p>
                    </div>
                    <span className="font-mono text-lg font-black text-emerald-700">
                      ₱{(385000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-150 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[10px] text-indigo-800 dark:text-indigo-400 block uppercase mb-1">Estimated Period Reserve Cash</span>
                      <p className="text-[9.5px] text-slate-400 mb-2">Forecast ending safety ledger</p>
                    </div>
                    <span className="font-mono text-xl font-black text-indigo-700 dark:text-indigo-400">
                      ₱{(
                        (bankBalance + 23000) + 
                        (385000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)) - 
                        145000
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Projected flow chart - custom styled */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl mt-2 flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Projected Cash Holding timeline graph</span>
                
                <div className="h-28 flex items-end gap-3 px-2 border-b border-l border-slate-200 dark:border-slate-800 pt-5">
                  {[
                    { label: 'Week 1', php: bankBalance + 15000, color: 'bg-indigo-500' },
                    { label: 'Week 2', php: bankBalance + 80000, color: 'bg-indigo-600' },
                    { label: 'Week 3', php: bankBalance + 120000, color: 'bg-blue-600' },
                    { label: 'Week 4', php: bankBalance + 210000, color: 'bg-emerald-600' },
                  ].map((w, index) => {
                    const pct = Math.min(100, Math.max(25, (w.php / 1000000) * 100));
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9.5px] font-mono text-slate-500">₱{w.php.toLocaleString()}</span>
                        <div className={`w-full ${w.color} rounded-t-lg transition-all duration-500`} style={{ height: `${pct}%` }} />
                        <span className="text-[9.5px] text-slate-400 font-bold mb-1 font-sans">{w.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* projections details table schedule */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-150">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Period Scheduled Receipts vs Outlays</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold border-b border-slate-150 text-[10.5px]">
                      <th className="p-3">Schedule Interval</th>
                      <th className="p-3 text-right">Inflows (Sales Customer Collections)</th>
                      <th className="p-3 text-right">Outflows (Payroll, Rent, Tax)</th>
                      <th className="p-3 text-right">Period Net Cash Flow</th>
                      <th className="p-3 text-right">Ending Cash Reserve Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">Week 1 (Current Float)</span>
                        <p className="text-[9.5px] text-slate-400">Forecast opening limits</p>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">₱{(85000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-rose-600">-₱35,000</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">₱{((85000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)) - 35000).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-700">₱{(bankBalance + 23000).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">Week 2</span>
                        <p className="text-[9.5px] text-slate-400">Receivable collection milestones</p>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">₱{(100000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-rose-600">-₱45,000</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">₱{((100000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)) - 45000).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-700">₱{(bankBalance + 110000).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">Week 3</span>
                        <p className="text-[9.5px] text-slate-400">Customer payments schedules</p>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">₱{(120000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-rose-600">-₱25,000</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">₱{((120000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)) - 25000).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-700">₱{(bankBalance + 195000).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">Week 4 (Period End Status)</span>
                        <p className="text-[9.5px] text-slate-400">Consolidated cash safety levels</p>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">₱{(80000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-rose-600">-₱40,000</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">₱{((80000 * (cfScenario === 'conservative' ? 0.75 : cfScenario === 'optimistic' ? 1.2 : 1.0)) - 40000).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-700">₱{(bankBalance + 263000).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 8: SUBSIDIARY CONSOLIDATION & INTERCOMPANY ELIMINATION */}
          {activeTab === 'consolidation' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight mb-1">Intercompany Consolidation & Elimination Journal</h4>
                <p className="text-xs text-slate-500">Consolidate subsidiary ledgers. Map and eliminate cross-entity transactions (such as parent-subsidiary sales) to avoid double counting corporate revenues.</p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                
                {/* subsidiary registry listing */}
                <div className="col-span-12 md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Subsidiary Consolidated Companies</span>
                  
                  <div className="flex flex-col gap-2.5">
                    {subsidiaries.map(sub => (
                      <div key={sub.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-3 rounded-xl text-xs flex flex-col gap-1">
                        <div className="flex justify-between font-black text-slate-800 dark:text-slate-100">
                          <span>{sub.name}</span>
                          <span className="text-indigo-600 font-mono">Revenue: ₱{sub.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] text-slate-400">
                          <span>Assets: ₱{sub.assets.toLocaleString()}</span>
                          <span>Liabilities: ₱{sub.liabilities.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleAddElimination();
                  }} className="border-t border-slate-200 pt-3 flex flex-col gap-3 mt-1">
                    <span className="text-[10.5px] font-extrabold text-slate-400 block uppercase">Register Intercompany Elimination entry</span>
                    
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">From Origin Entity</label>
                      <select value={elimFrom} onChange={e => setElimFrom(e.target.value)} className="form-select w-full text-xs">
                        <option value="Metro Manila Distribution Inc.">Metro Manila Distribution Inc.</option>
                        <option value="Cebu CyberOps Logistics Corp.">Cebu CyberOps Logistics Corp.</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">To Target Entity</label>
                      <select value={elimTo} onChange={e => setElimTo(e.target.value)} className="form-select w-full text-xs">
                        <option value="Cebu CyberOps Logistics Corp.">Cebu CyberOps Logistics Corp.</option>
                        <option value="Metro Manila Distribution Inc.">Metro Manila Distribution Inc.</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Eliminated Balance</label>
                        <input required type="number" placeholder="₱ Amount" value={elimAmt} onChange={e => setElimAmt(e.target.value)} className="form-input text-xs w-full font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Adjustment Account</label>
                        <select value={elimAcc} onChange={e => setElimAcc(e.target.value)} className="form-select text-[10px] py-1 w-full">
                          <option value="Intercompany Transfer Revenues">Intercompany Revenues</option>
                          <option value="Intercompany Accounts Payable">Intercompany AP</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow">
                      <Save className="w-4 h-4" /> Log Elimination entries
                    </button>
                  </form>
                </div>

                {/* Consolidation Rollups comparison log and details */}
                <div className="col-span-12 md:col-span-7 flex flex-col gap-4">
                  <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col gap-3">
                    <span className="text-[10px] text-indigo-600 font-extrabold block">CONSOLIDATED GROUP SUMMARY COMPUTATION</span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Sum of subsidiary revenues</span>
                        <p className="font-mono text-sm font-black text-slate-800 dark:text-slate-100">₱{totalSubRev.toLocaleString()}</p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Eliminated Cross-Revenues</span>
                        <p className="font-mono text-sm font-black text-rose-600">- ₱{totalElimAmt.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-150 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs">CONSOLIDATED AUDITED GROUP REVENUE</span>
                        <p className="text-[10px] text-slate-400">Total top-line corporate health</p>
                      </div>
                      <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-400">
                        ₱{(totalSubRev - totalElimAmt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Active Eliminations list table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden self-start w-full">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                          <th className="p-2">Elimination Details</th>
                          <th className="p-2 text-right">Debit Adjust Amount</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {intercompanyData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400">No elimination journals recorded yet. Complete cross-border eliminations using formulation panel!</td>
                          </tr>
                        ) : (
                          intercompanyData.map(el => (
                            <tr key={el.id} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="p-2.5">
                                <span className="font-extrabold text-indigo-700 dark:text-indigo-400 font-mono text-[11px] block">{el.accountTitle}</span>
                                <p className="text-[10px] text-slate-400 leading-tight">From: {el.fromEntity} → {el.toEntity}</p>
                              </td>
                              <td className="p-2.5 text-right font-bold text-rose-600 font-mono">
                                -₱{el.amount.toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center">
                                <button onClick={() => handleDeleteElimination(el.id)} className="text-red-500 hover:text-red-700 px-2 py-1">
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
