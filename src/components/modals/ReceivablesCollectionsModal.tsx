import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { CashReceiptDetail, DepositSlip, CustomerDeposit, DebitCreditMemo, Sale } from '../../types';
import { formatTIN } from '../../lib/utils';
import { 
  DollarSign, FileText, Printer, Plus, Trash2, ShieldAlert, 
  CheckCircle, AlertTriangle, Play, Pause, RefreshCw, 
  TrendingUp, ArrowRightLeft, Landmark, Percent, Ban, Check, HelpCircle
} from 'lucide-react';

export function ReceivablesCollectionsModal() {
  const { currentClient, currentClientId, saveClient, showToast, activeModal } = useAccounting();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'receipts' | 'deposits' | 'memos' | 'returns' | 'customer_deposits' | 'aging' | 'statements' | 'twas'>('dashboard');

  // --- Initial Data Defaults from currentClient ---
  const receipts: CashReceiptDetail[] = currentClient?.receipts || [];
  const depositSlips: DepositSlip[] = currentClient?.depositSlips || [];
  const customerDeposits: CustomerDeposit[] = currentClient?.customerDeposits || [];
  const customerMemos: DebitCreditMemo[] = currentClient?.customerMemos || [];
  const sales: Sale[] = currentClient?.sales || [];
  const bankBalance = currentClient?.bankBalance ?? 500000;

  // --- Form toggle switches ---
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [showDepositFormState, setShowDepositFormState] = useState(false);
  const [showCustDepForm, setShowCustDepForm] = useState(false);

  // --- Cash Receipt Form states ---
  const [rcpType, setRcpType] = useState<'Provisional' | 'Collection' | 'Official'>('Official');
  const [rcpNo, setRcpNo] = useState('');
  const [rcpDate, setRcpDate] = useState(new Date().toISOString().split('T')[0]);
  const [rcpBuyerName, setRcpBuyerName] = useState('');
  const [rcpBuyerTin, setRcpBuyerTin] = useState('');
  const [rcpAmount, setRcpAmount] = useState('');
  const [rcpMethod, setRcpMethod] = useState<'Cash' | 'Check' | 'Bank Transfer'>('Cash');
  const [rcpCheckNo, setRcpCheckNo] = useState('');
  const [rcpBankName, setRcpBankName] = useState('');
  const [rcpDesc, setRcpDesc] = useState('');
  const [rcpInvoiceId, setRcpInvoiceId] = useState('');
  const [rcpTwasRate, setRcpTwasRate] = useState('0'); // 0 = None, 0.01 = 1%, 0.02 = 2%, etc.
  const [rcpAtcCode, setRcpAtcCode] = useState('');

  // --- Deposit Slip state ---
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [depBankName, setDepBankName] = useState('BDO Savings Account');
  const [depAccountNo, setDepAccountNo] = useState('10912-3312-92');
  const [depAccountName, setDepAccountName] = useState('');
  const [selectedReceiptIdsForDeposit, setSelectedReceiptIdsForDeposit] = useState<string[]>([]);
  // Cash denomination counters
  const [den1000, setDen1000] = useState('0');
  const [den500, setDen500] = useState('0');
  const [den200, setDen200] = useState('0');
  const [den100, setDen100] = useState('0');
  const [den50, setDen50] = useState('0');
  const [den20, setDen20] = useState('0');

  // --- Credit & Debit Memos form states ---
  const [memoType, setMemoType] = useState<'Debit' | 'Credit'>('Credit');
  const [memoDate, setMemoDate] = useState(new Date().toISOString().split('T')[0]);
  const [memoInvoiceId, setMemoInvoiceId] = useState(''); // Target invoice
  const [memoAmount, setMemoAmount] = useState('');
  const [memoReason, setMemoReason] = useState('');

  // --- Customer Deposits / Advances form states ---
  const [custDepDate, setCustDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [custDepName, setCustDepName] = useState('');
  const [custDepTin, setCustDepTin] = useState('');
  const [custDepAmount, setCustDepAmount] = useState('');

  // --- Replacement Tool states ---
  const [provisionalToReplaceId, setProvisionalToReplaceId] = useState('');
  const [replacementOfficialNo, setReplacementOfficialNo] = useState('');

  // --- Returned Checks states ---
  const [bounceCheckReceiptId, setBounceCheckReceiptId] = useState('');
  const [bounceReason, setBounceReason] = useState('Insufficent Funds (NSF)');

  // --- Statements & Aging configuration ---
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState('');
  const [dunningLevel, setDunningLevel] = useState<'Friendly' | 'Medium' | 'Urgent'>('Friendly');
  
  // Outstanding receivables custom aging buckets (e.g. 0-15, 16-30, 31-45, etc.)
  const [agingPeriod1, setAgingPeriod1] = useState(30);
  const [agingPeriod2, setAgingPeriod2] = useState(60);
  const [agingPeriod3, setAgingPeriod3] = useState(90);

  // Print overlays
  const [printReceiptVoucher, setPrintReceiptVoucher] = useState<CashReceiptDetail | null>(null);
  const [printDepositSlip, setPrintDepositSlip] = useState<DepositSlip | null>(null);
  const [printStatementCustomer, setPrintStatementCustomer] = useState<string | null>(null);

  useEffect(() => {
    if (rcpType === 'Provisional') {
      setRcpNo(`PR-${10000 + receipts.length + 1}`);
    } else if (rcpType === 'Collection') {
      setRcpNo(`CR-${10000 + receipts.length + 1}`);
    } else {
      setRcpNo(`OR-${10000 + receipts.length + 1}`);
    }
  }, [rcpType, receipts.length, showReceiptForm]);

  useEffect(() => {
    if (currentClient) {
      setDepAccountName(currentClient.registeredName || currentClient.name || '');
    }
  }, [currentClient]);

  if (!currentClient || activeModal !== 'receivables_collections') return null;

  // --- Helper: save client dataset ---
  const handleSaveData = async (updatedFields: Partial<typeof currentClient>) => {
    await saveClient(currentClient.id, {
      ...currentClient,
      ...updatedFields
    });
  };

  // --- Core Accounting Engine Calculations ---

  // Calculates the current due balance of a Sale/Invoice
  const getInvoiceBalance = (sale: Sale) => {
    const totalInvoiced = sale.amount;
    
    // Sum of applied cash receipts that are active
    const paymentsForInvoice = receipts
      .filter(r => r.invoiceId === String(sale.id) && r.status === 'Active')
      .reduce((sum, r) => sum + r.amount + (r.twasAmount || 0), 0);

    // Sum of credit/debit memos
    const invoiceMemos = customerMemos.filter(m => m.invoiceId === String(sale.id));
    const creditAdjustments = invoiceMemos.filter(m => m.type === 'Credit').reduce((sum, m) => sum + m.amount, 0);
    const debitAdjustments = invoiceMemos.filter(m => m.type === 'Debit').reduce((sum, m) => sum + m.amount, 0);

    return Math.max(0, totalInvoiced - paymentsForInvoice - creditAdjustments + debitAdjustments);
  };

  // Calculate stats for Dashboard
  const activeUnappliedReceipts = receipts.filter(r => r.status === 'Active' && !r.invoiceId);
  const totalOutstandingAR = sales.reduce((sum, s) => sum + getInvoiceBalance(s), 0);
  const totalCollections = receipts.filter(r => r.status === 'Active').reduce((sum, r) => sum + r.amount, 0);
  const totalTwasWithheld = receipts.filter(r => r.status === 'Active').reduce((sum, r) => sum + (r.twasAmount || 0), 0);
  const unappliedCustDeposits = customerDeposits.filter(d => d.status === 'Unapplied').reduce((sum, d) => sum + d.amount, 0);

  // Compute Aging buckets based on user aging configuration
  const getCustomerAging = () => {
    const customerAgingMap: Record<string, {
      tin: string;
      current: number;
      bucket1: number;
      bucket2: number;
      bucket3: number;
      older: number;
      total: number;
    }> = {};

    sales.forEach(sale => {
      const bal = getInvoiceBalance(sale);
      if (bal <= 0) return;

      const customerKey = sale.buyerName;
      if (!customerAgingMap[customerKey]) {
        customerAgingMap[customerKey] = {
          tin: sale.buyerTin || '',
          current: 0,
          bucket1: 0,
          bucket2: 0,
          bucket3: 0,
          older: 0,
          total: 0
        };
      }

      // Calculate days past invoice date
      const invDate = new Date(sale.date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      customerAgingMap[customerKey].total += bal;

      if (diffDays <= agingPeriod1) {
        customerAgingMap[customerKey].current += bal;
      } else if (diffDays <= agingPeriod2) {
        customerAgingMap[customerKey].bucket1 += bal;
      } else if (diffDays <= agingPeriod3) {
        customerAgingMap[customerKey].bucket2 += bal;
      } else {
        customerAgingMap[customerKey].older += bal;
      }
    });

    return Object.entries(customerAgingMap).map(([name, data]) => ({
      customerName: name,
      ...data
    }));
  };

  const customerAgingData = getCustomerAging();

  // --- Handlers ---

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rcpAmount);
    if (!rcpNo || isNaN(amt) || amt <= 0 || !rcpBuyerName) {
      alert('Voucher No, Buyer Name, and Valid Amount are required.');
      return;
    }

    const twasRateValue = parseFloat(rcpTwasRate) || 0;
    const computedTwasAmt = amt * twasRateValue;
    const finalReceiptAmount = amt - computedTwasAmt; // Collection cash is net of TWAS

    const newRcp: CashReceiptDetail = {
      id: crypto.randomUUID(),
      date: rcpDate,
      receiptType: rcpType,
      receiptNo: rcpNo,
      buyerName: rcpBuyerName,
      buyerTin: rcpBuyerTin || undefined,
      amount: finalReceiptAmount,
      paymentMethod: rcpMethod,
      checkNo: rcpMethod === 'Check' ? rcpCheckNo : undefined,
      bankName: rcpMethod === 'Check' || rcpMethod === 'Bank Transfer' ? rcpBankName : undefined,
      desc: rcpDesc || undefined,
      status: 'Active',
      twasRate: twasRateValue > 0 ? twasRateValue : undefined,
      twasAmount: computedTwasAmt > 0 ? computedTwasAmt : undefined,
      atcCode: rcpAtcCode || undefined,
      invoiceId: rcpInvoiceId || undefined
    };

    // If an invoice is selected, check if we exceed its outstanding balance
    if (rcpInvoiceId) {
      const matchedSale = sales.find(s => String(s.id) === rcpInvoiceId);
      if (matchedSale) {
        const remaining = getInvoiceBalance(matchedSale);
        if (amt > remaining + 0.05) {
          if (!confirm(`Warning: Receipt amount (₱${amt.toLocaleString()}) exceeds invoice outstanding balance (₱${remaining.toLocaleString()}). Proceed?`)) {
            return;
          }
        }
      }
    }

    const updatedReceipts = [...receipts, newRcp];
    
    // Automatically recalculate bankBalance
    const updatedBalance = bankBalance + finalReceiptAmount;

    await handleSaveData({
      receipts: updatedReceipts,
      bankBalance: updatedBalance
    });

    showToast(`Successfully created ${rcpType} Receipt #${rcpNo}`);
    
    // Reset Form
    setShowReceiptForm(false);
    setRcpBuyerName('');
    setRcpBuyerTin('');
    setRcpAmount('');
    setRcpCheckNo('');
    setRcpBankName('');
    setRcpDesc('');
    setRcpInvoiceId('');
    setRcpTwasRate('0');
    setRcpAtcCode('');
  };

  const handleReplaceProvisional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionalToReplaceId || !replacementOfficialNo) return;

    const targetPR = receipts.find(r => r.id === provisionalToReplaceId);
    if (!targetPR) return;

    // 1. Mark PR as replaced
    // 2. Create matching Official Receipt
    const officialId = crypto.randomUUID();
    const updatedReceipts = receipts.map(r => {
      if (r.id === provisionalToReplaceId) {
        return {
          ...r,
          status: 'Replaced' as const,
          replacedByReceiptId: officialId
        };
      }
      return r;
    });

    const newOR: CashReceiptDetail = {
      ...targetPR,
      id: officialId,
      receiptType: 'Official',
      receiptNo: replacementOfficialNo,
      date: new Date().toISOString().split('T')[0],
      desc: `Replacement OR for Provisional Receipt #${targetPR.receiptNo} - ${targetPR.desc || ''}`
    };

    updatedReceipts.push(newOR);

    await handleSaveData({ receipts: updatedReceipts });
    showToast(`PR #${targetPR.receiptNo} successfully replaced with Official OR #${replacementOfficialNo}`);
    setProvisionalToReplaceId('');
    setReplacementOfficialNo('');
  };

  const handleAddDepositSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReceiptIdsForDeposit.length === 0) {
      alert('Please select at least one cash/check receipt to pack inside this deposit slip.');
      return;
    }

    const targetReceipts = receipts.filter(r => selectedReceiptIdsForDeposit.includes(r.id));
    const cashTotal = targetReceipts.filter(r => r.paymentMethod === 'Cash').reduce((sum, r) => sum + r.amount, 0);
    const checkTotal = targetReceipts.filter(r => r.paymentMethod === 'Check').reduce((sum, r) => sum + r.amount, 0);
    const overallTotal = cashTotal + checkTotal;

    // Check checks detail elements
    const checkDetailsList = targetReceipts
      .filter(r => r.paymentMethod === 'Check')
      .map(r => ({
        checkNo: r.checkNo || 'N/A',
        bank: r.bankName || 'Unknown Bank',
        amount: r.amount
      }));

    // Record cash denominations
    const denominations = {
      '1000': parseInt(den1000) || 0,
      '500': parseInt(den500) || 0,
      '200': parseInt(den200) || 0,
      '100': parseInt(den100) || 0,
      '50': parseInt(den50) || 0,
      '20': parseInt(den20) || 0,
    };

    const newSlip: DepositSlip = {
      id: crypto.randomUUID(),
      date: depDate,
      bankName: depBankName,
      accountNo: depAccountNo,
      accountName: depAccountName,
      receiptIds: selectedReceiptIdsForDeposit,
      cashAmount: cashTotal,
      checksAmount: checkTotal,
      checkDetails: checkDetailsList,
      totalAmount: overallTotal,
      cashDenominations: denominations
    };

    const updatedSlips = [...depositSlips, newSlip];
    await handleSaveData({ depositSlips: updatedSlips });
    
    showToast(`Bank Deposit Slip generated total ₱${overallTotal.toLocaleString()}`);
    setShowDepositForm(false);
    setSelectedReceiptIdsForDeposit([]);
    setDen1000('0');
    setDen500('0');
    setDen200('0');
    setDen100('0');
    setDen50('0');
    setDen20('0');
  };

  const handleAddMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(memoAmount);
    if (!memoInvoiceId || isNaN(amt) || amt <= 0) {
      alert('Please select a valid sale invoice and amount.');
      return;
    }

    const newMemo: DebitCreditMemo = {
      id: crypto.randomUUID(),
      date: memoDate,
      type: memoType,
      invoiceId: memoInvoiceId,
      amount: amt,
      reason: memoReason || 'Operational Customer Adjustment'
    };

    const updatedMemos = [...customerMemos, newMemo];
    await handleSaveData({ customerMemos: updatedMemos });

    showToast(`${memoType} Memo applied successfully on invoice.`);
    setShowMemoForm(false);
    setMemoInvoiceId('');
    setMemoAmount('');
    setMemoReason('');
  };

  const handleAddCustomerDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(custDepAmount);
    if (!custDepName || isNaN(amt) || amt <= 0) {
      alert('Valid customer details and amount are required.');
      return;
    }

    const newDep: CustomerDeposit = {
      id: crypto.randomUUID(),
      date: custDepDate,
      customerName: custDepName,
      customerTin: custDepTin || '000-000-000',
      amount: amt,
      status: 'Unapplied'
    };

    const updatedCustDeposits = [...customerDeposits, newDep];
    // Add deposit directly to bank collection funds too!
    const updatedBalance = bankBalance + amt;

    await handleSaveData({ 
      customerDeposits: updatedCustDeposits,
      bankBalance: updatedBalance
    });

    showToast(`Advance payment of ₱${amt.toLocaleString()} received from ${custDepName}.`);
    setShowCustDepForm(false);
    setCustDepName('');
    setCustDepTin('');
    setCustDepAmount('');
  };

  const handleApplyDepositToInvoice = async (depositId: string, saleId: number) => {
    const dep = customerDeposits.find(d => d.id === depositId);
    if (!dep) return;

    // Apply deposit amount deduction to outstanding target invoice
    const updatedDeposits = customerDeposits.map(d => {
      if (d.id === depositId) {
        return {
          ...d,
          status: 'Applied' as const,
          appliedSaleId: String(saleId)
        };
      }
      return d;
    });

    // We can also record this as an active receipt under that invoice
    const newRcp: CashReceiptDetail = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      receiptType: 'Official',
      receiptNo: `OR-DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerName: dep.customerName,
      buyerTin: dep.customerTin,
      amount: dep.amount,
      paymentMethod: 'Cash',
      desc: `Applied Customer Deposit Advance reference ID ${dep.id}`,
      status: 'Active',
      invoiceId: String(saleId)
    };

    // Bank balance was already updated when the advance was received, so just save receipts & deposits
    await handleSaveData({
      customerDeposits: updatedDeposits,
      receipts: [...receipts, newRcp]
    });

    showToast(`Successfully applied ₱${dep.amount.toLocaleString()} advance balance to Invoice.`);
  };

  const handleBounceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bounceCheckReceiptId) return;

    const rcp = receipts.find(r => r.id === bounceCheckReceiptId);
    if (!rcp) return;

    // Mark check receipt as Bounced/Returned
    const updatedReceipts = receipts.map(r => {
      if (r.id === bounceCheckReceiptId) {
        return {
          ...r,
          status: 'Returned' as const,
          desc: `BOUNCED CHECK RETURNED: ${bounceReason} | ${r.desc || ''}`
        };
      }
      return r;
    });

    // Deduct bounced amount from the active bankBalance
    const updatedBalance = bankBalance - rcp.amount;

    await handleSaveData({
      receipts: updatedReceipts,
      bankBalance: updatedBalance
    });

    showToast(`NSF RETURNED CHECK ALERT: Receipt #${rcp.receiptNo} bounced. Ledger balance reversed by -₱${rcp.amount.toLocaleString()}`);
    setBounceCheckReceiptId('');
  };

  const handleDeleteReceipt = async (id: string) => {
    const item = receipts.find(r => r.id === id);
    if (!item) return;

    if (confirm(`Delete permanently receipt #${item.receiptNo}? This will revert any payment accounts.`)) {
      const updated = receipts.filter(r => r.id !== id);
      const isDeduction = item.status === 'Active';
      const updatedBalance = isDeduction ? bankBalance - item.amount : bankBalance;

      await handleSaveData({
        receipts: updated,
        bankBalance: updatedBalance
      });
      showToast('Cash receipt record deleted.');
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    if (confirm('Are you sure you want to delete this deposit slip?')) {
      const updated = depositSlips.filter(s => s.id !== id);
      await handleSaveData({ depositSlips: updated });
      showToast('Deposit record deleted.');
    }
  };

  const handleDeleteMemo = async (id: string) => {
    if (confirm('Delete this debit/credit memo?')) {
      const updated = customerMemos.filter(m => m.id !== id);
      await handleSaveData({ customerMemos: updated });
      showToast('Memo deleted.');
    }
  };

  // --- Dunning Messages Engine ---
  const getDunningMessage = (level: typeof dunningLevel) => {
    switch (level) {
      case 'Friendly':
        return `DELINQUENT REMINDER:\nThis is a friendly statement reminder that your account holds a pending balance. Please forward the settlement amount at your earliest convenience. Thank you for your continued business.`;
      case 'Medium':
        return `PAST DUE GENERAL DEMAND:\nAccording to our records, your customer account is currently past due. We request that you process this overdue payment within 7 business days to avoid accounts lock constraints.`;
      case 'Urgent':
        return `URGENT COLLECTION - FINAL NOTICE BEFORE LEGAL REFERRAL:\nYour accounts receivable values represent critical past-due breaches. This serves as our final formal warning to arrange immediate wiring of outstanding balances. Failure to settle will escalate this file to collections counsel.`;
    }
  };

  // Tax Withheld at Source ATC codes
  const WHT_ATC_CODES = [
    { code: 'WC158', rate: 0.01, desc: 'Purchase of goods (1% WHT)' },
    { code: 'WC160', rate: 0.02, desc: 'Purchase of services (2% WHT)' },
    { code: 'WI158', rate: 0.01, desc: 'Individual Goods seller (1% WHT)' },
    { code: 'WI160', rate: 0.02, desc: 'Individual Service seller (2% WHT)' },
  ];

  return (
    <Modal
      id="receivables_collections"
      title="Receivables, Collections & Cash Receipts Suite"
      icon={<Landmark className="w-5 h-5 text-indigo-500" />}
      maxWidth="max-w-7xl"
    >
      <div className="flex flex-col md:flex-row h-[78vh] overflow-hidden">
        
        {/* Sidebar Nav Tabs */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="mb-4 px-2">
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Main Modules</span>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Suite Dashboard
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'receipts' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Cash Receipts Journal
          </button>

          <button
            onClick={() => {
              setActiveTab('deposits');
              setSelectedReceiptIdsForDeposit([]);
            }}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'deposits' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <Landmark className="w-4 h-4 text-blue-500" />
            Deposit Slip Prep
          </button>

          <button
            onClick={() => setActiveTab('memos')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'memos' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-330'}`}
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
            Debit & Credit Memos
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'returns' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <Ban className="w-4 h-4 text-rose-500" />
            Returned Checks (NSF)
          </button>

          <button
            onClick={() => setActiveTab('customer_deposits')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'customer_deposits' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <CheckCircle className="w-4 h-4 text-cyan-500" />
            Customer Prepayments
          </button>

          <div className="mt-4 mb-2 px-2">
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest">Reports & Statements</span>
          </div>

          <button
            onClick={() => setActiveTab('aging')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'aging' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            A/R Aging Report
          </button>

          <button
            onClick={() => setActiveTab('statements')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'statements' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            Statements & Dunning
          </button>

          <button
            onClick={() => setActiveTab('twas')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${activeTab === 'twas' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-350'}`}
          >
            <Percent className="w-4 h-4 text-orange-500" />
            Tax Withheld (TWAS)
          </button>

          {/* Quick Balance indicator */}
          <div className="mt-auto bg-indigo-950 text-white rounded-2xl p-3.5 border border-indigo-900">
            <div className="text-[10px] uppercase text-indigo-300 font-extrabold mb-1">Corporate Cash Vault</div>
            <span className="text-base font-black font-mono text-yellow-450">₱{bankBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Content body container */}
        <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-950">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                <h4 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-400 uppercase mb-1">Accounts Receivable & Collections Dashboard</h4>
                <p className="text-xs text-slate-500">Real-time ledger matching. Handle cash sales collections, invoice applications, credit/debit adjustments, and check clearings in full compliance.</p>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Outstanding A/R</span>
                  <span className="font-mono text-xl font-extrabold text-amber-600 block mt-1">₱{totalOutstandingAR.toLocaleString()}</span>
                  <p className="text-[9.5px] text-slate-400 mt-2">Active outstanding invoice debt</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Collections</span>
                  <span className="font-mono text-xl font-extrabold text-emerald-600 block mt-1">₱{totalCollections.toLocaleString()}</span>
                  <p className="text-[9.5px] text-slate-400 mt-2">Net cashier receipt inflow</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Withheld Tax Assets (TWAS)</span>
                  <span className="font-mono text-xl font-extrabold text-indigo-600 block mt-1">₱{totalTwasWithheld.toLocaleString()}</span>
                  <p className="text-[9.5px] text-slate-400 mt-2">BIR Form 2307 ledger credits</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Advances</span>
                  <span className="font-mono text-xl font-extrabold text-teal-600 block mt-1">₱{unappliedCustDeposits.toLocaleString()}</span>
                  <p className="text-[9.5px] text-slate-400 mt-2">Unapplied prepayments</p>
                </div>
              </div>

              {/* Action Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="bg-slate-50 dark:bg-slate-900/40 border p-5 rounded-2xl">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-2">Prompt Collection Workflow</h5>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed mb-4">Easily track invoice dues, apply customer wire transers, hand over official receipts or credit notes, and run custom multi-bucket aging cards inside a highly structured interface.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('receipts');
                        setShowReceiptForm(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
                    >
                      Receive Cash Receipt
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('aging');
                      }}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
                    >
                      Check Overdues
                    </button>
                  </div>
                </div>

                <div className="border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900/20 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Compliance Warning: BIR 2307
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Ensure buyers with BIR withholding tax rates (1% on goods, 2% on services) submit valid Certificate of Creditable Tax Withheld at Source (Form 2307) during settlement of open accounts payable invoice values.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('twas')}
                    className="text-indigo-600 dark:text-indigo-400 font-extrabold text-xs text-left mt-3 flex items-center gap-1 hover:underline"
                  >
                    View TWAS tax tracker register &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECEIPTS PROCESSING */}
          {activeTab === 'receipts' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border gap-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Accounts Collections Register</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Processes Provisional, Collection, or Official Receipts with instant ledger booking.</p>
                </div>
                <button
                  onClick={() => setShowReceiptForm(!showReceiptForm)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Receive Payment Transaction
                </button>
              </div>

              {/* Receipt creation form */}
              {showReceiptForm && (
                <form onSubmit={handleAddReceipt} className="bg-slate-50 dark:bg-slate-900/50 border p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-extrabold text-xs uppercase text-slate-700">Add Collection Entry</span>
                    <button type="button" onClick={() => setShowReceiptForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Receipt Document Level</label>
                      <select 
                        value={rcpType} 
                        onChange={e => setRcpType(e.target.value as any)}
                        className="form-select text-xs w-full"
                      >
                        <option value="Provisional">Provisional Receipt (PR)</option>
                        <option value="Collection">Collection Receipt (CR)</option>
                        <option value="Official">Official Receipt (OR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Receipt voucher number</label>
                      <input 
                        required 
                        type="text" 
                        value={rcpNo} 
                        onChange={e => setRcpNo(e.target.value)}
                        className="form-input text-xs w-full" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Date Collected</label>
                      <input 
                        required 
                        type="date" 
                        value={rcpDate} 
                        onChange={e => setRcpDate(e.target.value)}
                        className="form-input text-xs w-full" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Customer buyer Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="Search or enter customer..." 
                        value={rcpBuyerName} 
                        onChange={e => rcpBuyerName === '' ? (setRcpBuyerName(e.target.value)) : setRcpBuyerName(e.target.value)}
                        className="form-input text-xs w-full" 
                      />
                      {/* TIN autocomplete logic simulation */}
                      <div className="flex gap-2 mt-1">
                        {currentClient.tinLibrary.customers.slice(0,3).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setRcpBuyerName(c.name);
                              setRcpBuyerTin(c.tin);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-[10px] text-indigo-700 font-bold px-1.5 py-0.5 rounded"
                          >
                            + {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Customer TIN</label>
                      <input 
                        type="text" 
                        placeholder="000-000-000" 
                        value={rcpBuyerTin} 
                        onChange={e => setRcpBuyerTin(formatTIN(e.target.value))}
                        className="form-input text-xs w-full font-mono" 
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Apply to Outstanding Invoice</label>
                      <select 
                        value={rcpInvoiceId} 
                        onChange={e => {
                          setRcpInvoiceId(e.target.value);
                          // Autofill customer name and balance
                          const matchedSale = sales.find(s => String(s.id) === e.target.value);
                          if (matchedSale) {
                            setRcpBuyerName(matchedSale.buyerName);
                            setRcpBuyerTin(matchedSale.buyerTin);
                            setRcpAmount(String(getInvoiceBalance(matchedSale)));
                          }
                        }}
                        className="form-select text-xs w-full"
                      >
                        <option value="">-- Direct Sales Collection (No open invoice) --</option>
                        {sales.map(s => {
                          const outstanding = getInvoiceBalance(s);
                          if (outstanding <= 0) return null;
                          return (
                            <option key={s.id} value={s.id}>
                              INV #{s.ref || s.id} - {s.buyerName} (Oustanding: ₱{outstanding.toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Base Amount Collected (₱)</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="0.00" 
                        value={rcpAmount} 
                        onChange={e => setRcpAmount(e.target.value)}
                        className="form-input text-xs w-full font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Payment Mode</label>
                      <select 
                        value={rcpMethod} 
                        onChange={e => setRcpMethod(e.target.value as any)}
                        className="form-select text-xs w-full"
                      >
                        <option value="Cash">Cash Vault</option>
                        <option value="Check">Check Drawer</option>
                        <option value="Bank Transfer">Bank Electronic Transfer</option>
                      </select>
                    </div>
                  </div>

                  {/* Extra check details if check is mode of payment */}
                  {rcpMethod === 'Check' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 p-3 rounded-xl border">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Check Number</label>
                        <input 
                          type="text" 
                          placeholder="CK-99120" 
                          value={rcpCheckNo} 
                          onChange={e => setRcpCheckNo(e.target.value)}
                          className="form-input text-xs w-full font-mono" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Drawee Bank Name</label>
                        <input 
                          type="text" 
                          placeholder="BDO Universal Bank" 
                          value={rcpBankName} 
                          onChange={e => setRcpBankName(e.target.value)}
                          className="form-input text-xs w-full" 
                        />
                      </div>
                    </div>
                  )}

                  {rcpMethod === 'Bank Transfer' && (
                    <div className="bg-slate-100 p-3 rounded-xl border">
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Deposit Bank Name</label>
                      <input 
                        type="text" 
                        placeholder="BDO / BPI Savings Account" 
                        value={rcpBankName} 
                        onChange={e => setRcpBankName(e.target.value)}
                        className="form-input text-xs w-full" 
                      />
                    </div>
                  )}

                  {/* TWAS (Tax Withheld) segment inside the Cash receipt form */}
                  <div className="bg-slate-100 dark:bg-slate-900 border p-3 rounded-xl">
                    <span className="text-[10.5px] font-extrabold text-slate-600 block mb-2 uppercase">Creditable Tax Withheld at source (BIR 2307)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold">Withholding Tax Rate</label>
                        <select 
                          value={rcpTwasRate} 
                          onChange={e => setRcpTwasRate(e.target.value)}
                          className="form-select text-xs w-full"
                        >
                          <option value="0">0% - No Withholding</option>
                          <option value="0.01">1% - Withholding on Goods (WC158/WI158)</option>
                          <option value="0.02">2% - Withholding on Services (WC160/WI160)</option>
                          <option value="0.05">5% - Rental / Other business accounts</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 font-bold">ATC Code Identifier</label>
                        <input 
                          type="text" 
                          placeholder="e.g. WC160" 
                          value={rcpAtcCode} 
                          onChange={e => setRcpAtcCode(e.target.value)}
                          className="form-input text-xs w-full font-mono uppercase" 
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase font-extrabold">Narration Remarks</label>
                    <textarea 
                      rows={2} 
                      placeholder="Settlement for balance operational receipts..." 
                      value={rcpDesc} 
                      onChange={e => setRcpDesc(e.target.value)}
                      className="form-input text-xs w-full" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Confirm Collection receipt
                  </button>
                </form>
              )}

              {/* Replace Provisional Receipt with Official Receipt UI form */}
              <div className="bg-slate-50 dark:bg-slate-900 border p-4 rounded-xl">
                <span className="text-xs font-black text-indigo-700 uppercase tracking-wider block mb-1">Replace Provisional (PR) with Official Receipt (OR)</span>
                <p className="text-[11px] text-slate-500 mb-3">Converts audit-only provisional advances to official booked sales invoices receipts.</p>
                
                <form onSubmit={handleReplaceProvisional} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Select Provisional Receipt</label>
                    <select 
                      value={provisionalToReplaceId} 
                      onChange={e => setProvisionalToReplaceId(e.target.value)}
                      className="form-select text-xs w-full"
                    >
                      <option value="">-- Choose Active PR --</option>
                      {receipts.filter(r => r.receiptType === 'Provisional' && r.status === 'Active').map(r => (
                        <option key={r.id} value={r.id}>
                          PR #{r.receiptNo} - {r.buyerName} (₱{r.amount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">New Official Receipt Number (OR)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="OR-99120" 
                      value={replacementOfficialNo} 
                      onChange={e => setReplacementOfficialNo(e.target.value)}
                      className="form-input text-xs w-full" 
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={!provisionalToReplaceId || !replacementOfficialNo}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                  >
                    Convert to Official Receipt
                  </button>
                </form>
              </div>

              {/* Receipts registry table */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Logged Collections Receipts Repository</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Receipt Info / Type</th>
                      <th className="p-3 text-center">Date</th>
                      <th className="p-3">Customer Buyer</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3 text-right">Net Collection Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(rcp => (
                      <tr key={rcp.id} className="hover:bg-slate-50 border-b text-[11px] transition">
                        <td className="p-3">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold mr-2 ${
                            rcp.receiptType === 'Official' ? 'bg-emerald-50 text-emerald-700' : rcp.receiptType === 'Collection' ? 'bg-blue-50 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {rcp.receiptType}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{rcp.receiptNo}</span>
                          {rcp.invoiceId && (
                            <p className="text-[9.5px] text-indigo-600 mt-1">Invoice ID: #{sales.find(s => String(s.id) === rcp.invoiceId)?.ref || rcp.invoiceId}</p>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{rcp.date}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {rcp.buyerName}
                          {rcp.buyerTin && <p className="text-[9.5px] font-mono text-slate-400">TIN: {rcp.buyerTin}</p>}
                        </td>
                        <td className="p-3">
                          {rcp.paymentMethod}
                          {rcp.checkNo && <p className="text-[9.5px] text-slate-400">Chk: {rcp.checkNo} Bank: {rcp.bankName}</p>}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₱{rcp.amount.toLocaleString()}
                          {rcp.twasAmount && (
                            <p className="text-[9px] text-orange-600">Withheld Form 2307: -₱{rcp.twasAmount.toLocaleString()}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            rcp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : rcp.status === 'Replaced' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {rcp.status}
                          </span>
                        </td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <button
                            onClick={() => setPrintReceiptVoucher(rcp)}
                            title="Print Voucher"
                            className="p-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(rcp.id)}
                            title="Delete permanently"
                            className="p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {receipts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No receipts booked. Generate one above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: DEPOSIT SLIP PREPARATION & PRINTING */}
          {activeTab === 'deposits' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border gap-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Deposit Slip Preparation Engine</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Combine cash collections and clearing check items into formatted bank deposit slip vouchers.</p>
                </div>
                <button
                  onClick={() => setShowDepositForm(!showDepositForm)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Prepare Deposit Slip
                </button>
              </div>

              {/* Deposit Slip build form */}
              {showDepositForm && (
                <form onSubmit={handleAddDepositSlip} className="bg-slate-50 dark:bg-slate-900/50 border p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-extrabold text-xs uppercase text-slate-700">Bank Deposit Slip Builder</span>
                    <button type="button" onClick={() => setShowDepositForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Target Account Bank</label>
                      <select 
                        value={depBankName} 
                        onChange={e => setDepBankName(e.target.value)}
                        className="form-select text-xs w-full"
                      >
                        <option value="BDO Savings Account">BDO Savings Account (PHP - Main Vault)</option>
                        <option value="BPI Savings Account">BPI Savings Account (PHP - Corporate float)</option>
                        <option value="Metrobank Corporate Savings">Metrobank Corporate Savings (PHP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Account Number</label>
                      <input 
                        required 
                        type="text" 
                        value={depAccountNo} 
                        onChange={e => setDepAccountNo(e.target.value)}
                        className="form-input text-xs w-full font-mono" 
                      />
                    </div>
                  </div>

                  {/* Multi selector for pending unassigned cash / check receipts */}
                  <div>
                    <label className="text-[10.5px] font-extrabold text-slate-600 block mb-2 uppercase">Select cash / check receipts to clear and deposit</label>
                    <div className="border rounded-xl max-h-[160px] overflow-y-auto divide-y">
                      {receipts.filter(r => r.status === 'Active' && r.paymentMethod !== 'Bank Transfer').map(r => {
                        const isSelected = selectedReceiptIdsForDeposit.includes(r.id);
                        return (
                          <div 
                            key={r.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedReceiptIdsForDeposit(prev => prev.filter(id => id !== r.id));
                              } else {
                                setSelectedReceiptIdsForDeposit(prev => [...prev, r.id]);
                              }
                            }}
                            className={`p-2.5 flex justify-between items-center cursor-pointer transition text-[11px] ${
                              isSelected ? 'bg-blue-50 dark:bg-slate-800' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly 
                                className="rounded text-blue-600" 
                              />
                              <div>
                                <span className="font-bold">Receipt #{r.receiptNo}</span>
                                <p className="text-[9.5px] text-slate-400">{r.buyerName} ({r.paymentMethod})</p>
                              </div>
                            </div>
                            <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">₱{r.amount.toLocaleString()}</span>
                          </div>
                        );
                      })}
                      {receipts.filter(r => r.status === 'Active' && r.paymentMethod !== 'Bank Transfer').length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-xs italic">No pending cash or check float receipts left to deposit in vault!</div>
                      )}
                    </div>
                  </div>

                  {/* Cash denominations input to structure cash breakdown */}
                  {selectedReceiptIdsForDeposit.some(id => receipts.find(r => r.id === id)?.paymentMethod === 'Cash') && (
                    <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border">
                      <span className="text-[10px] font-extrabold text-slate-600 uppercase block mb-3">Cash Denominations Breakdown</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱1,000 Bill Qty</label>
                          <input type="number" placeholder="0" value={den1000} onChange={e => setDen1000(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱500 Bill Qty</label>
                          <input type="number" placeholder="0" value={den500} onChange={e => setDen500(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱200 Bill Qty</label>
                          <input type="number" placeholder="0" value={den200} onChange={e => setDen200(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱100 Bill Qty</label>
                          <input type="number" placeholder="0" value={den100} onChange={e => setDen100(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱50 Bill Qty</label>
                          <input type="number" placeholder="0" value={den50} onChange={e => setDen50(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">₱20 Bill Qty</label>
                          <input type="number" placeholder="0" value={den20} onChange={e => setDen20(e.target.value)} className="form-input text-xs w-full text-center" />
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                  >
                    Post Prepared Deposit Slip
                  </button>
                </form>
              )}

              {/* Deposit Slips table history */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Generated Deposit Slip records</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Reference / Slip date</th>
                      <th className="p-3">Deposit Bank Acc No</th>
                      <th className="p-3 text-right">Cash deposited</th>
                      <th className="p-3 text-right">Checks deposited</th>
                      <th className="p-3 text-right font-bold">Total Deposit Slip value</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositSlips.map(slip => (
                      <tr key={slip.id} className="hover:bg-slate-50 border-b text-[11px] transition">
                        <td className="p-3">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">Deposit - {slip.date}</span>
                          <p className="text-[9px] text-slate-400 font-mono">ID: {slip.id.slice(0, 8)}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-850">
                          {slip.bankName}
                          <p className="text-[9.5px] font-mono text-slate-400">Acc: {slip.accountNo}</p>
                        </td>
                        <td className="p-3 text-right font-mono">₱{slip.cashAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">₱{slip.checksAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-indigo-700">₱{slip.totalAmount.toLocaleString()}</td>
                        <td className="p-3 text-center flex justify-center gap-1.5">
                          <button
                            onClick={() => setPrintDepositSlip(slip)}
                            title="Print Bank Slip"
                            className="p-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeposit(slip.id)}
                            title="Delete"
                            className="p-1.5 bg-rose-50 border hover:bg-rose-100 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {depositSlips.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No deposit slips compiled yet. Build one above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 4: DEBIT AND CREDIT MEMOS */}
          {activeTab === 'memos' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border gap-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Debit & Credit Memos (DCM)</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Issue Credit notes for sales returns/discounts, or Debit memos to adjust pricing / penalties.</p>
                </div>
                <button
                  onClick={() => setShowMemoForm(!showMemoForm)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Prep Customer Memo
                </button>
              </div>

              {/* Memo issuing form */}
              {showMemoForm && (
                <form onSubmit={handleAddMemo} className="bg-slate-50 dark:bg-slate-900/50 border p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-extrabold text-xs uppercase text-slate-700">Customer Memo Generator</span>
                    <button type="button" onClick={() => setShowMemoForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Adjustment Type</label>
                      <select 
                        value={memoType} 
                        onChange={e => setMemoType(e.target.value as any)}
                        className="form-select text-xs w-full"
                      >
                        <option value="Credit">Credit Note (Reduces A/R Outstanding)</option>
                        <option value="Debit">Debit Note (Increases A/R Outstanding)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Select Customer Invoice</label>
                      <select 
                        value={memoInvoiceId} 
                        onChange={e => setMemoInvoiceId(e.target.value)}
                        className="form-select text-xs w-full"
                      >
                        <option value="">-- Choose Invoice to adjust --</option>
                        {sales.map(s => (
                          <option key={s.id} value={s.id}>
                            INV #{s.ref || s.id} - {s.buyerName} (Outstanding: ₱{getInvoiceBalance(s).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Adjustment value amount (₱)</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="0.00" 
                        value={memoAmount} 
                        onChange={e => setMemoAmount(e.target.value)}
                        className="form-input text-xs w-full font-mono" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase font-extrabold">Justification of Adjustment</label>
                    <textarea 
                      required 
                      rows={2} 
                      placeholder="Returned defective office supplies, bulk discount credit etc..." 
                      value={memoReason} 
                      onChange={e => setMemoReason(e.target.value)}
                      className="form-input text-xs w-full" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl"
                  >
                    Authorize Memo Adjustment
                  </button>
                </form>
              )}

              {/* Memos list registry tab */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Active Customer Adjustments memos</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Memo ID Date</th>
                      <th className="p-3">Recipient Customer</th>
                      <th className="p-3">Reference target invoice</th>
                      <th className="p-3 text-right">Adjustment Amount</th>
                      <th className="p-3">Reason / Justification</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerMemos.map(memo => {
                      const matchedInv = sales.find(s => String(s.id) === memo.invoiceId);
                      return (
                        <tr key={memo.id} className="hover:bg-slate-50 border-b text-[11px] transition">
                          <td className="p-3">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold mr-2 ${
                              memo.type === 'Credit' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {memo.type}
                            </span>
                            <span className="font-mono text-slate-500">{memo.date}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {matchedInv ? matchedInv.buyerName : 'Unknown Customer'}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            INV ID #{matchedInv ? (matchedInv.ref || matchedInv.id) : memo.invoiceId}
                          </td>
                          <td className={`p-3 text-right font-mono font-black ${memo.type === 'Credit' ? 'text-indigo-600' : 'text-rose-600'}`}>
                            {memo.type === 'Credit' ? '-' : '+'}₱{memo.amount.toLocaleString()}
                          </td>
                          <td className="p-3 max-w-[140px] truncate text-slate-400" title={memo.reason}>{memo.reason}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteMemo(memo.id)}
                              className="p-1.5 bg-rose-50 border hover:bg-rose-100 rounded-lg text-rose-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {customerMemos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No Debit/Credit Memos issued yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 5: RETURNED CHECK PROCESSING */}
          {activeTab === 'returns' && (
            <div className="flex flex-col gap-6">
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 p-4 rounded-xl">
                <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Returned / Bounced check clearing operations (NSF)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">If a customer's payment check bounces, mark it below to automatically flag its cash receipt as Returned, subtract the credit inflow from ledger cash books, and alert dunning departments.</p>
              </div>

              {/* Bounced check form */}
              <div className="bg-slate-50 dark:bg-slate-900 border p-5 rounded-2xl">
                <span className="text-xs font-extrabold text-slate-700 uppercase block mb-3">Bounce Receipt Check Form</span>
                <form onSubmit={handleBounceCheck} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Select Active Check Collection</label>
                    <select 
                      value={bounceCheckReceiptId} 
                      onChange={e => setBounceCheckReceiptId(e.target.value)}
                      className="form-select text-xs w-full"
                    >
                      <option value="">-- Choose Check receipt --</option>
                      {receipts.filter(r => r.paymentMethod === 'Check' && r.status === 'Active').map(r => (
                        <option key={r.id} value={r.id}>
                          Receipt #{r.receiptNo} - {r.buyerName} (₱{r.amount.toLocaleString()} - Check: {r.checkNo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Drawee rejection reason</label>
                    <input 
                      type="text" 
                      value={bounceReason} 
                      onChange={e => setBounceReason(e.target.value)}
                      className="form-input text-xs w-full" 
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={!bounceCheckReceiptId}
                    className="py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                  >
                    Flag Returned & Re-open A/R
                  </button>
                </form>
              </div>

              {/* List of returned bounces */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-rose-50 dark:bg-slate-800 border-b">
                  <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300">Returned Checks register reports</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Orig Voucher Info</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Check No / Bank</th>
                      <th className="p-3 text-right">Deducted Amount</th>
                      <th className="p-3">Clearance status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.filter(r => r.status === 'Returned').map(rcp => (
                      <tr key={rcp.id} className="bg-rose-50/20 border-b text-[11px]">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200"># {rcp.receiptNo}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{rcp.buyerName}</td>
                        <td className="p-3">CK #{rcp.checkNo || 'N/A'} - {rcp.bankName}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">-₱{rcp.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-rose-100 text-rose-700">NSF RETURNED</span>
                        </td>
                      </tr>
                    ))}
                    {receipts.filter(r => r.status === 'Returned').length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No check returns or bounced events registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 6: CUSTOMER ADVANCES & DEPOSITS */}
          {activeTab === 'customer_deposits' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border gap-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Customer Deposits & Advances</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Record downpayment / advance collections, and let accountants apply them onto customer sales invoices later.</p>
                </div>
                <button
                  onClick={() => setShowCustDepForm(!showCustDepForm)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Book Advance Downpayment
                </button>
              </div>

              {/* Downpayment advance form */}
              {showCustDepForm && (
                <form onSubmit={handleAddCustomerDeposit} className="bg-slate-50 dark:bg-slate-900/50 border p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="font-extrabold text-xs uppercase text-slate-700">Receive Advance Payment Float</span>
                    <button type="button" onClick={() => setShowCustDepForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Inflow Date</label>
                      <input type="date" value={custDepDate} onChange={e => setCustDepDate(e.target.value)} className="form-input text-xs w-full" />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Purchaser Customer</label>
                      <input type="text" required placeholder="ACME Company" value={custDepName} onChange={e => setCustDepName(e.target.value)} className="form-input text-xs w-full" />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Company TIN</label>
                      <input type="text" placeholder="000-000-000" value={custDepTin} onChange={e => setCustDepTin(formatTIN(e.target.value))} className="form-input text-xs w-full font-mono" maxLength={11} />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Sum Deposited (₱)</label>
                      <input type="number" required placeholder="0.00" value={custDepAmount} onChange={e => setCustDepAmount(e.target.value)} className="form-input text-xs w-full font-mono" />
                    </div>
                  </div>

                  <button type="submit" className="py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow">
                    Book Advance Downpayment
                  </button>
                </form>
              )}

              {/* Advances table list with Application drop down tools for each unapplied prepayments */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Registered Prepayments registry logs</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Downpayment Date</th>
                      <th className="p-3">Depositor Customer Name</th>
                      <th className="p-3">TIN Info</th>
                      <th className="p-3 text-right">Advance Amount (₱)</th>
                      <th className="p-3 text-center">Receipt Mapping status</th>
                      <th className="p-3 text-right">Authorized Account Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDeposits.map(dep => (
                      <tr key={dep.id} className="hover:bg-slate-50 border-b text-[11px] transition">
                        <td className="p-3 font-mono text-slate-500">{dep.date}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{dep.customerName}</td>
                        <td className="p-3 font-mono text-slate-400">{dep.customerTin}</td>
                        <td className="p-3 text-right font-mono font-black text-teal-600">₱{dep.amount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            dep.status === 'Applied' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700 animate-pulse'
                          }`}>
                            {dep.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {dep.status === 'Unapplied' ? (
                            <div className="flex gap-1 justify-end">
                              <select 
                                onChange={e => {
                                  if (e.target.value) {
                                    handleApplyDepositToInvoice(dep.id, parseInt(e.target.value));
                                  }
                                }}
                                className="form-select text-[10px] py-1 max-w-[130px] font-bold"
                              >
                                <option value="">-- Apply to open Invoice --</option>
                                {sales.filter(s => getInvoiceBalance(s) > 0).map(s => (
                                  <option key={s.id} value={s.id}>
                                    INV #{s.ref || s.id} - (₱{getInvoiceBalance(s).toLocaleString()})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">
                              Applied ref Invoice #{sales.find(s => String(s.id) === dep.appliedSaleId)?.ref || dep.appliedSaleId}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {customerDeposits.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No customer downpayments or float deposits on file.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 7: AGE ANALYSIS OF OUTSTANDING RECEIVABLES (USER DEFINED TIMELINES) */}
          {activeTab === 'aging' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900 border p-4 rounded-xl flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest block mb-1">Multi-Bucket Accounts Receivable aging report configuration</h4>
                  <p className="text-[11px] text-slate-500">Configure customizable aging buckets. Adjust days ranges parameters dynamically below.</p>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl border">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bucket 1 (Days)</label>
                    <input type="number" value={agingPeriod1} onChange={e => setAgingPeriod1(parseInt(e.target.value) || 30)} className="w-14 text-center form-input text-xs py-1 font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bucket 2 (Days)</label>
                    <input type="number" value={agingPeriod2} onChange={e => setAgingPeriod2(parseInt(e.target.value) || 60)} className="w-14 text-center form-input text-xs py-1 font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bucket 3 (Days)</label>
                    <input type="number" value={agingPeriod3} onChange={e => setAgingPeriod3(parseInt(e.target.value) || 90)} className="w-14 text-center form-input text-xs py-1 font-mono" />
                  </div>
                </div>
              </div>

              {/* Aging report output card */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Aging Schedule of Outstanding Receivables (Past due timeline)</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Standard Accounts aging format</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Customer Buyer Corporation</th>
                      <th className="p-3">TIN Info</th>
                      <th className="p-3 text-right">Current (&le; {agingPeriod1} days)</th>
                      <th className="p-3 text-right">Overdue ({agingPeriod1 + 1}-{agingPeriod2} days)</th>
                      <th className="p-3 text-right">Overdue ({agingPeriod2 + 1}-{agingPeriod3} days)</th>
                      <th className="p-3 text-right">Overdue (&gt; {agingPeriod3} days)</th>
                      <th className="p-3 text-right font-black">Total Outstanding balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerAgingData.map(c => (
                      <tr key={c.customerName} className="hover:bg-slate-50 border-b text-[11px] transition">
                        <td className="p-3 font-bold text-slate-850 dark:text-slate-200">{c.customerName}</td>
                        <td className="p-3 font-mono text-slate-400">{c.tin}</td>
                        <td className="p-3 text-right font-mono">₱{c.current.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-amber-500">₱{c.bucket1.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-amber-600">₱{c.bucket2.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-rose-600 font-bold">₱{c.older.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-indigo-700">₱{c.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {customerAgingData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No customer outstanding invoice debts to age analysis.</td>
                      </tr>
                    )}
                  </tbody>
                  {customerAgingData.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                      <tr className="font-mono text-[11px]">
                        <td colSpan={2} className="p-3 text-right font-sans font-bold">Overall Totals:</td>
                        <td className="p-3 text-right text-slate-600">₱{customerAgingData.reduce((s, c) => s + c.current, 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-amber-550">₱{customerAgingData.reduce((s, c) => s + c.bucket1, 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-amber-650">₱{customerAgingData.reduce((s, c) => s + c.bucket2, 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-rose-600">₱{customerAgingData.reduce((s, c) => s + c.older, 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-indigo-700 text-xs">₱{customerAgingData.reduce((s, c) => s + c.total, 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

            </div>
          )}

          {/* TAB 8: CUSTOMER STATEMENTS & DUNNING */}
          {activeTab === 'statements' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900 border p-4 rounded-xl flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <label className="text-[10px] font-extrabold text-indigo-700 uppercase">Select Target account client statement</label>
                  <select 
                    value={selectedStatementCustomer} 
                    onChange={e => setSelectedStatementCustomer(e.target.value)}
                    className="form-select text-xs w-full"
                  >
                    <option value="">-- Choose Customer Accounts --</option>
                    {[...new Set(sales.map(s => s.buyerName))].map(cust => (
                      <option key={cust} value={cust}>{cust}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-2/3 md:flex-row items-end gap-3 justify-end">
                  <div className="w-full md:w-52">
                    <label className="text-[10px] font-extrabold text-indigo-700 uppercase">Notice Severity of collections letter</label>
                    <select 
                      value={dunningLevel} 
                      onChange={e => setDunningLevel(e.target.value as any)}
                      className="form-select text-xs w-full"
                    >
                      <option value="Friendly">Level 1 - Friendly Letter Reminder</option>
                      <option value="Medium">Level 2 - General Demand Past Due Notice</option>
                      <option value="Urgent">Level 3 - Urgent Warning Action Escalation</option>
                    </select>
                  </div>
                  {selectedStatementCustomer && (
                    <button
                      onClick={() => setPrintStatementCustomer(selectedStatementCustomer)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                    >
                      <Printer className="w-4 h-4" /> Print Customer Statement
                    </button>
                  )}
                </div>
              </div>

              {/* Render dynamic statement profile */}
              {selectedStatementCustomer ? (
                <div className="border rounded-2xl p-6 bg-slate-50/50 flex flex-col gap-6 border-slate-205">
                  <div className="flex flex-col sm:flex-row justify-between border-b pb-4">
                    <div>
                      <h4 className="text-base font-black uppercase text-indigo-950">Statement of Customer Account</h4>
                      <p className="text-xs text-slate-400 font-mono mt-1">Generated: {rcpDate}</p>
                    </div>
                    <div className="text-left sm:text-right mt-3 sm:mt-0">
                      <span className="text-xs text-slate-500">Withholding tax records matches:</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedStatementCustomer}</p>
                    </div>
                  </div>

                  {/* Customer transaction entries log table matches */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Ledger Cards Transactions matched</span>
                    
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-850 text-slate-600 font-bold border-b text-[10.5px]">
                          <th className="p-2.5">Transaction Date</th>
                          <th className="p-2.5 font-mono">Reference NO</th>
                          <th className="p-2.5">Particulars Remarks</th>
                          <th className="p-2.5 text-right">Debit Charge (₱)</th>
                          <th className="p-2.5 text-right">Credit Payment (₱)</th>
                          <th className="p-2.5 text-right">Sum balance (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Compute step by step balance run card */}
                        {(() => {
                          const customerSales = sales.filter(s => s.buyerName === selectedStatementCustomer);
                          const customerReceipts = receipts.filter(r => r.buyerName === selectedStatementCustomer);
                          
                          // Merge into chronological timeline
                          const timeline: Array<{
                            date: string;
                            ref: string;
                            particulars: string;
                            debit: number;
                            credit: number;
                          }> = [];

                          customerSales.forEach(s => {
                            timeline.push({
                              date: s.date,
                              ref: s.ref || String(s.id),
                              particulars: `Sales invoice billed: ${s.desc || ''}`,
                              debit: s.amount,
                              credit: 0
                            });
                          });

                          customerReceipts.forEach(r => {
                            timeline.push({
                              date: r.date,
                              ref: r.receiptNo,
                              particulars: `Cash collection received: ${r.desc || ''} [${r.status}]`,
                              debit: 0,
                              credit: r.status === 'Active' ? r.amount + (r.twasAmount || 0) : 0
                            });
                          });

                          // Sort chronologically
                          timeline.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                          let runningBal = 0;
                          return timeline.map((itm, idx) => {
                            runningBal += itm.debit - itm.credit;
                            return (
                              <tr key={idx} className="hover:bg-slate-100 border-b text-[11px]">
                                <td className="p-2.5 text-slate-500 font-mono">{itm.date}</td>
                                <td className="p-2.5 font-mono text-slate-600">{itm.ref}</td>
                                <td className="p-2.5 text-slate-700">{itm.particulars}</td>
                                <td className="p-2.5 text-right font-mono text-rose-600">{itm.debit > 0 ? `₱${itm.debit.toLocaleString()}` : '—'}</td>
                                <td className="p-2.5 text-right font-mono text-emerald-600">{itm.credit > 0 ? `₱${itm.credit.toLocaleString()}` : '—'}</td>
                                <td className="p-2.5 text-right font-mono font-black text-slate-900">₱{runningBal.toLocaleString()}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Dunning Letter Box */}
                  <div className="bg-amber-50 dark:bg-slate-900/40 p-4 rounded-xl border border-amber-150">
                    <span className="text-[10px] font-extrabold text-amber-700 block mb-1 uppercase tracking-wider flex items-center gap-1.5 font-black">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      Automatic collections escalation notice appendix (BIR dunning)
                    </span>
                    <pre className="text-xs font-sans text-slate-700 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-wrap">{getDunningMessage(dunningLevel)}</pre>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border rounded-2xl bg-slate-50 italic">Please select a customer profile to view and generate their statements of account statement cards.</div>
              )}

            </div>
          )}

          {/* TAB 9: TAX WITHHELD AT SOURCE (TWAS) PROCESSING */}
          {activeTab === 'twas' && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-400 uppercase mb-1">Tax Withheld at Source (TWAS) 2307 register</h4>
                <p className="text-xs text-slate-500">Track creditable withholding taxes deducted by your corporate buyers. This log registers ATC codes, base taxable values, and serves as an audit path to generate quarterly income taxes credits.</p>
              </div>

              {/* TWAS Registry details */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow">
                <div className="p-3.5 bg-slate-50 border-b">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">BIR Form 2307 Tax Withholding Ledger</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-850 border-b text-[10.5px]">
                      <th className="p-3">Calculation date</th>
                      <th className="p-3">Withholding Taxpayer Customer</th>
                      <th className="p-3">Receipt Document Ref</th>
                      <th className="p-3 text-center">ATC Code</th>
                      <th className="p-3 text-right">Tax Rate %</th>
                      <th className="p-3 text-right font-black">Tax Withheld amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.filter(r => r.status === 'Active' && r.twasAmount && r.twasAmount > 0).map(rcp => (
                      <tr key={rcp.id} className="hover:bg-slate-50 border-b text-[11px] transition">
                        <td className="p-3 font-mono text-slate-500">{rcp.date}</td>
                        <td className="p-3 font-extrabold text-slate-850 dark:text-slate-200">{rcp.buyerName}</td>
                        <td className="p-3 font-mono text-indigo-600">OR #{rcp.receiptNo}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600">{rcp.atcCode || 'WC160'}</td>
                        <td className="p-3 text-right font-mono text-slate-500">{rcp.twasRate ? `${rcp.twasRate * 100}%` : 'N/A'}</td>
                        <td className="p-3 text-right font-mono font-black text-orange-600">₱{rcp.twasAmount?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {receipts.filter(r => r.status === 'Active' && r.twasAmount && r.twasAmount > 0).length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No withholding tax credit vouchers (Form 2307) on file. Select WHT rates on receipts.</td>
                      </tr>
                    )}
                  </tbody>
                  {receipts.filter(r => r.status === 'Active' && r.twasAmount && r.twasAmount > 0).length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                      <tr className="font-mono text-[11.5px]">
                        <td colSpan={5} className="p-3 text-right font-sans">Total Creditable Taxes assets:</td>
                        <td className="p-3 text-right text-orange-600 font-extrabold">
                          ₱{receipts.filter(r => r.status === 'Active' && r.twasAmount).reduce((sum, r) => sum + (r.twasAmount || 0), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- PRINT OVERLAYS --- */}

      {/* 1. PRINT RECEIPT VOUCHER */}
      {printReceiptVoucher && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 font-mono border flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="text-center font-black pb-4 border-b">
              <h3 className="text-sm font-extrabold text-indigo-900 tracking-wider">OFFICIAL TRANSACTION RECEIPT</h3>
              <p className="text-[10px] text-slate-500">COGNIZANT ACCOUNTING SYSTEMS PHILIPPINES</p>
            </div>

            <div className="text-xs flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="font-extrabold">{printReceiptVoucher.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Receipt Level:</span>
                <span className="font-bold uppercase">{printReceiptVoucher.receiptType}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Date:</span>
                <span>{printReceiptVoucher.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Tracker:</span>
                <span>{printReceiptVoucher.status}</span>
              </div>

              <div className="border-t my-2 pt-2"></div>

              <div className="flex justify-between">
                <span>Acquiring Customer Buyer:</span>
                <span className="font-bold">{printReceiptVoucher.buyerName}</span>
              </div>
              {printReceiptVoucher.buyerTin && (
                <div className="flex justify-between">
                  <span>Buyer TIN:</span>
                  <span>{printReceiptVoucher.buyerTin}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Fund Settlement Route:</span>
                <span>{printReceiptVoucher.paymentMethod}</span>
              </div>

              {printReceiptVoucher.checkNo && (
                <div className="flex justify-between">
                  <span>Check No / Drawee Bank:</span>
                  <span>{printReceiptVoucher.checkNo} / {printReceiptVoucher.bankName}</span>
                </div>
              )}

              <div className="border-t my-2 pt-2"></div>

              {printReceiptVoucher.twasAmount && (
                <>
                  <div className="flex justify-between font-mono">
                    <span>Base Taxable Valuation:</span>
                    <span>₱{((printReceiptVoucher.amount) / (1 - (printReceiptVoucher.twasRate || 0))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono text-orange-600">
                    <span>Tax Withheld (BIR 2307 Atc {printReceiptVoucher.atcCode || 'WC160'}):</span>
                    <span>-₱{printReceiptVoucher.twasAmount.toLocaleString()}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between font-mono font-black text-indigo-800 text-sm mt-2">
                <span>Net Collections received:</span>
                <span>₱{printReceiptVoucher.amount.toLocaleString()} PHP</span>
              </div>

              {printReceiptVoucher.desc && (
                <div className="bg-slate-100 p-2.5 rounded text-[10px] mt-2">
                  <span className="font-extrabold block uppercase">Details Remarks:</span>
                  <p>{printReceiptVoucher.desc}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t mt-auto">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
              >
                Send to Printer Device
              </button>
              <button
                onClick={() => setPrintReceiptVoucher(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRINT DEPOSIT SLIP */}
      {printDepositSlip && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-yellow-50 text-slate-900 rounded-2xl max-w-lg w-full p-6 font-mono border-2 border-yellow-250 flex flex-col gap-4 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="text-center pb-4 border-b border-slate-300">
              <h3 className="text-sm font-extrabold text-blue-900 tracking-wider">BANK CLEARING DEPOSIT SLIP</h3>
              <p className="text-[10px] text-slate-500">{printDepositSlip.bankName}</p>
            </div>

            <div className="text-xs flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Deposit Date:</span>
                <span className="font-bold">{printDepositSlip.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Account No:</span>
                <span className="font-bold font-mono">{printDepositSlip.accountNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Account Name:</span>
                <span className="font-bold">{printDepositSlip.accountName}</span>
              </div>

              <div className="border-t my-2 border-slate-300"></div>

              {/* Cash Denominations table */}
              {printDepositSlip.cashAmount > 0 && printDepositSlip.cashDenominations && (
                <div className="flex flex-col gap-1 bg-yellow-100/60 p-2.5 rounded border border-yellow-200">
                  <span className="text-[9.5px] font-black uppercase text-blue-900 block mb-1">Cash Bills breakdown</span>
                  {Object.entries(printDepositSlip.cashDenominations).map(([denom, qty]) => {
                    const count = qty as number;
                    if (count <= 0) return null;
                    return (
                      <div key={denom} className="flex justify-between text-[11px]">
                        <span>₱{denom} bill x {qty}:</span>
                        <span>₱{(parseInt(denom) * count).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-black border-t pt-1 border-yellow-300 mt-1">
                    <span>Cash total:</span>
                    <span>₱{printDepositSlip.cashAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Checks collection table inside deposit slip */}
              {printDepositSlip.checksAmount > 0 && printDepositSlip.checkDetails && (
                <div className="flex flex-col gap-1 bg-yellow-100/60 p-2.5 rounded border border-yellow-200 mt-2">
                  <span className="text-[9.5px] font-black uppercase text-blue-900 block mb-1">Checks breakdown clearing</span>
                  {printDepositSlip.checkDetails.map((chk, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span>Check #{chk.checkNo} ({chk.bank}):</span>
                      <span>₱{chk.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black border-t pt-1 border-yellow-300 mt-1">
                    <span>Checks total:</span>
                    <span>₱{printDepositSlip.checksAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-300 my-2 pt-2"></div>

              <div className="flex justify-between font-mono font-black text-blue-900 text-sm">
                <span>OVERALL TOTAL DEPOSIT:</span>
                <span>₱{printDepositSlip.totalAmount.toLocaleString()} PHP</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-300 mt-auto">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-700 text-white font-bold text-xs rounded-xl"
              >
                Print Slip
              </button>
              <button
                onClick={() => setPrintDepositSlip(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRINT CLIENT STATEMENT RECORD */}
      {printStatementCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 font-mono border flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center font-black pb-4 border-b">
              <h3 className="text-sm font-extrabold text-indigo-900 uppercase">Statement of Outstanding Account Ledger</h3>
              <p className="text-[10px] text-slate-500">PHILIPPINES CORPORATE AUDITING SYSTEM</p>
            </div>

            <div className="text-xs flex flex-col gap-4">
              <div className="grid grid-cols-2">
                <div>
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Creditor Account Issuer:</span>
                  <p className="font-black text-indigo-900">{currentClient.registeredName || currentClient.name}</p>
                  <p className="text-slate-500">RDO Code: {currentClient.rdoCode || '—'}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Debtor Account customer:</span>
                  <p className="font-black text-slate-800">{printStatementCustomer}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-200 mt-2">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b text-[10px]">
                    <th className="p-2">Date</th>
                    <th className="p-2">Doc-Ref</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Debit Balance</th>
                    <th className="p-2 text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const cSales = sales.filter(s => s.buyerName === printStatementCustomer);
                    const cReceipts = receipts.filter(r => r.buyerName === printStatementCustomer);
                    const timelines: Array<{ date: string; ref: string; desc: string; dr: number; cr: number }> = [];

                    cSales.forEach(s => timelines.push({ date: s.date, ref: s.ref || String(s.id), desc: `Invoice: ${s.desc || ''}`, dr: s.amount, cr: 0 }));
                    cReceipts.forEach(r => timelines.push({ date: r.date, ref: r.receiptNo, desc: `Receipt collection [${r.status}]`, dr: 0, cr: r.status === 'Active' ? r.amount + (r.twasAmount || 0) : 0 }));

                    timelines.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    let balance = 0;
                    return timelines.map((item, id) => {
                      balance += item.dr - item.cr;
                      return (
                        <tr key={id} className="border-b text-[11px]">
                          <td className="p-2 font-mono text-slate-500">{item.date}</td>
                          <td className="p-2 font-mono font-bold">{item.ref}</td>
                          <td className="p-2 text-slate-600">{item.desc}</td>
                          <td className="p-2 text-right font-mono text-rose-600">{item.dr > 0 ? `₱${item.dr.toLocaleString()}` : '—'}</td>
                          <td className="p-2 text-right font-mono text-emerald-600">{item.cr > 0 ? `₱${item.cr.toLocaleString()}` : '—'}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              <div className="flex justify-end p-2.5 font-bold border rounded bg-slate-50 text-indigo-950 text-sm mt-2">
                <span>Account Final Balance due: ₱{
                  (() => {
                    const cSales = sales.filter(s => s.buyerName === printStatementCustomer);
                    const totalInvoiceAmount = cSales.reduce((sum, s) => sum + s.amount, 0);
                    const totalReceivedPayments = receipts.filter(r => r.buyerName === printStatementCustomer && r.status === 'Active').reduce((sum, r) => sum + r.amount + (r.twasAmount || 0), 0);
                    const invoiceMemos = customerMemos.filter(m => {
                      const matchedInv = sales.find(s => String(s.id) === m.invoiceId && s.buyerName === printStatementCustomer);
                      return !!matchedInv;
                    });
                    const creditAdjustments = invoiceMemos.filter(m => m.type === 'Credit').reduce((sum, m) => sum + m.amount, 0);
                    const debitAdjustments = invoiceMemos.filter(m => m.type === 'Debit').reduce((sum, m) => sum + m.amount, 0);

                    return Math.max(0, totalInvoiceAmount - totalReceivedPayments - creditAdjustments + debitAdjustments);
                  })().toLocaleString()
                } PHP</span>
              </div>

              {/* Dunning letter print */}
              <div className="bg-slate-100 p-4 rounded border font-sans text-[11.5px] mt-2 block">
                <span className="font-extrabold uppercase text-[10px] tracking-wider block mb-1 text-slate-500 font-mono">Dun Statement Escalation Note:</span>
                <p className="leading-relaxed font-semibold">{getDunningMessage(dunningLevel)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t mt-auto">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
              >
                Print Statement Note
              </button>
              <button
                onClick={() => setPrintStatementCustomer(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </Modal>
  );
}
