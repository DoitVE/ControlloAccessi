
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Save, 
  ArrowRight,
  Database,
  Info,
  X,
  AlertTriangle,
  Copy,
  ShieldAlert,
  Check,
  Sparkles,
  Wand2
} from 'lucide-react';
import { readExcelFile, loadExcelJSWorkbook, saveExcelJSWorkbook } from '../utils/excelHelper';
import { processFiles, updateWorkbook, deleteDeviceFromWorkbook, checkDeactivatedMismatch, updateElmoSheet, detectNewElmoNames } from '../utils/deviceRegistryLogic';
import { DeviceEntry, ProcessingResult, DuplicateGroup, MismatchItem } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';

const DeviceRegistry: React.FC = () => {
  const [registryFile, setRegistryFile] = useState<File | null>(null);
  const [elmoFile, setElmoFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Drag State
  const [isDraggingReg, setIsDraggingReg] = useState(false);
  const [isDraggingElmo, setIsDraggingElmo] = useState(false);
  
  // Filter State
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [currentWizardIndex, setCurrentWizardIndex] = useState(0);
  const [wizardEntries, setWizardEntries] = useState<DeviceEntry[]>([]);

  // Notification State
  const [showElmoNotification, setShowElmoNotification] = useState(false);

  // Orphans State
  const [orphans, setOrphans] = useState<DeviceEntry[]>([]);
  const [currentOrphanIndex, setCurrentOrphanIndex] = useState(0);
  const [showOrphanModal, setShowOrphanModal] = useState(false);

  // Duplicates State
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);

  // Mismatch State (Queue)
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [currentMismatchIndex, setCurrentMismatchIndex] = useState(0);
  const [showMismatchWizard, setShowMismatchWizard] = useState(false);
  // Activation Choice State
  const [activationTempistica, setActivationTempistica] = useState('LUNGO TERMINE');

  // Main Data State
  const [registryData, setRegistryData] = useState<DeviceEntry[]>([]);

  // --- Scrolling Refs ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  
  // State for dummy scrollbars dimensions
  const [contentWidth, setContentWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // --- STANDARD STYLES FOR UNIFORMITY ---
  const LABEL_CLS = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";
  const INPUT_CLS = "w-full p-2.5 text-sm text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal transition-all bg-white";
  
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
    if (registryData.length > 0 && tableContainerRef.current) {
        setTimeout(() => {
            if (tableContainerRef.current) {
                setContentWidth(tableContainerRef.current.scrollWidth);
                setContentHeight(tableContainerRef.current.scrollHeight);
            }
        }, 100);
    }
  }, [registryData, filters]);


  const handleFileUpload = (file: File, type: 'REGISTRY' | 'ELMO') => {
      if (type === 'REGISTRY') setRegistryFile(file);
      else setElmoFile(file);
  };

  const handleDragOver = (e: React.DragEvent, type: 'REGISTRY' | 'ELMO') => {
      e.preventDefault();
      if (type === 'REGISTRY') setIsDraggingReg(true);
      else setIsDraggingElmo(true);
  };
  
  const handleDragLeave = (e: React.DragEvent, type: 'REGISTRY' | 'ELMO') => {
      e.preventDefault();
      if (type === 'REGISTRY') setIsDraggingReg(false);
      else setIsDraggingElmo(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'REGISTRY' | 'ELMO') => {
      e.preventDefault();
      if (type === 'REGISTRY') setIsDraggingReg(false);
      else setIsDraggingElmo(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0], type);
      }
  };

  const processData = async () => {
    if (!registryFile || !elmoFile) return;
    setIsProcessing(true);
    try {
      const workbook = await loadExcelJSWorkbook(registryFile);
      const elmoRaw = await readExcelFile(elmoFile);
      
      // 1. Detect New EL.MO Names BEFORE overwriting Sheet 2
      // This identifies names that are in the new export but NOT yet in the EL.MO. Utenti sheet
      const newNames = detectNewElmoNames(workbook, elmoRaw);

      // 2. THE "COPINCOLLA": Update Sheet 2 with new data
      updateElmoSheet(workbook, elmoRaw);

      // 3. ANALYZE: Analysis now happens reading from the updated Sheet 2
            const result = await processFiles(workbook, newNames, elmoRaw);
      result.originalWorkbook = workbook; 

      setProcessingResult(result);
      setRegistryData(result.mergedRegistry);
      
      // Seguendo l'ordine richiesto: Prima le differenze dell'export (Box Azzurro)
      if (result.elmoNewNames && result.elmoNewNames.length > 0) {
        setShowElmoNotification(true);
      } else {
        startAnalysisFlow(result);
      }
    } catch (error) {
      console.error("Error processing files", error);
      alert("Errore nella lettura dei file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performMismatchCheck = (workbook: any) => {
    const foundMismatches = checkDeactivatedMismatch(workbook);
    if (foundMismatches.length > 0) {
       setMismatches(foundMismatches);
       setCurrentMismatchIndex(0);
       setShowMismatchWizard(true);
    } else {
       if (processingResult) proceedToWizard(processingResult);
    }
  };

  const proceedToOrphans = () => {
     setShowDuplicateModal(false);
     if (processingResult && processingResult.orphanedDevices.length > 0) {
        setOrphans(processingResult.orphanedDevices);
        setShowOrphanModal(true);
     } else if (processingResult) {
        performMismatchCheck(processingResult.originalWorkbook);
     }
  };

  const proceedToElmoNotification = (result: ProcessingResult) => {
    if (result.elmoNewNames.length > 0) {
      setShowElmoNotification(true);
    } else {
      proceedToWizard(result);
    }
  };

  const proceedToWizard = (result: ProcessingResult) => {
    if (result.newDevices.length > 0) {
      setWizardEntries(result.newDevices);
      setShowWizard(true);
    }
  };

  const startAnalysisFlow = (result: ProcessingResult) => {
    if (result.duplicates && result.duplicates.length > 0) {
      setDuplicates(result.duplicates);
      setShowDuplicateModal(true);
    } else if (result.orphanedDevices.length > 0) {
      setOrphans(result.orphanedDevices);
      setShowOrphanModal(true);
    } else {
      performMismatchCheck(result.originalWorkbook);
    }
  };

  const closeElmoNotification = () => {
    setShowElmoNotification(false);
    if (processingResult) {
      startAnalysisFlow(processingResult);
    }
  };

  const handleDuplicateDecision = (entryToDelete: DeviceEntry | null) => {
      if (!processingResult || !processingResult.originalWorkbook) return;
      if (entryToDelete && entryToDelete.rowIndex) {
          const success = deleteDeviceFromWorkbook(processingResult.originalWorkbook, entryToDelete.rowIndex);
          if (success) setRegistryData(prev => prev.filter(d => d.rowIndex !== entryToDelete.rowIndex));
      }
      if (currentDuplicateIndex < duplicates.length - 1) setCurrentDuplicateIndex(prev => prev + 1);
      else proceedToOrphans();
  };

  const handleOrphanDecision = (shouldDelete: boolean) => {
    if (!processingResult || !processingResult.originalWorkbook) return;
    const currentOrphan = orphans[currentOrphanIndex];
    if (shouldDelete && currentOrphan.rowIndex) {
        const success = deleteDeviceFromWorkbook(processingResult.originalWorkbook, currentOrphan.rowIndex); 
        if (success) setRegistryData(prev => prev.filter(d => d.rowIndex !== currentOrphan.rowIndex));
    }
    if (currentOrphanIndex < orphans.length - 1) setCurrentOrphanIndex(prev => prev + 1);
    else {
      setShowOrphanModal(false);
      setOrphans([]);
      setCurrentOrphanIndex(0);
      performMismatchCheck(processingResult.originalWorkbook);
    }
  };

  const handleMismatchDecision = (confirmed: boolean) => {
      if (!processingResult || !processingResult.originalWorkbook) return;
      const item = mismatches[currentMismatchIndex];
      const isActivation = item.suggestedAction === 'ACTIVATE';
      let shouldUpdate = false;
      let newValue = "";
      if (isActivation) {
          if (confirmed) {
              newValue = activationTempistica;
              shouldUpdate = true;
          }
      } else {
          if (confirmed) {
              newValue = "DISATTIVATA";
              shouldUpdate = true;
          } else {
              alert("Si richiede modifica sulla piattaforma EL.MO.");
          }
      }
      if (shouldUpdate) {
          setRegistryData(prev => prev.map(d => (d.rowIndex === item.rowIndex ? { ...d, tempistica: newValue } : d)));
          let registrySheet = processingResult.originalWorkbook.worksheets.find((w: any) => w.name.toUpperCase().includes('REGISTRO')) || processingResult.originalWorkbook.worksheets[0];
          const row = registrySheet.getRow(item.rowIndex);
          row.getCell(8).value = newValue; 
          row.commit();
      }
      if (currentMismatchIndex < mismatches.length - 1) {
          setCurrentMismatchIndex(prev => prev + 1);
          setActivationTempistica('LUNGO TERMINE');
      } else {
          setShowMismatchWizard(false);
          setMismatches([]);
          proceedToWizard(processingResult);
      }
  };

  const suggestions = useMemo(() => {
    const currentReferente = wizardEntries[currentWizardIndex]?.referente || "";
    if (!currentReferente && currentReferente.length < 2) return { names: [], matricola: [], azienda: [], reparto: [], note: [] };
    const term = currentReferente.toLowerCase();
    const nameMatches = new Set<string>();
    registryData.forEach(d => {
       const ref = d.referente || "";
       if (ref.toLowerCase().includes(term)) nameMatches.add(ref);
    });
    const matches = registryData.filter(item => item.referente && item.referente.toLowerCase().includes(term));
    const unique = (key: keyof DeviceEntry) => {
       const set = new Set<string>();
       matches.forEach(m => {
          const val = String(m[key] || "").trim();
          if (val) set.add(val);
       });
       return Array.from(set).slice(0, 5);
    };
    return { names: Array.from(nameMatches).slice(0, 5), matricola: unique('matricola'), azienda: unique('azienda'), reparto: unique('reparto'), note: unique('note') };
  }, [wizardEntries, currentWizardIndex, registryData]);

  const handleWizardUpdate = (field: keyof DeviceEntry, value: string) => {
    const updated = [...wizardEntries];
    updated[currentWizardIndex] = { ...updated[currentWizardIndex], [field]: value };
    setWizardEntries(updated);
  };

  const nextWizardStep = () => {
    if (currentWizardIndex < wizardEntries.length - 1) setCurrentWizardIndex(prev => prev + 1);
    else {
      setRegistryData(prev => [...prev, ...wizardEntries]);
      setShowWizard(false);
      setWizardEntries([]);
      setCurrentWizardIndex(0);
    }
  };
  
  const SuggestionPill = ({ values, field }: { values: string[], field: keyof DeviceEntry }) => {
    if (values.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
         {values.map((val, idx) => (
            <button key={idx} onClick={() => handleWizardUpdate(field, val)} className="flex items-center gap-1 text-[10px] bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full transition-colors animate-fade-in shadow-sm">
              <Sparkles size={10} /> {val}
            </button>
         ))}
      </div>
    );
  };

  const handleExport = async () => {
    if (!processingResult?.originalWorkbook) return;
    try {
      await updateWorkbook(processingResult.originalWorkbook, registryData, processingResult.fullElmoList || []);
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '.');
      await saveExcelJSWorkbook(processingResult.originalWorkbook, `Registro Dispositivi e Utenti ${dateStr}`);
    } catch (e) {
      console.error("Export error", e);
      alert("Errore durante il salvataggio del file.");
    }
  };

  const getUniqueValues = (field: keyof DeviceEntry) => {
    const unique = new Set<string>();
    registryData.forEach(item => {
      const val = String(item[field] || "").trim();
      if(val) unique.add(val);
    });
    return Array.from(unique).sort();
  };

  const handleFilterChange = (field: string, values: string[]) => setFilters(prev => ({ ...prev, [field]: values }));

  const filteredData = useMemo(() => {
    return registryData.filter(item => Object.entries(filters).every(([key, val]) => {
          const selectedVals = val as string[];
          if (selectedVals.length === 0) return true;
          return selectedVals.includes(String((item as any)[key] || "").trim());
       }));
  }, [registryData, filters]);

  const deleteEntry = (idUtente: string) => {
    const entry = registryData.find(d => d.idUtente === idUtente);
    if (entry && window.confirm(`Sei sicuro di voler eliminare il dispositivo ${idUtente} (${entry.nominativo})?`)) {
      if (entry.rowIndex && processingResult?.originalWorkbook) deleteDeviceFromWorkbook(processingResult.originalWorkbook, entry.rowIndex);
      setRegistryData(prev => prev.filter(d => d.idUtente !== idUtente));
    }
  };

  const formatDisplayDate = (val: string | undefined) => {
    if (!val) return "";
    const num = Number(val);
    if (!isNaN(num) && num > 20000 && num < 90000) {
         return new Date(Math.round((num - 25569) * 86400 * 1000)).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const match = String(val).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
        const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
        if (!isNaN(d.getTime())) return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    return val;
  };
  
  const colWidths = { id: 130, nominativo: 220, azienda: 180 };
  const stickyPositions = { id: 0, nominativo: colWidths.id, azienda: colWidths.id + colWidths.nominativo };
  const currentMismatchItem = mismatches[currentMismatchIndex];
  const isActivation = currentMismatchItem?.suggestedAction === 'ACTIVATE';

  return (
    <div className="space-y-8 animate-fade-in pb-24 relative text-sm text-slate-600">
      {showMismatchWizard && mismatches.length > 0 && currentMismatchItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[140] p-4">
           <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in border ${isActivation ? 'border-blue-100' : 'border-orange-100'}`}>
             <div className={`${isActivation ? 'bg-blue-600' : 'bg-orange-500'} p-4 text-white flex justify-between items-center`}>
                 <h3 className="font-bold text-lg flex items-center gap-2">
                     <ShieldAlert size={24} /> {isActivation ? 'Riattivazione Rilevata' : 'Incongruenza Stato Dispositivo'} 
                     <span className="text-xs opacity-80">({currentMismatchIndex + 1}/{mismatches.length})</span>
                 </h3>
             </div>
             <div className="p-8 text-center space-y-6">
                 <p className="text-slate-600">Differenza di stato per: <br/><strong className="text-lg text-slate-900">{currentMismatchItem.nominativo}</strong></p>
                 <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <div><span className={LABEL_CLS}>Registro</span><span className={`font-mono font-bold ${currentMismatchItem.currentRegStatus.includes('DISATTIVAT') ? 'text-red-500' : 'text-green-600'}`}>{currentMismatchItem.currentRegStatus || "ATTIVO"}</span></div>
                     <div className="border-l border-slate-200"><span className={LABEL_CLS}>EL.MO. Aggiornata</span><span className={`font-bold ${isActivation ? 'text-green-600' : 'text-red-500'}`}>{currentMismatchItem.elmoGroup}</span></div>
                 </div>
                 <p className="font-medium text-slate-800 text-lg">{isActivation ? "Utenza risulta attiva in EL.MO. Aggiornare registro?" : "Utenza risulta disattiva in EL.MO. Aggiornare registro?"}</p>
                 {isActivation && (
                    <div className="w-full max-w-xs mx-auto">
                        <label className={`${LABEL_CLS} mb-2`}>Tempistica</label>
                        <select value={activationTempistica} onChange={(e) => setActivationTempistica(e.target.value)} className={INPUT_CLS}>
                            <option value="LUNGO TERMINE">LUNGO TERMINE</option>
                            <option value="BREVE TERMINE">BREVE TERMINE</option>
                        </select>
                    </div>
                 )}
                 <div className="flex justify-center gap-4">
                     <button onClick={() => handleMismatchDecision(false)} className="px-6 py-3 rounded-lg border-2 border-slate-200 text-slate-600 font-bold hover:border-slate-400">NO</button>
                     <button onClick={() => handleMismatchDecision(true)} className={`px-6 py-3 rounded-lg text-white font-bold transition-colors shadow-lg flex items-center gap-2 ${isActivation ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}><Check size={18} /> {isActivation ? 'SÌ (Conferma Attivazione)' : 'SÌ (Imposta "DISATTIVATA")'}</button>
                 </div>
             </div>
           </div>
        </div>
      )}

      {showDuplicateModal && duplicates.length > 0 && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-bounce-in border border-amber-100">
               <div className="bg-amber-500 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><Copy size={24} /> Rilevati Duplicati ({currentDuplicateIndex + 1}/{duplicates.length})</h3></div>
               <div className="p-6">
                  <p className="text-slate-600 mb-6 text-center">ID <strong>{duplicates[currentDuplicateIndex].id}</strong> duplicato nel registro. Seleziona quale eliminare.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {duplicates[currentDuplicateIndex].entries.map((entry, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:border-red-400">
                           <div className="text-xs text-slate-400 font-mono mb-2">Riga: {entry.rowIndex}</div>
                           <div className="font-bold text-lg mb-1">{entry.nominativo}</div>
                           <div className="text-sm text-slate-600 mb-4">{entry.azienda} - {entry.reparto}</div>
                           <button onClick={() => handleDuplicateDecision(entry)} className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50">Elimina Questa Riga</button>
                        </div>
                     ))}
                  </div>
                  <div className="mt-8 flex justify-center"><button onClick={() => handleDuplicateDecision(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Mantieni Entrambi</button></div>
               </div>
            </div>
         </div>
      )}

      {showOrphanModal && orphans.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in border border-rose-100">
             <div className="bg-rose-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle size={24} /> Dispositivo Orfano ({currentOrphanIndex + 1}/{orphans.length})</h3></div>
             <div className="p-8 text-center space-y-4">
                <p className="text-slate-600 text-lg">Il dispositivo <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">{orphans[currentOrphanIndex].idUtente}</strong><br/>assegnato a <strong className="text-slate-900">{orphans[currentOrphanIndex].nominativo || "Sconosciuto"}</strong><br/>non esiste più in EL.MO.</p>
                <p className="text-sm text-rose-500 font-bold">Vuoi eliminare il rigo dal registro?</p>
                <div className="flex justify-center gap-4 mt-6">
                   <button onClick={() => handleOrphanDecision(false)} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50">No, mantieni</button>
                   <button onClick={() => handleOrphanDecision(true)} className="px-6 py-3 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700">Sì, elimina rigo</button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      {showElmoNotification && processingResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in border border-sky-100">
             <div className="bg-sky-500 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><Info size={20} /> Aggiornamento EL.MO.</h3><button onClick={closeElmoNotification} className="hover:bg-sky-600 p-1 rounded-full"><X size={20} /></button></div>
             <div className="p-6">
                <p className="text-slate-600 mb-4">Aggiunti al foglio <strong>EL.MO. Utenti</strong>:</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 max-h-48 overflow-y-auto uppercase leading-relaxed">{processingResult.elmoNewNames.join(', ') + '.'}</div>
                <div className="mt-6 flex justify-end"><button onClick={closeElmoNotification} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg font-medium">OK, Procedi</button></div>
             </div>
          </div>
        </div>
      )}

      {showWizard && wizardEntries.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-fade-in border border-emerald-100 flex flex-col max-h-[90vh]">
             <div className="bg-emerald-600 p-6 text-white flex justify-between items-center shrink-0">
              <div><h2 className="text-2xl font-bold">Nuovi Dispositivi da Censire</h2><p className="opacity-90">Utenti con dispositivo non presente nel registro.</p><p className="text-xs opacity-75 mt-1">Step {currentWizardIndex + 1} di {wizardEntries.length}</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><AlertCircle size={24} /></div>
            </div>
            <div className="h-2 bg-slate-100 w-full shrink-0"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((currentWizardIndex + 1) / wizardEntries.length) * 100}%` }}></div></div>
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="border-2 border-emerald-100 bg-emerald-50/50 rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-emerald-100/50 p-3 border-b border-emerald-100"><h3 className="text-center font-bold text-slate-900 uppercase tracking-widest text-sm">Dati Assegnatario</h3></div>
                 <div className="p-6"><div className="grid grid-cols-2 gap-4 text-sm mb-4"><div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">CODICE DISPOSITIVO</span><span className="font-mono font-bold text-slate-900 text-lg bg-white px-3 py-1.5 rounded border border-emerald-100 block w-full">{wizardEntries[currentWizardIndex].idUtente}</span></div><div><span className="text-slate-500 block text-xs uppercase font-bold mb-1">NOMINATIVO</span><span className="font-bold text-slate-900 text-lg bg-white px-3 py-1.5 rounded border border-emerald-100 block w-full">{wizardEntries[currentWizardIndex].nominativo}</span></div></div><div><label className={LABEL_CLS}>AZIENDA AFFIDATARIO</label><input type="text" className={INPUT_CLS} value={wizardEntries[currentWizardIndex].azienda} onChange={(e) => handleWizardUpdate('azienda', e.target.value)} /><SuggestionPill values={suggestions.azienda} field="azienda" /></div></div>
              </div>
              <div className="border-2 border-sky-100 bg-sky-50/50 rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-sky-100/50 p-3 border-b border-sky-100"><h3 className="text-center font-bold text-slate-900 uppercase tracking-widest text-sm">Dati Committente</h3></div>
                 <div className="p-6 space-y-4"><div className="relative"><label className={LABEL_CLS}>COMMITTENTE DISPOSITIVO <span className="ml-auto text-sky-600 flex items-center gap-1 font-normal normal-case"><Wand2 size={12} />Scrivi per suggerimenti</span></label><input type="text" placeholder="Mario Rossi" className={INPUT_CLS} value={wizardEntries[currentWizardIndex].referente} onChange={(e) => handleWizardUpdate('referente', e.target.value)} autoFocus /><SuggestionPill values={suggestions.names} field="referente" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={LABEL_CLS}>MATRICOLA COMMITTENTE</label><input type="text" className={INPUT_CLS} value={wizardEntries[currentWizardIndex].matricola} onChange={(e) => handleWizardUpdate('matricola', e.target.value)} /><SuggestionPill values={suggestions.matricola} field="matricola" /></div><div><label className={LABEL_CLS}>AZIENDA/REPARTO COMMITTENTE</label><input type="text" className={INPUT_CLS} value={wizardEntries[currentWizardIndex].reparto} onChange={(e) => handleWizardUpdate('reparto', e.target.value)} /><SuggestionPill values={suggestions.reparto} field="reparto" /></div></div></div>
              </div>
              <div className="border-2 border-emerald-100 bg-emerald-50/50 rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-emerald-100/50 p-3 border-b border-emerald-100"><h3 className="text-center font-bold text-slate-900 uppercase tracking-widest text-sm">Dati Affidamento</h3></div>
                 <div className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className={LABEL_CLS}>TEMPISTICA</label><select className={INPUT_CLS} value={wizardEntries[currentWizardIndex].tempistica} onChange={(e) => handleWizardUpdate('tempistica', e.target.value)}><option value="LUNGO TERMINE">LUNGO TERMINE</option><option value="BREVE TERMINE">BREVE TERMINE</option></select></div><div><label className={LABEL_CLS}>DATA CONSEGNA</label><input type="text" placeholder="gg/mm/aaaa" className={INPUT_CLS} value={wizardEntries[currentWizardIndex].dataConsegna} onChange={(e) => handleWizardUpdate('dataConsegna', e.target.value)} /></div></div><div><label className={LABEL_CLS}>NOTE</label><textarea rows={2} className={INPUT_CLS} value={wizardEntries[currentWizardIndex].note} onChange={(e) => handleWizardUpdate('note', e.target.value)} /><SuggestionPill values={suggestions.note} field="note" /></div></div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-100"><button onClick={nextWizardStep} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all">{currentWizardIndex < wizardEntries.length - 1 ? 'Avanti' : 'Termina e Salva'}<ArrowRight size={20} /></button></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Database className="text-violet-500" /> Registro Dispositivi</h2>
        <p className="text-slate-600 mb-6">Carica Registro e Estrazione EL.MO. per il confronto.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center text-center transition-all ${isDraggingReg || registryFile ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-corporate-400'}`} onDragOver={(e) => handleDragOver(e, 'REGISTRY')} onDragLeave={(e) => handleDragLeave(e, 'REGISTRY')} onDrop={(e) => handleDrop(e, 'REGISTRY')}><FileSpreadsheet size={32} className={registryFile || isDraggingReg ? 'text-violet-600' : 'text-slate-400'} /><h3 className="font-bold mt-2">Registro Dispositivi (Excel)</h3><input type="file" accept=".xlsx, .xls" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'REGISTRY')} className="hidden" id="reg-file" /><label htmlFor="reg-file" className="cursor-pointer px-4 py-2 mt-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-corporate-600">{registryFile ? registryFile.name : 'Seleziona File'}</label></div>
          <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center text-center transition-all ${isDraggingElmo || elmoFile ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-corporate-400'}`} onDragOver={(e) => handleDragOver(e, 'ELMO')} onDragLeave={(e) => handleDragLeave(e, 'ELMO')} onDrop={(e) => handleDrop(e, 'ELMO')}><Upload size={32} className={elmoFile || isDraggingElmo ? 'text-violet-600' : 'text-slate-400'} /><h3 className="font-bold mt-2">Estrazione EL.MO. (CSV/Excel)</h3><input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'ELMO')} className="hidden" id="elmo-file" /><label htmlFor="elmo-file" className="cursor-pointer px-4 py-2 mt-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-corporate-600">{elmoFile ? elmoFile.name : 'Seleziona File'}</label></div>
        </div>
        <div className="mt-8 flex justify-center"><button onClick={processData} disabled={!registryFile || !elmoFile || isProcessing} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all" aria-label="Confronta e aggiorna registro dispositivi">{isProcessing ? 'Analisi...' : 'Confronta e Aggiorna'}<ArrowRight size={20} /></button></div>
      </div>

      {registryData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px] relative">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><div className="flex items-center gap-2"><CheckCircle size={20} className="text-emerald-500" /><span className="font-bold text-slate-700">Registro Unificato ({filteredData.length} voci)</span></div><button onClick={handleExport} className="flex items-center gap-2 bg-corporate-600 hover:bg-corporate-700 text-white px-4 py-2 rounded-lg font-bold" aria-label="Salva registro dispositivi in Excel"><Save size={18} /> Salva Registro</button></div>
          <div ref={topScrollRef} className="w-full overflow-x-auto bg-slate-50 border-b border-slate-200" style={{ height: '16px' }} onScroll={() => handleScroll('TOP')}><div style={{ width: contentWidth, height: '1px' }}></div></div>
          <div className="flex-1 relative flex overflow-hidden"><div ref={leftScrollRef} className="overflow-y-auto bg-slate-50 border-r border-slate-200 flex-shrink-0" style={{ width: '16px' }} onScroll={() => handleScroll('LEFT')}><div style={{ height: contentHeight, width: '1px' }}></div></div><div ref={tableContainerRef} className="flex-1 overflow-auto relative" onScroll={() => handleScroll('TABLE')}><table className="w-full text-left text-sm border-collapse"><thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-50 shadow-sm"><tr className="bg-slate-200 text-xs uppercase tracking-wider"><th colSpan={1} className="px-4 py-1 text-center border-r border-slate-300 sticky z-[60] bg-slate-200" style={{ left: stickyPositions.id, width: colWidths.id, minWidth: colWidths.id, maxWidth: colWidths.id }}>ID</th><th colSpan={2} className="px-4 py-1 text-center border-r border-slate-300 sticky z-[60] bg-sky-200 text-sky-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ left: stickyPositions.nominativo, width: colWidths.nominativo + colWidths.azienda, minWidth: colWidths.nominativo + colWidths.azienda }}>Assegnatario</th><th colSpan={3} className="px-4 py-1 text-center border-r border-slate-300 bg-emerald-100 text-emerald-900">Committente</th><th colSpan={2} className="px-4 py-1 text-center border-r border-slate-300 bg-white">Affidamento</th><th className="px-4 py-1 text-center bg-white border-l">Note</th><th className="bg-white"></th></tr><tr><th className="px-4 py-3 border-b border-r border-slate-200 bg-slate-100 z-[60] sticky" style={{ left: stickyPositions.id, width: colWidths.id, minWidth: colWidths.id, maxWidth: colWidths.id }}><div className="flex flex-col gap-2"><span className="text-xs font-bold text-slate-500">ID</span><MultiSelectFilter label="ID" options={getUniqueValues('idUtente')} selectedValues={filters['idUtente'] || []} onChange={(vals) => handleFilterChange('idUtente', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 bg-sky-50 z-[60] sticky" style={{ left: stickyPositions.nominativo, width: colWidths.nominativo, minWidth: colWidths.nominativo, maxWidth: colWidths.nominativo }}><div className="flex flex-col gap-2"><span className="text-xs font-bold text-sky-900/70">NOMINATIVO</span><MultiSelectFilter label="Nominativo" options={getUniqueValues('nominativo')} selectedValues={filters['nominativo'] || []} onChange={(vals) => handleFilterChange('nominativo', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 bg-sky-50 z-[60] sticky shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ left: stickyPositions.azienda, width: colWidths.azienda, minWidth: colWidths.azienda, maxWidth: colWidths.azienda }}><div className="flex flex-col gap-2"><span className="text-xs font-bold text-sky-900/70">AZIENDA</span><MultiSelectFilter label="Azienda" options={getUniqueValues('azienda')} selectedValues={filters['azienda'] || []} onChange={(vals) => handleFilterChange('azienda', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 min-w-[200px] bg-emerald-50/50"><div className="flex flex-col gap-2"><span className="text-xs font-bold text-emerald-900/70">NOMINATIVO</span><MultiSelectFilter label="Referente" options={getUniqueValues('referente')} selectedValues={filters['referente'] || []} onChange={(vals) => handleFilterChange('referente', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 min-w-[120px] bg-emerald-50/50"><div className="flex flex-col gap-2"><span className="text-xs font-bold text-emerald-900/70">MATRICOLA</span><MultiSelectFilter label="Matricola" options={getUniqueValues('matricola')} selectedValues={filters['matricola'] || []} onChange={(vals) => handleFilterChange('matricola', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 min-w-[200px] bg-emerald-50/50"><div className="flex flex-col gap-2"><span className="text-xs font-bold text-emerald-900/70">REPARTO</span><MultiSelectFilter label="Reparto" options={getUniqueValues('reparto')} selectedValues={filters['reparto'] || []} onChange={(vals) => handleFilterChange('reparto', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 min-w-[150px] bg-white"><div className="flex flex-col gap-2"><span className="text-xs font-bold text-slate-700">TEMPISTICA</span><MultiSelectFilter label="Tempistica" options={getUniqueValues('tempistica')} selectedValues={filters['tempistica'] || []} onChange={(vals) => handleFilterChange('tempistica', vals)} /></div></th><th className="px-4 py-3 border-b border-r border-slate-200 min-w-[120px] bg-white"><span className="text-xs font-bold text-slate-700 uppercase">CONSEGNA</span></th><th className="px-4 py-3 border-b border-slate-200 min-w-[250px] bg-white"><span className="text-xs font-bold text-slate-700 uppercase">NOTE</span></th><th className="px-4 py-3 border-b border-l border-slate-200 w-10 bg-white"></th></tr></thead><tbody className="divide-y divide-slate-100">{filteredData.map((item, idx) => (<tr key={item.idUtente + idx} className={`hover:bg-slate-50 ${item.isNew ? 'bg-green-50/50' : ''}`}><td className="px-4 py-3 font-mono font-bold text-slate-800 border-r bg-slate-50 sticky z-40" style={{ left: stickyPositions.id, width: colWidths.id, minWidth: colWidths.id, maxWidth: colWidths.id }}>{item.idUtente}</td><td className="px-4 py-3 border-r bg-sky-50 sticky z-40" style={{ left: stickyPositions.nominativo, width: colWidths.nominativo, minWidth: colWidths.nominativo, maxWidth: colWidths.nominativo }}>{item.nominativo}</td><td className="px-4 py-3 border-r text-xs bg-sky-50 sticky z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ left: stickyPositions.azienda, width: colWidths.azienda, minWidth: colWidths.azienda, maxWidth: colWidths.azienda }}>{item.azienda}</td><td className="px-4 py-3 border-r bg-emerald-50/30">{item.referente}</td><td className="px-4 py-3 border-r font-mono text-xs bg-emerald-50/30">{item.matricola}</td><td className="px-4 py-3 border-r text-xs bg-emerald-50/30">{item.reparto}</td><td className="px-4 py-3 border-r"><span className={`px-2 py-1 rounded-full text-xs font-bold ${item.tempistica === 'LUNGO TERMINE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'} ${item.tempistica === 'DISATTIVATA' ? '!bg-red-100 !text-red-700' : ''}`}>{item.tempistica}</span></td><td className="px-4 py-3 border-r text-xs">{formatDisplayDate(item.dataConsegna)}</td><td className="px-4 py-3 text-xs italic text-slate-500 max-w-[300px] truncate" title={item.note}>{item.note}</td><td className="px-4 py-3 text-right"><button onClick={() => deleteEntry(item.idUtente)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div></div></div>
      )}
    </div>
  );
};

export default DeviceRegistry;
