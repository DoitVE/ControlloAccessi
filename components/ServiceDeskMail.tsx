
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  SprayCan, 
  ArrowRightLeft,
  X,
  Send,
  Plus,
  Trash2,
  Building2,
  HardHat
} from 'lucide-react';
import { MailCase, MailFormData, generateEmlFile, PersonEntry } from '../utils/mailGenerator';

const ServiceDeskMail: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<MailCase | null>(null);
  
  // Dynamic entries for Cases 1-5
  const [entries, setEntries] = useState<PersonEntry[]>([]);
  
  // Specific state for Swap Case 6
  const [swapData, setSwapData] = useState<{
    swapTessera: string;
    oldNominativo: string;
    oldDitta: string;
    newNominativo: string;
    newDitta: string;
  }>({
    swapTessera: '',
    oldNominativo: '',
    oldDitta: '',
    newNominativo: '',
    newDitta: ''
  });

  // --- STANDARD STYLES FOR UNIFORMITY ---
  const LABEL_CLS = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";
  const INPUT_CLS = "w-full p-2.5 text-sm text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 placeholder:font-normal transition-all";

  // Debugging
  useEffect(() => {
    console.log("Service Desk Mail Component v1.7 Mounted.");
  }, []);

  const cases = [
    {
      id: 'CASE_1_DOIT_NO_TIMBRA',
      label: 'Personale Sede Esterna a Via Trento 38',
      desc: 'Personale che non timbra in Via Trento 38: DOIT VE, CIRCOLAZIONE, DRUO, FERSERVIZI, FS SECURITY, ITALFERR, GRUPPO FS SEDI ESTERNE',
      icon: <Building2 className="text-blue-600" size={32} />,
      color: 'bg-blue-50 hover:border-blue-300'
    },
    {
      id: 'CASE_3_TIMBRA_VIA_TRENTO',
      label: 'Personale Sede Via Trento 38',
      desc: 'Personale che timbra in Via Trento 38: INGEGNERIA, SICUREZZA, FORMAZIONE, UM TLC, UM SSE-LP, SE.RO.DI., TRENITALIA.',
      icon: <HardHat className="text-emerald-600" size={32} />,
      color: 'bg-emerald-50 hover:border-emerald-300'
    },
    {
      id: 'CASE_6_PULIZIE_SWAP',
      label: 'Cambio Assegnatario Dispositivo',
      desc: 'Cambio assegnatario dispositivo di accesso per Ditta Esterna al Gruppo FS',
      icon: <ArrowRightLeft className="text-cyan-500" size={32} />,
      color: 'bg-cyan-50 hover:border-cyan-300'
    }
  ];

  const handleOpenModal = (c: any) => {
    setSelectedCase(c.id);
    // Init with one empty entry
    setEntries([{ nominativo: '', code: '', ditta: '' }]);
    setSwapData({
        swapTessera: '',
        oldNominativo: '',
        oldDitta: '',
        newNominativo: '',
        newDitta: ''
    });
  };

  const handleCloseModal = () => {
    setSelectedCase(null);
  };

  // --- Dynamic List Handlers ---
  const addEntry = () => {
    setEntries(prev => [...prev, { nominativo: '', code: '', ditta: '' }]);
  };

  const removeEntry = (idx: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const updateEntry = (idx: number, field: keyof PersonEntry, val: string) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: val };
    setEntries(updated);
  };

  // --- Swap Handlers ---
  const handleSwapChange = (field: keyof typeof swapData, val: string) => {
    setSwapData(prev => ({ ...prev, [field]: val }));
  };


  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const finalData: MailFormData = {
        entries: entries,
        ...swapData
    };

    // Updated to async to support saveFileAs
    await generateEmlFile(selectedCase, finalData);
    handleCloseModal();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-6xl mx-auto">
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 flex items-center justify-center gap-3">
          <Mail className="text-amber-500" size={36} />
          Mail Abilitazioni Accessi da Service Desk
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
          Seleziona la tipologia di richiesta per generare automaticamente il file mail (.eml) 
          già formattato per Outlook, pronto per l'invio a Service Desk Almaviva.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((c) => (
          <button
            key={c.id}
            onClick={() => handleOpenModal(c)}
            className={`flex flex-col items-center text-center p-8 rounded-2xl border-2 border-transparent transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 group ${c.color}`}
            aria-label={`Apri configuratore richiesta: ${c.label}`}
          >
            <div className="mb-4 bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
              {c.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{c.label}</h3>
            <p className="text-slate-500 text-sm">{c.desc}</p>
          </button>
        ))}
      </div>

      {/* MODAL */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-bounce-in max-h-[90vh] flex flex-col">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Compila Dati Richiesta
              </h3>
              <button onClick={handleCloseModal} className="hover:bg-slate-700 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-8 space-y-6 overflow-y-auto">
              
              {/* --- STANDARD MULTI-ENTRY CASES (1-5) --- */}
              {selectedCase !== 'CASE_6_PULIZIE_SWAP' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Inserisci i dati delle persone. Puoi aggiungerne più di una.
                    </p>
                    
                    {entries.map((entry, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                            {/* Remove Button (only if > 1) */}
                            {entries.length > 1 && (
                                <button
                                    type="button" 
                                    onClick={() => removeEntry(idx)}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLS}>Nominativo</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Cognome Nome"
                                        value={entry.nominativo}
                                        className={INPUT_CLS}
                                        onChange={e => updateEntry(idx, 'nominativo', e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <label className={LABEL_CLS}>Matricola / Dispositivo</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Es. 123456"
                                        value={entry.code}
                                        className={INPUT_CLS}
                                        onChange={e => updateEntry(idx, 'code', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button 
                        type="button"
                        onClick={addEntry}
                        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Aggiungi Persona
                    </button>
                </div>
              )}

              {/* --- SWAP CASE (6) --- */}
              {selectedCase === 'CASE_6_PULIZIE_SWAP' && (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className={LABEL_CLS}>Dispositivo da riassegnare</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Codice Dispositivo"
                      className={INPUT_CLS}
                      value={swapData.swapTessera}
                      onChange={e => handleSwapChange('swapTessera', e.target.value)}
                    />
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-xs font-bold text-red-500 uppercase mb-2">Attuale Affidatario (Old)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        required
                        placeholder="Nominativo Vecchio"
                        className="w-full p-2.5 text-sm font-medium border border-red-200 rounded-lg placeholder:text-red-300 text-red-900"
                        value={swapData.oldNominativo}
                        onChange={e => handleSwapChange('oldNominativo', e.target.value)}
                      />
                      <input 
                        required
                        placeholder="Ditta Esterna"
                        className="w-full p-2.5 text-sm font-medium border border-red-200 rounded-lg placeholder:text-red-300 text-red-900"
                        value={swapData.oldDitta}
                        onChange={e => handleSwapChange('oldDitta', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase mb-2">Nuovo Affidatario (New)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        required
                        placeholder="Nominativo Nuovo"
                        className="w-full p-2.5 text-sm font-medium border border-green-200 rounded-lg placeholder:text-green-300 text-green-900"
                        value={swapData.newNominativo}
                        onChange={e => handleSwapChange('newNominativo', e.target.value)}
                      />
                      <input 
                        required
                        placeholder="Ditta Esterna"
                        className="w-full p-2.5 text-sm font-medium border border-green-200 rounded-lg placeholder:text-green-300 text-green-900"
                        value={swapData.newDitta}
                        onChange={e => handleSwapChange('newDitta', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shrink-0"
                aria-label="Genera file mail .eml per Service Desk"
              >
                <Send size={18} />
                Genera Mail (.eml)
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServiceDeskMail;
