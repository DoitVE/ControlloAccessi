
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ScanBarcode, 
  KeyRound, 
  TabletSmartphone, 
  MailPlus, 
  Radio, 
  FileJson, 
  ClipboardSignature,
  ChevronLeft,
  Info
} from 'lucide-react';
import { AppView, ToolDefinition } from './types';
import { ToolsGrid } from './components/Dashboard';

// Import All Components Strictly
import MifareDecoder from './components/MifareDecoder';
import DeviceRegistry from './components/DeviceRegistry';
import AccessPermissions from './components/AccessPermissions';
import DeviceDelivery from './components/DeviceDelivery';
import ServiceDeskMail from './components/ServiceDeskMail';
import ReaderTypes from './components/ReaderTypes';
import ElmoLogs from './components/ElmoLogs';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    if (import.meta.env.DEV) {
      console.error('View render error', error, errorInfo);
    }
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">Si è verificato un errore nella vista.</div>;
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);

  useEffect(() => {
    // @ts-ignore
    if (import.meta.env.DEV) {
      console.log(`[App] Current View switched to: ${currentView}`);
    }
  }, [currentView]);

  const tools: ToolDefinition[] = useMemo(() => ([
    {
      id: AppView.ACCESS_PERMISSIONS,
      label: 'Gestione Permessi',
      description: 'Sincronizzazione Abilitazioni Gruppi di Accesso tramite confronto con estrazione aggiornata.',
      icon: <KeyRound size={24} />,
      color: 'bg-emerald-600'
    },
    {
      id: AppView.DEVICE_REGISTRY,
      label: 'Registro Dispositivi',
      description: 'Sincronizzazione Registro Dispositivi tramite confronto con estrazione aggiornata utenti EL.MO.',
      icon: <TabletSmartphone size={24} />,
      color: 'bg-corporate-600'
    },
    {
      id: AppView.DEVICE_DELIVERY,
      label: 'Verbali Consegna Dispositivi di Accesso',
      description: 'Generazione guidata di verbali di affido dispositivi di accesso.',
      icon: <ClipboardSignature size={24} />,
      color: 'bg-indigo-600'
    },
    {
      id: AppView.MIFARE_DECODER,
      label: 'Decodifica MIFARE',
      description: 'Conversione bidirezionale Matricola/Codice MIFARE.',
      icon: <ScanBarcode size={24} />,
      color: 'bg-slate-600'
    },
    {
      id: AppView.SERVICE_DESK_MAIL,
      label: 'Mail Abilitazioni Accessi da Service Desk',
      description: 'Compilazione guidata ticket per abilitazioni gestite da Sede Centrale.',
      icon: <MailPlus size={24} />,
      color: 'bg-amber-500'
    },
    {
      id: AppView.ELMO_LOGS,
      label: 'Estrazioni Log Eventi EL.MO.',
      description: 'Sistemazione leggibilità e formato log eventi.',
      icon: <FileJson size={24} />,
      color: 'bg-rfi-red'
    },
    {
      id: AppView.READER_TYPES,
      label: 'Tipologie Lettori',
      description: 'Elenco lettori con relative procedure di richiesta di abilitazione.',
      icon: <Radio size={24} />,
      color: 'bg-cyan-600'
    }
  ]), []);

  // COMPLETE VIEW MAPPING
  const VIEW_COMPONENTS: Record<AppView, React.ComponentType | null> = {
    [AppView.HOME]: null,
    [AppView.MIFARE_DECODER]: MifareDecoder,
    [AppView.DEVICE_REGISTRY]: DeviceRegistry,
    [AppView.ACCESS_PERMISSIONS]: AccessPermissions,
    [AppView.DEVICE_DELIVERY]: DeviceDelivery,
    [AppView.SERVICE_DESK_MAIL]: ServiceDeskMail,
    [AppView.READER_TYPES]: ReaderTypes,
    [AppView.ELMO_LOGS]: ElmoLogs
  };

  const BackButton = () => (
    <div className="max-w-6xl mx-auto mb-6 flex items-center">
      <button 
        onClick={() => setCurrentView(AppView.HOME)}
        className="group flex items-center gap-2 text-slate-500 hover:text-corporate-600 transition-colors"
        aria-label="Torna alla dashboard"
      >
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 group-hover:border-corporate-600">
          <ChevronLeft size={20} />
        </div>
        <span className="font-medium">Torna alla Dashboard</span>
      </button>
    </div>
  );

  const renderContent = () => {
    if (currentView === AppView.HOME) {
      return <ToolsGrid tools={tools} onSelectTool={setCurrentView} />;
    }

    const SpecificComponent = VIEW_COMPONENTS[currentView];

    if (SpecificComponent) {
      return (
        <div className="animate-fade-in">
          <BackButton />
          <ErrorBoundary>
            <SpecificComponent />
          </ErrorBoundary>
        </div>
      );
    }

    return <div>Errore caricamento vista {currentView}</div>;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 h-20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
           
           {/* Left: RFI Logo */}
           <div className="flex items-center gap-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Rete_Ferroviaria_Italiana_logo.svg/960px-Rete_Ferroviaria_Italiana_logo.svg.png" 
                alt="Rete Ferroviaria Italiana" 
                className="h-10 w-auto object-contain"
              />
              <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
              <span className="font-bold text-corporate-600 text-lg hidden sm:block tracking-tight">Hub Gestione accessi</span>
           </div>
           
           {/* Right: Credits Tooltip */}
           <div className="relative group cursor-help p-2">
             <Info className="text-slate-400 hover:text-corporate-600 transition-colors" size={20} />
             
             {/* Tooltip Content */}
             <div className="absolute right-0 top-full mt-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
               <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-right">
                 <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Powered by</p>
                 <p className="text-xs text-slate-500 leading-tight">Simone Giungato (964217)</p>
                 <p className="text-xs text-slate-500 leading-tight">DOIT VE</p>
               </div>
             </div>
           </div>
        </div>
      </header>
      <main className="p-6 lg:p-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
