import React, { useState, useMemo, Fragment } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { 
  Building, ShieldAlert, FileSpreadsheet, Plus, Search, Filter, 
  Trash2, ArrowRightLeft, UserCheck, AlertOctagon, Printer, 
  Calendar, DollarSign, Table, Clock, HelpCircle, Eye, RefreshCw, BarChart2,
  Bookmark, User, MapPin, Tag, ChevronRight, ChevronDown, CheckCircle, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { FixedAsset, AssetTransferRecord } from '../../types';

// Standard depreciation row interface
interface DepreciationRow {
  year: number;
  beginningValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

// 1. Math formulas for depreciation schedules
export function calculateDepreciationSchedule(
  cost: number,
  salvage: number,
  usefulLife: number,
  method: 'StraightLine' | 'DecliningBalance' | 'DoubleDeclining' | 'SumOfYearsDigits',
  customRate?: number
): DepreciationRow[] {
  const schedule: DepreciationRow[] = [];
  let remainingValue = cost;
  let accumulated = 0;

  if (usefulLife <= 0 || cost <= 0) return [];

  // Straight Line (SL)
  if (method === 'StraightLine') {
    const annualDep = (cost - salvage) / usefulLife;
    for (let yr = 1; yr <= usefulLife; yr++) {
      const beg = remainingValue;
      let dep = annualDep;
      if (yr === usefulLife) {
        dep = beg - salvage;
      }
      dep = Math.max(0, dep);
      accumulated += dep;
      remainingValue = cost - accumulated;

      schedule.push({
        year: yr,
        beginningValue: beg,
        depreciationExpense: dep,
        accumulatedDepreciation: accumulated,
        endingValue: remainingValue,
      });
    }
  }
  // Declining Balance (DB)
  else if (method === 'DecliningBalance') {
    let rate = customRate || (1 - Math.pow(salvage / cost, 1 / usefulLife));
    if (isNaN(rate) || !isFinite(rate) || rate <= 0 || rate >= 1) {
      rate = 1.5 / usefulLife; // default rate
    }

    for (let yr = 1; yr <= usefulLife; yr++) {
      const beg = remainingValue;
      let dep = beg * rate;
      if (beg - dep < salvage || yr === usefulLife) {
        dep = beg - salvage;
      }
      dep = Math.max(0, dep);
      accumulated += dep;
      remainingValue = cost - accumulated;

      schedule.push({
        year: yr,
        beginningValue: beg,
        depreciationExpense: dep,
        accumulatedDepreciation: accumulated,
        endingValue: remainingValue,
      });
    }
  }
  // Double Declining Balance (DDB)
  else if (method === 'DoubleDeclining') {
    const rate = 2 / usefulLife;
    for (let yr = 1; yr <= usefulLife; yr++) {
      const beg = remainingValue;
      let dep = beg * rate;
      if (beg - dep < salvage || yr === usefulLife) {
        dep = beg - salvage;
      }
      dep = Math.max(0, dep);
      accumulated += dep;
      remainingValue = cost - accumulated;

      schedule.push({
        year: yr,
        beginningValue: beg,
        depreciationExpense: dep,
        accumulatedDepreciation: accumulated,
        endingValue: remainingValue,
      });
    }
  }
  // Sum of Years' Digits (SYD)
  else if (method === 'SumOfYearsDigits') {
    const n = usefulLife;
    const sydSum = (n * (n + 1)) / 2;
    const depreciableBase = cost - salvage;

    for (let yr = 1; yr <= usefulLife; yr++) {
      const beg = remainingValue;
      const fraction = (n - yr + 1) / sydSum;
      let dep = depreciableBase * fraction;
      if (yr === usefulLife) {
        dep = beg - salvage;
      }
      dep = Math.max(0, dep);
      accumulated += dep;
      remainingValue = cost - accumulated;

      schedule.push({
        year: yr,
        beginningValue: beg,
        depreciationExpense: dep,
        accumulatedDepreciation: accumulated,
        endingValue: remainingValue,
      });
    }
  }

  return schedule;
}

// 2. Exact current status of deep calculation at current date
export function getDepreciationAtDate(
  asset: FixedAsset,
  targetDateStr: string = new Date().toISOString()
): { accumulated: number; bookValue: number; expiredYears: number } {
  const schedule = calculateDepreciationSchedule(
    asset.acquisitionCost,
    asset.salvageValue,
    asset.usefulLifeYrs,
    asset.depreciationMethod,
    asset.decliningRate
  );

  const acq = new Date(asset.acquisitionDate);
  const target = new Date(targetDateStr);
  const diffMs = target.getTime() - acq.getTime();
  if (diffMs <= 0 || schedule.length === 0) {
    return { accumulated: 0, bookValue: asset.acquisitionCost, expiredYears: 0 };
  }

  const expiredDays = diffMs / (1000 * 60 * 60 * 24);
  const expiredYears = expiredDays / 365.25;

  if (expiredYears >= asset.usefulLifeYrs) {
    const finalRow = schedule[schedule.length - 1];
    return {
      accumulated: finalRow.accumulatedDepreciation,
      bookValue: finalRow.endingValue,
      expiredYears: asset.usefulLifeYrs
    };
  }

  const wholeYear = Math.floor(expiredYears);
  const fractional = expiredYears - wholeYear;

  if (wholeYear === 0) {
    const firstRow = schedule[0];
    const acc = firstRow.depreciationExpense * expiredYears;
    return {
      accumulated: acc,
      bookValue: asset.acquisitionCost - acc,
      expiredYears
    };
  } else {
    const prevRow = schedule[wholeYear - 1];
    const currRow = schedule[wholeYear];
    if (!currRow) {
      return {
        accumulated: prevRow.accumulatedDepreciation,
        bookValue: prevRow.endingValue,
        expiredYears: wholeYear
      };
    }
    const acc = prevRow.accumulatedDepreciation + (currRow.depreciationExpense * fractional);
    return {
      accumulated: acc,
      bookValue: asset.acquisitionCost - acc,
      expiredYears
    };
  }
}

export function FixedAssetsModal() {
  const { currentClient, currentClientId, activeModal, openModal, saveClient, showToast, logAuditTrail } = useAccounting();

  // Navigation Panel Tabs
  type SubTab = 'dashboard' | 'list' | 'schedules' | 'custody_transfers' | 'reporting';
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detailed asset drawer selection or preview
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [labelAssetId, setLabelAssetId] = useState<string | null>(null);

  // Forms states
  const [assetForm, setAssetForm] = useState<{
    id: string;
    name: string;
    category: string;
    acquisitionDate: string;
    acquisitionCost: number;
    salvageValue: number;
    usefulLifeYrs: number;
    depreciationMethod: 'StraightLine' | 'DecliningBalance' | 'DoubleDeclining' | 'SumOfYearsDigits';
    decliningRate?: number;
    custodian: string;
    location: string;
  }>({
    id: '',
    name: '',
    category: 'IT Hardware',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 50000,
    salvageValue: 5000,
    usefulLifeYrs: 5,
    depreciationMethod: 'StraightLine',
    custodian: '',
    location: ''
  });

  // custody transfer inputs
  const [transferState, setTransferState] = useState({
    toCustodian: '',
    toLocation: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showTransferForm, setShowTransferForm] = useState(false);

  // disposal inputs
  const [disposalState, setDisposalState] = useState({
    type: 'Disposal' as 'Disposal' | 'Abandonment',
    date: new Date().toISOString().split('T')[0],
    proceeds: 0,
    reason: ''
  });
  const [showDisposalForm, setShowDisposalForm] = useState(false);

  if (activeModal !== 'fixed_assets' || !currentClient) return null;

  const assetsList = currentClient.fixedAssets || [];

  // Derived arrays
  const categoriesList = useMemo(() => {
    const list = assetsList.map(a => a.category).filter(Boolean);
    return Array.from(new Set(list));
  }, [assetsList]);

  const filteredAssets = useMemo(() => {
    return assetsList.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.custodian.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCat = categoryFilter === 'all' || asset.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [assetsList, searchTerm, categoryFilter, statusFilter]);

  // Selected Asset detailed calculations
  const selectedAsset = useMemo(() => {
    return assetsList.find(a => a.id === selectedAssetId) || null;
  }, [assetsList, selectedAssetId]);

  const selectedSchedule = useMemo(() => {
    if (!selectedAsset) return [];
    return calculateDepreciationSchedule(
      selectedAsset.acquisitionCost,
      selectedAsset.salvageValue,
      selectedAsset.usefulLifeYrs,
      selectedAsset.depreciationMethod,
      selectedAsset.decliningRate
    );
  }, [selectedAsset]);

  const selectedLiveDep = useMemo(() => {
    if (!selectedAsset) return { accumulated: 0, bookValue: 0, expiredYears: 0 };
    return getDepreciationAtDate(selectedAsset);
  }, [selectedAsset]);

  // General executive metrics across database
  const executiveMetrics = useMemo(() => {
    let totalCost = 0;
    let totalAccumulated = 0;
    let totalNetBookValue = 0;
    let activeCount = 0;
    let disposedCount = 0;

    assetsList.forEach(asset => {
      totalCost += asset.acquisitionCost;
      if (asset.status === 'Disposed' || asset.status === 'Abandoned') {
        disposedCount++;
        totalAccumulated += (asset.acquisitionCost - (asset.disposalValue || 0) + (asset.disposalGainLoss || 0)); // estimate
      } else {
        activeCount++;
        const statusAtDate = getDepreciationAtDate(asset);
        totalAccumulated += statusAtDate.accumulated;
      }
    });

    totalNetBookValue = Math.max(0, totalCost - totalAccumulated);

    return { totalCost, totalAccumulated, totalNetBookValue, activeCount, disposedCount, count: assetsList.length };
  }, [assetsList]);

  // Form setup helper
  const handleOpenNewAssetForm = () => {
    const nextId = 'FA-' + (1000 + assetsList.length + 1);
    setAssetForm({
      id: nextId,
      name: '',
      category: 'IT Hardware',
      acquisitionDate: new Date().toISOString().split('T')[0],
      acquisitionCost: 50000,
      salvageValue: 5000,
      usefulLifeYrs: 5,
      depreciationMethod: 'StraightLine',
      custodian: 'Office Pool',
      location: 'Main Head Office'
    });
    setShowAssetForm(true);
  };

  const handleLoadSandboxAssets = async () => {
    const sandbox: FixedAsset[] = [
      {
        id: 'FA-2023-01',
        name: 'Toyota Hilux 2.4L Fleet Cargo Pickup',
        category: 'Vehicles & Logistics',
        acquisitionDate: '2023-01-15',
        acquisitionCost: 1450000,
        salvageValue: 150000,
        usefulLifeYrs: 7,
        depreciationMethod: 'DoubleDeclining',
        custodian: 'Gerald Garcia (Senior Logistics Officer)',
        location: 'HQ Main Garage & Delivery Hub',
        status: 'Active',
        transferHistory: []
      },
      {
        id: 'FA-2024-02',
        name: 'Dell PowerEdge R750 Virtualization Server Rack',
        category: 'IT Hardware',
        acquisitionDate: '2024-03-10',
        acquisitionCost: 480000,
        salvageValue: 30000,
        usefulLifeYrs: 5,
        depreciationMethod: 'StraightLine',
        custodian: 'Rico Sanchez (Systems Administrator)',
        location: '3rd Floor Secure Server Room',
        status: 'Active',
        transferHistory: []
      },
      {
        id: 'FA-2021-03',
        name: 'Heidelberg High-Speed Rotary Industrial Press',
        category: 'Machinery & Production',
        acquisitionDate: '2021-08-01',
        acquisitionCost: 3500000,
        salvageValue: 500000,
        usefulLifeYrs: 10,
        depreciationMethod: 'SumOfYearsDigits',
        custodian: 'Elena Mendoza (Production Chief)',
        location: 'Ground Floor Printing Press Floor',
        status: 'Active',
        transferHistory: []
      }
    ];

    const updatedClient = {
      ...currentClient,
      fixedAssets: [...assetsList, ...sandbox]
    };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Import', 'Fixed Assets', `Imported 3 diverse high-value sandbox demonstration assets with multi-method schedules into active registry.`);
    }
    showToast('Demo sandbox assets on-boarded successfully');
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name.trim() || !assetForm.id.trim()) {
      showToast('Asset name and Tag ID cannot be empty');
      return;
    }

    const assetIdExists = assetsList.some(a => a.id === assetForm.id);
    if (assetIdExists) {
      showToast(`Asset Tag ID "${assetForm.id}" already exists in custody registry`);
      return;
    }

    if (assetForm.salvageValue >= assetForm.acquisitionCost) {
      showToast('Salvage value must be strictly less than acquisition cost');
      return;
    }

    const newAsset: FixedAsset = {
      id: assetForm.id,
      name: assetForm.name,
      category: assetForm.category,
      acquisitionDate: assetForm.acquisitionDate,
      acquisitionCost: Number(assetForm.acquisitionCost),
      salvageValue: Number(assetForm.salvageValue),
      usefulLifeYrs: Number(assetForm.usefulLifeYrs),
      depreciationMethod: assetForm.depreciationMethod,
      decliningRate: assetForm.decliningRate ? Number(assetForm.decliningRate) : undefined,
      custodian: assetForm.custodian || 'Unassigned',
      location: assetForm.location || 'HQ Storage',
      status: 'Active',
      transferHistory: []
    };

    const updatedAssetsList = [...assetsList, newAsset];
    const updatedClient = {
      ...currentClient,
      fixedAssets: updatedAssetsList
    };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Add', 'Fixed Assets', `Registered asset "${newAsset.name}" [Tag: ${newAsset.id}] costing ₱${newAsset.acquisitionCost.toLocaleString()} using ${newAsset.depreciationMethod} depreciation method.`);
    }

    showToast(`Asset "${newAsset.name}" registered successfully`);
    setShowAssetForm(false);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete asset "${name}" [ID: ${id}] permanently? This will remove all associated schedules.`)) {
      return;
    }

    const updatedAssetsList = assetsList.filter(a => a.id !== id);
    const updatedClient = {
      ...currentClient,
      fixedAssets: updatedAssetsList
    };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Delete', 'Fixed Assets', `Permanently deleted asset record: "${name}" [ID: ${id}] from custody database.`);
    }

    showToast(`Asset "${name}" removed from registry`);
    if (selectedAssetId === id) setSelectedAssetId(null);
  };

  // Perform Custodial Transfer
  const handlePerformTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    if (!transferState.toCustodian.trim() || !transferState.toLocation.trim()) {
      showToast('Destination Custodian and Location are required for relocation');
      return;
    }

    const newTransfer: AssetTransferRecord = {
      id: 'txf_' + Math.random().toString(36).substring(2, 9),
      date: transferState.date,
      fromCustodian: selectedAsset.custodian,
      toCustodian: transferState.toCustodian,
      fromLocation: selectedAsset.location,
      toLocation: transferState.toLocation,
      reason: transferState.reason || 'General Relocation'
    };

    const updatedAsset: FixedAsset = {
      ...selectedAsset,
      custodian: transferState.toCustodian,
      location: transferState.toLocation,
      transferHistory: [newTransfer, ...(selectedAsset.transferHistory || [])]
    };

    const updatedAssetsList = assetsList.map(a => a.id === selectedAsset.id ? updatedAsset : a);
    const updatedClient = { ...currentClient, fixedAssets: updatedAssetsList };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Update', 'Fixed Assets', `Transferred asset "${selectedAsset.name}" [ID: ${selectedAsset.id}] from ${selectedAsset.custodian} (${selectedAsset.location}) to ${transferState.toCustodian} (${transferState.toLocation})`);
    }

    showToast(`Asset custodian reassigned to ${transferState.toCustodian}`);
    setShowTransferForm(false);
    setTransferState({ toCustodian: '', toLocation: '', reason: '', date: new Date().toISOString().split('T')[0] });
  };

  // Handle disposal / retirement
  const handlePerformDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const atDate = getDepreciationAtDate(selectedAsset, disposalState.date);
    const proceeds = Number(disposalState.proceeds);
    const gainLoss = proceeds - atDate.bookValue;

    const updatedAsset: FixedAsset = {
      ...selectedAsset,
      status: disposalState.type === 'Disposal' ? 'Disposed' : 'Abandoned',
      disposalDate: disposalState.date,
      disposalValue: proceeds,
      disposalGainLoss: gainLoss,
      disposalReason: disposalState.reason || 'End of useful lifecycle'
    };

    const updatedAssetsList = assetsList.map(a => a.id === selectedAsset.id ? updatedAsset : a);
    const updatedClient = { ...currentClient, fixedAssets: updatedAssetsList };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Update', 'Fixed Assets', `Asset retired/disposed: "${selectedAsset.name}" [ID: ${selectedAsset.id}]. Method: ${disposalState.type}. Proceeds: ₱${proceeds.toLocaleString()} vs Net Book Value of ₱${atDate.bookValue.toLocaleString()}. Recorded ${gainLoss >= 0 ? 'Gain' : 'Loss'} of ₱${Math.abs(gainLoss).toLocaleString()}`);
    }

    showToast(`Asset marked as ${disposalState.type === 'Disposal' ? 'Disposed' : 'Abandoned'}`);
    setShowDisposalForm(false);
    setDisposalState({ type: 'Disposal', date: new Date().toISOString().split('T')[0], proceeds: 0, reason: '' });
  };

  // Excel reporting compilation
  const handleExportFixedAssetsReport = () => {
    if (!assetsList.length) {
      showToast('No assets logged yet to export reports');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Master Registry
    const registryHeaders = [
      ['FIXED ASSET & COMPLIANCE LEDGERS'],
      [`CLIENT: ${currentClient.name}`],
      [`TIN: ${currentClient.tin || 'N/A'}`],
      [`GENERATED: ${new Date().toLocaleString()}`],
      [''],
      ['Asset Tag ID', 'Asset Name', 'Category', 'Acquisition Date', 'Acquisition Cost (₱)', 'Salvage Value (₱)', 'Useful Life (Yrs)', 'Method', 'Custodian', 'Location', 'Status', 'Disposal Date', 'Disposal proceeds (₱)']
    ];

    const registryRows = assetsList.map(asset => {
      return [
        asset.id,
        asset.name,
        asset.category,
        asset.acquisitionDate,
        asset.acquisitionCost,
        asset.salvageValue,
        asset.usefulLifeYrs,
        asset.depreciationMethod,
        asset.custodian,
        asset.location,
        asset.status,
        asset.disposalDate || 'N/A',
        asset.disposalValue || 0
      ];
    });

    const registrySheet = XLSX.utils.aoa_to_sheet([...registryHeaders, ...registryRows]);
    XLSX.utils.book_append_sheet(workbook, registrySheet, 'Ledger Registry');

    // Sheet 2: Accum Accountability Stats
    const summaryHeaders = [
      ['ASSET MONITORING AND ACCOUNTABILITY REPORTS'],
      [''],
      ['Asset Category', 'Total Registered Cost', 'Current Accum Depreciation', 'Current Net Book Value', 'Asset Count']
    ];

    const cats = Array.from(new Set(assetsList.map(a => a.category)));
    const summaryRows = cats.map(cat => {
      const curAssets = assetsList.filter(a => a.category === cat);
      let cost = 0;
      let accum = 0;
      curAssets.forEach(a => {
        cost += a.acquisitionCost;
        if (a.status !== 'Disposed' && a.status !== 'Abandoned') {
          accum += getDepreciationAtDate(a).accumulated;
        } else {
          accum += (a.acquisitionCost - (a.disposalValue || 0) + (a.disposalGainLoss || 0));
        }
      });
      return [cat, cost, accum, Math.max(0, cost - accum), curAssets.length];
    });

    const summarySheet = XLSX.utils.aoa_to_sheet([...summaryHeaders, ...summaryRows]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // Write file
    XLSX.writeFile(workbook, `FIXED_ASSETS_REPORT_${currentClient.name.replace(/\s+/g, '_')}.xlsx`);
    if (logAuditTrail) {
      logAuditTrail('Export', 'Fixed Assets', `Compiled and exported complete Fixed Assets register and Custodian Accountability tables to Excel.`);
    }
    showToast('Fixed assets compliance reports saved to Excel');
  };

  const handlePrintLabel = (id: string) => {
    setLabelAssetId(id);
    setTimeout(() => {
      const printContents = document.getElementById('printable-asset-label')?.innerHTML;
      const originalContents = document.body.innerHTML;
      if (!printContents) return;

      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Asset Label Tag - ${id}</title>
              <style>
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 20px;
                  background-color: white;
                  color: black;
                  text-align: center;
                }
                .label-box {
                  border: 2px dashed #000;
                  padding: 15px;
                  max-width: 420px;
                  margin: 0 auto;
                }
                .barcodes {
                  font-size: 20px;
                  letter-spacing: 2px;
                  margin: 10px 0;
                  font-weight: bold;
                }
                .meta-table {
                  width: 100%;
                  font-size: 11px;
                  text-align: left;
                  margin-top: 10px;
                  border-top: 1px solid #ccc;
                  padding-top: 5px;
                }
                button { display: none; }
              </style>
            </head>
            <body>
              <div class="label-box">
                ${printContents}
              </div>
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }, 100);
  };

  return (
    <Modal
      id="fixed_assets"
      title="Fixed Asset Custody & Depreciation suite"
      icon={<Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col gap-6">

        {/* Dynamic Modal Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 gap-1 overflow-x-auto select-none shrink-0 pb-1.5">
          <button
            onClick={() => setSubTab('dashboard')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              subTab === 'dashboard'
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            📊 Executive Dashboard
          </button>
          <button
            onClick={() => setSubTab('list')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              subTab === 'list'
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            📋 Asset Registry DB
          </button>
          <button
            onClick={() => setSubTab('schedules')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              subTab === 'schedules'
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            ⏱️ Depreciation Schedules
          </button>
          <button
            onClick={() => setSubTab('custody_transfers')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              subTab === 'custody_transfers'
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            🔀 Custodian & Transfers
          </button>
          <button
            onClick={() => setSubTab('reporting')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              subTab === 'reporting'
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            📈 Accountability Reports
          </button>
        </div>

        {/* 1. EXECUTIVE DASHBOARD SUB-TAB */}
        {subTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Summary Info Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Capital Expenditure</span>
                <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-50 block">₱{executiveMetrics.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className="text-[10px] text-slate-400 block">{executiveMetrics.count} Assets Registered</span>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">Accumulated Depreciation</span>
                <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-500 block">₱{executiveMetrics.totalAccumulated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className="text-[10px] text-slate-400 block">Total depreciated capital</span>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider block">Net Book Value (NBV)</span>
                <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 block">₱{executiveMetrics.totalNetBookValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className="text-[10px] text-slate-400 block">Active capital value</span>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block">Active / Disposed</span>
                <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 block">{executiveMetrics.activeCount} / {executiveMetrics.disposedCount}</span>
                <span className="text-[10px] text-slate-400 block">General status counts</span>
              </div>
            </div>

            {/* Quick Actions and Intro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Register New Asset Card */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-650 text-white p-5 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden group">
                <div className="space-y-2 relative z-10">
                  <Bookmark className="w-8 h-8 opacity-70" />
                  <h3 className="text-base font-black uppercase tracking-tight">Custody Register</h3>
                  <p className="text-xs text-indigo-100 leading-relaxed font-semibold">
                    Incorporate capital equipment, automotive vehicles, technology hardware, or property structures. Maintain strict regulatory tax ledger depreciation files.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewAssetForm}
                  className="mt-6 w-full py-2.5 bg-white text-indigo-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 relative z-10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Asset</span>
                </button>
              </div>

              {/* Middle Column: Visual category breakdown */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Asset Capital Category Matrix</span>
                {assetsList.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                    <Info className="w-5 h-5 opacity-40" />
                    <span>No Capital Breakdown Available</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {Array.from(new Set(assetsList.map(a => a.category))).map(cat => {
                      const totalCatCost = assetsList.filter(a => a.category === cat).reduce((sum, a) => sum + a.acquisitionCost, 0);
                      const pct = executiveMetrics.totalCost > 0 ? (totalCatCost / executiveMetrics.totalCost) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                            <span>{cat}</span>
                            <span className="font-mono">₱{totalCatCost.toLocaleString()} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-650 dark:bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Custodian Assignment Summary */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custodian Accountability Standings</span>
                {assetsList.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                    <UserCheck className="w-5 h-5 opacity-40" />
                    <span>No Custodian Records Found</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {Array.from(new Set(assetsList.map(a => a.custodian))).slice(0, 5).map(cust => {
                      const count = assetsList.filter(a => a.custodian === cust).length;
                      return (
                        <div key={cust} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-28" title={cust}>{cust}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-indigo-100/50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold shrink-0">{count} Active Assets</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* 2. ASSET REGISTRY SUB-TAB */}
        {subTab === 'list' && (
          <div className="space-y-6">
            
            {/* Filter and Search controls */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="relative w-full md:flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by asset name, tag number, custodian, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                <div className="flex flex-col gap-1 shrink-0 w-36">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">📂 All Categories</option>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 shrink-0 w-32">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">⚡ All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Disposed">Disposed</option>
                    <option value="Abandoned">Abandoned</option>
                  </select>
                </div>

                <button 
                  onClick={handleOpenNewAssetForm}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Asset</span>
                </button>
              </div>
            </div>

            {/* Asset Listing Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-3 w-32">Tag ID</th>
                      <th className="px-4 py-3">Asset Description</th>
                      <th className="px-4 py-3 w-32 text-right">Cost (₱)</th>
                      <th className="px-4 py-3 w-28 text-center">Life (Yrs)</th>
                      <th className="px-4 py-3 w-40">Custodian</th>
                      <th className="px-4 py-3 w-32">Location</th>
                      <th className="px-4 py-3 w-28 text-center">Status</th>
                      <th className="px-4 py-3 w-32 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAssets.map((asset) => {
                      const curDep = getDepreciationAtDate(asset);
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all text-xs text-slate-600 dark:text-slate-300">
                          <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {asset.id}
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 dark:text-slate-100 font-bold">
                            <div>{asset.name}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{asset.category} &bull; {asset.depreciationMethod}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold">
                            ₱{asset.acquisitionCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold">
                            {asset.usefulLifeYrs}
                          </td>
                          <td className="px-4 py-3.5 truncate max-w-[140px]" title={asset.custodian}>
                            {asset.custodian}
                          </td>
                          <td className="px-4 py-3.5 truncate max-w-[130px]" title={asset.location}>
                            {asset.location}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shadow-xs",
                              asset.status === 'Active' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-990/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" :
                              asset.status === 'Transferred' ? "bg-blue-50 text-blue-700 dark:bg-blue-990/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30" :
                              asset.status === 'Disposed' ? "bg-rose-50 text-rose-700 dark:bg-rose-990/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30" :
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setSelectedAssetId(asset.id); setSubTab('schedules'); }}
                                className="p-1 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1"
                                title="View detailed depreciation schedule"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Schedule</span>
                              </button>
                              <button
                                onClick={() => handlePrintLabel(asset.id)}
                                className="p-1 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-indigo-600 hover:text-indigo-900 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/20 transition-colors flex items-center gap-1"
                                title="Print Asset Tag Label"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Tag</span>
                              </button>
                              <button
                                onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-rose-500 hover:text-rose-700 transition-colors"
                                title="Remove asset permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAssets.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500">
                          <Building className="w-12 h-12 mx-auto mb-4 opacity-15" />
                          <p className="font-bold text-sm">No Fixed Assets Found</p>
                          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">Populate first asset entries using the "Register Asset" action or run the automatic ledger sandbox builder.</p>
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={handleOpenNewAssetForm}
                              className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                            >
                              Add Custom Asset
                            </button>
                            <button
                              onClick={handleLoadSandboxAssets}
                              className="px-3.5 py-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/30 border border-emerald-200 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                            >
                              Load Practice Sandbox
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. DEPRECIATION SCHEDULES SUB-TAB */}
        {subTab === 'schedules' && (
          <div className="space-y-6">
            
            {/* Asset Selection Dropdown & Header details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Selector Menu Cards */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm space-y-3 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Target Asset Selection</span>
                <select
                  value={selectedAssetId || ''}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Asset from Database --</option>
                  {assetsList.map(asset => (
                    <option key={asset.id} value={asset.id}>[{asset.id}] {asset.name}</option>
                  ))}
                </select>

                {selectedAsset && (
                  <div className="space-y-3.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Method</span>
                      <span className="font-extrabold uppercase font-mono">{selectedAsset.depreciationMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Acquisition Cost</span>
                      <span className="font-extrabold font-mono">₱{selectedAsset.acquisitionCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Salvage Value</span>
                      <span className="font-extrabold font-mono">₱{selectedAsset.salvageValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Useful Life</span>
                      <span className="font-extrabold font-mono">{selectedAsset.usefulLifeYrs} Years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Acquisition Date</span>
                      <span className="font-extrabold font-mono">{selectedAsset.acquisitionDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Schedule Table / visual chart */}
              {selectedAsset ? (
                <div className="md:col-span-2 space-y-6">
                  
                  {/* Ledger summary banner */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedAsset.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Expired Useful Life: <span className="font-bold">{selectedLiveDep.expiredYears.toFixed(2)}</span> / {selectedAsset.usefulLifeYrs} years. Remaining Book Value: <span className="font-bold text-indigo-600 dark:text-indigo-400">₱{selectedLiveDep.bookValue.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintLabel(selectedAsset.id)}
                        className="py-1.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-slate-400" />
                        <span>Print Tag Label</span>
                      </button>
                    </div>
                  </div>

                  {/* SVG Custom Premium Depreciation Graph */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Theoretical Depreciation Curving Chart</span>
                    
                    <div className="h-44 w-full flex items-end gap-3 pt-6 border-b border-l border-slate-200 dark:border-slate-800 px-4 relative">
                      
                      {/* Zero line / salvage height marker */}
                      <div className="absolute right-4 left-4 border-t border-dashed border-red-500/25 text-[9px] text-red-500/80 font-mono text-right" style={{ bottom: `${(selectedAsset.salvageValue / selectedAsset.acquisitionCost) * 100}%` }}>
                        Salvage Threshold: ₱{selectedAsset.salvageValue.toLocaleString()}
                      </div>

                      {selectedSchedule.map((row) => {
                        const expensePct = (row.depreciationExpense / selectedAsset.acquisitionCost) * 100 * 1.5; // Scaled
                        const endingValuePct = (row.endingValue / selectedAsset.acquisitionCost) * 100;

                        return (
                          <div key={row.year} className="flex-1 flex flex-col justify-end items-center h-full gap-1 group relative">
                            
                            {/* Hover data card */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white p-2.5 rounded-lg text-[10px] space-y-0.5 z-20 pointer-events-none w-40 leading-normal">
                              <p className="font-bold border-b border-slate-800 pb-0.5">Year {row.year}</p>
                              <p>Cost base: ₱{row.beginningValue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                              <p className="text-amber-400">Expense: ₱{row.depreciationExpense.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                              <p className="text-emerald-400">Ending Book: ₱{row.endingValue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                            </div>

                            {/* Bar: expense (yellow/amber) */}
                            <div 
                              className="w-4 bg-amber-400/80 group-hover:bg-amber-400 rounded-t transition-all" 
                              style={{ height: `${Math.max(4, expensePct)}%` }}
                            ></div>

                            {/* Bar: ending book value (indigo) */}
                            <div 
                              className="w-4 bg-indigo-500/40 group-hover:bg-indigo-500/70 rounded-t transition-all" 
                              style={{ height: `${Math.max(4, endingValuePct)}%` }}
                            ></div>

                            <span className="text-[10px] font-mono font-bold text-slate-400">Yr {row.year}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 justify-center text-[10px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-amber-400 rounded-xs"></div>
                        <span>Depreciation Expense</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-indigo-500/40 rounded-xs"></div>
                        <span>Ending Net Book Value</span>
                      </div>
                    </div>
                  </div>

                  {/* Depreciation Schedule table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 text-[9px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3 w-16 text-center">Year</th>
                          <th className="p-3 text-right">Beginning Book Value</th>
                          <th className="p-3 text-right text-amber-600 dark:text-amber-400">Depreciation Expense</th>
                          <th className="p-3 text-right text-indigo-600">Accum Depreciation</th>
                          <th className="p-3 text-right font-extrabold text-slate-700 dark:text-slate-100">Ending Book Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {selectedSchedule.map((row) => (
                          <tr key={row.year} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300">
                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{row.year}</td>
                            <td className="p-3 text-right">₱{row.beginningValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">₱{row.depreciationExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-3 text-right">₱{row.accumulatedDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">₱{row.endingValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              ) : (
                <div className="md:col-span-2 p-16 text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
                  <Table className="w-12 h-12 mx-auto mb-4 opacity-15" />
                  <p className="font-bold text-slate-400 text-sm">Select target asset document ID above to calculate annual schedules.</p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* 4. CUSTODY & TRANSFERS SUB-TAB */}
        {subTab === 'custody_transfers' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Asset selection and custody info */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Active Asset</span>
                <select
                  value={selectedAssetId || ''}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    setShowTransferForm(false);
                    setShowDisposalForm(false);
                  }}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Choose Asset from Registry --</option>
                  {assetsList.filter(a => a.status === 'Active' || a.status === 'Transferred').map(asset => (
                    <option key={asset.id} value={asset.id}>[{asset.id}] {asset.name}</option>
                  ))}
                </select>

                {selectedAsset ? (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block mb-1">Current Accountable Custodian</span>
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-150">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedAsset.custodian}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[9px] block mb-1">Registered Sector / Location</span>
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-150">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedAsset.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => { setShowTransferForm(true); setShowDisposalForm(false); }}
                        className="py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Relocate / Transfer</span>
                      </button>
                      <button
                        onClick={() => { setShowDisposalForm(true); setShowTransferForm(false); }}
                        className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider border border-rose-100 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        <span>Asset Retirement</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    Select an active fixed asset from the list above to perform custodian assignment transfers or log disposal retirement rules.
                  </p>
                )}
              </div>

              {/* Middle & Right columns: Forms and histories */}
              <div className="md:col-span-2 space-y-6">
                
                {/* 1. TRANSFER COAX REGISTRATION FORM */}
                {selectedAsset && showTransferForm && (
                  <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Reassign Location & Custodian Accountability</span>
                    </h3>

                    <form onSubmit={handlePerformTransfer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-400">Current Custodian</label>
                        <input type="text" readOnly value={selectedAsset.custodian} className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 cursor-not-allowed" />
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-500">Destination/New Custodian *</label>
                        <input 
                          type="text" 
                          required
                          value={transferState.toCustodian}
                          onChange={(e) => setTransferState({ ...transferState, toCustodian: e.target.value })}
                          placeholder="e.g. Maria Gonzales Lopez" 
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs" 
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-400">Current Location / Division</label>
                        <input type="text" readOnly value={selectedAsset.location} className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 cursor-not-allowed" />
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-500">Destination Location *</label>
                        <input 
                          type="text" 
                          required
                          value={transferState.toLocation}
                          onChange={(e) => setTransferState({ ...transferState, toLocation: e.target.value })}
                          placeholder="e.g. Quezon City Warehouse B" 
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800" 
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <label className="font-bold text-slate-500">Transfer authorization reason *</label>
                        <input 
                          type="text" 
                          required
                          value={transferState.reason}
                          onChange={(e) => setTransferState({ ...transferState, reason: e.target.value })}
                          placeholder="e.g., Transfer to new branch logistics supervisor" 
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800" 
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 sm:col-span-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowTransferForm(false)} 
                          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                          Commit Transfer
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* 2. DISPOSAL RETIREMENT FORM */}
                {selectedAsset && showDisposalForm && (
                  <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-rose-700 dark:text-rose-450 uppercase tracking-tight flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4" />
                      <span>Retire, Abandon, or Dispose of capital asset</span>
                    </h3>

                    <form onSubmit={handlePerformDisposal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-500">Retirement Rule Method *</label>
                        <select
                          value={disposalState.type}
                          onChange={(e) => setDisposalState({ ...disposalState, type: e.target.value as 'Disposal' | 'Abandonment', proceeds: e.target.value === 'Abandonment' ? 0 : disposalState.proceeds })}
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850"
                        >
                          <option value="Disposal">Sales / Scrap Disposal (Collects Proceeds)</option>
                          <option value="Abandonment">Total Destruction / Abandonment (Proceeds = 0)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="font-bold text-slate-500">Effective Retirement Date *</label>
                        <input 
                          type="date" 
                          required
                          value={disposalState.date}
                          onChange={(e) => setDisposalState({ ...disposalState, date: e.target.value })}
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                        />
                      </div>

                      {disposalState.type === 'Disposal' && (
                        <div className="flex flex-col gap-1.5 text-xs">
                          <label className="font-bold text-slate-500">Gross Proceeds Received (₱) *</label>
                          <input 
                            type="number" 
                            required
                            min={0}
                            value={disposalState.proceeds}
                            onChange={(e) => setDisposalState({ ...disposalState, proceeds: Number(e.target.value) })}
                            className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850 font-mono font-bold" 
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <label className="font-bold text-slate-500">Retirement / Scrap Explanation Reason *</label>
                        <input 
                          type="text" 
                          required
                          value={disposalState.reason}
                          onChange={(e) => setDisposalState({ ...disposalState, reason: e.target.value })}
                          placeholder="e.g. Screen burned out, sold chassis for metal scrap" 
                          className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 sm:col-span-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowDisposalForm(false)} 
                          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                          Commit Retirement
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* 3. HISTORICAL TIMELINE TRAIL */}
                {selectedAsset && (
                  <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Acquisition & Custody Relocation Log History</span>
                    
                    <div className="relative border-l border-slate-200 pl-4 py-1.5 space-y-6">
                      
                      {/* Current Standings */}
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 p-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full border border-white">
                          <CheckCircle className="w-2.5 h-2.5" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-100">Current Status: {selectedAsset.status}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Assigned to <span className="font-semibold text-slate-600">{selectedAsset.custodian}</span> in {selectedAsset.location}.</p>
                        </div>
                      </div>

                      {/* Relocations list */}
                      {(selectedAsset.transferHistory || []).map((tx, idx) => (
                        <div key={tx.id || idx} className="relative">
                          <div className="absolute -left-[21px] top-1 p-1 bg-indigo-50 dark:bg-slate-800 text-indigo-500 rounded-full border border-white">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                          </div>
                          <div className="text-xs">
                            <p className="font-bold text-slate-700 dark:text-slate-350">{tx.date} — Relocated Location</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">
                              Moved from {tx.fromCustodian} to {tx.toCustodian}. Explanation: "{tx.reason}"
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Origin */}
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 p-1 bg-slate-100 text-slate-500 rounded-full border border-white">
                          <Clock className="w-2.5 h-2.5" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-500">{selectedAsset.acquisitionDate} — Capital Purchase</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Original purchase costing ₱{selectedAsset.acquisitionCost.toLocaleString()} on-boarded to database.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* 5. CUSTODY MONITORING & COMPLIANCE REPORTS SUB-TAB */}
        {subTab === 'reporting' && (
          <div className="space-y-6">
            
            {/* Download and Print Trigger Header */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Consolidated Asset Monitoring Registry</h4>
                <p className="text-[11px] text-slate-400">Export audited inventories, category cost-bases, custodian accountability files, and computed residual carrying values directly.</p>
              </div>

              <button
                onClick={handleExportFixedAssetsReport}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Executive Report</span>
              </button>
            </div>

            {/* Categorized Summary Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Table A: Group by category summaries */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Capital carrying values by Category</span>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-right">Cost Value</th>
                        <th className="pb-2 text-right">Accum Dep</th>
                        <th className="pb-2 text-right">Net carrying</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {Array.from(new Set(assetsList.map(a => a.category))).map(cat => {
                        const items = assetsList.filter(a => a.category === cat);
                        let sumCost = 0;
                        let sumAccum = 0;
                        items.forEach(i => {
                          sumCost += i.acquisitionCost;
                          if (i.status !== 'Disposed' && i.status !== 'Abandoned') {
                            sumAccum += getDepreciationAtDate(i).accumulated;
                          } else {
                            sumAccum += (i.acquisitionCost - (i.disposalValue || 0) + (i.disposalGainLoss || 0));
                          }
                        });
                        return (
                          <tr key={cat} className="text-slate-600 dark:text-slate-350">
                            <td className="py-2.5 font-bold font-sans text-slate-800 dark:text-slate-150">{cat}</td>
                            <td className="py-2.5 text-right">₱{sumCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            <td className="py-2.5 text-right">₱{sumAccum.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                            <td className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">₱{(Math.max(0, sumCost - sumAccum)).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table B: Group by custodian custody tracking */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Custodian Accountability Inventory counts</span>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                        <th className="pb-2">Accountable Person</th>
                        <th className="pb-2 text-center">Active Assets</th>
                        <th className="pb-2 text-right">Accum Cost assigned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {Array.from(new Set(assetsList.map(a => a.custodian))).map(cust => {
                        const items = assetsList.filter(a => a.custodian === cust);
                        const cost = items.reduce((sum, a) => sum + a.acquisitionCost, 0);
                        return (
                          <tr key={cust} className="text-slate-600 dark:text-slate-350">
                            <td className="py-2.5 font-bold font-sans text-slate-800 dark:text-slate-150">{cust}</td>
                            <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white">{items.length}</td>
                            <td className="py-2.5 text-right">₱{cost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* FIXED ASSET REGISTER DIALOG FROM */}
      {showAssetForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">On-Board Capital Asset Record</h3>
              <button onClick={() => setShowAssetForm(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveAsset} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="font-extrabold text-slate-500">Asset Tag/Code Number *</label>
                <input 
                  type="text" 
                  required
                  value={assetForm.id}
                  onChange={(e) => setAssetForm({ ...assetForm, id: e.target.value })}
                  placeholder="e.g. FA-2026-003" 
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850 font-mono font-bold" 
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="font-extrabold text-slate-500">Capital Asset Name *</label>
                <input 
                  type="text" 
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. Toyota Hilux 2.4L Fleet Vehicle" 
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Asset Class Category *</label>
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850"
                >
                  <option value="IT Hardware">IT Hardware & Tech</option>
                  <option value="Vehicles & Logistics">Vehicles & Logistics</option>
                  <option value="Machinery & Production">Machinery & Production</option>
                  <option value="Office Properties">Office Properties</option>
                  <option value="Real Estates & Buildings">Real Estates & Buildings</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Acquisition Date *</label>
                <input 
                  type="date" 
                  required
                  value={assetForm.acquisitionDate}
                  onChange={(e) => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Gross Cost Basis (₱) *</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={assetForm.acquisitionCost}
                  onChange={(e) => setAssetForm({ ...assetForm, acquisitionCost: Number(e.target.value) })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850 font-mono font-bold" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Salvage Value (₱) *</label>
                <input 
                  type="number" 
                  required
                  min={0}
                  value={assetForm.salvageValue}
                  onChange={(e) => setAssetForm({ ...assetForm, salvageValue: Number(e.target.value) })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850 font-mono font-bold" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Useful Lifetime (Years) *</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={assetForm.usefulLifeYrs}
                  onChange={(e) => setAssetForm({ ...assetForm, usefulLifeYrs: Number(e.target.value) })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Depreciation Method *</label>
                <select
                  value={assetForm.depreciationMethod}
                  onChange={(e) => setAssetForm({ ...assetForm, depreciationMethod: e.target.value as any })}
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-850"
                >
                  <option value="StraightLine">Straight Line (SL)</option>
                  <option value="DecliningBalance">Declining Balance (DB)</option>
                  <option value="DoubleDeclining">Double Declining (DDB)</option>
                  <option value="SumOfYearsDigits">Sum of Years' Digits (SYD)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Custodian assignment *</label>
                <input 
                  type="text" 
                  required
                  value={assetForm.custodian}
                  onChange={(e) => setAssetForm({ ...assetForm, custodian: e.target.value })}
                  placeholder="e.g., Office logistics pool" 
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold text-slate-500">Assigned Physical Office Location *</label>
                <input 
                  type="text" 
                  required
                  value={assetForm.location}
                  onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  placeholder="e.g., Warehouse Manila" 
                  className="bg-slate-55 p-2.5 rounded-xl border border-slate-200 text-slate-800" 
                />
              </div>

              <div className="flex justify-end gap-2.5 sm:col-span-2 pt-2 border-t border-slate-150 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAssetForm(false)} 
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all text-[11px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider transition-all text-[11px]"
                >
                  Confirm Registration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* HIDDEN OFFSITE PRINT ELEMENT BARCODE STYLE */}
      <div id="printable-asset-label" className="hidden">
        {(() => {
          const lAsset = assetsList.find(a => a.id === labelAssetId);
          if (!lAsset) return null;
          return (
            <div style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {currentClient.name}
              </h2>
              <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                PROPERTY ID / ASSET BARCODE
              </span>
              
              <div style={{ fontSize: '24px', letterSpacing: '2px', wordBreak: 'break-all', margin: '8px 0', fontFamily: 'monospace', fontWeight: 'bold' }}>
                ||||| | ||||| | || |||
                <br />
                <span style={{ fontSize: '13px', letterSpacing: 'normal' }}>*{lAsset.id}*</span>
              </div>

              <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', marginTop: '10px', borderTop: '1px solid #000', paddingTop: '6px' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', width: '35%' }}>Description:</td>
                    <td>{lAsset.name}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Category:</td>
                    <td>{lAsset.category}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Acquired:</td>
                    <td>{lAsset.acquisitionDate}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Custodian:</td>
                    <td>{lAsset.custodian}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Division:</td>
                    <td>{lAsset.location}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '15px', borderTop: '1px dashed #666', paddingTop: '8px', fontSize: '8px', color: '#555' }}>
                SECURED SYSTEM VERIFIED PHYSICAL ASSET TAG
              </div>
            </div>
          );
        })()}
      </div>

    </Modal>
  );
}
