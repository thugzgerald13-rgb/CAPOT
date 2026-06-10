import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { InvoicePayable, CashDisbursementDetail, AdvanceToSupplier, DebitCreditMemo } from '../../types';
import { formatTIN, MONTHS } from '../../lib/utils';
import { DEFAULT_ACCOUNTS } from './ChartOfAccountsModal';
import { 
  CreditCard, Wallet, Printer, Plus, Trash2, ShieldAlert, 
  CheckCircle, AlertTriangle, Play, Pause, RefreshCw, 
  TrendingDown, FileText, ArrowRightLeft, Landmark, Percent
} from 'lucide-react';

export function PayablesDisbursementsModal() {
  const { currentClient, currentClientId, saveClient, showToast, activeModal, openModal } = useAccounting();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'payables' | 'disbursements' | 'advances' | 'memos' | 'aging' | 'bir'>('dashboard');

  // --- Initial Data Defaults ---
  const payables: InvoicePayable[] = currentClient?.payables || [];
  const disbursements: CashDisbursementDetail[] = currentClient?.disbursements || [];
  const advances: AdvanceToSupplier[] = currentClient?.advances || [];
  const memos: DebitCreditMemo[] = currentClient?.memos || [];
  const bankBalance = currentClient?.bankBalance ?? 500000;

  // Chart of accounts for debits
  const coaAccounts = currentClient?.accounts || DEFAULT_ACCOUNTS;

  // Form states
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [payableInvoiceNo, setPayableInvoiceNo] = useState('');
  const [payablePoNo, setPayablePoNo] = useState('');
  const [payableRrNo, setPayableRrNo] = useState('');
  const [payableDate, setPayableDate] = useState(new Date().toISOString().split('T')[0]);
  const [payableDueDate, setPayableDueDate] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [poQty, setPoQty] = useState('0');
  const [poUnitPrice, setPoUnitPrice] = useState('0');
  const [rrQty, setRrQty] = useState('0');
  const [rrUnitPrice, setRrUnitPrice] = useState('0');
  const [viQty, setViQty] = useState('0');
  const [viUnitPrice, setViUnitPrice] = useState('0');
  const [whtRate, setWhtRate] = useState('0.02'); // defaults to 2%
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');

  // Disbursement Form states
  const [showDisForm, setShowDisForm] = useState(false);
  const [disType, setDisType] = useState<'Invoice' | 'Miscellaneous' | 'Advance'>('Invoice');
  const [disDate, setDisDate] = useState(new Date().toISOString().split('T')[0]);
  const [disVoucherNo, setDisVoucherNo] = useState('');
  const [disCheckNo, setDisCheckNo] = useState('');
  const [disBankName, setDisBankName] = useState('Land Bank of the Philippines');
  const [disPayee, setDisPayee] = useState('');
  const [disAmount, setDisAmount] = useState('0');
  const [disAccountTitle, setDisAccountTitle] = useState('Accounts Payable');
  const [disParticulars, setDisParticulars] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  // Advances Form
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [advSupplier, setAdvSupplier] = useState('');
  const [advSupplierTin, setAdvSupplierTin] = useState('');
  const [advBank, setAdvBank] = useState('Land Bank of the Philippines');
  const [advCheckNo, setAdvCheckNo] = useState('');
  const [advAmount, setAdvAmount] = useState('0');

  // Memo Form
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [memoType, setMemoType] = useState<'Debit' | 'Credit'>('Debit');
  const [memoInvoiceId, setMemoInvoiceId] = useState('');
  const [memoAmount, setMemoAmount] = useState('0');
  const [memoReason, setMemoReason] = useState('');

  // Printing Overlay or Voucher Views
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<CashDisbursementDetail | null>(null);
  const [reversingVoucher, setReversingVoucher] = useState<CashDisbursementDetail | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // BIR Form view states
  const [birVendorId, setBirVendorId] = useState('');
  const [birQuarter, setBirQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q2');
  const [birYear, setBirYear] = useState('2026');

  // Temporary Balance update state
  const [tempBalance, setTempBalance] = useState(String(bankBalance));
  const [showBalanceEdit, setShowBalanceEdit] = useState(false);

  // Auto-fill due date and vouchers
  useEffect(() => {
    if (payableDate) {
      const d = new Date(payableDate);
      d.setDate(d.getDate() + 30); // Net 30 default
      setPayableDueDate(d.toISOString().split('T')[0]);
    }
  }, [payableDate]);

  useEffect(() => {
    if (disbursements.length > 0) {
      const nextNo = `CV-${2026}-${String(disbursements.length + 1).padStart(4, '0')}`;
      setDisVoucherNo(nextNo);
    } else {
      setDisVoucherNo(`CV-${2026}-0001`);
    }
  }, [disbursements.length, showDisForm]);

  if (!currentClient || activeModal !== 'payables_disbursements') return null;

  // --- Handlers ---
  const handleSaveClientData = async (updatedFields: Partial<typeof currentClient>) => {
    await saveClient(currentClient.id, {
      ...currentClient,
      ...updatedFields
    });
  };

  const handleUpdateBankBalance = async () => {
    const parsed = parseFloat(tempBalance) || 0;
    await handleSaveClientData({ bankBalance: parsed });
    setShowBalanceEdit(false);
    showToast('Bank balance updated successfully');
  };

  const handleAddPayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payableInvoiceNo || !supplierName || !supplierTin) {
      alert('Invoice No, Supplier Name, and Supplier TIN are required.');
      return;
    }

    const pq = parseFloat(poQty) || 0;
    const pp = parseFloat(poUnitPrice) || 0;
    const rq = parseFloat(rrQty) || 0;
    const rp = parseFloat(rrUnitPrice) || 0;
    const vq = parseFloat(viQty) || 0;
    const vp = parseFloat(viUnitPrice) || 0;
    const rate = parseFloat(whtRate) || 0;

    let totalAmount = vq * vp;

    // Apply supplier advance deduction if selected
    if (selectedAdvanceId) {
      const adv = advances.find(a => a.id === selectedAdvanceId);
      if (adv) {
        totalAmount = Math.max(0, totalAmount - adv.amount);
        // Mark advance as applied
        const updatedAdvances = advances.map(a => 
          a.id === selectedAdvanceId ? { ...a, status: 'Applied' as const, appliedInvoiceNo: payableInvoiceNo } : a
        );
        await handleSaveClientData({ advances: updatedAdvances });
      }
    }

    // Determine matching status
    let status: 'Matched' | 'Discrepancy' | 'Pending' = 'Pending';
    let details = '';

    if (pq > 0 && rq > 0 && vq > 0) {
      if (pq === rq && rq === vq && pp === rp && rp === vp) {
        status = 'Matched';
        details = '3-way match complete: PO, RR, and VI quantities and unit prices match perfectly.';
      } else {
        status = 'Discrepancy';
        const issues: string[] = [];
        if (pq !== rq) issues.push(`PO quantity (${pq}) is different from RR received quantity (${rq})`);
        if (rq !== vq) issues.push(`RR quantity (${rq}) is different from VI billed quantity (${vq})`);
        if (pp !== vp) issues.push(`PO unit price (₱${pp}) is different from VI unit price (₱${vp})`);
        details = `Discrepancy alert! ${issues.join('; ')}.`;
      }
    } else {
      details = 'Pending inputs - Ensure PO, RR, and VI have non-zero quantities.';
    }

    const calculatedWht = totalAmount * rate;

    const newPayable: InvoicePayable = {
      id: crypto.randomUUID(),
      invoiceNo: payableInvoiceNo,
      poNo: payablePoNo || 'N/A',
      rrNo: payableRrNo || 'N/A',
      date: payableDate,
      dueDate: payableDueDate,
      supplierTin,
      supplierName,
      supplierAddress: supplierAddress || 'Manila, Philippines',
      poQty: pq,
      poUnitPrice: pp,
      rrQty: rq,
      rrUnitPrice: rp,
      viQty: vq,
      viUnitPrice: vp,
      amount: totalAmount,
      matchingStatus: status,
      matchingDetails: details,
      status: 'Released',
      paymentStatus: 'Unpaid',
      amountPaid: 0,
      whtRate: rate,
      whtAmount: calculatedWht,
      atcCode: rate > 0 ? (rate === 0.01 ? 'WC158' : rate === 0.02 ? 'WC160' : 'WC120') : undefined
    };

    const updatedPayables = [...payables, newPayable];
    await handleSaveClientData({ payables: updatedPayables });
    showToast('Invoice Payable added with 3-way matching calculated.');

    // Auto add supplier to Library
    const exists = currentClient.tinLibrary.suppliers.some(s => s.tin === supplierTin);
    if (!exists) {
      const updatedLibrary = {
        ...currentClient.tinLibrary,
        suppliers: [...currentClient.tinLibrary.suppliers, {
          id: Date.now(),
          tin: supplierTin,
          name: supplierName,
          address: supplierAddress
        }]
      };
      await handleSaveClientData({ tinLibrary: updatedLibrary });
    }

    // Reset Form
    setShowPayableForm(false);
    setPayableInvoiceNo('');
    setPayablePoNo('');
    setPayableRrNo('');
    setPoQty('0');
    setPoUnitPrice('0');
    setRrQty('0');
    setRrUnitPrice('0');
    setViQty('0');
    setViUnitPrice('0');
    setSelectedAdvanceId('');
  };

  const handleToggleHold = async (id: string) => {
    const updated = payables.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'Hold' ? 'Released' : 'Hold';
        return { ...p, status: nextStatus as 'Hold' | 'Released' };
      }
      return p;
    });
    await handleSaveClientData({ payables: updated });
    showToast('Hold status updated successfully.');
  };

  const handleAddDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const grAmount = parseFloat(disAmount) || 0;
    if (grAmount <= 0 && disType !== 'Invoice') {
      alert('Amount must be greater than 0.');
      return;
    }

    let calculatedWht = 0;
    let netCheckAmount = grAmount;
    let finalPayee = disPayee;
    let payeeTin = '';
    let linkInvoice: InvoicePayable | undefined;

    if (disType === 'Invoice') {
      linkInvoice = payables.find(p => p.id === selectedInvoiceId);
      if (!linkInvoice) {
        alert('Please choose an invoice.');
        return;
      }
      if (linkInvoice.status === 'Hold') {
        alert('This invoice is on HOLD. Release it first before disbursement.');
        return;
      }
      const payableBalance = linkInvoice.amount - linkInvoice.amountPaid;
      netCheckAmount = payableBalance - linkInvoice.whtAmount;
      calculatedWht = linkInvoice.whtAmount;
      finalPayee = linkInvoice.supplierName;
      payeeTin = linkInvoice.supplierTin;
    }

    // Sufficiency checking!
    if (bankBalance < netCheckAmount) {
      const confirmProceed = window.confirm(`⚠️ INSUFFICIENT FUNDS IN BANK BALANCE!\n\nCurrent Bank Balance: ₱${bankBalance.toLocaleString()}\nCheck Amount: ₱${netCheckAmount.toLocaleString()}\n\nDo you want to proceed anyway with accountant authorization override?`);
      if (!confirmProceed) return;
    }

    const newDisbursement: CashDisbursementDetail = {
      id: crypto.randomUUID(),
      date: disDate,
      voucherNo: disVoucherNo,
      checkNo: disCheckNo || 'N/A',
      bankName: disBankName,
      payee: finalPayee,
      payeeTin,
      amount: disType === 'Invoice' ? (linkInvoice?.amount || 0) : grAmount,
      whtAmount: calculatedWht,
      netAmountPaid: netCheckAmount,
      accountTitle: disAccountTitle,
      particulars: disParticulars || `Disbursement for ${finalPayee}`,
      payableInvoiceId: linkInvoice?.id,
      type: disType
    };

    // Update bank balance directly
    const nextBalance = bankBalance - netCheckAmount;

    // Save
    const updatedDisbursements = [...disbursements, newDisbursement];
    let updatedPayables = [...payables];

    if (disType === 'Invoice' && linkInvoice) {
      updatedPayables = payables.map(p => 
        p.id === linkInvoice.id ? { ...p, paymentStatus: 'Paid' as const, amountPaid: p.amount } : p
      );
    }

    await handleSaveClientData({
      disbursements: updatedDisbursements,
      payables: updatedPayables,
      bankBalance: nextBalance
    });

    setTempBalance(String(nextBalance));
    showToast('Disbursement transaction logged successfully.');
    setShowDisForm(false);
    setDisCheckNo('');
    setDisAmount('0');
    setDisParticulars('');
  };

  const handleReverseCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingVoucher) return;

    // Apply reversal
    const updatedDis = disbursements.map(d => {
      if (d.id === reversingVoucher.id) {
        return {
          ...d,
          isReversed: true,
          reversalReason: reversalReason || 'Bounced Check/Cancelled',
          reversalDate: new Date().toISOString().split('T')[0]
        };
      }
      return d;
    });

    // Re-instate original bank balance
    const nextBalance = bankBalance + reversingVoucher.netAmountPaid;

    // Revert invoice status to unpaid if matched
    let updatedPayables = [...payables];
    if (reversingVoucher.payableInvoiceId) {
      updatedPayables = payables.map(p => 
        p.id === reversingVoucher.payableInvoiceId ? { ...p, paymentStatus: 'Unpaid' as const, amountPaid: 0 } : p
      );
    }

    await handleSaveClientData({
      disbursements: updatedDis,
      payables: updatedPayables,
      bankBalance: nextBalance
    });

    setTempBalance(String(nextBalance));
    showToast(`Check voucher reversed successfully. ₱${reversingVoucher.netAmountPaid.toLocaleString()} added back to bank.`);
    setReversingVoucher(null);
    setReversalReason('');
  };

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advAmount) || 0;
    if (!advSupplier || amt <= 0) {
      alert('Supplier and Amount must be valid.');
      return;
    }

    const newAdv: AdvanceToSupplier = {
      id: crypto.randomUUID(),
      date: advDate,
      supplierName: advSupplier,
      supplierTin: advSupplierTin || '000-000-000-000',
      bankName: advBank,
      checkNo: advCheckNo || 'N/A',
      amount: amt,
      status: 'Unapplied'
    };

    // Deduct from bank balance since advances is cash outflow
    const nextBalance = bankBalance - amt;

    const updatedAdv = [...advances, newAdv];
    await handleSaveClientData({ 
      advances: updatedAdv,
      bankBalance: nextBalance
    });

    setTempBalance(String(nextBalance));
    showToast(`Logged Advance of ₱${amt.toLocaleString()} to ${advSupplier}`);
    setShowAdvForm(false);
    setAdvSupplier('');
    setAdvSupplierTin('');
    setAdvCheckNo('');
    setAdvAmount('0');
  };

  const handleAddMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(memoAmount) || 0;
    const inv = payables.find(p => p.id === memoInvoiceId);
    if (!inv || amt <= 0) {
      alert('Please select an invoice and specify an amount.');
      return;
    }

    const newMemo: DebitCreditMemo = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: memoType,
      invoiceId: memoInvoiceId,
      amount: amt,
      reason: memoReason || 'Adjustment memo'
    };

    // Adjust the original invoice amount
    const updatedPayables = payables.map(p => {
      if (p.id === memoInvoiceId) {
        const adjustment = memoType === 'Debit' ? -amt : amt;
        const nextAmount = Math.max(0, p.amount + adjustment);
        return {
          ...p,
          amount: nextAmount,
          whtAmount: nextAmount * p.whtRate // recalculate withholding too
        };
      }
      return p;
    });

    const updatedMemos = [...memos, newMemo];
    await handleSaveClientData({
      payables: updatedPayables,
      memos: updatedMemos
    });

    showToast(`${memoType} Memo applied successfully. Invoice total adjusted.`);
    setShowMemoForm(false);
    setMemoAmount('0');
    setMemoReason('');
  };

  // --- Calculations for Aging ---
  const getAgingBuckets = () => {
    const today = new Date();
    const buckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days90Plus: 0,
    };

    const supplierAggregate: Record<string, typeof buckets & { total: number }> = {};

    payables.forEach(p => {
      if (p.paymentStatus === 'Paid') return;
      const outstanding = p.amount - p.amountPaid;
      const due = new Date(p.dueDate);
      const diffTime = today.getTime() - due.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let key: keyof typeof buckets = 'current';
      if (diffDays <= 0) {
        key = 'current';
      } else if (diffDays <= 30) {
        key = 'days30';
      } else if (diffDays <= 60) {
        key = 'days60';
      } else if (diffDays <= 90) {
        key = 'days90';
      } else {
        key = 'days90Plus';
      }

      buckets[key] += outstanding;

      if (!supplierAggregate[p.supplierName]) {
        supplierAggregate[p.supplierName] = { current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0, total: 0 };
      }
      supplierAggregate[p.supplierName][key] += outstanding;
      supplierAggregate[p.supplierName].total += outstanding;
    });

    return { total: buckets, suppliers: supplierAggregate };
  };

  const agingData = getAgingBuckets();

  // Printable Amount in words generator helper
  const amountToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const g = ['', 'Thousand', 'Million', 'Billion'];

    const numString = num.toString().split('.')[0];
    const centsString = num.toString().split('.')[1] || '00';
    let integerVal = parseInt(numString);

    if (integerVal === 0) return 'Zero Pesos Only';

    let words = '';
    let gIndex = 0;

    const translateChunk = (n: number) => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else if (n > 0) {
        str += a[n];
      }
      return str;
    };

    while (integerVal > 0) {
      const chunk = integerVal % 1000;
      if (chunk > 0) {
        words = translateChunk(chunk) + (g[gIndex] ? g[gIndex] + ' ' : '') + words;
      }
      integerVal = Math.floor(integerVal / 1000);
      gIndex++;
    }

    return `${words}Pesos and ${centsString}/100 Centavos Only`;
  };

  // ATC aggregates for BIR Quarterly Form 1601-EQ
  const getAtcAggregates = () => {
    const map: Record<string, { desc: string; base: number; tax: number; rate: number }> = {};
    payables.forEach(p => {
      if (p.whtRate > 0) {
        const code = p.atcCode || 'WC158';
        if (!map[code]) {
          map[code] = {
            desc: code === 'WC158' ? 'Purchases of goods from top taxpayers' : code === 'WC160' ? 'Services / Rentals' : 'Professional Fees',
            base: 0,
            tax: 0,
            rate: p.whtRate * 100
          };
        }
        map[code].base += p.amount;
        map[code].tax += p.whtAmount;
      }
    });
    return Object.entries(map);
  };

  const selectedSupplierForBir = currentClient.tinLibrary.suppliers.find(s => String(s.id) === birVendorId) || currentClient.tinLibrary.suppliers[0];

  return (
    <Modal
      id="payables_disbursements"
      title={
        <div className="flex items-center gap-2">
          <Landmark className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Payables & Disbursements Suite</span>
        </div>
      }
      maxWidth="max-w-7xl"
    >
      <div className="grid grid-cols-12 gap-6 min-h-[580px] font-sans">
        
        {/* Local Tab Navigation Sidebar */}
        <div className="col-span-12 md:col-span-3 border-r border-slate-200 dark:border-slate-700 pr-4 flex flex-col gap-1.5 shrink-0">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">CASH DEPOSITORY</p>
            {showBalanceEdit ? (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-slate-500 font-semibold text-lg">₱</span>
                <input
                  type="number"
                  value={tempBalance}
                  onChange={e => setTempBalance(e.target.value)}
                  className="w-full form-input py-1 text-sm bg-white dark:bg-slate-800"
                />
                <button 
                  onClick={handleUpdateBankBalance}
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center mt-1">
                <span className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-400">
                  ₱{bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <button 
                  onClick={() => setShowBalanceEdit(true)}
                  className="text-xs text-blue-600 hover:underline hover:text-blue-700 font-bold"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Real-time Sufficiency Account</p>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <TrendingDown className="w-4 h-4" />
            Suite Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('payables')}
            className={`flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'payables' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Invoice Payables</span>
            </div>
            {payables.filter(p => p.paymentStatus !== 'Paid').length > 0 && (
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {payables.filter(p => p.paymentStatus !== 'Paid').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('disbursements')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'disbursements' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <CreditCard className="w-4 h-4" />
            Disbursements & Checks
          </button>

          <button
            onClick={() => setActiveTab('advances')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'advances' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Wallet className="w-4 h-4" />
            Supplier Advances
          </button>

          <button
            onClick={() => setActiveTab('memos')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'memos' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Debit / Credit Memos
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'aging' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <Percent className="w-4 h-4" />
            AP Aging Reports
          </button>

          <button
            onClick={() => setActiveTab('bir')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-left ${activeTab === 'bir' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
          >
            <FileText className="w-4 h-4" />
            Withholding Tax & 2307
          </button>
        </div>


        {/* Visual Panel Body Content */}
        <div className="col-span-12 md:col-span-9 flex flex-col overflow-y-auto max-h-[80vh] px-2">
          
          {/* TAB 0: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-indigo-900/20">
                <h3 className="text-2xl font-black mb-1">Accounts Payable Control Room</h3>
                <p className="text-indigo-200 text-sm mb-6 max-w-lg">Execute invoice matches, prevent over-drafting through sufficiency filters, print formal check details, and generate withholding reports instantly.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setActiveTab('payables'); setShowPayableForm(true); }} className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Match New Invoice
                  </button>
                  <button onClick={() => { setActiveTab('disbursements'); setShowDisForm(true); }} className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-xl font-bold border border-indigo-500/30 transition-all flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> New Check Disbursement
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Cash in Bank Reserves</span>
                  <div className="text-xl font-bold font-mono text-emerald-600">₱{bankBalance.toLocaleString()}</div>
                  <span className="text-xs text-slate-500">Live check clearing depth</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Outstanding Payables</span>
                  <div className="text-xl font-bold font-mono text-rose-600">₱{payables.filter(p => p.paymentStatus !== 'Paid').reduce((sum, p) => sum + (p.amount - p.amountPaid), 0).toLocaleString()}</div>
                  <span className="text-xs text-slate-500">{payables.filter(p => p.paymentStatus !== 'Paid').length} open records</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Released & Matched</span>
                  <div className="text-xl font-bold font-mono text-indigo-600">₱{payables.filter(p => p.matchingStatus === 'Matched' && p.status === 'Released').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</div>
                  <span className="text-xs text-indigo-500">{payables.filter(p => p.matchingStatus === 'Matched' && p.status === 'Released').length} items ready to pay</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Deposits/Supplier Advances</span>
                  <div className="text-xl font-bold font-mono text-amber-600">₱{advances.filter(a => a.status === 'Unapplied').reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</div>
                  <span className="text-xs text-slate-500">{advances.filter(a => a.status === 'Unapplied').length} credits available</span>
                </div>
              </div>

              {/* Quick Checklist alerts */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">SYSTEM HEALTH NOTES</h4>
                
                {payables.filter(p => p.matchingStatus === 'Discrepancy').length > 0 && (
                  <div className="flex gap-3 text-amber-800 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <AlertTriangle className="w-4 h-4 shrink-0 transition-transform hover:scale-110" />
                    <div>
                      <strong>3-Way Matching Failure Detect:</strong> There are {payables.filter(p => p.matchingStatus === 'Discrepancy').length} raw invoices with PO or Receiving Report price/quantity mismatch details. Inspect the Invoice Payables tab before releasing disbursement.
                    </div>
                  </div>
                )}

                {payables.filter(p => p.status === 'Hold').length > 0 && (
                  <div className="flex gap-3 text-red-800 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <div>
                      <strong>Disbursement Holds Applied:</strong> {payables.filter(p => p.status === 'Hold').length} vendors are on administrative hold. Bank clearance blocks automatic printing on these vouchers.
                    </div>
                  </div>
                )}

                {disbursements.filter(d => d.isReversed).length > 0 && (
                  <div className="flex gap-3 text-indigo-800 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/30">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <div>
                      <strong>Check Voucher Reversals Recorded:</strong> {disbursements.filter(d => d.isReversed).length} cancellations have reinstatements processed to general ledger records.
                    </div>
                  </div>
                )}

                {payables.filter(p => p.matchingStatus === 'Matched' && p.status === 'Released' && p.paymentStatus !== 'Paid').length === 0 && payables.filter(p => p.matchingStatus === 'Discrepancy').length === 0 && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    No matched payables waiting for checkout. Excellent ledger cleanliness!
                  </div>
                )}
              </div>
            </div>
          )}


          {/* TAB 1: INVOICE PAYABLES */}
          {activeTab === 'payables' && (
            <div className="flex flex-col gap-6">
              
              {/* Add form banner toggle */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Payable Invoices & Three-Way Matches</h3>
                  <p className="text-xs text-slate-500">PO, Receiving Report, and Vendor Invoice verification platform</p>
                </div>
                <button
                  onClick={() => setShowPayableForm(!showPayableForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-4 h-4" /> {showPayableForm ? 'Close Form' : 'Add Payable & Verify Match'}
                </button>
              </div>

              {/* Form implementation */}
              {showPayableForm && (
                <form onSubmit={handleAddPayable} className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 grid grid-cols-12 gap-4">
                  <h4 className="col-span-12 font-bold text-sm text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Link PO, Receiving Report, & Invoice Form
                  </h4>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Supplier Registered Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Acme Industrial Supply"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Supplier TIN (9-12 digits)</label>
                    <input
                      required
                      type="text"
                      placeholder="000-000-000-000"
                      value={supplierTin}
                      onChange={e => setSupplierTin(formatTIN(e.target.value))}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Supplier Address</label>
                    <input
                      type="text"
                      placeholder="Corporate tower, Makati"
                      value={supplierAddress}
                      onChange={e => setSupplierAddress(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold">Invoice Number (VI)</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. VI-10492"
                      value={payableInvoiceNo}
                      onChange={e => setPayableInvoiceNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold">Purchase Order No (PO)</label>
                    <input
                      type="text"
                      placeholder="PO-2026-90"
                      value={payablePoNo}
                      onChange={e => setPayablePoNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold">Receiving Report No (RR)</label>
                    <input
                      type="text"
                      placeholder="RR-5601"
                      value={payableRrNo}
                      onChange={e => setPayableRrNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold">Withholding Tax (BIR EWT)</label>
                    <select
                      value={whtRate}
                      onChange={e => setWhtRate(e.target.value)}
                      className="form-select text-xs w-full mt-1"
                    >
                      <option value="0">0% Exempt</option>
                      <option value="0.01">1% Purchase of Goods</option>
                      <option value="0.02">2% Purchase of Services / Rentals</option>
                      <option value="0.05">5% Professional Fees</option>
                      <option value="0.10">10% Special Rate</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs text-slate-500 font-bold">Invoice Date</label>
                    <input
                      required
                      type="date"
                      value={payableDate}
                      onChange={e => setPayableDate(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs text-slate-500 font-bold">Due Date (Net Term)</label>
                    <input
                      type="date"
                      value={payableDueDate}
                      onChange={e => setPayableDueDate(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  {/* THREE-WAY INPUT GRID */}
                  <div className="col-span-12 border-t border-dashed border-slate-300 dark:border-slate-800 my-2 pt-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-2">3-Way matching verification fields (Quantities & Prices):</span>
                    <div className="grid grid-cols-12 gap-3 bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-3">
                        <p className="text-[10px] text-slate-500 font-black block mb-1">1. PURCHASE ORDER (PO)</p>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Qty" value={poQty} onChange={e => setPoQty(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                          <input type="number" placeholder="Price" value={poUnitPrice} onChange={e => setPoUnitPrice(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                        </div>
                      </div>

                      <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-3">
                        <p className="text-[10px] text-indigo-500 font-black block mb-1">2. RECEIVING REPORT (RR)</p>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Qty" value={rrQty} onChange={e => setRrQty(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                          <input type="number" placeholder="Price" value={rrUnitPrice} onChange={e => setRrUnitPrice(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                        </div>
                      </div>

                      <div className="col-span-4">
                        <p className="text-[10px] text-rose-500 font-black block mb-1">3. VENDOR INVOICE (VI)</p>
                        <div className="flex gap-2">
                          <input type="number" placeholder="Qty" value={viQty} onChange={e => setViQty(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                          <input type="number" placeholder="Price" value={viUnitPrice} onChange={e => setViUnitPrice(e.target.value)} className="form-input text-[11px] w-full py-1 text-center font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUPPlIER ADVANCES CORRELATION */}
                  {advances.filter(a => a.status === 'Unapplied' && a.supplierName === supplierName).length > 0 && (
                    <div className="col-span-12 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">💰</span>
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                          <strong>Active Advance found:</strong> You have unapplied advances to {supplierName}. Link this to deduct deposit balance!
                        </p>
                      </div>
                      <select
                        value={selectedAdvanceId}
                        onChange={e => setSelectedAdvanceId(e.target.value)}
                        className="form-select text-xs"
                      >
                        <option value="">Do not apply advance</option>
                        {advances.filter(a => a.status === 'Unapplied' && a.supplierName === supplierName).map(a => (
                          <option key={a.id} value={a.id}>Date: {a.date} (₱{a.amount.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="col-span-12 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setShowPayableForm(false)} className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl font-bold">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow">
                      Verify & Save Payable
                    </button>
                  </div>
                </form>
              )}


              {/* Payable List Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Invoice / Dates</th>
                      <th className="p-3">Supplier / TIN</th>
                      <th className="p-3">Quantities (PO-RR-VI)</th>
                      <th className="p-3 text-right">Invoice Total</th>
                      <th className="p-3 text-center">3-Way Match</th>
                      <th className="p-3 text-center">Hold State</th>
                      <th className="p-3 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {payables.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">No invoice payables defined yet. Add an invoice payable above to track matching.</td>
                      </tr>
                    ) : (
                      payables.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-3 align-top">
                            <p className="font-extrabold text-slate-800 dark:text-slate-100 font-mono">{p.invoiceNo}</p>
                            <p className="text-[10px] text-slate-400">Inv: {p.date}</p>
                            <p className="text-[10px] text-slate-400">Due: {p.dueDate}</p>
                          </td>
                          <td className="p-3 align-top">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{p.supplierName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{p.supplierTin}</p>
                          </td>
                          <td className="p-3 align-top">
                            <p className="font-mono text-[10px] text-slate-500">PO Qty: {p.poQty} @ ₱{p.poUnitPrice}</p>
                            <p className="font-mono text-[10px] text-indigo-500">RR Qty: {p.rrQty} @ ₱{p.rrUnitPrice}</p>
                            <p className="font-mono text-[10px] text-rose-500 font-black">VI Qty: {p.viQty} @ ₱{p.viUnitPrice}</p>
                          </td>
                          <td className="p-3 text-right align-top">
                            <p className="font-bold text-slate-800 dark:text-slate-100 font-mono">₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            {p.whtAmount > 0 && <p className="text-[10px] text-rose-500">Withheld EWT: ₱{p.whtAmount.toLocaleString()}</p>}
                          </td>
                          <td className="p-3 text-center align-top">
                            <div className="flex flex-col items-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.matchingStatus === 'Matched' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                p.matchingStatus === 'Discrepancy' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {p.matchingStatus}
                              </span>
                              {p.matchingDetails && (
                                <p className="text-[9px] text-slate-400 max-w-[140px] text-center mt-1 scale-95">{p.matchingDetails}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center align-top">
                            <button
                              onClick={() => handleToggleHold(p.id)}
                              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                                p.status === 'Hold' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100'
                              }`}
                            >
                              {p.status === 'Hold' ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                              {p.status === 'Hold' ? 'HOLD' : 'RELEASED'}
                            </button>
                          </td>
                          <td className="p-3 text-center align-top">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-900/30'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 2: DISBURSEMENTS & CHECKS */}
          {activeTab === 'disbursements' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Disbursements Ledger & Check Voucher Printouts</h3>
                  <p className="text-xs text-slate-500">Post check descriptions directly against bank balance sufficiency rules</p>
                </div>
                <button
                  onClick={() => setShowDisForm(!showDisForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-4 h-4" /> {showDisForm ? 'Close Form' : 'Disburse Voucher (New check)'}
                </button>
              </div>

              {/* Form Disbursement */}
              {showDisForm && (
                <form onSubmit={handleAddDisbursement} className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 grid grid-cols-12 gap-4">
                  <h4 className="col-span-12 font-bold text-sm text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Issue Cash check voucher & Settle accounts
                  </h4>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Disbursement Type</label>
                    <select
                      value={disType}
                      onChange={e => {
                        setDisType(e.target.value as any);
                        if (e.target.value === 'Invoice') {
                          setDisAccountTitle('Accounts Payable');
                        }
                      }}
                      className="form-select text-xs w-full mt-1"
                    >
                      <option value="Invoice">Pay Invoice Payable (Auto links matching/WHT)</option>
                      <option value="Miscellaneous">Miscellaneous direct expenses (Utility/Rent/etc)</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Voucher Code (Manual / Auto)</label>
                    <input
                      required
                      type="text"
                      placeholder="CV-YYYY-0001"
                      value={disVoucherNo}
                      onChange={e => setDisVoucherNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Check Number</label>
                    <input
                      type="text"
                      placeholder="CHQ-104928"
                      value={disCheckNo}
                      onChange={e => setDisCheckNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  {disType === 'Invoice' ? (
                    <div className="col-span-12 md:col-span-6 bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200">
                      <label className="text-xs text-indigo-600 font-bold block mb-1">Select Open Released Invoice</label>
                      <select
                        required
                        value={selectedInvoiceId}
                        onChange={e => {
                          setSelectedInvoiceId(e.target.value);
                          const inv = payables.find(p => p.id === e.target.value);
                          if (inv) {
                            setDisAmount(String(inv.amount));
                            setDisPayee(inv.supplierName);
                          }
                        }}
                        className="form-select text-xs w-full mt-1"
                      >
                        <option value="">-- Choose Released Unpaid Invoice --</option>
                        {payables.filter(p => p.paymentStatus !== 'Paid' && p.status === 'Released').map(p => (
                          <option key={p.id} value={p.id}>{p.invoiceNo} - {p.supplierName} (Balance Due: ₱{(p.amount - p.amountPaid).toLocaleString()} | EWT: ₱{p.whtAmount.toLocaleString()})</option>
                        ))}
                      </select>
                      {selectedInvoiceId && (
                        <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-2">
                          * The bank sufficiency engine will check for: <strong>₱{(parseFloat(disAmount) - (payables.find(p => p.id === selectedInvoiceId)?.whtAmount || 0)).toLocaleString()}</strong> net check payout after Withholding Tax deductions.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="col-span-12 md:col-span-4">
                        <label className="text-xs text-slate-500 font-bold">Payee / Recipient</label>
                        <input
                          required
                          type="text"
                          placeholder="Acme Utility Corp"
                          value={disPayee}
                          onChange={e => setDisPayee(e.target.value)}
                          className="form-input text-xs w-full mt-1"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <label className="text-xs text-slate-500 font-bold">Gross Amount (₱)</label>
                        <input
                          required
                          type="number"
                          placeholder="5000"
                          value={disAmount}
                          onChange={e => setDisAmount(e.target.value)}
                          className="form-input text-xs w-full mt-1 font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Date of disbursement</label>
                    <input
                      required
                      type="date"
                      value={disDate}
                      onChange={e => setDisDate(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Debit Target Account (Chart of Accounts)</label>
                    <select
                      value={disAccountTitle}
                      onChange={e => setDisAccountTitle(e.target.value)}
                      className="form-select text-xs w-full mt-1"
                      disabled={disType === 'Invoice'}
                    >
                      <option value="Accounts Payable">Accounts Payable (AP Control Account)</option>
                      {coaAccounts.filter(a => a.type === 'Expense' || a.type === 'Expenses' || a.type === 'Asset' || a.type === 'Assets').map(a => (
                        <option key={a.id} value={a.name}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold font-mono">Bank Source Depository</label>
                    <input
                      type="text"
                      value={disBankName}
                      onChange={e => setDisBankName(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12">
                    <label className="text-xs text-slate-500 font-bold">Transaction Particulars (Description)</label>
                    <textarea
                      placeholder="Payment details or memo"
                      value={disParticulars}
                      onChange={e => setDisParticulars(e.target.value)}
                      className="form-input text-xs w-full mt-1 h-16"
                    />
                  </div>

                  {/* LIVE VALIDATOR FOR SUFFICIENCY */}
                  <div className="col-span-12 border-t border-slate-200 dark:border-slate-800 my-2 pt-3">
                    {bankBalance < (parseFloat(disAmount) - (disType === 'Invoice' ? (payables.find(p => p.id === selectedInvoiceId)?.whtAmount || 0) : 0)) ? (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 text-red-800 dark:text-red-400 p-3 rounded-2xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="text-xs">
                          <strong>WARNING: Bank Sufficiency Clearance Failed!</strong> 
                          <p>Current Bank balance is ₱{bankBalance.toLocaleString()} while this check requires a net payout of ₱{(parseFloat(disAmount) - (disType === 'Invoice' ? (payables.find(p => p.id === selectedInvoiceId)?.whtAmount || 0) : 0)).toLocaleString()}. Authorization needed to override.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-300 text-emerald-800 dark:text-emerald-400 p-3 rounded-2xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <span className="text-xs">Bank sufficiency cleared! ₱{bankBalance.toLocaleString()} reserves are sufficient to cover this net check asset payout.</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-12 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setShowDisForm(false)} className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl font-bold">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow">
                      Authorize Disbursement and Ledger Cash Outflow
                    </button>
                  </div>
                </form>
              )}


              {/* Disbursements Table List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">CV Code / Dates</th>
                      <th className="p-3">Payee Details</th>
                      <th className="p-3">Method / Bank / Check No</th>
                      <th className="p-3">Account Charged</th>
                      <th className="p-3 text-right">Net Cleared</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Certificate Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {disbursements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">No disbursements processed. Add check disbursements or pay open invoice payables.</td>
                      </tr>
                    ) : (
                      disbursements.map(d => (
                        <tr key={d.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 ${d.isReversed ? 'opacity-50 line-through bg-red-50/30' : ''}`}>
                          <td className="p-3 font-mono font-bold">{d.voucherNo} <p className="text-[10px] text-slate-400 font-normal font-sans">{d.date}</p></td>
                          <td className="p-3 font-bold">{d.payee} <p className="text-[9px] text-slate-400 font-mono font-normal">TIN: {d.payeeTin || 'None'}</p></td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">{d.bankName} <p className="text-[9px] text-indigo-500 font-bold">CHQ: {d.checkNo}</p></td>
                          <td className="p-3 text-slate-600 font-bold">{d.accountTitle} <p className="text-[9px] text-slate-400 font-sans font-normal italic">{d.particulars}</p></td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-800 dark:text-slate-100">
                            ₱{d.netAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {d.whtAmount > 0 && <p className="text-[9px] text-rose-500 font-sans font-bold">Witheld: ₱{d.whtAmount.toLocaleString()}</p>}
                          </td>
                          <td className="p-3 text-center">
                            {d.isReversed ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-red-100 text-red-800 font-bold" title={d.reversalReason}>
                                REVERSED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedVoucherForPrint(d)}
                                className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-300 text-slate-700 dark:text-slate-200 rounded font-bold text-[10px] flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" /> Voucher
                              </button>
                              {!d.isReversed && (
                                <button
                                  onClick={() => setReversingVoucher(d)}
                                  className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded font-bold text-[10px] flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> Reverse Check
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 3: SUPPLIER ADVANCES */}
          {activeTab === 'advances' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Advances to Suppliers (Unapplied Credits)</h3>
                  <p className="text-xs text-slate-500">Track and apply down payments or mobilization fees to future accounts payable invoices</p>
                </div>
                <button
                  onClick={() => setShowAdvForm(!showAdvForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-4 h-4" /> Log Advance Payment
                </button>
              </div>

              {/* Advance form */}
              {showAdvForm && (
                <form onSubmit={handleAddAdvance} className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 grid grid-cols-12 gap-4">
                  <h4 className="col-span-12 font-bold text-sm text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5">
                    Register supplier prepayment deposit
                  </h4>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Supplier Registered Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. United Trading Inc"
                      value={advSupplier}
                      onChange={e => setAdvSupplier(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Supplier TIN</label>
                    <input
                      type="text"
                      placeholder="000-000-000-000"
                      value={advSupplierTin}
                      onChange={e => setAdvSupplierTin(formatTIN(e.target.value))}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Date of Prepaid Allocation</label>
                    <input
                      required
                      type="date"
                      value={advDate}
                      onChange={e => setAdvDate(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Check Code / Wire Ref</label>
                    <input
                      type="text"
                      placeholder="CHQ-9801"
                      value={advCheckNo}
                      onChange={e => setAdvCheckNo(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold font-mono">Bank Source Depository</label>
                    <input
                      type="text"
                      value={advBank}
                      onChange={e => setAdvBank(e.target.value)}
                      className="form-input text-xs w-full mt-1"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Prepaid Outflow Balance (₱)</label>
                    <input
                      required
                      type="number"
                      placeholder="25000"
                      value={advAmount}
                      onChange={e => setAdvAmount(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setShowAdvForm(false)} className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl font-bold">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow">
                      Disburse Prepayment to Asset Profile
                    </button>
                  </div>
                </form>
              )}


              {/* Advances table list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Prepayment Date</th>
                      <th className="p-3">Vendor Account</th>
                      <th className="p-3 font-mono">Check Reference</th>
                      <th className="p-3 text-right">Advance Deposited</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Linked Applied Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {advances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">No advance payments made to suppliers yet. Use this module to track mobilizations first.</td>
                      </tr>
                    ) : (
                      advances.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-mono">{a.date}</td>
                          <td className="p-3 font-bold">{a.supplierName} <p className="text-[10px] text-slate-400 font-normal font-mono">{a.supplierTin}</p></td>
                          <td className="p-3 font-mono text-slate-550">{a.bankName} - <span className="font-bold">{a.checkNo}</span></td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">₱{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              a.status === 'Applied' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-center font-bold text-slate-600">
                            {a.appliedInvoiceNo || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 4: DEBIT/CREDIT MEMOS */}
          {activeTab === 'memos' && (
            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Debit / Credit Adjustments Memos</h3>
                  <p className="text-xs text-slate-500">Record discount adjustments, defective returns, or price corrections against open payables</p>
                </div>
                <button
                  onClick={() => setShowMemoForm(!showMemoForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Adjustment Memo
                </button>
              </div>

              {/* Memo form */}
              {showMemoForm && (
                <form onSubmit={handleAddMemo} className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 grid grid-cols-12 gap-4">
                  <h4 className="col-span-12 font-bold text-sm text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5">
                    Issue adjustment memo
                  </h4>

                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold">Adjustment Direction</label>
                    <select
                      value={memoType}
                      onChange={e => setMemoType(e.target.value as any)}
                      className="form-select text-xs w-full mt-1"
                    >
                      <option value="Debit">Debit Memo (Reduces payable / Defective return)</option>
                      <option value="Credit">Credit Memo (Increases payable / Surcharge)</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-5">
                    <label className="text-xs text-slate-500 font-bold">Link to Invoice Payable Reference</label>
                    <select
                      required
                      value={memoInvoiceId}
                      onChange={e => setMemoInvoiceId(e.target.value)}
                      className="form-select text-xs w-full mt-1"
                    >
                      <option value="">-- Choose Invoice --</option>
                      {payables.map(p => (
                        <option key={p.id} value={p.id}>{p.invoiceNo} - {p.supplierName} (Current Balance: ₱{p.amount.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold">Adjustment Value (₱)</label>
                    <input
                      required
                      type="number"
                      placeholder="1500"
                      value={memoAmount}
                      onChange={e => setMemoAmount(e.target.value)}
                      className="form-input text-xs w-full mt-1 font-mono"
                    />
                  </div>

                  <div className="col-span-12">
                    <label className="text-xs text-slate-500 font-bold">Adjustment Verification Description / Reason</label>
                    <textarea
                      required
                      placeholder="State return conditions or invoicing error detail"
                      value={memoReason}
                      onChange={e => setMemoReason(e.target.value)}
                      className="form-input text-xs w-full mt-1 h-14"
                    />
                  </div>

                  <div className="col-span-12 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setShowMemoForm(false)} className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl font-bold">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow">
                      Apply Ledger Revision Note
                    </button>
                  </div>
                </form>
              )}


              {/* Applied memos table list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Memo Issue Date</th>
                      <th className="p-3">Adjustment Type</th>
                      <th className="p-3 font-mono">Invoice reference Linked</th>
                      <th className="p-3 text-right">Value Value</th>
                      <th className="p-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {memos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">No Debit or Credit Memos recorded for client payables.</td>
                      </tr>
                    ) : (
                      memos.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-mono">{m.date}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                              m.type === 'Debit' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {m.type === 'Debit' ? 'DEBIT MEMO (Decrease AP)' : 'CREDIT MEMO (Increase AP)'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-650">
                            {payables.find(p => p.id === m.invoiceId)?.invoiceNo || 'Unknown invoice'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">
                            ₱{m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 italic text-slate-500">{m.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 5: AGING REPORTS */}
          {activeTab === 'aging' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Live Accounts Payable Aging Report</h3>
                <p className="text-xs text-slate-500">Breakdown of open payables by overdue period segments</p>
                <div className="grid grid-cols-5 gap-3 mt-4 text-center">
                  <div className="bg-white dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono">₱{agingData.total.current.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">1-30 Days</p>
                    <p className="text-sm font-extrabold text-amber-600 font-mono">₱{agingData.total.days30.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">31-60 Days</p>
                    <p className="text-sm font-extrabold text-amber-700 font-mono">₱{agingData.total.days60.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">61-90 Days</p>
                    <p className="text-sm font-extrabold text-rose-600 font-mono">₱{agingData.total.days90.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 border border-slate-250 dark:border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">90+ Days</p>
                    <p className="text-sm font-extrabold text-red-600 font-mono">₱{agingData.total.days90Plus.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Vendor wise aging list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3 text-right">Current</th>
                      <th className="p-3 text-right">1-30 Days</th>
                      <th className="p-3 text-right">31-60 Days</th>
                      <th className="p-3 text-right">61-90 Days</th>
                      <th className="p-3 text-right">90+ Days</th>
                      <th className="p-3 text-right bg-slate-50 dark:bg-slate-850 font-black">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {Object.keys(agingData.suppliers).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">No open liabilities found. All payables fully balanced!</td>
                      </tr>
                    ) : (
                      Object.entries(agingData.suppliers).map(([name, data]) => (
                        <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{name}</td>
                          <td className="p-3 text-right font-mono text-slate-700">₱{data.current.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-amber-600">₱{data.days30.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-amber-700">₱{data.days60.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-rose-600">₱{data.days90.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-red-600">₱{data.days90Plus.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-950 dark:text-white bg-slate-50/30">₱{data.total.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 6: WITHHOLDING TAX RETRIEVALS */}
          {activeTab === 'bir' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">BIR Forms & Withholding Certificates</h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400">Expanded Withholding Tax system reports</p>
                </div>

                <div className="flex gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">BIR form 2307 Creditable Supplier</span>
                    <select
                      value={birVendorId}
                      onChange={e => setBirVendorId(e.target.value)}
                      className="form-select py-1 font-bold"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {currentClient.tinLibrary.suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.tin})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">Quarter</span>
                    <select
                      value={birQuarter}
                      onChange={e => setBirQuarter(e.target.value as any)}
                      className="form-select py-1 font-bold"
                    >
                      <option value="Q1">1st Quarter (Jan-Mar)</option>
                      <option value="Q2">2nd Quarter (Apr-Jun)</option>
                      <option value="Q3">3rd Quarter (Jul-Sep)</option>
                      <option value="Q4">4th Quarter (Oct-Dec)</option>
                    </select>
                  </div>
                </div>
              </div>


              {/* 1601-EQ aggregates breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/30 p-5 rounded-3xl shadow-sm">
                <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400 flex items-center gap-2 mb-4">
                  <span>📄</span> BIR Quarterly return Form 1601-EQ Aggregates & ATC categories
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold block">Taxable Quarter base amount</p>
                    <p className="text-lg font-mono font-bold text-slate-850">
                      ₱{payables.filter(p => p.whtRate > 0).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold block">Creditable Tax withheld</p>
                    <p className="text-lg font-mono font-bold text-indigo-600">
                      ₱{payables.filter(p => p.whtRate > 0).reduce((sum, p) => sum + p.whtAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold block">Consolidated ATC Categories</p>
                    <p className="text-lg font-black text-emerald-600">
                      {Array.from(new Set(payables.map(p => p.atcCode).filter(Boolean))).join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase">
                      <th className="p-2">ATC Code</th>
                      <th className="p-2">Category Description</th>
                      <th className="p-2 text-right">Tax Rate</th>
                      <th className="p-2 text-right">Quarterly Base Amount</th>
                      <th className="p-2 text-right">Tax to Remit (Withheld)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAtcAggregates().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 border-b border-slate-200">No transactions with creditable withholding tax (EWT) found. Check invoice details.</td>
                      </tr>
                    ) : (
                      getAtcAggregates().map(([code, data]) => (
                        <tr key={code} className="border-b border-slate-100">
                          <td className="p-2 font-mono font-bold text-indigo-700">{code}</td>
                          <td className="p-2">{data.desc}</td>
                          <td className="p-2 text-right font-mono font-bold">{data.rate}%</td>
                          <td className="p-2 text-right font-mono">₱{data.base.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-black text-indigo-650">₱{data.tax.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>


              {/* BEAUTIFUL BIR 2307 CERTIFICATE GENERATOR */}
              {selectedSupplierForBir && (
                <div className="border border-slate-300 dark:border-slate-850 p-6 bg-amber-50/10 dark:bg-slate-950 rounded-3xl relative overflow-hidden text-slate-800 dark:text-slate-200 select-none">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-xs uppercase font-black text-rose-800 dark:text-rose-500 tracking-wider">BIR Certificate Form 2307 replication</p>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                    >
                      🖨️ Print BIR 2307 Certificate
                    </button>
                  </div>

                  {/* FORM BODY STYLED AS OFFICIAL DOCK */}
                  <div className="border-4 border-slate-800 dark:border-slate-650 p-4 bg-white dark:bg-slate-900 text-slate-900 text-[10px] uppercase font-sans">
                    <div className="text-center font-bold mb-4 border-b border-slate-800 pb-2">
                      <p className="text-xs">Republika ng Pilipinas</p>
                      <p className="text-sm font-black">Kagawaran ng Pananalapi</p>
                      <p className="text-md font-extrabold tracking-widest text-[16px]">Kawanihan ng Rentas Internas</p>
                      <p className="text-xs mt-1 font-black">BIR Form No. 2307 - Certificate of Creditable Tax Withheld At Source</p>
                    </div>

                    <div className="grid grid-cols-12 gap-3 border-b border-slate-800 pb-3 mb-3">
                      <div className="col-span-12 md:col-span-6">
                        <span className="text-[8px] text-slate-500 block">1. For Period Quarter</span>
                        <p className="font-extrabold">{birQuarter} of {birYear}</p>
                      </div>
                      <div className="col-span-12 md:col-span-6 text-right">
                        <span className="text-[8px] text-slate-500 block">From - To</span>
                        <p className="font-extrabold">Active Accounting Period</p>
                      </div>
                    </div>

                    <div className="border-b border-slate-800 pb-3 mb-3">
                      <p className="font-black text-xs mr-3 bg-slate-100 p-1 block mb-2">PART I - PAYEE DETAILS (CREDIABLE SUPPLIER)</p>
                      <div className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-8">
                          <span className="text-[8px] text-slate-500 block">Registered Name</span>
                          <span className="font-black text-[12px]">{selectedSupplierForBir.name}</span>
                        </div>
                        <div className="col-span-4">
                          <span className="text-[8px] text-slate-500 block">Tin</span>
                          <span className="font-mono font-bold text-[12px]">{selectedSupplierForBir.tin}</span>
                        </div>
                        <div className="col-span-12">
                          <span className="text-[8px] text-slate-500 block">Registered Address</span>
                          <span className="font-semibold text-[10px]">{selectedSupplierForBir.address || 'Address Library Profile'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-slate-800 pb-3 mb-4">
                      <p className="font-black text-xs mr-3 bg-slate-100 p-1 block mb-2">PART II - PAYOR DETAILS (YOUR BUSINESS)</p>
                      <div className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-8">
                          <span className="text-[8px] text-slate-500 block">Registered Name</span>
                          <span className="font-black text-[12px]">{currentClient.registeredName || currentClient.name}</span>
                        </div>
                        <div className="col-span-4">
                          <span className="text-[8px] text-slate-500 block">Tin</span>
                          <span className="font-mono font-bold text-[12px]">{currentClient.tin || '000-000-000-000'}</span>
                        </div>
                        <div className="col-span-12">
                          <span className="text-[8px] text-slate-500 block">Registered Address</span>
                          <span className="font-semibold text-[10px]">{currentClient.city || 'Philippines Depository'}</span>
                        </div>
                      </div>
                    </div>

                    <p className="font-black text-xs mr-3 bg-slate-100 p-1 block mb-1">PART III - DETAILS OF TAX WITHHELD</p>
                    <table className="w-full text-left font-serif border border-slate-850 my-2">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-800 text-slate-700 font-bold text-[9px]">
                          <th className="p-1.5">Nature of Payment</th>
                          <th className="p-1.5">ATC</th>
                          <th className="p-1.5 text-right">1st Month</th>
                          <th className="p-1.5 text-right">2nd Month</th>
                          <th className="p-1.5 text-right">3rd Month</th>
                          <th className="p-1.5 text-right bg-slate-100">Total Base</th>
                          <th className="p-1.5 text-right bg-slate-200">Withheld</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payables.filter(p => p.whtRate > 0 && p.supplierName === selectedSupplierForBir.name).map(p => (
                          <tr key={p.id} className="border-b border-slate-300">
                            <td className="p-1">{p.atcCode === 'WC158' ? 'Purchases of Goods' : 'Services / Rentals'}</td>
                            <td className="p-1 font-mono">{p.atcCode || 'WC158'}</td>
                            <td className="p-1 text-right font-mono">₱{(p.amount / 3).toFixed(2)}</td>
                            <td className="p-1 text-right font-mono">₱{(p.amount / 3).toFixed(2)}</td>
                            <td className="p-1 text-right font-mono">₱{(p.amount / 3).toFixed(2)}</td>
                            <td className="p-1 text-right font-mono bg-slate-50 font-bold">₱{p.amount.toFixed(2)}</td>
                            <td className="p-1 text-right font-mono bg-slate-105 font-bold">₱{p.whtAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-8 grid grid-cols-2 gap-4 text-center text-[9px] border-t border-slate-800 pt-6">
                      <div>
                        <p className="underline font-bold">BY AUTHORIZED AGENTS / ACCOUNTANT</p>
                        <p className="text-slate-500 font-extrabold mt-1">SIGNATURE OF REGISTERED WITHHOLDING AGENT</p>
                      </div>
                      <div>
                        <p className="underline font-bold">BY SUPPLIER DEPUTY</p>
                        <p className="text-slate-500 font-extrabold mt-1">SIGNATURE OF VENDOR AGENT / REPRESENTATIVE</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* printing overlay overlay for check standard vouchers */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-6 border-4 border-slate-900 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-4">
              <h4 className="text-lg font-black tracking-tight text-indigo-900">CAPOTBOOKS PRINT ENGINE</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  🖨️ Real Print
                </button>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="p-1 px-3 border border-slate-400 hover:bg-slate-100 text-slate-850 rounded-lg text-xs"
                >
                  Close Print Lay
                </button>
              </div>
            </div>

            {/* Voucher Body Print */}
            <div className="border border-slate-800 p-6 bg-white rounded uppercase text-xs font-mono text-black leading-relaxed">
              <div className="text-center font-bold pb-4 border-b border-black mb-4 flex justify-between items-start">
                <div className="text-left">
                  <h3 className="text-lg font-black tracking-tight">CASH DISBURSEMENT VOUCHER</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{currentClient.registeredName || currentClient.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-md font-black">CV NO. {selectedVoucherForPrint.voucherNo}</p>
                  <p className="text-[10px] text-slate-500">Date: {selectedVoucherForPrint.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 pb-3 mb-3 border-b border-black">
                <div className="col-span-8">
                  <span className="text-[9px] text-slate-400 block font-normal font-sans">PAYEE:</span>
                  <p className="font-extrabold text-[13px]">{selectedVoucherForPrint.payee}</p>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-[9px] text-slate-400 block font-normal font-sans">CHECK NO:</span>
                  <p className="font-bold">{selectedVoucherForPrint.checkNo}</p>
                  <p className="text-[9px] text-slate-500 font-sans">{selectedVoucherForPrint.bankName}</p>
                </div>
              </div>

              <div className="pb-3 mb-3 border-b border-black">
                <span className="text-[9px] text-slate-400 block font-normal font-sans">THE SUM OF PESOS:</span>
                <p className="font-black text-[12px] italic underline">
                  {amountToWords(selectedVoucherForPrint.netAmountPaid)}
                </p>
              </div>

              <div className="mb-4">
                <span className="text-[9px] text-slate-400 block font-normal font-sans">PARTICULARS OF DISBURSEMENT:</span>
                <p className="text-xs bg-slate-100 p-2 leading-6">{selectedVoucherForPrint.particulars}</p>
              </div>

              <table className="w-full border-collapse border-b border-black text-center mt-6">
                <thead>
                  <tr className="bg-slate-100 border-t border-b border-black font-bold">
                    <th className="p-1">ACCOUNT CODE</th>
                    <th className="p-1">ACCOUNT TITLES DEBITED / CREDITED</th>
                    <th className="p-1 text-right">DEBIT (Dr)</th>
                    <th className="p-1 text-right">CREDIT (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dashed border-slate-350">
                    <td className="p-1.5 font-bold">AP/EXT</td>
                    <td className="p-1.5 text-left">{selectedVoucherForPrint.accountTitle} (Disbursed Ledger Charge)</td>
                    <td className="p-1.5 text-right">₱{selectedVoucherForPrint.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-1.5 text-right">-</td>
                  </tr>
                  {selectedVoucherForPrint.whtAmount > 0 && (
                    <tr className="border-b border-dashed border-slate-350 text-red-700">
                      <td className="p-1.5 font-bold">1601-EWT</td>
                      <td className="p-1.5 text-left">Withholding Tax Removable (BIR 2307 match)</td>
                      <td className="p-1.5 text-right">-</td>
                      <td className="p-1.5 text-right">₱{selectedVoucherForPrint.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black text-emerald-800">
                    <td className="p-1.5 font-bold">DEPOSITORY</td>
                    <td className="p-1.5 text-left">Cash in bank reserve payout</td>
                    <td className="p-1.5 text-right">-</td>
                    <td className="p-1.5 text-right">₱{selectedVoucherForPrint.netAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-6 text-center pt-8 text-[9px] font-sans">
                <div>
                  <p className="border-b border-black pb-4 font-bold">Prepared By</p>
                  <p className="text-slate-400 mt-1">AP Office deputy</p>
                </div>
                <div>
                  <p className="border-b border-black pb-4 font-bold">Authorized Approved By</p>
                  <p className="text-slate-400 mt-1">CFO / Manager</p>
                </div>
                <div>
                  <p className="border-b border-black pb-4 font-bold">Received Check/Amount By</p>
                  <p className="text-slate-400 mt-1">Vendor/Representative signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* reverse check overlay */}
      {reversingVoucher && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleReverseCheck} className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl relative border border-slate-200 dark:border-slate-700 font-sans">
            <h4 className="text-sm font-black text-rose-600 dark:text-rose-400 block mb-2">REVERSE OUTSTANDING CHECK VOUCHER</h4>
            <p className="text-xs text-slate-500 mb-4">You are reversing check <strong>{reversingVoucher.checkNo}</strong> (Voucher: {reversingVoucher.voucherNo}). This cancels payment, updates bank balance (adds ₱{reversingVoucher.netAmountPaid.toLocaleString()} back), and reinstates the original unpaid liabilities.</p>
            
            <label className="text-xs text-slate-500 font-bold block mb-1">State Official Reversal Reason</label>
            <input
              required
              type="text"
              placeholder="e.g. Returned Check / Error in payload"
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              className="form-input text-xs w-full py-2 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReversingVoucher(null)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">Reverse Transaction</button>
            </div>
          </form>
        </div>
      )}

    </Modal>
  );
}
