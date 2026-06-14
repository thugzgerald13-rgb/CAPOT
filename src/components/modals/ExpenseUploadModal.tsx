import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { Upload, FileText, FileSpreadsheet, FileArchive, Image, Trash2, Download, Link, Link2, Link2Off, Info, CheckCircle2, AlertCircle, ShoppingCart, Plus, Folder, FolderPlus, FolderOpen, FolderClosed, ChevronRight, ChevronLeft, FolderDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ExpenseFile, Purchase } from '../../types';

export function ExpenseUploadModal() {
  const { currentClient, currentClientId, saveClient, showToast, openModal } = useAccounting();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folders and navigation state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [movingFileId, setMovingFileId] = useState<string | null>(null);

  // Filter linked/unlinked states in user selection
  const [showFilter, setShowFilter] = useState<'all' | 'unlinked' | 'linked'>('all');
  
  // File search state
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states for linking files to expenses
  const [activeLinkingId, setActiveLinkingId] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-8 h-8 text-emerald-500 shrink-0" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-8 h-8 text-rose-500 shrink-0" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      return <FileSpreadsheet className="w-8 h-8 text-teal-500 shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tgz'].includes(ext || '')) {
      return <FileArchive className="w-8 h-8 text-amber-500 shrink-0" />;
    }
    return <FileText className="w-8 h-8 text-blue-500 shrink-0" />;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processUploadedFiles = (files: FileList) => {
    if (!currentClient || !currentClientId) return;

    setIsUploading(true);
    const fileList = Array.from(files);
    let uploadedCount = 0;
    let oversizeCount = 0;

    const existingFiles = currentClient.expenseFiles || [];
    const updatedFiles = [...existingFiles];

    const loadFilePromises = fileList.map(file => {
      return new Promise<void>((resolve) => {
        // limit size to 450KB to preserve Cloud Firestore 1MB document limitations safely
        if (file.size > 450 * 1024) {
          oversizeCount++;
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          updatedFiles.push({
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            dataUrl,
            folderId: selectedFolderId || undefined
          });
          uploadedCount++;
          resolve();
        };
        reader.onerror = () => {
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadFilePromises).then(() => {
      if (uploadedCount > 0) {
        const updatedClient = {
          ...currentClient,
          expenseFiles: updatedFiles
        };
        saveClient(currentClientId, updatedClient);
        showToast(`Successfully uploaded ${uploadedCount} file(s)!`);
      }
      
      if (oversizeCount > 0) {
        alert(`${oversizeCount} file(s) exceeded the 450KB size limit. To maintain safe and lightning-fast cloud persistence, please upload optimized or compressed receipt files.`);
      }
      setIsUploading(false);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (!currentClient || !currentClientId) return;
    if (!confirm("Are you sure you want to delete this expense file? This action is permanent.")) return;

    // Remove file association from purchases as well
    const updatedPurchases = (currentClient.purchases || []).map(p => {
      if (p.attachedFileId === fileId) {
        return { ...p, attachedFileId: undefined };
      }
      return p;
    });

    const updatedFiles = (currentClient.expenseFiles || []).filter(f => f.id !== fileId);

    saveClient(currentClientId, {
      ...currentClient,
      purchases: updatedPurchases,
      expenseFiles: updatedFiles
    });
    showToast("File deleted");
  };

  const handleLinkFileToPurchase = (fileId: string, purchaseId: string) => {
    if (!currentClient || !currentClientId) return;

    // 1. Unlink this file from any other purchase it was associated with
    const cleanedPurchases = (currentClient.purchases || []).map(p => {
      if (p.attachedFileId === fileId) {
        return { ...p, attachedFileId: undefined };
      }
      // If purchaseId is being bound to another file, remove it first
      if (p.id.toString() === purchaseId.toString()) {
        return { ...p, attachedFileId: fileId };
      }
      return p;
    });

    // 2. Link the file to the selected purchase
    const updatedFiles = (currentClient.expenseFiles || []).map(f => {
      if (f.id === fileId) {
        return { ...f, associatedExpenseId: purchaseId };
      }
      // Also, if another file was linked to this purchase, unlink it
      if (f.associatedExpenseId?.toString() === purchaseId.toString()) {
        return { ...f, associatedExpenseId: undefined };
      }
      return f;
    });

    saveClient(currentClientId, {
      ...currentClient,
      purchases: cleanedPurchases,
      expenseFiles: updatedFiles
    });

    setActiveLinkingId(null);
    showToast("Document connected with transaction!");
  };

  const handleUnlinkFile = (fileId: string) => {
    if (!currentClient || !currentClientId) return;

    const updatedPurchases = (currentClient.purchases || []).map(p => {
      if (p.attachedFileId === fileId) {
        return { ...p, attachedFileId: undefined };
      }
      return p;
    });

    const updatedFiles = (currentClient.expenseFiles || []).map(f => {
      if (f.id === fileId) {
        return { ...f, associatedExpenseId: undefined };
      }
      return f;
    });

    saveClient(currentClientId, {
      ...currentClient,
      purchases: updatedPurchases,
      expenseFiles: updatedFiles
    });

    showToast("Document unlinked successfully");
  };

  // Fast-track creation of new Entry pre-bound to this file
  const handleCreateEntryFromFile = (file: ExpenseFile) => {
    if (!currentClient || !currentClientId) return;

    // Save state into session/local storage for PurchasesModal to self-populate
    sessionStorage.setItem('pre_linked_file_id', file.id);
    sessionStorage.setItem('pre_linked_file_name', file.name);

    // Close current modal and open Purchases Entry modal
    openModal('purchases');
    showToast("Creating new invoice entry pre-linked to scan!");
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !currentClient || !currentClientId) return;
    const existingFolders = currentClient.expenseFolders || [];
    
    // Prevent duplicated names in client directory
    if (existingFolders.some(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase())) {
      alert("A folder with this name already exists.");
      return;
    }

    const newFolder = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: newFolderName.trim(),
      createdAt: new Date().toISOString()
    };

    saveClient(currentClientId, {
      ...currentClient,
      expenseFolders: [...existingFolders, newFolder]
    });

    setNewFolderName('');
    setIsCreatingFolder(false);
    setSelectedFolderId(newFolder.id); // auto-navigate inside the new folder
    showToast(`Folder "${newFolder.name}" created!`);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentClient || !currentClientId) return;

    const folder = (currentClient.expenseFolders || []).find(f => f.id === folderId);
    if (!folder) return;

    if (confirm(`Are you sure you want to delete folder "${folder.name}"? Files inside will be moved back to the main section.`)) {
      const updatedFolders = (currentClient.expenseFolders || []).filter(f => f.id !== folderId);
      
      // Move any files in this folder back to Root (undefined)
      const updatedFiles = (currentClient.expenseFiles || []).map(f => {
        if (f.folderId === folderId) {
          return { ...f, folderId: undefined };
        }
        return f;
      });

      saveClient(currentClientId, {
        ...currentClient,
        expenseFolders: updatedFolders,
        expenseFiles: updatedFiles
      });

      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      showToast("Folder deleted. Files moved to main section.");
    }
  };

  const handleMoveFile = (fileId: string, folderId: string | undefined) => {
    if (!currentClient || !currentClientId) return;

    const updatedFiles = (currentClient.expenseFiles || []).map(f => {
      if (f.id === fileId) {
        return { ...f, folderId };
      }
      return f;
    });

    saveClient(currentClientId, {
      ...currentClient,
      expenseFiles: updatedFiles
    });

    showToast("File directory transfer completed!");
  };

  const files = currentClient?.expenseFiles || [];
  const purchases = currentClient?.purchases || [];

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If searching, look everywhere. Otherwise, restrict to selected folder (undefined means Root)
    const matchesFolder = searchQuery ? true : (f.folderId === (selectedFolderId || undefined));

    if (showFilter === 'unlinked') {
      return matchesSearch && matchesFolder && !f.associatedExpenseId;
    }
    if (showFilter === 'linked') {
      return matchesSearch && matchesFolder && !!f.associatedExpenseId;
    }
    return matchesSearch && matchesFolder;
  });

  return (
    <Modal
      id="expense-upload"
      title="Expense Files & Documents"
      maxWidth="max-w-5xl"
      icon={<Upload className="w-5 h-5 text-amber-500" />}
    >
      <div className="flex flex-col gap-6">
        
        {/* Instruction Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/40 dark:to-orange-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">Document Repository & Receipts</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed mt-0.5">
              Securely upload and archive receipts, bills, invoice scans, PDFs, and spreadsheet files directly. Check upload status, link your digital files directly to specific expense records for Audit-Ready Tax reporting, or download archived items instantly.
            </p>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[160px]",
            isDragging 
              ? "border-amber-500 bg-amber-500/10" 
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/45 shadow-sm"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".csv,.png,.jpg,.jpeg,.pdf,.xlsx,.xls,.docx"
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Processing file secure uploads...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Drag & drop your files here, or <span className="text-amber-600 dark:text-amber-400 underline decoration-dotted">browse folder</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                  Supports PDF, PNG, JPG, CSV, XLS. Uploading destination: 
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                     {selectedFolderId ? (currentClient?.expenseFolders || []).find(f => f.id === selectedFolderId)?.name || 'Folder' : '/ (Root)'}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Folders Management Section */}
        <div className="bg-slate-50 dark:bg-slate-900/45 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">Folders / Collections</h3>
            </div>
            
            {isCreatingFolder ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none w-full sm:w-44"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-xl transition-colors shrink-0"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ml-auto"
              >
                <FolderPlus className="w-3.5 h-3.5" /> New Folder
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Root Navigation */}
            <div
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group",
                selectedFolderId === null
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                <span className="text-xs font-bold truncate">Root Folder</span>
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-bold text-slate-500 shrink-0">
                {(currentClient?.expenseFiles || []).filter(f => !f.folderId).length}
              </span>
            </div>

            {/* User directories */}
            {(currentClient?.expenseFolders || []).map(folder => {
              const count = (currentClient?.expenseFiles || []).filter(f => f.folderId === folder.id).length;
              const isSelected = selectedFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group relative min-w-0",
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 mr-5">
                    {isSelected ? (
                      <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <FolderClosed className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold truncate" title={folder.name}>
                      {folder.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-bold text-slate-500">
                      {count}
                    </span>
                    <button
                      onClick={(e) => handleDeleteFolder(folder.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-all absolute right-1.5 top-1.5 bg-white dark:bg-slate-900 shadow-xs border border-slate-150 dark:border-slate-800"
                      title="Delete folder (files are preserved & moved back to Root)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search, Filter & Content Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {filteredFiles.length} file(s)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Search */}
              <input 
                type="text"
                placeholder="Search file name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-48"
              />

              {/* Filtering tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowFilter('all')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-lg transition-all",
                    showFilter === 'all' ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setShowFilter('unlinked')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-lg transition-all",
                    showFilter === 'unlinked' ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Unlinked
                </button>
                <button
                  onClick={() => setShowFilter('linked')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-lg transition-all",
                    showFilter === 'linked' ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Linked
                </button>
              </div>
            </div>
          </div>

          {/* Files Grid */}
          {filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => {
                // Find associated purchase if linked
                const linkedPurchase = purchases.find(p => p.id.toString() === file.associatedExpenseId?.toString());
                const isLinked = !!linkedPurchase;

                return (
                  <div 
                    key={file.id} 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all relative group"
                  >
                    <div>
                      {/* Top metadata strip */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type, file.name)}
                          <div className="min-w-0">
                            <h4 
                              className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate max-w-[160px]" 
                              title={file.name}
                            >
                              {file.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', year: 'numeric'})}
                            </p>
                          </div>
                        </div>

                        {/* File Action Row (Hover visible or static) */}
                        <div className="flex gap-1">
                          {file.dataUrl && (
                            <a 
                              href={file.dataUrl} 
                              download={file.name}
                              className="p-1 px-1.5 text-slate-500 hover:text-amber-600 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                              title="Download original file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setMovingFileId(movingFileId === file.id ? null : file.id)}
                            className={cn(
                              "p-1 px-1.5 rounded-lg border transition-all shadow-sm",
                              movingFileId === file.id
                                ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"
                                : "text-slate-500 hover:text-amber-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            )}
                            title="Move to another folder"
                          >
                            <FolderDown className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-transparent hover:border-red-100 transition-all"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Association block */}
                      <div className="border-t border-slate-150 dark:border-slate-800 pt-3 mt-2">
                        {isLinked ? (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-xl flex flex-col justify-between gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paperclipped
                              </span>
                              <button 
                                onClick={() => handleUnlinkFile(file.id)}
                                className="text-[10px] font-extrabold text-slate-500 hover:text-red-500 flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md hover:shadow-sm"
                                title="Unlink file attachment"
                              >
                                <Link2Off className="w-3 h-3 text-red-500" /> Disconnect
                              </button>
                            </div>
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-350">
                              Inv: <span className="font-mono text-emerald-600 dark:text-emerald-400">{linkedPurchase.invoiceNo}</span> • ({linkedPurchase.supplierName})
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                              <span>Date: {linkedPurchase.date}</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{(linkedPurchase.amount + (linkedPurchase.inputTax || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/60 dark:bg-slate-900/40 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase">Unattached File</span>
                              <button 
                                onClick={() => handleCreateEntryFromFile(file)}
                                className="text-[10px] bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3 text-slate-950" /> Fast Book
                              </button>
                            </div>

                            {activeLinkingId === file.id ? (
                              <div className="flex flex-col gap-1.5">
                                <select 
                                  onChange={e => {
                                    if (e.target.value) {
                                      handleLinkFileToPurchase(file.id, e.target.value);
                                    }
                                  }}
                                  className="text-[11px] w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 focus:outline-none"
                                >
                                  <option value="">Select invoice matches...</option>
                                  {purchases.filter(p => !p.attachedFileId).map(p => (
                                    <option key={p.id} value={p.id}>
                                      Inv #{p.invoiceNo} - {p.supplierName} (₱{(p.amount + (p.inputTax || 0)).toLocaleString(undefined, {maximumFractionDigits: 0})}) ({p.date})
                                    </option>
                                  ))}
                                </select>
                                <div className="flex justify-end gap-1">
                                  <button 
                                    onClick={() => setActiveLinkingId(null)}
                                    className="text-[9px] text-slate-500 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  if (purchases.length === 0) {
                                    alert("There are no registered expenses to link to yet. Please create an entry first or click 'Fast Book'!");
                                    return;
                                  }
                                  setActiveLinkingId(file.id);
                                }}
                                className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 font-bold py-1 px-2.5 rounded-lg text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 hover:shadow-xs"
                              >
                                <Link className="w-3.5 h-3.5 text-slate-400" /> Paperclip to Transaction...
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Moving Dropdown UI */}
                      {movingFileId === file.id && (
                        <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 rounded-b-2xl flex flex-col gap-1.5 z-20 shadow-lg animate-in fade-in slide-in-from-bottom duration-150">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Move file to folder:
                          </label>
                          <select
                            value={file.folderId || ''}
                            onChange={(e) => {
                              handleMoveFile(file.id, e.target.value || undefined);
                              setMovingFileId(null);
                            }}
                            className="text-[11px] py-1 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none w-full text-slate-700 dark:text-slate-200"
                          >
                            <option value="">Root Folder</option>
                            {(currentClient?.expenseFolders || []).map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setMovingFileId(null)}
                              className="text-[9px] text-slate-500 hover:text-amber-600 font-bold hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 border rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-3">
              <Upload className="w-8 h-8 opacity-30 animate-pulse" />
              <div>
                <p className="font-bold text-slate-600 dark:text-slate-400 text-sm">No files found</p>
                <p className="text-xs mt-1 max-w-xs mx-auto text-slate-400">
                  {searchQuery 
                    ? "Adjust your search keywords or parameters and try again" 
                    : "Drag or select file documents from your desktop folder to begin normal uploading!"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Global Footer Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
          <div className="text-xs text-slate-400 italic">
            All files are stored safely in your user cloud profile index.
          </div>
          <button 
            onClick={() => {
              openModal(null);
            }} 
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 font-bold px-6 py-2 rounded-xl transition-colors text-xs"
          >
            Close Folder Panel
          </button>
        </div>

      </div>
    </Modal>
  );
}
