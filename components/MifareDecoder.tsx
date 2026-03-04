
import React, { useState } from 'react';
import { 
  Calculator,
  Trash2, 
  ArrowRightLeft,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { calculateMifareCode, reverseMifareCode } from '../utils/mifareLogic';

const MifareDecoder: React.FC = () => {
  const [matricola, setMatricola] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [mifareCode, setMifareCode] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // --- Handlers ---

  // 1. User changes Matricola -> Update Code
  const handleMatricolaChange = (val: string) => {
    // Allow only digits
    const cleanVal = val.replace(/[^0-9]/g, '');
    setMatricola(cleanVal);
    
    if (cleanVal) {
      const code = calculateMifareCode(cleanVal, version);
      setMifareCode(code);
    } else {
      setMifareCode('');
    }
  };

  // 2. User changes Version -> Update Code
  const handleVersionChange = (val: number) => {
    const newVer = Math.max(0, val);
    setVersion(newVer);
    
    if (matricola) {
      const code = calculateMifareCode(matricola, newVer);
      setMifareCode(code);
    }
  };

  // 3. User changes Code -> Update Matricola & Version
  const handleCodeChange = (val: string) => {
    // Allow only digits
    const cleanVal = val.replace(/[^0-9]/g, '');
    setMifareCode(cleanVal);

    if (cleanVal) {
      const result = reverseMifareCode(cleanVal);
      if (result) {
        setMatricola(result.matricola);
        setVersion(result.version);
      }
    } else {
      setMatricola('');
      // We don't reset version to 1 here to avoid jumping UI, or maybe we should? 
      // Keeping version as is feels more natural while clearing input.
    }
  };

  const handleClear = () => {
    setMatricola('');
    setVersion(1);
    setMifareCode('');
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showNotification("Copiato negli appunti");
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="text-corporate-600" />
            Decodifica MIFARE
          </h2>
          <p className="text-slate-500 mt-1">
            Conversione bidirezionale Matricola ↔ Codice MIFARE
          </p>
        </div>
        <button 
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium text-sm"
        >
          <Trash2 size={16} />
          Reset
        </button>
      </div>

      {/* Main Calculation Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-corporate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-8">
          
          <p className="text-center text-sm text-slate-500 font-medium leading-relaxed">
            Compila il campo Matricola (CID) e la versione per ottenere il Codice MIFARE, o al contrario, compila il Codice MIFARE per ottenere la Matricola (CID) e la versione.
          </p>

          {/* Top Row: Matricola & Version */}
          <div className="grid grid-cols-12 gap-6">
            
            <div className="col-span-8">
              <div className="relative mb-2">
                  <label className="block text-sm font-bold text-slate-700 text-center w-full">
                    Matricola (CID)
                  </label>
                  <button 
                    onClick={() => handleCopy(matricola)}
                    disabled={!matricola}
                    className="absolute right-0 top-0 text-xs flex items-center gap-1 text-slate-500 hover:text-corporate-600 transition-colors disabled:opacity-30"
                  >
                    <Copy size={14} /> Copia
                  </button>
              </div>
              <input 
                type="text" 
                value={matricola}
                onChange={(e) => handleMatricolaChange(e.target.value)}
                placeholder="es. 964217"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-4 focus:ring-corporate-100 focus:border-corporate-500 text-2xl font-mono text-slate-900 transition-all placeholder:text-slate-300 text-center"
              />
            </div>

            <div className="col-span-4">
              <label className="block text-sm font-bold text-slate-700 mb-2 text-center">
                Versione
              </label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleVersionChange(version - 1)}
                  className="w-12 h-[60px] rounded-l-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl transition-colors border-y border-l border-slate-200"
                >-</button>
                <input 
                  type="number" 
                  min="0"
                  max="15"
                  value={version}
                  onChange={(e) => handleVersionChange(parseInt(e.target.value) || 0)}
                  className="w-full h-[60px] bg-slate-50 border-y border-slate-300 text-center font-bold text-2xl text-slate-900 focus:ring-0 z-10"
                />
                <button 
                  onClick={() => handleVersionChange(version + 1)}
                  className="w-12 h-[60px] rounded-r-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl transition-colors border-y border-r border-slate-200"
                >+</button>
              </div>
            </div>
          </div>

          {/* Middle Divider */}
          <div className="flex items-center justify-center text-slate-300">
             <div className="h-px bg-slate-200 w-full"></div>
             <div className="bg-white px-4">
                <ArrowRightLeft size={24} className="text-corporate-400" />
             </div>
             <div className="h-px bg-slate-200 w-full"></div>
          </div>

          {/* Bottom Row: Mifare Code */}
          <div>
            <div className="relative mb-2">
              <label className="block text-sm font-bold text-corporate-700 text-center w-full">
                Codice MIFARE
              </label>
              <button 
                onClick={() => handleCopy(mifareCode)}
                disabled={!mifareCode}
                className="absolute right-0 top-0 text-xs flex items-center gap-1 text-corporate-600 hover:text-corporate-800 disabled:opacity-50 font-medium transition-colors"
              >
                <Copy size={14} /> Copia
              </button>
            </div>
            <input 
              type="text" 
              value={mifareCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="es. 0015427473"
              className="w-full px-6 py-6 bg-corporate-50/50 border-2 border-corporate-200 rounded-xl text-4xl font-mono font-bold text-corporate-900 tracking-widest text-center focus:outline-none focus:border-corporate-500 focus:bg-white transition-all placeholder:text-corporate-200/50"
            />
          </div>

        </div>
      </div>

       {/* Notification Toast */}
       {notification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in z-50">
          <CheckCircle2 size={20} className="text-green-400" />
          {notification}
        </div>
      )}
    </div>
  );
};

export default MifareDecoder;
