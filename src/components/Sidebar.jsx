import React from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Network,
  Activity,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard Risiko', icon: LayoutDashboard },
  { id: 'network', label: 'Peta Jaringan', icon: Network },
  { id: 'metrics', label: 'Evaluasi Metrik Model', icon: Activity },
];

export const Sidebar = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Tutup menu"
        />
      )}

      <div
        className={cn(
          'w-72 bg-pg-sidebar h-screen flex flex-col border-r border-pg-sidebar-elevated z-50 transition-transform duration-300',
          'fixed lg:sticky top-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pg-critical rounded-lg flex items-center justify-center">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-lg leading-tight tracking-tight">
                PipelineGuard
              </h1>
              <p className="text-pg-text-soft text-xs font-medium">
                Pemantauan Risiko Pipa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-pg-sidebar-muted hover:text-white hover:bg-pg-sidebar-elevated lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150 group text-sm font-medium',
                  isActive
                    ? 'bg-pg-sidebar-elevated text-white'
                    : 'text-pg-sidebar-muted hover:bg-pg-sidebar-elevated/60 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-pg-critical' : 'text-pg-text-soft group-hover:text-pg-sidebar-muted'
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-pg-critical" />}
              </button>
            );
          })}
        </nav>

      </div>
    </>
  );
};
