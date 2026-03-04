
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  Save, 
  CheckCircle2
} from 'lucide-react';
import { loadExcelJSWorkbook, saveExcelJSWorkbook } from '../utils/excelHelper';
import { processPermissionFiles, updatePermissionsWorkbook, PermissionData } from '../utils/permissionLogic';
import { MultiSelectFilter } from './MultiSelectFilter';

const AccessPermissions: React.FC = () => {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<PermissionData | null>(null);
  const [resultWorkbook, setResultWorkbook] = useState<any>(null);
  
  // Drag State
  const [isDraggingMaster, setIsDraggingMaster] = useState(false);
  const [isDraggingUpdate, setIsDraggingUpdate] = useState(false);

  // Map column index to array of selected strings
  const [filters, setFilters] = useState<Record<number, string[]>>({});

  // --- Scrolling Refs & State ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);

  const [contentWidth, setContentWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const handleFileUpload = (file: File, type: 'MASTER' | 'UPDATE') => {
      if (type === 'MASTER') setMasterFile(file);
      else setUpdateFile(file);
  };
  
  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent, type: 'MASTER' | 'UPDATE') => {
      e.preventDefault();
      if (type === 'MASTER') setIsDraggingMaster(true);
      else setIsDraggingUpdate(true);
  };
  
  const handleDragLeave = (e: React.DragEvent, type: 'MASTER' | 'UPDATE') => {
      e.preventDefault();
      if (type === 'MASTER') setIsDraggingMaster(false);
      else setIsDraggingUpdate(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'MASTER' | 'UPDATE') => {
      e.preventDefault();
      if (type === 'MASTER') setIsDraggingMaster(false);
      else setIsDraggingUpdate(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0], type);
      }
  };

  const processData = async () => {
    if (!masterFile || !updateFile) return;
    setIsProcessing(true);
    
    try {
      const workbook = await loadExcelJSWorkbook(masterFile);
      const result = await processPermissionFiles(workbook, updateFile);
      
      // CRITICAL UPDATE: Apply the "Copy-Paste" logic IMMEDIATELY to the workbook in memory.
      // This ensures the workbook is updated BEFORE the user sees the preview.
      await updatePermissionsWorkbook(workbook, result.processedData);

      setPreviewData(result.processedData);
      setResultWorkbook(workbook);
      setFilters({}); // Reset filters
    } catch (error) {
      console.error(error);
      alert("Errore durante l'elaborazione: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!resultWorkbook || !previewData) return;
    try {
      // The workbook is already updated in processData, just save it.
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '.');
      // Uses the new saveFileAs inside helper
      await saveExcelJSWorkbook(resultWorkbook, `Gruppi Accesso ${dateStr}`);
    } catch (error) {
      console.error(error);
      alert("Errore durante il salvataggio.");
    }
  };

  const handleFilterChange = (colIndex: number, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [colIndex]: values
    }));
  };

  // Helper to extract unique values for a column to populate the dropdown
  const getUniqueValues = (colIndex: number) => {
    if (!previewData) return [];
    const unique = new Set<string>();
    previewData.body.forEach(row => {
        const val = String(row[colIndex] ?? "").trim();
        if(val) unique.add(val);
    });
    return Array.from(unique).sort();
  };

  const filteredBody = useMemo(() => {
    if (!previewData) return [];
    
    return previewData.body.filter((row: any[]) => {
      // Check every active filter
      return Object.entries(filters).every(([colIdxStr, val]) => {
        const selectedVals = val as string[];
        
        if (selectedVals.length === 0) return true; // No filter active for this column
        
        const colIdx = parseInt(colIdxStr);
        const cellRaw = row[colIdx];
        const cellValue = String(cellRaw ?? "").trim();
        
        // Multi-select logic: OR (if row matches ANY of selected values)
        return selectedVals.includes(cellValue);
      });
    });
  }, [previewData, filters]);

  // --- Scroll Sync Logic ---
  const handleScroll = (source: 'TABLE' | 'TOP' | 'LEFT') => {
    if (source === 'TABLE' && tableContainerRef.current) {
        if (topScrollRef.current) topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
        if (leftScrollRef.current) leftScrollRef.current.scrollTop = tableContainerRef.current.scrollTop;
    } 
    else if (source === 'TOP' && topScrollRef.current && tableContainerRef.current) {
        tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    else if (source === 'LEFT' && leftScrollRef.current && tableContainerRef.current) {
        tableContainerRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
  };

  // Update dimensions when data changes
  useEffect(() => {
    if (previewData && tableContainerRef.current) {
        // Small timeout to allow DOM update
        setTimeout(() => {
            if (tableContainerRef.current) {
                setContentWidth(tableContainerRef.current.scrollWidth);
                setContentHeight(tableContainerRef.current.scrollHeight);
            }
        }, 100);
    }
  }, [previewData, filters, filteredBody]);

  return (
    <div className="space-y-8 animate-fade-in pb-24 text-sm text-slate-600">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-500" />
          Gestione Permessi
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Carica il File Gruppi Accesso (Excel) e il File Estrazione EL.MO. Permessi di Accesso per Gruppi (CSV) - reperibile in piattaforma EL.MO. al percorso <em>"Permessi &gt; Permessi per Gruppo &gt; Gruppi: Tutti &gt; Seleziona Lettori: Tutti"</em>.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Master Upload */}
          <div 
             className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${isDraggingMaster || masterFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-corporate-400'}`}
             onDragOver={(e) => handleDragOver(e, 'MASTER')}
             onDragLeave={(e) => handleDragLeave(e, 'MASTER')}
             onDrop={(e) => handleDrop(e, 'MASTER')}
          >
            <FileSpreadsheet size={32} className={masterFile || isDraggingMaster ? 'text-emerald-600' : 'text-slate-400'} />
            <h3 className="font-bold mt-2 text-slate-900">File Gruppi Accesso (Excel)</h3>
            <input type="file" accept=".xlsx, .xls" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'MASTER')} className="hidden" id="perm-master" />
            <label htmlFor="perm-master" className="cursor-pointer px-4 py-2 mt-4 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-corporate-600 hover:bg-slate-50">
              {masterFile ? masterFile.name : 'Seleziona File'}
            </label>
          </div>

          {/* Update Upload */}
          <div 
             className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${isDraggingUpdate || updateFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-corporate-400'}`}
             onDragOver={(e) => handleDragOver(e, 'UPDATE')}
             onDragLeave={(e) => handleDragLeave(e, 'UPDATE')}
             onDrop={(e) => handleDrop(e, 'UPDATE')}
          >
            <Upload size={32} className={updateFile || isDraggingUpdate ? 'text-emerald-600' : 'text-slate-400'} />
            <h3 className="font-bold mt-2 text-slate-900">Estrazione EL.MO. Permessi di Accesso per Gruppi (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">Permessi &gt; Permessi per Gruppo &gt; Gruppi: Tutti &gt; Seleziona Lettori: Tutti</p>
            <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'UPDATE')} className="hidden" id="perm-update" />
            <label htmlFor="perm-update" className="cursor-pointer px-4 py-2 mt-4 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-corporate-600 hover:bg-slate-50">
              {updateFile ? updateFile.name : 'Seleziona File'}
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={processData}
            disabled={!masterFile || !updateFile || isProcessing}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
            aria-label="Analizza e prepara dati permessi"
          >
            {isProcessing ? 'Elaborazione...' : 'Analizza e Prepara'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {previewData && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px] relative">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <span className="font-bold text-slate-700">Anteprima Dati ({filteredBody.length} righe)</span>
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-corporate-600 hover:bg-corporate-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors"
              aria-label="Salva Excel aggiornato permessi"
            >
              <Save size={18} />
              Salva Excel Aggiornato
            </button>
          </div>

          {/* Top Horizontal Scrollbar Sync */}
          <div 
            ref={topScrollRef} 
            className="w-full overflow-x-auto bg-slate-50 border-b border-slate-200" 
            style={{ height: '16px' }}
            onScroll={() => handleScroll('TOP')}
          >
             <div style={{ width: contentWidth, height: '1px' }}></div>
          </div>

          <div className="flex-1 relative flex overflow-hidden">
             {/* Left Vertical Scrollbar Sync */}
             <div 
                ref={leftScrollRef}
                className="overflow-y-auto bg-slate-50 border-r border-slate-200 flex-shrink-0"
                style={{ width: '16px' }}
                onScroll={() => handleScroll('LEFT')}
             >
                 <div style={{ height: contentHeight, width: '1px' }}></div>
             </div>

             {/* Actual Table Container */}
             <div
               ref={tableContainerRef}
               className="flex-1 overflow-auto relative"
               onScroll={() => handleScroll('TABLE')}
             >
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-20 shadow-sm">
                    <tr>
                    {/* First column is "Gruppo" */}
                    <th className="px-4 py-3 border-b border-r border-slate-200 min-w-[250px] bg-slate-100 z-30 sticky left-0">
                        <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500">GRUPPO DI ACCESSO</span>
                        <MultiSelectFilter 
                            label="Gruppo"
                            options={getUniqueValues(0)}
                            selectedValues={filters[0] || []}
                            onChange={(vals) => handleFilterChange(0, vals)}
                        />
                        </div>
                    </th>
                    {/* Reader Columns */}
                    {previewData.headers.map((header, idx) => (
                        <th key={idx} className="px-4 py-3 border-b border-r border-slate-200 min-w-[180px] bg-slate-100 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                            <span title={header} className="truncate block max-w-[150px] text-xs font-bold">{header}</span>
                            <MultiSelectFilter 
                            label={header}
                            options={getUniqueValues(idx + 1)} // +1 because col 0 is Group
                            selectedValues={filters[idx + 1] || []}
                            onChange={(vals) => handleFilterChange(idx + 1, vals)}
                            />
                        </div>
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredBody.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                        {row.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className={`px-4 py-2 border-r border-slate-100 whitespace-nowrap text-xs ${cIdx === 0 ? 'font-bold text-slate-900 bg-slate-50/80 sticky left-0 border-r-2 border-r-slate-200' : ''}`}>
                            {cell === 'Abilitato' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm w-full justify-center">
                                Abilitato
                            </span>
                            ) : (
                            <span className="block truncate max-w-[200px]" title={String(cell)}>{cell}</span>
                            )}
                        </td>
                        ))}
                    </tr>
                    ))}
                    {filteredBody.length === 0 && (
                    <tr>
                        <td colSpan={previewData.headers.length + 1} className="px-6 py-12 text-center text-slate-400">
                        Nessun risultato trovato con i filtri correnti.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessPermissions;
