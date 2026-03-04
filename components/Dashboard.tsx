import React from 'react';
import { ToolDefinition, AppView } from '../types';
import { ArrowRight } from 'lucide-react';

interface ToolsGridProps {
  tools: ToolDefinition[];
  onSelectTool: (view: AppView) => void;
}

export const ToolsGrid: React.FC<ToolsGridProps> = ({ tools, onSelectTool }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-12 border-b border-slate-100 pb-8">
        <h1 className="text-4xl font-extrabold text-corporate-600 tracking-tight">
          Hub Gestione accessi
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-full">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group relative flex flex-col items-start p-6 bg-white rounded-lg border border-slate-200 hover:border-corporate-600 hover:shadow-lg transition-all duration-300 text-left h-full"
            aria-label={`Apri strumento: ${tool.label}`}
          >
            <div className={`p-3 rounded-lg mb-4 ${tool.color} text-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
              {tool.icon}
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-corporate-600 transition-colors">
              {tool.label}
            </h3>
            
            <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed">
              {tool.description}
            </p>

            <div className="w-full flex items-center justify-between pt-4 border-t border-slate-100 text-corporate-600 font-bold text-xs uppercase tracking-wide">
              <span>Apri strumento</span>
              <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Re-export as Dashboard for compatibility if needed
export const Dashboard = ToolsGrid;
