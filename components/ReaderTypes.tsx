
import React from 'react';
import { Radio, Building2, CheckCircle2, Info, Users, ArrowRightCircle, Printer } from 'lucide-react';

interface ReaderDefinition {
  id: string;
  title: string;
  imageUrl: string;
  managedBy: 'SEDE_CENTRALE' | 'LOCALE';
  description?: string; // Usato solo per EL.MO, gli altri hanno layout custom
}

const READERS: ReaderDefinition[] = [
  {
    id: '1',
    title: "LETTORE DI PROSSIMITÀ E BANDA MAGNETICA CON RILEVAZIONE ORARIA",
    imageUrl: "https://i.imgur.com/FVDShX4.png",
    managedBy: 'SEDE_CENTRALE'
  },
  {
    id: '2',
    title: "LETTORE DI PROSSIMITÀ CON RILEVAZIONE ORARIA",
    imageUrl: "https://i.imgur.com/m896N0P.png",
    managedBy: 'SEDE_CENTRALE'
  },
  {
    id: '3',
    title: "LETTORE DI PROSSIMITÀ PER TRANSITO SENZA RILEVAZIONE ORARIA",
    imageUrl: "https://i.imgur.com/YbH2USg.png",
    managedBy: 'SEDE_CENTRALE'
  },
  {
    id: '4',
    title: "LETTORE EL.MO. DI TRANSITO SENZA RILEVAZIONE ORARIA",
    imageUrl: "https://i.imgur.com/NdXj06J.png",
    managedBy: 'LOCALE',
    description: "Gestito direttamente da Controllo Accessi Segreteria DOIT VE."
  }
];

const ReaderTypes: React.FC = () => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-6xl mx-auto">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }

          body {
            background: white;
          }

          /* Hide everything by default */
          body * {
            visibility: hidden;
            height: 0;
            overflow: hidden;
          }

          /* Show only the reader content and its children */
          #reader-content, #reader-content * {
            visibility: visible;
            height: auto;
            overflow: visible;
          }

          #reader-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          /* Header Styling for Print */
          .print-header {
            display: block !important;
            margin-bottom: 20px;
            border-bottom: 2px solid #00549f; /* Corporate Blue */
            padding-bottom: 10px;
          }

          /* Card Styling for Print */
          .reader-card {
            display: block !important; /* Stack vertically (Image Top, Text Bottom) */
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page; /* Force one reader per page */
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Remove break after last card to avoid empty final page */
          .reader-card:last-child {
            break-after: auto;
          }

          /* Image sizing for Print */
          .reader-image-container {
            width: 100% !important;
            height: 250px !important; /* Fixed height header style */
            border-right: none !important;
            border-bottom: 1px solid #eee !important;
            background: #f8fafc !important; /* Slate-50 */
            padding: 10px !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .reader-image-container img {
            max-height: 100%;
            object-fit: contain;
            width: auto;
          }

          /* Text Content adjustments */
          .reader-text-content {
            padding: 20px !important;
          }

          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide non-print UI elements */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="reader-content" className="space-y-8">
        
        {/* Header visibile solo a video e stampa, ma il bottone è nascosto in stampa */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start print-header">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Radio className="text-cyan-500" size={36} />
              Tipologie Lettori
            </h2>
            <p className="text-slate-600">
              Guida visiva ai dispositivi installati e relative competenze di gestione.
            </p>
          </div>
        <button 
          onClick={handlePrint}
          className="no-print flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105"
          aria-label="Stampa schede lettori in PDF"
        >
          <Printer size={20} />
          Stampa Schede / PDF
        </button>
        </div>

        <div className="space-y-8 print:space-y-0">
          {READERS.map((reader) => (
            <div key={reader.id} className="reader-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row group">
              
              {/* Image Section */}
              <div className="reader-image-container w-full md:w-80 min-h-[320px] bg-slate-50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-100 flex-shrink-0 relative">
                <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none no-print" />
                <img 
                  src={reader.imageUrl} 
                  alt={reader.title}
                  loading="lazy"
                  className="w-full h-full object-contain mix-blend-multiply drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Content Section */}
              <div className="reader-text-content p-6 md:p-8 flex flex-col flex-1">
                <div className="mb-4">
                  {reader.managedBy === 'SEDE_CENTRALE' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-corporate-50 text-corporate-700 border border-corporate-200 uppercase tracking-wide">
                      <Building2 size={12} />
                      Gestito da Sede Centrale
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                      <CheckCircle2 size={12} />
                      Gestione Locale DOIT VE
                    </span>
                  )}
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 leading-tight">
                  {reader.title}
                </h3>
                
                {reader.managedBy === 'SEDE_CENTRALE' ? (
                  <div className="space-y-6">
                      {/* Blocco 1: Cosa Facciamo (Standard) */}
                      <div className="prose-sm text-slate-600 leading-relaxed border-l-4 border-corporate-200 pl-4">
                          <p>
                              Il Controllo Accessi invia le richieste di abilitazione a Sede Centrale tramite il service desk, principalmente per i <span className="text-emerald-600 font-bold">dipendenti RFI</span> e per i <span className="text-blue-600 font-bold">dispositivi di accesso in affido</span>.
                          </p>
                      </div>

                      {/* Blocco 2: Ottimizzazione e Gruppo FS */}
                      <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100/80">
                          <div className="flex items-start gap-3">
                              <div className="mt-1 bg-amber-100 text-amber-600 p-1.5 rounded-lg shrink-0">
                                  <Users size={18} />
                              </div>
                              <div className="text-sm text-slate-700 leading-relaxed">
                                  <p className="mb-3">
                                      La stessa procedura viene seguita anche, più in generale, per il <span className="text-amber-700 font-bold">personale del Gruppo FS</span>, ma in alcuni casi il service desk potrebbe richiedere un cambio di area o sottoarea per un dipendente.
                                      Questo tipo di modifica può essere eseguita solo dal DRUO (HR) competente di ogni specifica società del Gruppo.
                                  </p>
                                  <div className="flex gap-2 items-start mt-4 pt-3 border-t border-amber-200/50">
                                      <ArrowRightCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                      <p className="text-amber-900 font-medium italic">
                                          Per semplificare il processo e renderlo più rapido, è preferibile che sia il DRUO della società di appartenenza del dipendente richiedente ad inviare direttamente la richiesta al service desk.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <Info className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                      <p className="text-emerald-900 text-sm font-medium">
                          {reader.description}
                      </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReaderTypes;
