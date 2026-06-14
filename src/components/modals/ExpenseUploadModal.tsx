import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN, MONTHS } from '../../lib/utils';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Info, Calculator, Calendar, Store, CreditCard, ChevronRight, Search, Trash } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DEFAULT_ACCOUNTS } from './ChartOfAccountsModal';

export function ExpenseUploadModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast, openModal } = useAccounting();

  const [activeTab, setActiveTab] = useState<'csv' | 'receipt'>('receipt');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  
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
  const [tags, setTags] = useState<string[]>([]);

  // AI category suggestion states
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isBulkSuggestingAI, setIsBulkSuggestingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const getAISuggestion = async (vendorName: string, detailsText: string, currentAmount: string, currentType: string) => {
    setIsSuggestingAI(true);
    try {
      const list = (currentClient?.accounts || DEFAULT_ACCOUNTS).map(a => a.name);
      const response = await fetch("/api/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: vendorName,
          details: detailsText,
          amount: currentAmount,
          availableCategories: list,
          currentExpenseType: currentType
        })
      });
      if (!response.ok) {
        throw new Error("Failed to suggest category with AI");
      }
      const data = await response.json();
      setAiSuggestion(data);
      
      // Auto-apply recommendation
      if (data.suggestedCategory) {
        setAccountTitle(data.suggestedCategory);
        const acc = (currentClient?.accounts || DEFAULT_ACCOUNTS).find(a => a.name === data.suggestedCategory);
        if (acc?.type) {
          setSelectedAccountType(acc.type);
        }
      }
      if (data.suggestedExpenseType) {
        setExpenseType(data.suggestedExpenseType);
      }
      if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
        setTags(data.suggestedTags);
      }
      showToast("✨ AI suggested categories matched and applied!");
    } catch (error) {
      console.error("AI categorization failed:", error);
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleTriggerAISuggestion = () => {
    getAISuggestion(supplierName, transactionDetails, amount, expenseType);
  };

  const handleBulkSuggestAI = async () => {
    if (csvPreviewRows.length === 0) return;
    setIsBulkSuggestingAI(true);
    showToast("✨ Querying Gemini AI for CSV mapping...");
    try {
      const list = (currentClient?.accounts || DEFAULT_ACCOUNTS).map(a => a.name);
      const updatedRows = await Promise.all(
        csvPreviewRows.map(async (row) => {
          try {
            const resp = await fetch("/api/suggest-category", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vendor: row.supplierName,
                details: row.transactionDetails,
                amount: row.grossAmount,
                availableCategories: list,
                currentExpenseType: row.expenseType
              })
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.suggestedCategory) {
                return {
                  ...row,
                  accountTitle: data.suggestedCategory,
                  expenseType: data.suggestedExpenseType || row.expenseType
                };
              }
            }
          } catch (e) {
            console.error("CSV Row AI Suggestion error:", e);
          }
          return row;
        })
      );
      setCsvPreviewRows(updatedRows);
      showToast("Completed! AI auto-categorization applied to all matching items.");
    } catch (err) {
      console.error("Bulk AI categorizing fail:", err);
      showToast("Could not bulk suggest categories.");
    } finally {
      setIsBulkSuggestingAI(false);
    }
  };

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
    setAiSuggestion(null);
    setTags([]);
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
        let extDetails = "Office Supplies & Stationery";
        let extAccount = "Operating Expenses";
        let extExpenseType = "Others";

        if (lowerName.includes("meralco") || lowerName.includes("electric") || lowerName.includes("power")) {
          extName = "Meralco Power Corp.";
          extTin = "000-112-234-000";
          extAddress = "Ortigas Ave, Pasig City";
          extAmount = "4850.00";
          extDetails = "Electricity Bill Monthly";
          extAccount = "Operating Expenses";
          extExpenseType = "Services";
        } else if (lowerName.includes("globe") || lowerName.includes("telecom") || lowerName.includes("pldt")) {
          extName = "Globe Telecom Inc.";
          extTin = "000-512-334-000";
          extAddress = "Pioneer St, Mandaluyong City";
          extAmount = "1499.00";
          extDetails = "Internet & Phone Service Plan";
          extAccount = "Operating Expenses";
          extExpenseType = "Services";
        } else if (lowerName.includes("grab") || lowerName.includes("uber") || lowerName.includes("taxi")) {
          extName = "Grab Car Philippines";
          extTin = "003-912-321-000";
          extAddress = "Valero St, Salcedo Village, Makati City";
          extAmount = "450.00";
          extDetails = "Business Travel Expense";
          extAccount = "Operating Expenses";
          extExpenseType = "Services";
        } else if (lowerName.includes("sm") || lowerName.includes("supermarket") || lowerName.includes("grocery")) {
          extName = "SM Supermarket Inc.";
          extTin = "000-123-456-111";
          extAddress = "SM Megamall, Mandaluyong City";
          extAmount = "2350.50";
          extDetails = "Kitchen Supplies & Groceries";
          extAccount = "Operating Expenses";
          extExpenseType = "Others";
        } else if (lowerName.includes("capital") || lowerName.includes("machine") || lowerName.includes("asset") || lowerName.includes("pc")) {
          extName = "Dell Systems Philippines";
          extTin = "221-443-445-000";
          extAddress = "Chino Roces Ave, Makati City";
          extAmount = "45000.00";
          extDetails = "Workstation Computer Setup";
          extAccount = "Capital Stock";
          extExpenseType = "Capital Goods";
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

        // Auto run Gemini AI category recommendation based on scanned values
        getAISuggestion(extName, extDetails, extAmount, extExpenseType);
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
        inputTax: inputTaxVal,
        tags: row.tags || []
      });
    });

    const updatedClient = {
      ...currentClient,
      purchases: [...allPurchases, ...newPurchases]
    };
    saveClient(currentClientId, updatedClient);
    showToast(`Successfully imported ${newPurchases.length} expenses from CSV!`);
    resetAll();
    openModal(null); // Close modal
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
      inputTax: inputTaxVal,
      tags: tags
    };

    const updatedClient = {
      ...currentClient,
      purchases: [...(currentClient.purchases || []), newPurchaseEntry]
    };

    saveClient(currentClientId, updatedClient);
    showToast(`Saved expense from uploaded receipt OCR!`);
    resetAll();
    openModal(null); // Close modal
  };

  return (
    <Modal
      id="expense-upload"
      title="Expense Files"
      maxWidth="max-w-5xl"
      icon={<Upload className="w-5 h-5 text-amber-500" />}
    >
      <div className="flex flex-col gap-6">
        
        {/* Instruction Info Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/40 dark:to-orange-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Expense Smart Upload Module</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed mt-0.5">
              Select or drop files below. Drop a <strong>CSV</strong> file to parse and bulk-load a series of accounts instantly, or upload a <strong>PNG/JPG/PDF receipt</strong> to run AI-assisted OCR scanning, letting you preview, edit and commit transaction details automatically.
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

        {/* Previous Uploads & Search Section */}
        {!scannedData && csvPreviewRows.length === 0 && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Document Archives & Entries
                </h3>
                <p className="text-xs text-slate-400">
                  Search already uploaded receipts, CSV rows, or document entries.
                </p>
              </div>
              
              {/* Search Input */}
              <div className="relative w-full md:w-85">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  placeholder="Search by supplier, date, or category..."
                  className="w-full pl-9 pr-12 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-550 transition-all text-slate-700 dark:text-slate-200"
                />
                {fileSearchQuery && (
                  <button
                    onClick={() => setFileSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 animate-fade-in"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List Results */}
            {(() => {
              const purchases = currentClient?.purchases || [];
              const filtered = purchases.filter(p => {
                const query = fileSearchQuery.toLowerCase().trim();
                if (!query) return true;
                
                const matchesName = p.supplierName?.toLowerCase().includes(query);
                const matchesDate = p.date?.includes(query);
                const matchesAccount = p.accountTitle?.toLowerCase().includes(query);
                const matchesType = p.expenseType?.toLowerCase().includes(query);
                const matchesInvoice = p.invoiceNo?.toLowerCase().includes(query);
                const matchesTags = p.tags && p.tags.some(t => t.toLowerCase().includes(query));
                
                return matchesName || matchesDate || matchesAccount || matchesType || matchesInvoice || matchesTags;
              });

              if (purchases.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-400">No imported expense files or manually entered transactions found yet.</p>
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-400">No documents or entries match search query: "{fileSearchQuery}"</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {filtered.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3.5 bg-white dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/20 rounded-2xl transition-all flex flex-col justify-between gap-2 group relative shadow-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate max-w-[180px]">
                            {item.supplierName || 'Unknown Supplier'}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="truncate">Inv: {item.invoiceNo || 'N/A'}</span>
                            <span>•</span>
                            <span className="font-mono shrink-0">{item.date}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">
                            ₱{((item.amount || 0) * (item.vatType === 'vat' ? 1.12 : 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-550 uppercase">
                            {item.vatType}
                          </span>
                        </div>
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-0.5">
                          {item.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 border-t border-slate-150/60 dark:border-slate-800 pt-2 mt-0.5">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9.5px] px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-full font-bold truncate max-w-[150px]">
                            {item.accountTitle}
                          </span>
                          <span className="text-[9.5px] px-2 py-0.5 bg-slate-50 text-slate-500 dark:bg-slate-850 dark:text-slate-400 rounded-full font-medium shrink-0">
                            {item.expenseType}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the entry for ${item.supplierName || 'this supplier'}?`)) {
                                const newPurchases = (currentClient?.purchases || []).filter(p => p.id !== item.id);
                                saveClient(currentClientId, {
                                  ...currentClient,
                                  purchases: newPurchases
                                });
                                showToast("Document entry deleted successfully.");
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-650 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                            title="Delete entry"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Verified Fields Review
              </h3>

              {/* AI Suggestion Notification Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-950/20 dark:to-slate-900 border border-blue-200 dark:border-indigo-900/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-indigo-900/40 text-blue-600 dark:text-blue-300 rounded-xl mt-0.5 shrink-0">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      AI Category Suggestion
                      {isSuggestingAI && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                    </h4>
                    {isSuggestingAI ? (
                      <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse">Gemini AI is analyzing transaction details and mapping options...</p>
                    ) : aiSuggestion ? (
                      <div className="space-y-1 mt-0.5">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Recommended Category: <span className="font-bold text-blue-700 dark:text-blue-300 underline">{aiSuggestion.suggestedCategory}</span> (Class: <span className="font-semibold text-slate-700 dark:text-slate-200">{aiSuggestion.suggestedExpenseType}</span> with <span className="text-emerald-600 dark:text-emerald-400 font-bold">{aiSuggestion.confidence} Confidence</span>)
                        </p>
                        <p className="text-[10px] text-slate-400 italic">
                          " {aiSuggestion.reason} "
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">Click the recommend button to analyze and map this expense using Gemini AI.</p>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleTriggerAISuggestion}
                  disabled={isSuggestingAI}
                  className="shrink-0 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm"
                >
                  {isSuggestingAI ? "Thinking..." : "✨ Ask Gemini AI"}
                </button>
              </div>
              
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

                {/* AI Automated Tagging Suggestions */}
                <div className="md:col-span-2">
                  <label className="form-label flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-350">
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold shrink-0">✨</span> AI Suggested Primary Category Tags
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-wide italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Auto-mapped by Gemini</span>
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner min-h-[50px] items-center">
                    {tags.length > 0 ? (
                      tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-full font-bold text-[11px] border border-amber-500/20 hover:border-rose-500/30 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer group/tag select-none">
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))}
                            className="text-amber-500 group-hover/tag:text-rose-500 transition-colors font-extrabold text-[12px] leading-none"
                            title="Remove label"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11.5px] text-slate-400 italic pl-1">No labels yet. Drag a receipt/CSV or trigger Ask Gemini above to auto-tag.</span>
                    )}

                    {/* Inline Tag Adder */}
                    <div className="ml-auto inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-xl border border-slate-150 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="+ Add custom tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !tags.includes(val)) {
                              setTags(prev => [...prev, val]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        className="bg-transparent border-none p-0 outline-none focus:ring-0 text-[10.5px] placeholder:text-slate-400 text-slate-700 dark:text-slate-200 max-w-[120px]"
                      />
                    </div>
                  </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {importStatus.msg}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBulkSuggestAI}
                  disabled={isBulkSuggestingAI}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-605 disabled:opacity-50 text-indigo-705 dark:text-white dark:bg-indigo-900/60 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800/80 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {isBulkSuggestingAI ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 dark:border-white border-t-transparent" />
                      <span>Categorizing...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ Auto-Match with Gemini AI</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={handleImportCSV}
                  disabled={isBulkSuggestingAI}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center"
                >
                  Import All {csvPreviewRows.length} Rows
                </button>
              </div>
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
              openModal(null);
            }} 
            className="bg-slate-250 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-755 dark:text-slate-150 font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-1 text-sm"
          >
            Close Window
          </button>
        </div>

      </div>
    </Modal>
  );
}
