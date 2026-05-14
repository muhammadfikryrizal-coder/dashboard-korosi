import React from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Network, 
  ClipboardList, 
  Activity, 
  Fingerprint,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard Risiko', icon: LayoutDashboard },
  { id: 'network', label: 'Peta Jaringan', icon: Network },
  { id: 'recommendations', label: 'Rekomendasi Operasional', icon: ClipboardList },
  { id: 'metrics', label: 'Evaluasi Metrik Model', icon: Activity },
  { id: 'shap', label: 'Explainability SHAP', icon: Fingerprint },
];

export const Sidebar = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-72 bg-[#0d1b2a] h-screen flex flex-col border-r border-[#1b263b] sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-pg-critical rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
          <ShieldAlert className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-white font-extrabold text-lg leading-tight tracking-tight">PipelineGuard</h1>
          <p className="text-[#627d98] text-xs font-semibold tracking-widest uppercase">Inteligensi Buatan</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                isActive 
                  ? "bg-[#1b263b] text-white shadow-sm" 
                  : "text-[#9ca3af] hover:bg-[#1b263b]/50 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-pg-critical" : "text-[#486581] group-hover:text-[#9ca3af]"
              )} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-pg-critical" />}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#1b263b]">
        <div className="bg-[#1b263b]/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-[#9ca3af] font-bold">System Online</span>
          </div>
          <p className="text-[10px] text-[#486581] leading-relaxed">
            Menganalisis 75 segmen pipa secara real-time dengan akurasi model 1.00.
          </p>
        </div>
      </div>
    </div>
  );
};
