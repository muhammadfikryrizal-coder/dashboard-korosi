import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { NetworkMap } from '@/components/NetworkMap';
import { Recommendations } from '@/components/Recommendations';
import { Validation } from '@/components/Validation';
import { ShapAnalysis } from '@/components/ShapAnalysis';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'network':
        return <NetworkMap />;
      case 'recommendations':
        return <Recommendations />;
      case 'metrics':
        return <Validation />;
      case 'shap':
        return <ShapAnalysis />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--pg-surface-soft)]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 min-w-0 overflow-hidden">
        <header className="h-16 border-b border-pg-border bg-white flex items-center justify-between px-8 sticky top-0 z-40 backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-pg-text-soft uppercase tracking-[0.2em] border-r border-pg-border pr-4">
              PipelineGuard v2.0
            </span>
            <h2 className="text-sm font-bold text-pg-text-main capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  U{i}
                </div>
              ))}
            </div>
            <div className="h-4 w-px bg-pg-border" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-pg-text-main leading-tight">Admin Integrity</p>
              <p className="text-[9px] font-medium text-pg-text-soft">Operator Pusat</p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <footer className="mt-12 py-8 px-8 border-t border-pg-border bg-white text-center">
          <p className="text-[10px] font-bold text-pg-text-soft uppercase tracking-widest">
            © 2026 PipelineGuard AI • Dashboard Pemeliharaan Preskriptif Industri
          </p>
        </footer>
      </main>
    </div>
  );
}

