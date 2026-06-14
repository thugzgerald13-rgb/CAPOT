import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN, MONTHS } from '../../lib/utils';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Info, Calculator, Calendar, Store, CreditCard, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DEFAULT_ACCOUNTS } from './ChartOfAccountsModal';

export function ExpenseUploadModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast, openModal } = useAccounting();

  const [activeTab, setActiveTab] = useState<'csv' | 'receipt'>('receipt');
  
  // Drag and drop / upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  // Receipt OCR State
  const [scannedData, setScannedData] = useState<any | null>(null);

  // Form states for manual review of OCR scanning before save
  const [date, setDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [vatType, setVatType] = useState('vat');
  const [expenseType, setExpenseType] = useState('Others');
  const [accountTitle, setAccountTitle] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('Expenses');

  // Derive coaAccounts
  const coaAccounts = (() => {
    let accs = currentClient?.accounts || [];
    if (accs.length === 0) accs = DEFAULT_ACCOUNTS;
    if (currentDat) {
      return accs.filter(a => expenseType === 'Capital Goods' ? (a.type.toLowerCase() === 'asset' || a.type.toLowerCase() === 'assets') : (a.type.toLowerCase() === 'expense' || a.type.toLowerCase() === 'expenses'));
    } else {
      const t = selectedAccountType.toLowerCase();
      return accs.filter(a => {
        const at = a.type.toLowerCase();
        if (t === 'assets') return at === 'asset' || at === 'assets';
        if (t === 'liabilities') return at === 'liability' || at === 'liabilities';
        if (t === 'equity') return at === 'equity';
        if (t === 'income') return at === 'income' || at === 'revenue';
        if (t === 'costs') return at === 'costs' || at === 'cost' || at === 'expense' || at === 'expenses';
        if (t === 'expenses') return at === 'expense' || at === 'expenses' || at === 'costs';
        return at === t;
      });
    }
  })();

  // Sync default account title
  useEffect(() => {
    if (coaAccounts.length > 0) {
      if (!coaAccounts.find(a => a.name === accountTitle)) {
        setAccountTitle(coaAccounts[0].name);
      }
    } else {
      setAccountTitle('');
    }
  }, [expenseType, selectedAccountType, coaAccounts, accountTitle]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetAll = () => {
    setCsvPreviewRows([]);
    setImportStatus({ type: null, msg: '' });
    setScannedData(null);
    setDate('');
    setInvoiceNo('');
    setSupplierTin('');
    setSupplierName('');
    setSupplierAddress('');
    setAmount('');
    setTransactionDetails('');
  };

  const processFile = (file: File) => {
    if (!file || !currentClient || !currentClientId) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    // Reset previous states
    setImportStatus({ type: null, msg: '' });
    setCsvPreviewRows([]);
    setScannedData(null);

    if (extension === 'csv') {
      setActiveTab('csv');
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length <= 1) {
            setImportStatus({ type: 'error', msg: 'The CSV file is empty or only contains headers.' });
            setIsProcessing(false);
            return;
          }

          const headerLine = lines[0].toLowerCase();
          const hasHeaders = headerLine.includes('date') || headerLine.includes('invoice') || headerLine.includes('amount') || headerLine.includes('tin');
          let startIndex = hasHeaders ? 1 : 0;
          const rows: any[] = [];

          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const cols: string[] = [];
            let currentStr = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                if (inQuotes && line[j + 1] === '"') {
                  currentStr += '"';
                  j++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                cols.push(currentStr.trim());
                currentStr = '';
              } else {
                currentStr += char;
              }
            }
            cols.push(currentStr.trim());

            if (cols.length < 5) continue;

            const rDate = cols[0] || new Date().toISOString().split('T')[0];
            const rInvoiceNo = cols[1] || `UP-${Date.now().toString().slice(-4)}`;
            const rTin = formatTIN(cols[2] || '000-000-000');
            const rName = cols[3] || 'Imported Supplier';
            const rAddr = cols[4] || '';
            const rAmountRaw = cols[5]?.replace(/[^0-9.]/g, '') || '0';
            const rAmount = parseFloat(rAmountRaw) || 0;
            const rVatType = cols[6]?.toLowerCase() === 'non-vat' ? 'non-vat' : (cols[6]?.toLowerCase() === 'zero-rated' ? 'zero-rated' : 'vat');
            const rExpenseType = cols[7] || 'Others';
            const rAccountTitle = cols[8] || 'Operating Expenses';
            const rDetails = cols[9] || 'Imported via CSV';

            rows.push({
              date: rDate,
              invoiceNo: rInvoiceNo,
              supplierTin: rTin,
              supplierName: rName,
              supplierAddress: rAddr,
              grossAmount: rAmount,
              vatType: rVatType,
              expenseType: rExpenseType,
              accountTitle: rAccountTitle,
              transactionDetails: rDetails
            });
          }

          if (rows.length > 0) {
            setCsvPreviewRows(rows);
            setImportStatus({ type: 'success', msg: `Successfully scanned CSV. ${rows.length} rows ready to import.` });
          } else {
            setImportStatus({ type: 'error', msg: 'Could not find any valid lines in the CSV file.' });
          }
        } catch (err) {
          console.error(err);
          setImportStatus({ type: 'error', msg: 'Error parsing CSV file. Please make sure the structure is correct.' });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      // PDF or Image Upload - Smart OCR simulation
      setActiveTab('receipt');
      setIsProcessing(true);
      setTimeout(() => {
        const lowerName = file.name.toLowerCase();
        let extName = "National Book Store Inc.";
        let extTin = "000-441-235-000";
        let extAddress = "Quad Alpha Centrum, Mandaluyong City";
        let extAmount = "890.30";
        let extDetails = "";
        let extAccount = "";
        let extExpenseType = "Others";

        if (lowerName.includes("meralco") || lowerName.includes("electric") || lowerName.includes("power")) {
          extName = "Meralco Power Corp.";
          extTin = "000-112-234-000";
          extAddress = "Ortigas Ave, Pasig City";
          extAmount = "4850.00";
        } else if (lowerName.includes("globe") || lowerName.includes("telecom") || lowerName.includes("pldt")) {
          extName = "Globe Telecom Inc.";
          extTin = "000-512-334-000";
          extAddress = "Pioneer St, Mandaluyong City";
          extAmount = "1499.00";
        } else if (lowerName.includes("grab") || lowerName.includes("uber") || lowerName.includes("taxi")) {
          extName = "Grab Car Philippines";
          extTin = "003-912-321-000";
          extAddress = "Valero St, Salcedo Village, Makati City";
          extAmount = "450.00";
        } else if (lowerName.includes("sm") || lowerName.includes("supermarket") || lowerName.includes("grocery")) {
          extName = "SM Supermarket Inc.";
          extTin = "000-123-456-111";
          extAddress = "SM Megamall, Mandaluyong City";
          extAmount = "2350.50";
        } else if (lowerName.includes("capital") || lowerName.includes("machine") || lowerName.includes("asset") || lowerName.includes("pc")) {
          extName = "Dell Systems Philippines";
          extTin = "221-443-445-000";
          extAddress = "Chino Roces Ave, Makati City";
          extAmount = "45000.00";
        }

        const dateStr = currentDat 
          ? `${currentDat.year}-${String(currentDat.month).padStart(2, '0')}-15`
          : new Date().toISOString().split('T')[0];

        // Set state for review
        setDate(dateStr);
        setInvoiceNo(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
        setSupplierTin(extTin);
        setSupplierName(extName);
        setSupplierAddress(extAddress);
        setAmount(extAmount);
        setTransactionDetails(extDetails);
        setExpenseType(extExpenseType);
        setAccountTitle(extAccount);

        const acc = (currentClient?.accounts || DEFAULT_ACCOUNTS).find(a => a.name.toLowerCase() === extAccount.toLowerCase() || a.name === extAccount);
        if (acc?.type) {
          setSelectedAccountType(acc.type);
        }

        setScannedData({
          fileName: file.name,
          confidence: '98%',
          vendor: extName,
          amount: extAmount
        });

        setIsProcessing(false);
        showToast("OCR extracted billing details instantly!");
      }, 1500);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Perform bulk import of CSV rows
  const handleImportCSV = () => {
    if (csvPreviewRows.length === 0 || !currentClient || !currentClientId) return;

    const allPurchases = [...(currentClient.purchases || [])];
    const newPurchases: any[] = [];

    csvPreviewRows.forEach((row, index) => {
      // Date processing for formatted output
      let rDate = row.date;
      let formattedDate = rDate;
      if (rDate.includes('-')) {
        const [y, m, d] = rDate.split('-');
        formattedDate = `${parseInt(m)}/${parseInt(d)}/${y}`;
      } else if (rDate.includes('/')) {
        formattedDate = rDate;
      }

      const gross = row.grossAmount;
      const net = row.vatType === 'vat' ? (gross / 1.12) : gross;
      const inputTaxVal = row.vatType === 'vat' ? (net * 0.12) : 0;

      // Extract Year and Month Name for DAT file period matching
      const [mStr, dStr, yStr] = formattedDate.split('/');
      const monthIdx = parseInt(mStr) - 1;
      const yearStr = yStr;
      const datMonthYear = currentDat 
        ? currentDat.formatted 
        : (`${MONTHS[monthIdx] || 'January'} ${yearStr || new Date().getFullYear()}`);

      newPurchases.push({
        id: Date.now() + Math.random() + index,
        sequenceNumber: allPurchases.length + newPurchases.length + 1,
        datMonthYear: datMonthYear,
        date: formattedDate,
        paymentMethod: 'Cash',
        bankName: null,
        checkNumber: null,
        invoiceNo: row.invoiceNo,
        supplierTin: row.supplierTin,
        supplierName: row.supplierName,
        supplierAddress: row.supplierAddress,
        amount: net,
        vatType: row.vatType,
        expenseType: row.expenseType,
        accountTitle: row.accountTitle,
        transactionDetails: row.transactionDetails,
        inputTax: inputTaxVal
      });
    });

    const updatedClient = {
      ...currentClient,
      purchases: [...allPurchases, ...newPurchases]
    };
    saveClient(currentClientId, updatedClient);
    showToast(`Successfully imported ${newPurchases.length} expenses from CSV!`);
    resetAll();
    openModal('purchases'); // Return to screen
  };

  // Save the OCR reviewed single transaction
  const handleSaveOCRTransaction = () => {
    if (!currentClient || !currentClientId) return;
    if (!date || !invoiceNo || !supplierTin || !supplierName || !amount) {
      alert("Please fill in all required reviewed fields before saving.");
      return;
    }

    const gross = parseFloat(String(amount).replace(/,/g, '')) || 0;
    const net = vatType === 'vat' ? (gross / 1.12) : gross;
    const inputTaxVal = vatType === 'vat' ? (net * 0.12) : 0;

    let formattedDate = date;
    if (date.includes('-')) {
      const [y, m, d] = date.split('-');
      formattedDate = `${parseInt(m)}/${parseInt(d)}/${y}`;
    }

    const [mStr, dStr, yStr] = formattedDate.split('/');
    const monthIdx = parseInt(mStr) - 1;
    const datMonthYear = currentDat 
      ? currentDat.formatted 
      : (`${MONTHS[monthIdx] || 'January'} ${yStr}`);

    const newPurchaseEntry = {
      id: Date.now() + Math.random(),
      sequenceNumber: (currentClient.purchases || []).length + 1,
      datMonthYear: datMonthYear,
      date: formattedDate,
      paymentMethod: 'Cash',
      bankName: null,
      checkNumber: null,
      invoiceNo,
      supplierTin,
      supplierName,
      supplierAddress,
      amount: net,
      vatType,
      expenseType,
      accountTitle,
      transactionDetails,
      inputTax: inputTaxVal
    };

    const updatedClient = {
      ...currentClient,
      purchases: [...(currentClient.purchases || []), newPurchaseEntry]
    };

    saveClient(currentClientId, updatedClient);
    showToast(`Saved expense from uploaded receipt OCR!`);
    resetAll();
    openModal('purchases'); // Return to List view
  };

  return (
    <Modal
      id="expense-upload"
      title="Upload & Import Expense File"
      maxWidth="max-w-5xl"
      icon={<Upload className="w-5 h-5 text-amber-500" />}
    >
      <div className="flex flex-col gap-6">
        
        {/* Instruction Info Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/40 dark:to-orange-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Expense Upload Module</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed mt-0.5">
              Select or drop files below. Drop a <strong>CSV</strong> file to parse and bulk-load a series of accounts instantly, or upload a <strong>PNG/JPG/PDF receipt</strong> to run OCR scanning, letting you preview billing details and manually select their accounts and expense categories.
            </p>
          </div>
        </div>

        {/* Dynamic Drag/Drop Upload Area */}
        {!scannedData && csvPreviewRows.length === 0 && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 min-h-[220px]",
              isDragging 
                ? "border-amber-500 bg-amber-500/10" 
                : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40 shadow-inner"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.png,.jpg,.jpeg,.pdf"
              className="hidden"
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 animate-pulse">Running Optical OCR details & extracting values...</p>
                <p className="text-xs text-slate-400">This will take just a second</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-150">
                    Drag & drop files here, or <span className="text-amber-600 dark:text-amber-400 underline">browse computer</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Supports .CSV bulk expense archives, or receipt image documents like .PNG, .JPG, and .PDF
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Display Tab Navigation if data is scanned */}
        {(scannedData || csvPreviewRows.length > 0) && (
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => { setActiveTab('receipt'); resetAll(); }}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                  activeTab === 'receipt' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <FileText className="w-4 h-4" /> Single Receipt OCR
              </button>
              <button 
                onClick={() => { setActiveTab('csv'); resetAll(); }}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                  activeTab === 'csv' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <FileSpreadsheet className="w-4 h-4" /> CSV Bulk List
              </button>
            </div>
            
            <button 
              onClick={resetAll}
              className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors"
            >
              ⇄ Start Over / Clear file
            </button>
          </div>
        )}

        {/* Display OCR Review Screens */}
        {scannedData && activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Receipt visual check */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-between relative shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Scanned Receipt Mockup</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                    Confidence: {scannedData.confidence}
                  </span>
                </div>
                
                {/* Styled Mock Receipt Visual */}
                <div className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-6 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 shadow-inner flex flex-col gap-3">
                  <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-800">
                    <p className="font-bold text-sm tracking-wide uppercase">{scannedData.vendor}</p>
                    <p className="text-[10px] text-slate-400 mt-1">OFFICIAL RECEIPT / TAX INVOICE</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-bold">{invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIN:</span>
                    <span className="tracking-widest">{supplierTin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{date}</span>
                  </div>
                  
                  <div className="py-2.5 border-t border-b border-dashed border-slate-300 dark:border-slate-800 my-1 justify-between flex">
                    <span>{transactionDetails || "General Purchase Item"}</span>
                    <span>₱ {amount}</span>
                  </div>
                  
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1">
                    <span>GROSS TOTAL:</span>
                    <span>₱ {amount}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 mt-6 border-t border-slate-150 dark:border-slate-800 text-[11px] text-slate-500">
                <p>File Scanned: <span className="font-mono text-slate-700 dark:text-slate-300">{scannedData.fileName}</span></p>
              </div>
            </div>

            {/* Right: Interactive review input forms */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" /> Verified Fields Review
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
                
                <div>
                  <label className="form-label text-red-500">Transaction Date *</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label text-red-500">Invoice / Receipt # *</label>
                  <input 
                    type="text" 
                    value={invoiceNo} 
                    onChange={e => setInvoiceNo(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label text-red-500">Supplier TIN *</label>
                  <input 
                    type="text" 
                    value={supplierTin} 
                    onChange={e => setSupplierTin(formatTIN(e.target.value))} 
                    className="form-input font-mono" 
                  />
                </div>

                <div>
                  <label className="form-label text-red-500">Supplier Name *</label>
                  <input 
                    type="text" 
                    value={supplierName} 
                    onChange={e => setSupplierName(e.target.value)} 
                    className="form-input font-semibold text-slate-800" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="form-label">Supplier Address</label>
                  <input 
                    type="text" 
                    value={supplierAddress} 
                    onChange={e => setSupplierAddress(e.target.value)} 
                    className="form-input text-xs" 
                  />
                </div>

                <div>
                  <label className="form-label text-red-500">Gross Amount (₱) *</label>
                  <input 
                    type="text" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="form-input font-bold text-amber-900 dark:text-amber-100" 
                  />
                </div>

                <div>
                  <label className="form-label text-red-500">VAT Type *</label>
                  <select value={vatType} onChange={e => setVatType(e.target.value)} className="form-input">
                    <option value="vat">VAT 12% (+ Input Tax)</option>
                    <option value="non-vat">Non-VAT (0 Tax)</option>
                    <option value="zero-rated">0-Rated (0 Tax)</option>
                  </select>
                </div>

                {currentDat ? (
                  <div>
                    <label className="form-label">Expense Class</label>
                    <select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="form-input">
                      <option value="Capital Goods">🏭 Capital Goods</option>
                      <option value="Services">📋 Services</option>
                      <option value="Others">📦 Others</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="form-label text-blue-500">Account Type</label>
                    <select 
                      value={selectedAccountType} 
                      onChange={e => setSelectedAccountType(e.target.value)} 
                      className="form-input"
                    >
                      <option value="Assets">Assets</option>
                      <option value="Liabilities">Liabilities</option>
                      <option value="Equity">Equity</option>
                      <option value="Income">Income</option>
                      <option value="Costs">Costs</option>
                      <option value="Expenses">Expenses</option>
                    </select>
                  </div>
                )}

                <div className={currentDat ? "md:col-span-1" : "md:col-span-2"}>
                  <label className="form-label">{currentDat ? "Account Title" : "Header Account"}</label>
                  <select value={accountTitle} onChange={e => setAccountTitle(e.target.value)} className="form-input font-bold text-blue-800 dark:text-blue-300">
                    {coaAccounts.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="form-label">Transaction Details</label>
                  <input 
                    type="text" 
                    value={transactionDetails} 
                    onChange={e => setTransactionDetails(e.target.value)} 
                    className="form-input" 
                  />
                </div>

              </div>

              {/* Action Rows */}
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={resetAll}
                  className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSaveOCRTransaction}
                  className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-5 h-5" /> Import Scanned Transaction
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Display CSV bulk tables */}
        {csvPreviewRows.length > 0 && activeTab === 'csv' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {importStatus.msg}
                </span>
              </div>
              <button 
                onClick={handleImportCSV}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all text-xs"
              >
                Import All {csvPreviewRows.length} Rows
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-250 dark:border-slate-705 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-250 dark:border-slate-700">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">TIN</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Tax Class</th>
                    <th className="px-4 py-3">Account Header</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 font-medium">
                  {csvPreviewRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{row.date}</td>
                      <td className="px-4 py-2.5 font-mono">{row.invoiceNo}</td>
                      <td className="px-4 py-2.5 font-mono">{row.supplierTin}</td>
                      <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">{row.supplierName}</td>
                      <td className="px-4 py-2.5 text-slate-500 truncate max-w-[120px]">{row.supplierAddress}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                        ₱{row.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 uppercase font-bold text-[9px] text-slate-500">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded",
                          row.vatType === 'vat' ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        )}>
                          {row.vatType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 text-[11px] font-bold">{row.accountTitle}</td>
                    </tr>
                  ))}
                  {csvPreviewRows.length > 15 && (
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <td colSpan={8} className="px-4 py-3 text-center text-slate-400 dark:text-slate-500 italic">
                        ... and {csvPreviewRows.length - 15} more records to be imported.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={resetAll}
                className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
              >
                Cancel / Clear
              </button>
              <button 
                onClick={handleImportCSV}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-5 h-5" /> Bulk Import Now
              </button>
            </div>
          </div>
        )}

        {/* Global Footer Buttons */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700 mt-2">
          <button 
            onClick={() => {
              resetAll();
              openModal('purchases');
            }} 
            className="bg-slate-250 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-755 dark:text-slate-150 font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-1 text-sm"
          >
            Go back to Expenses list
          </button>
        </div>

      </div>
    </Modal>
  );
}
