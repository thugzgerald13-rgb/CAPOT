import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { 
  UploadCloud, FileText, Trash2, Download, Search, 
  FileCode, FileImage, FileSpreadsheet, FileArchive, File, CheckCircle2, AlertTriangle, HardDrive
} from 'lucide-react';

interface ExpenseFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dateAdded: string;
  dataUrl: string; // Base64 data for actual local retrieval / download
}

export function ExpenseFilesModal() {
  const { activeModal, showToast } = useAccounting();
  const [files, setFiles] = useState<ExpenseFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from LocalStorage on mount or when modal becomes active
  useEffect(() => {
    if (activeModal === 'expense-files') {
      const stored = localStorage.getItem('expense_files');
      if (stored) {
        try {
          setFiles(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored expense files", e);
          setFiles([]);
        }
      } else {
        // Prepopulate with a helpful mock template so it looks professional initially
        const mockFiles: ExpenseFile[] = [
          {
            id: 'mock-1',
            name: 'Office_Rent_Invoice_Template.pdf',
            size: 145000,
            type: 'application/pdf',
            dateAdded: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 days ago
            dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...'
          },
          {
            id: 'mock-2',
            name: 'Taxi_Travel_Receipt_Sample.png',
            size: 48000,
            type: 'image/png',
            dateAdded: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          }
        ];
        setFiles(mockFiles);
        localStorage.setItem('expense_files', JSON.stringify(mockFiles));
      }
    }
  }, [activeModal]);

  const saveFilesToStorage = (updatedFiles: ExpenseFile[]) => {
    setFiles(updatedFiles);
    try {
      localStorage.setItem('expense_files', JSON.stringify(updatedFiles));
    } catch (e) {
      showToast('Storage limit reached! Try uploading smaller files.');
    }
  };

  // Convert uploaded file to base64 and save
  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const updated = [...files];
    let addedCount = 0;
    let limitExceeded = false;

    Array.from(fileList).forEach((file) => {
      // Limit file size to 2MB to keep localStorage happy
      if (file.size > 2 * 1024 * 1024) {
        limitExceeded = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        
        // Prevent duplicate names in the same session
        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        const newFile: ExpenseFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          dateAdded: new Date().toISOString(),
          dataUrl: base64Data
        };

        updated.unshift(newFile);
        saveFilesToStorage([...updated]);
        addedCount++;
        
        if (addedCount === fileList.length) {
          showToast(`Successfully uploaded ${addedCount} file(s)`);
        }
      };
      
      reader.readAsDataURL(file);
    });

    if (limitExceeded) {
      showToast('Some files skipped (Max limit is 2MB per file)');
    }
  };

  const handleDelete = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    saveFilesToStorage(updated);
    showToast('File deleted successfully');
  };

  const handleDownload = (file: ExpenseFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading: ${file.name}`);
  };

  // Helpers for file size formatting and file type icons
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    const mime = type.toLowerCase();
    if (mime.includes('image')) return <FileImage className="w-8 h-8 text-emerald-500 shrink-0" />;
    if (mime.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500 shrink-0" />;
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />;
    if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) return <FileArchive className="w-8 h-8 text-amber-500 shrink-0" />;
    if (mime.includes('json') || mime.includes('javascript') || mime.includes('xml')) return <FileCode className="w-8 h-8 text-purple-500 shrink-0" />;
    return <File className="w-8 h-8 text-slate-400 shrink-0" />;
  };

  // Filtered files
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Storage metric
  const totalStorageSize = files.reduce((acc, curr) => acc + curr.size, 0);
  const totalStorageFormatted = formatBytes(totalStorageSize);

  return (
    <Modal id="expense-files" title="Expense Files Drop" icon={<UploadCloud className="text-rose-500 w-6 h-6" />} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6 font-sans">
        
        {/* Banner Informational Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>Standalone Local Storage Manager</span>
          </div>
          <div>Used Space: <span className="font-bold text-slate-700 dark:text-slate-200">{totalStorageFormatted}</span> / 5.0 MB Limit</div>
        </div>

        {/* Drag & Drop uploader area */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20' 
              : 'border-slate-300 dark:border-slate-700 hover:border-rose-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden" 
            multiple 
          />
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-full mb-3 text-rose-500">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Upload Expense Files</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-sm">
            Drag and drop bills, purchase invoices, receipts, or templates here, or <span className="text-rose-500 font-bold hover:underline">browse files</span>. Max size limit 2MB per file.
          </p>
        </div>

        {/* Search & Listing Zone */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              My Uploaded Files ({filteredFiles.length})
            </h3>
            
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search file name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-rose-500 transition-all text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {/* Files List */}
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
              <File className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No matching files found</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Upload files using the box above to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  className="p-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-rose-300 dark:hover:border-rose-900 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(file.type)}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold">{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.dateAdded).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleDownload(file)}
                      className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Download/View file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning Badge */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-xl flex gap-3 text-xs text-amber-800 dark:text-amber-400 font-semibold items-start leading-relaxed shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Offline Storage & Non-Integration Notice</p>
            <p className="text-slate-600 dark:text-slate-400 font-normal">This module operates as a separate local utility to drop and organise files. These files are stored strictly offline in your browser's private local state manager and do not link with transactions, taxes, or general ledger records.</p>
          </div>
        </div>

      </div>
    </Modal>
  );
}
