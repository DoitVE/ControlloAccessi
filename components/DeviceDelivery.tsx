
import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  User, 
  Smartphone, 
  CalendarDays,
  Briefcase,
  CheckSquare,
  Wand2,
  Loader2,
  Info,
  MessageSquare
} from 'lucide-react';
import { generateDeliveryDoc, preprocessWordTemplate, DeliveryFormData } from '../utils/docxHelper';

const DeviceDelivery: React.FC = () => {
  const [processedTemplate, setProcessedTemplate] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [formData, setFormData] = useState<DeliveryFormData>({
    luogo_e_data: `Venezia, ${new Date().toLocaleDateString('it-IT')}`,
    quantita: '',
    tipo_dispositivo: 'MIFARE CARD',
    incaricato_ritiro_e_matricola: '',
    committente_e_matricola: '',
    reparto_committente: '',
    gruppo_accessi: '',
    accessi_specifici: '',
    motivazione_rilascio: '',
    lista_dispositivi: [
      { affidatario: '', codice: '' }
    ]
  });

  // --- STANDARD STYLES FOR UNIFORMITY ---
  const LABEL_CLS = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";
  const INPUT_CLS = "w-full p-2.5 text-sm text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal transition-all";

  const handleFileChange = async (file: File) => {
    setFileName(file.name);
    setIsAnalyzing(true);
    
    try {
      const processedBlob = await preprocessWordTemplate(file);
      setProcessedTemplate(processedBlob);
      setShowForm(true);
    } catch (err) {
      console.error(err);
      alert("Errore durante l'analisi del file Word. Riprova con un file valido.");
    } finally {
      setIsAnalyzing(false);
    }
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
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileChange(e.dataTransfer.files[0]);
      }
  };


  const updateField = (field: keyof DeliveryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDeviceRow = () => {
    setFormData(prev => ({
      ...prev,
      lista_dispositivi: [...prev.lista_dispositivi, { affidatario: '', codice: '' }]
    }));
  };

  const removeDeviceRow = (index: number) => {
    if (formData.lista_dispositivi.length === 1) return; 
    setFormData(prev => ({
      ...prev,
      lista_dispositivi: prev.lista_dispositivi.filter((_, i) => i !== index)
    }));
  };

  const updateDeviceRow = (index: number, field: 'affidatario' | 'codice', value: string) => {
    const newList = [...formData.lista_dispositivi];
    newList[index] = { ...newList[index], [field]: value };
    setFormData(prev => ({ ...prev, lista_dispositivi: newList }));
  };

  const handleGenerate = async () => {
    if (!processedTemplate) return;
    try {
      // Updated to await async operation (which handles save dialog)
      await generateDeliveryDoc(processedTemplate, formData);
    } catch (e) {
      alert("Errore generazione file.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-5xl mx-auto">
      
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="text-indigo-500" />
          Verbali Consegna Dispositivi di Accesso
        </h2>
        <p className="text-slate-600 mb-4">
          Carica il verbale di base. Il tool ti guiderà nella compilazione.
        </p>

        {/* File Upload Area */}
        {!showForm && !isAnalyzing && (
          <div 
             className={`border-2 border-dashed rounded-xl p-12 text-center transition-all group ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30'}`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".docx" 
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} 
              className="hidden" 
              id="docx-upload" 
            />
            <label htmlFor="docx-upload" className="cursor-pointer flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Wand2 size={32} className="text-indigo-500" />
              </div>
              <span className="text-lg font-bold text-slate-700">Carica Verbale Word</span>
              <span className="text-sm text-slate-500 mt-2">Riconoscimento automatico campi di compilazione</span>
            </label>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
           <div className="p-12 text-center border rounded-xl border-slate-200 bg-slate-50">
              <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Analisi Strutturale in corso...</h3>
              <p className="text-slate-500">Sto mappando le celle di input (destra o sotto).</p>
           </div>
        )}

        {/* Ready State */}
        {showForm && (
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 mt-4">
             <div className="p-3 bg-white rounded-lg shadow-sm">
                <Wand2 className="text-emerald-600" size={24} />
             </div>
             <div className="flex-grow">
               <p className="font-bold text-slate-800">{fileName}</p>
               <p className="text-xs text-emerald-700">Struttura riconosciuta. Campi mappati correttamente.</p>
             </div>
             <button 
               onClick={() => { setShowForm(false); setProcessedTemplate(null); }}
               className="text-xs text-red-500 hover:underline"
             >
               Reset
             </button>
          </div>
        )}
      </div>

      {/* Input Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-slide-up">
          <div className="p-6 bg-slate-50 border-b border-slate-200">
             <h3 className="font-bold text-lg text-slate-800">Compilazione Guidata</h3>
          </div>
          
          <div className="p-8 space-y-8">
            
            {/* Row 1: General Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                 <label className={LABEL_CLS}>
                   <CalendarDays size={14} /> Luogo e Data
                 </label>
                 <input 
                   type="text" 
                   value={formData.luogo_e_data}
                   onChange={(e) => updateField('luogo_e_data', e.target.value)}
                   className={INPUT_CLS}
                 />
               </div>
               <div>
                 <label className={LABEL_CLS}>
                   Quantità dispositivi
                 </label>
                 <input 
                   type="text" 
                   placeholder="Es. 1"
                   value={formData.quantita}
                   onChange={(e) => updateField('quantita', e.target.value)}
                   className={INPUT_CLS}
                 />
               </div>
               <div>
                 <label className={LABEL_CLS}>
                   Tipo Dispositivo
                 </label>
                 <input 
                   type="text" 
                   value={formData.tipo_dispositivo}
                   onChange={(e) => updateField('tipo_dispositivo', e.target.value)}
                   className={INPUT_CLS}
                 />
               </div>
            </div>

            {/* Row 2: Incaricato Ritiro (Full Width) */}
            <div>
               <label className={LABEL_CLS}>
                 <User size={14} /> Incaricato Ritiro e Matricola
               </label>
               <input 
                 type="text" 
                 placeholder="Nome Cognome - CID 123456"
                 value={formData.incaricato_ritiro_e_matricola}
                 onChange={(e) => updateField('incaricato_ritiro_e_matricola', e.target.value)}
                 className={`${INPUT_CLS} bg-indigo-50/50 focus:bg-white`}
               />
            </div>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Row 3: Dynamic Table Section (Devices) */}
            <div>
               <div className="flex justify-between items-end mb-3">
                  <label className={LABEL_CLS}>
                    <Smartphone size={14} /> Lista Dispositivi
                  </label>
                  <button 
                    onClick={addDeviceRow}
                    className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wide border border-indigo-100"
                  >
                    <Plus size={12} /> Aggiungi Riga
                  </button>
               </div>

               <div className="space-y-3">
                  {formData.lista_dispositivi.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start animate-fade-in group">
                       <div className="flex-grow grid grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            placeholder="Affidatario Dispositivo di Accesso"
                            value={item.affidatario}
                            onChange={(e) => updateDeviceRow(idx, 'affidatario', e.target.value)}
                            className={INPUT_CLS}
                          />
                          <input 
                            type="text" 
                            placeholder="Codice Dispositivo di Accesso"
                            value={item.codice}
                            onChange={(e) => updateDeviceRow(idx, 'codice', e.target.value)}
                            className={INPUT_CLS}
                          />
                       </div>
                       <button 
                         onClick={() => removeDeviceRow(idx)}
                         disabled={formData.lista_dispositivi.length === 1}
                         className="mt-2.5 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                         title="Rimuovi riga"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  ))}
               </div>
               <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-[10px] text-emerald-800 flex gap-2 items-center">
                  <Info size={12} />
                  <span>Ho rilevato la tabella nel file. Le righe verranno inserite automaticamente sotto l'intestazione.</span>
               </div>
            </div>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Row 4: Committente and Reparto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className={LABEL_CLS}>
                     Committente e Matricola
                   </label>
                   <input 
                     type="text" 
                     placeholder="Nome Cognome - CID 123456"
                     value={formData.committente_e_matricola}
                     onChange={(e) => updateField('committente_e_matricola', e.target.value)}
                     className={INPUT_CLS}
                   />
                </div>
                <div>
                   <label className={LABEL_CLS}>
                     <Briefcase size={14} /> Reparto Committente
                   </label>
                   <input 
                     type="text" 
                     placeholder="RFI-DOIT VE/"
                     value={formData.reparto_committente}
                     onChange={(e) => updateField('reparto_committente', e.target.value)}
                     className={INPUT_CLS}
                   />
                </div>
            </div>

            {/* Row 5: Motivazione Rilascio (Full Width) */}
            <div>
               <label className={LABEL_CLS}>
                 <MessageSquare size={14} /> Motivazione Rilascio
               </label>
               <input 
                 type="text" 
                 placeholder="Necessità lavorative"
                 value={formData.motivazione_rilascio}
                 onChange={(e) => updateField('motivazione_rilascio', e.target.value)}
                 className={INPUT_CLS}
               />
            </div>

             {/* Row 6: Access Info & Checkboxes */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                   <label className={`${LABEL_CLS} mb-2`}>
                     <CheckSquare size={16} className={formData.gruppo_accessi ? "text-indigo-600" : "text-slate-400"} />
                     Gruppo Accessi
                   </label>
                   <input 
                     type="text" 
                     placeholder="Es. Accessi Carrai (Automezzi Aziendali) - Non segnalare il codice del gruppo"
                     value={formData.gruppo_accessi}
                     onChange={(e) => updateField('gruppo_accessi', e.target.value)}
                     className={INPUT_CLS}
                   />
                   <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                     Inserisce la spunta su "Gruppo Accessi" e compila il campo descrittivo.
                   </p>
                </div>
                 <div>
                   <label className={`${LABEL_CLS} mb-2`}>
                     <CheckSquare size={16} className={formData.accessi_specifici ? "text-indigo-600" : "text-slate-400"} />
                     Accessi Specifici
                   </label>
                   <input 
                     type="text" 
                     placeholder="Es. Parcheggio Stazione di Rovigo"
                     value={formData.accessi_specifici}
                     onChange={(e) => updateField('accessi_specifici', e.target.value)}
                     className={INPUT_CLS}
                   />
                   <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                     Inserisce la spunta su "Accessi Specifici" e compila il campo descrittivo.
                   </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 flex justify-end">
               <button 
                 onClick={handleGenerate}
                 className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-transform hover:scale-[1.02]"
                 aria-label="Genera documento Word di consegna"
               >
                 <Download size={20} />
                 Genera Documento Word
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDelivery;
