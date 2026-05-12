import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { FolderClock, FileDown, Receipt, ShoppingCart, Upload } from 'lucide-react';
import { MONTHS, getMonthName, generateDATFile } from '../../lib/utils';

export function DatModal() {
  const { currentDat, setCurrentDat, openModal, currentClient, currentClientId, saveClient, showToast, pendingModal, setPendingModal } = useAccounting();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

  const [selectedMonth, setSelectedMonth] = useState((currentDat?.month || new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState((currentDat?.year || currentYear).toString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !currentClient || !currentClientId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) return;

      const expectedMonth = parseInt(selectedMonth);
      const expectedYear = parseInt(selectedYear);
      const expectedFormatted = `${getMonthName(selectedMonth)} ${selectedYear}`;

      let type: 'P' | 'S' | null = null;
      let headerPeriodMatched = false;
      const newPurchases: any[] = [];
      const newSales: any[] = [];

      for (let line of lines) {
        // Robust split handling quotes
        const cols: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') { cur += '"'; j++; }
            else { inQuotes = !inQuotes; }
          } else if (char === ',' && !inQuotes) {
            cols.push(cur.trim());
            cur = '';
          } else { cur += char; }
        }
        cols.push(cur.trim());

        if (cols[0] === 'H') {
          type = cols[1] as 'P' | 'S';
          const dateIdx = type === 'P' ? 19 : 14;
          const dateStr = cols[dateIdx]; // MM/DD/YYYY
          if (dateStr) {
            const [m, , y] = dateStr.split('/');
            if (parseInt(m) === expectedMonth && parseInt(y) === expectedYear) {
              headerPeriodMatched = true;
            } else {
              alert(`Period mismatch! File is for ${MONTHS[parseInt(m)-1]} ${y}, but selected period is ${expectedFormatted}.`);
              return;
            }
          }
        } else if (cols[0] === 'D') {
          const rowType = cols[1] as 'P' | 'S';
          if (!type) type = rowType;
          
          if (rowType === 'P') {
            const tin = cols[2];
            const name = cols[3];
            const addr = `${cols[7]}${cols[8] ? ', ' + cols[8] : ''}`;
            const ex = parseFloat(cols[9]) || 0;
            const zr = parseFloat(cols[10]) || 0;
            const srv = parseFloat(cols[11]) || 0;
            const cap = parseFloat(cols[12]) || 0;
            const oth = parseFloat(cols[13]) || 0;
            const itax = parseFloat(cols[14]) || 0;
            
            const amount = ex + zr + srv + cap + oth;
            let vatType: any = 'vat';
            if (ex > 0 && zr === 0 && srv === 0 && cap === 0 && oth === 0) vatType = 'non-vat';
            else if (zr > 0) vatType = 'zero-rated';
            
            let expenseType: any = 'Other';
            if (srv > 0) expenseType = 'Services';
            else if (cap > 0) expenseType = 'Capital Goods';

            newPurchases.push({
              id: Date.now() + Math.random(),
              datMonthYear: expectedFormatted,
              date: cols[16] || `01/01/${expectedYear}`,
              paymentMethod: 'Cash',
              invoiceNo: `UP-${Date.now().toString().slice(-4)}`,
              supplierTin: tin,
              supplierName: name,
              supplierAddress: addr,
              amount: amount,
              inputTax: itax,
              netAmount: amount,
              vatType,
              expenseType,
              accountTitle: 'Imported',
              sequenceNumber: (currentClient.purchases?.length || 0) + newPurchases.length + 1
            });
          } else if (rowType === 'S') {
            const tin = cols[2];
            const name = cols[3];
            const addr = `${cols[7]}${cols[8] ? ', ' + cols[8] : ''}`;
            const ex = parseFloat(cols[9]) || 0;
            const zr = parseFloat(cols[10]) || 0;
            const tax = parseFloat(cols[11]) || 0;
            const otax = parseFloat(cols[12]) || 0;
            
            const totalAmount = ex + zr + tax;
            newSales.push({
              id: Date.now() + Math.random(),
              datMonthYear: expectedFormatted,
              date: cols[13] || `01/01/${expectedYear}`,
              customerTin: tin,
              customerName: name,
              customerAddress: addr,
              amount: totalAmount,
              outputTax: otax,
              netAmount: totalAmount,
              reference: `UP-${Date.now().toString().slice(-4)}`,
              sequenceNumber: (currentClient.sales?.length || 0) + newSales.length + 1
            });
          }
        }
      }

      if (newPurchases.length > 0 || newSales.length > 0) {
        const updatedClient = {
          ...currentClient,
          purchases: [...(currentClient.purchases || []), ...newPurchases],
          sales: [...(currentClient.sales || []), ...newSales]
        };
        saveClient(currentClientId, updatedClient);
        showToast(`Uploaded ${newPurchases.length + newSales.length} entries for ${expectedFormatted}`);
      } else {
        alert('No valid entries found in the file.');
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const formatted = `${getMonthName(selectedMonth)} ${selectedYear}`;
    setCurrentDat({
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      formatted
    });
    if (pendingModal) {
      openModal(pendingModal);
      setPendingModal(null);
    } else {
      openModal(null);
    }
  };

  const qt = (val: string | undefined | null) => `"${val || ''}"`;
  const qtE = (val: string | undefined | null) => val ? `"${val}"` : '';
  const numH = (n: number) => n.toFixed(2);
  const numD = (n: number) => n === 0 ? '0' : n.toFixed(2);

  const generateDATContent = (type: 'P' | 'S', periodMonth: number, periodYear: number) => {
    if (!currentClient) return '';
    const formatted = `${getMonthName(periodMonth)} ${periodYear}`;
    
    // Default accounting month end
    const lastDayOfMonth = new Date(periodYear, periodMonth, 0);
    const endOfMonthStr = `${String(periodMonth).padStart(2, '0')}/${String(lastDayOfMonth.getDate()).padStart(2, '0')}/${periodYear}`;
    
    const taxpayerTIN = (currentClient.tin || '000000000').replace(/\D/g, '').substring(0, 9);
    const branchCode = ""; 
    const lastName = currentClient.lastName || "";
    const firstName = currentClient.firstName || "";
    const middleName = currentClient.middleName || "";
    const registeredName = currentClient.registeredName || currentClient.name || "";
    
    // Infer Address format from currentClient properties (for now we use simple fallback)
    const clientAdd = currentClient.substreet || currentClient.street || currentClient.city || "";
    let add1 = clientAdd;
    let add2 = "";
    if (clientAdd.includes(',')) {
      const parts = clientAdd.split(',');
      add1 = parts[0].trim();
      add2 = parts.slice(1).join(', ').trim();
    }
    const rdoCode = currentClient.rdoCode || "057";
    const fiscalMonthEnd = (currentClient.fiscalMonthEnd || 12).toString();

    let lines: string[] = [];

    if (type === 'P') {
      const periodPurchases = (currentClient.purchases || []).filter(p => p.datMonthYear === formatted);
      
      let totExempt = 0, totZero = 0, totServices = 0, totCapital = 0, totOther = 0, totInputTax = 0;
      const detailLines: string[] = [];

      periodPurchases.forEach(p => {
        const supTIN = (p.supplierTin || '').replace(/\D/g, '').substring(0, 9);
        const supName = p.supplierName || "";
        let supAdd1 = p.supplierAddress || "";
        let supAdd2 = "";
        if (supAdd1.includes(',')) {
          const parts = supAdd1.split(',');
          supAdd1 = parts[0].trim();
          supAdd2 = parts.slice(1).join(', ').trim();
        }

        let ex = 0, zr = 0, srv = 0, cap = 0, oth = 0;
        let itax = p.inputTax || 0;
        
        if (p.vatType === 'non-vat') {
          ex = p.amount;
        } else if (p.vatType === 'zero-rated') {
          zr = p.amount;
        } else {
          // vat
          if (p.expenseType === 'Services') {
            srv = p.amount;
          } else if (p.expenseType === 'Capital Goods') {
            cap = p.amount;
          } else {
            oth = p.amount;
          }
        }
        
        totExempt += ex; totZero += zr; totServices += srv; totCapital += cap; totOther += oth; totInputTax += itax;

        // Details line: D,P,tin,regName,lastName,firstName,middleName,add1,add2,exempt,zero,srv,cap,oth,itax,taxpayerTIN,date
        const dLine = `D,P,${qt(supTIN)},${qtE(supName)},${qtE("")},${qtE("")},${qtE("")},${qt(supAdd1)},${qt(supAdd2)},${numD(ex)},${numD(zr)},${numD(srv)},${numD(cap)},${numD(oth)},${numD(itax)},${taxpayerTIN},${endOfMonthStr}`;
        detailLines.push(dLine);
      });

      // Header line: H,P,taxpayerTIN,branch,lastName,firstName,middleName,regName,add1,add2,totExempt,totZero,totSrv,totCap,totOth,totItax,totItaxcred,0.00,rdo,date,fiscal
      const hLine = `H,P,${qt(taxpayerTIN)},${qt(branchCode)},${qt(lastName)},${qt(firstName)},${qt(middleName)},${qt(registeredName)},${qt(add1)},${qt(add2)},${numH(totExempt)},${numH(totZero)},${numH(totServices)},${numH(totCapital)},${numH(totOther)},${numH(totInputTax)},${numH(totInputTax)},0.00,${rdoCode},${endOfMonthStr},${fiscalMonthEnd}`;

      lines.push(hLine);
      lines.push(...detailLines);
    } else if (type === 'S') {
      const periodSales = (currentClient.sales || []).filter(s => s.datMonthYear === formatted);
      let totExempt = 0, totZero = 0, totTaxable = 0, totOutputTax = 0;
      const detailLines: string[] = [];

      periodSales.forEach(s => {
        const cusTIN = (s.customerTin || '').replace(/\D/g, '').substring(0, 9);
        const cusName = s.customerName || "";
        let cusAdd1 = s.customerAddress || "";
        let cusAdd2 = "";
        if (cusAdd1.includes(',')) {
          const parts = cusAdd1.split(',');
          cusAdd1 = parts[0].trim();
          cusAdd2 = parts.slice(1).join(', ').trim();
        }

        let ex = 0, zr = 0, tax = 0;
        let otax = s.outputTax || 0;
        if (otax > 0) { tax = s.amount; } else { ex = s.amount; }

        totExempt += ex; totZero += zr; totTaxable += tax; totOutputTax += otax;

        // Details line: D,S,tin,regName,lastName,firstName,middleName,add1,add2,ex,zr,tax,otax,taxpayerTIN,date
        const dLine = `D,S,${qt(cusTIN)},${qtE(cusName)},${qtE("")},${qtE("")},${qtE("")},${qt(cusAdd1)},${qt(cusAdd2)},${numD(ex)},${numD(zr)},${numD(tax)},${numD(otax)},${taxpayerTIN},${endOfMonthStr}`;
        detailLines.push(dLine);
      });

      // Header line: H,S,taxpayerTIN,branch,lastName,firstName,middleName,regName,add1,add2,totEx,totZr,totTax,totOtax,rdo,date,fiscal
      const hLine = `H,S,${qt(taxpayerTIN)},${qt(branchCode)},${qt(lastName)},${qt(firstName)},${qt(middleName)},${qt(registeredName)},${qt(add1)},${qt(add2)},${numH(totExempt)},${numH(totZero)},${numH(totTaxable)},${numH(totOutputTax)},${rdoCode},${endOfMonthStr},${fiscalMonthEnd}`;

      lines.push(hLine);
      lines.push(...detailLines);
    }
    
    return lines.join('\n');
  };

  const handleGenerateDAT = (type: 'P' | 'S') => {
    if (!currentClient) return;

    const formatted = `${getMonthName(selectedMonth)} ${selectedYear}`;
    const periodMonth = parseInt(selectedMonth);
    const periodYear = parseInt(selectedYear);

    const periodSales = (currentClient.sales || []).filter(s => s.datMonthYear === formatted);
    const periodPurchases = (currentClient.purchases || []).filter(p => p.datMonthYear === formatted);

    if (type === 'P' && periodPurchases.length === 0) {
      alert(`No purchase transactions found for ${formatted}`);
      return;
    }
    if (type === 'S' && periodSales.length === 0) {
      alert(`No sales transactions found for ${formatted}`);
      return;
    }

    const content = generateDATContent(type, periodMonth, periodYear);

    const tinClean = (currentClient.tin || '000000000').replace(/\D/g, '').substring(0, 9).padStart(9, '0');
    const monthStr = selectedMonth.toString().padStart(2, '0');
    const yearStr = selectedYear.toString();
    const filename = `${tinClean}${type}${monthStr}${yearStr}.DAT`;

    generateDATFile(filename, content);
    showToast(`DAT File generated for ${formatted}`);
  };

  return (
    <Modal
      id="dat"
      title="DAT File Selection"
      icon={<FolderClock className="w-5 h-5 text-cyan-500" />}
      maxWidth="max-w-md"
    >
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-center text-white mb-6 shadow-lg">
        <h3 className="text-xl font-bold mb-6">Select DAT File Period</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-left">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border-none outline-none font-medium"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="text-left">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border-none outline-none font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white/20 rounded-full px-4 py-2 inline-block font-semibold backdrop-blur-sm shadow-inner mt-2">
          Current: {getMonthName(selectedMonth)} {selectedYear}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleConfirm}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-sm"
        >
          Confirm & Proceed
        </button>
        
        {(!pendingModal || pendingModal === 'purchases' || pendingModal === 'history') && (
          <button
            onClick={() => handleGenerateDAT('P')}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" /> Generate SLP .DAT (Purchases)
          </button>
        )}

        {(!pendingModal || pendingModal === 'sales' || pendingModal === 'history') && (
          <button
            onClick={() => handleGenerateDAT('S')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Receipt className="w-5 h-5" /> Generate SLS .DAT (Sales)
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <input 
            type="file" 
            accept=".dat,.csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-800 dark:bg-slate-900 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" /> Upload DAT/CSV File
          </button>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Upload RELIEF .DAT or CSV for the selected period
          </p>
        </div>

        <button
          onClick={() => openModal(null)}
          className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
