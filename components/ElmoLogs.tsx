
import React, { useState, useRef, useEffect } from 'react';
import { FileJson, Upload, Save, FileSpreadsheet, Trash2, Eye, Download } from 'lucide-react';
import { processElmoLogsToExcel, ProcessedSheet } from '../utils/elmoLogLogic';
import { saveExcelJSWorkbook } from '../utils/excelHelper';
import ExcelJS from 'exceljs';

const ElmoLogs: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Preview State
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [previewSheets, setPreviewSheets] = useState<ProcessedSheet[] | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // --- Scrolling Refs ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  
  // State for dummy scrollbars dimensions
  const [contentWidth, setContentWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Add new files to existing list
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      // Reset preview on new upload
      setWorkbook(null);
      setPreviewSheets(null);
    }
    // Reset input value to allow re-upload of same file if needed
    e.target.value = '';
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const newFiles = Array.from(e.dataTransfer.files).filter((f: File) => f.name.toLowerCase().endsWith('.csv'));
          if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);
            setWorkbook(null);
            setPreviewSheets(null);
          }
      }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setWorkbook(null);
    setPreviewSheets(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    try {
      const result = await processElmoLogsToExcel(files);
      setWorkbook(result.workbook);
      setPreviewSheets(result.previewData);
      setActiveSheetIdx(0);
    } catch (error) {
      console.error("Processing error", error);
      alert("Errore durante l'elaborazione dei file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSheetDate = (name: string): string | null => {
      // Format expected: mmm-yy (e.g., set-25)
      const parts = name.split('-');
      if (parts.length !== 2) return null;
      
      const m = parts[0];
      const y = parts[1];
      const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
      const mIdx = months.indexOf(m);
      
      if (mIdx === -1) return null;
      
      return `${String(mIdx + 1).padStart(2, '0')}.20${y}`;
  };

  const handleDownload = async () => {
      if (!workbook || !previewSheets || previewSheets.length === 0) return;

      const firstSheetName = previewSheets[0].name;
      const lastSheetName = previewSheets[previewSheets.length - 1].name;

      const firstDate = parseSheetDate(firstSheetName) || 'XX.XXXX';
      const lastDate = parseSheetDate(lastSheetName) || 'XX.XXXX';

      const filename = `Log Eventi ${firstDate} - ${lastDate}`;
      // Uses the new saveFileAs inside helper
      await saveExcelJSWorkbook(workbook, filename);
  };

  // Helper for row styling (replicating Excel Conditional Formatting)
  const getRowStyle = (text: string) => {
      const t = text.toLowerCase();
      if (t.includes('accesso consentito')) return 'bg-[#66FF66] text-black font-arial';
      if (t.includes('accesso negato')) return 'bg-[#FFFF00] text-black font-arial';
      if (t.includes('porta forzata')) return 'bg-[#FF6666] text-black font-bold font-arial';
      if (t.includes('porta ripristinata')) return 'bg-[#66CCFF] text-black font-arial';
      if (t.includes('porta rimasta aperta')) return 'bg-[#FF9933] text-black font-arial';
      return 'text-slate-700 font-arial';
  };

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
    if (previewSheets && tableContainerRef.current) {
        // Small timeout to allow render
        setTimeout(() => {
            if (tableContainerRef.current) {
                setContentWidth(tableContainerRef.current.scrollWidth);
                setContentHeight(tableContainerRef.current.scrollHeight);
            }
        }, 100);
    }
  }, [previewSheets, activeSheetIdx]);

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <FileJson className="text-rose-500" size={36} />
          Estrazioni Log Eventi EL.MO.
        </h2>
        <p className="text-slate-600">
          Carica i file CSV delle estrazioni mensili (es. Settembre, Ottobre). 
          Il tool genererà un <strong>unico file Excel</strong> formattato, con un foglio per ogni mese 
          (es. "set-25", "ott-25") e la formattazione condizionale sugli eventi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Upload Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div 
                   className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging || files.length > 0 ? 'border-rose-400 bg-rose-50' : 'border-rose-200 bg-rose-50/30'}`}
                   onDragOver={handleDragOver}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}
                >
                <input 
                    type="file" 
                    multiple 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    id="csv-upload" 
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <Upload size={24} className="text-rose-500" />
                    </div>
                    <span className="font-bold text-slate-700">Carica CSV Log Eventi EL.MO.</span>
                    <p className="text-xs text-slate-500 mt-2 text-center max-w-md leading-relaxed">
                        Eventi &gt; Seleziona il filtro di ricerca (se stiamo cercando eventi di un utente in particolare, o tutti gli eventi di alcuni lettori) &gt; Aggiorna &gt; Esporta
                    </p>
                </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                <div className="mt-6 space-y-2">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">File Caricati</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileSpreadsheet className="text-rose-400 flex-shrink-0" size={16} />
                                <span className="text-xs font-medium text-slate-800 truncate">{f.name}</span>
                            </div>
                            <button 
                                onClick={() => removeFile(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    </div>
                </div>
                )}

                <div className="mt-6">
                    <button 
                    onClick={handleProcess}
                    disabled={files.length === 0 || isProcessing}
                    className="w-full flex justify-center items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold shadow-md transition-all"
                    aria-label="Genera anteprima log EL.MO."
                    >
                    {isProcessing ? (
                        <>Elaborazione...</>
                    ) : (
                        <>
                        <Eye size={20} />
                        Genera Anteprima
                        </>
                    )}
                    </button>
                </div>
            </div>
        </div>

        {/* Right Column: Preview & Download */}
        <div className="lg:col-span-2 space-y-6">
            {previewSheets ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                    {/* Toolbar */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-[70%]">
                            {previewSheets.map((sheet, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveSheetIdx(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                                        activeSheetIdx === idx 
                                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {sheet.name}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm flex-shrink-0"
                            aria-label="Scarica file Excel log EL.MO."
                        >
                            <Download size={16} />
                            Scarica Excel
                        </button>
                    </div>

                    {/* Top Horizontal Scrollbar Sync */}
                    <div 
                        ref={topScrollRef} 
                        className="w-full overflow-x-auto bg-slate-50 border-b border-slate-200 flex-shrink-0" 
                        style={{ height: '16px' }}
                        onScroll={() => handleScroll('TOP')}
                    >
                        <div style={{ width: contentWidth, height: '1px' }}></div>
                    </div>

                    {/* Content Area with Side Scrollbar */}
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

                        {/* Main Table Container (Right/Bottom Native Scrollbars) */}
                        <div 
                            ref={tableContainerRef} 
                            className="flex-1 overflow-auto relative bg-white"
                            onScroll={() => handleScroll('TABLE')}
                        >
                            <table className="w-full text-left text-xs border-collapse font-arial">
                                <thead className="sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        {previewSheets[activeSheetIdx].headers.map((h, i) => (
                                            <th key={i} className="bg-[#E0E0E0] text-slate-900 font-bold px-3 py-2 border border-slate-300 whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewSheets[activeSheetIdx].rows.map((row, rIdx) => {
                                        // Assuming Column D (index 3) contains the Event Description for conditional formatting
                                        const eventText = row[3] ? String(row[3]) : '';
                                        const styleClass = getRowStyle(eventText);

                                        return (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => (
                                                    <td 
                                                        key={cIdx} 
                                                        className={`px-3 py-1.5 border border-slate-200 whitespace-nowrap ${cIdx === 3 ? styleClass : 'text-slate-700'}`}
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full min-h-[400px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <FileJson size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Carica i file e clicca su "Genera Anteprima"</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ElmoLogs;
