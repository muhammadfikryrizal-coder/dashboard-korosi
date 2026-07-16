import React, { useState } from 'react';
import {
  Menu,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAGE_META, DEFAULT_USER } from '@/lib/pageMeta';

const PERIOD_OPTIONS = [
  '7 hari terakhir',
  '30 hari terakhir',
  '90 hari terakhir',
  '1 tahun terakhir',
];

export const Header = ({
  activeTab,
  onMenuToggle,
  searchQuery = '',
  onSearchChange,
  user = DEFAULT_USER,
  onLogout,
}) => {
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [profileOpen, setProfileOpen] = useState(false);

  const meta = PAGE_META[activeTab] ?? PAGE_META.dashboard;

  return (
    <header className="pg-header">
      <div className="flex items-start gap-3 min-w-0 flex-1 lg:flex-[0_0_auto]">
        <button
          type="button"
          onClick={onMenuToggle}
          className="mt-1 p-2 rounded-lg text-pg-text-soft hover:bg-pg-surface-soft hover:text-pg-text-main transition-colors lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-pg-text-main tracking-tight leading-tight text-balance">
            {meta.title}
          </h1>
          <p className="text-sm text-pg-text-soft mt-1 max-w-xl leading-relaxed hidden sm:block text-pretty">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pg-text-soft" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Cari"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-pg-surface-soft border border-pg-border rounded-xl focus:outline-none focus:ring-2 focus:ring-pg-accent/30 focus:border-pg-accent placeholder:text-pg-text-soft/70"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setPeriodOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-pg-text-main bg-white border border-pg-border rounded-lg hover:bg-pg-surface-soft transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-pg-text-soft" />
            <span>Periode: {selectedPeriod}</span>
            {periodOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-pg-text-soft" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-pg-text-soft" />
            )}
          </button>
          {periodOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-pg-border rounded-xl shadow-lg z-50 py-1">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(option);
                    setPeriodOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-xs font-medium hover:bg-pg-surface-soft transition-colors',
                    selectedPeriod === option
                      ? 'text-pg-accent bg-blue-50'
                      : 'text-pg-text-main'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-pg-surface-soft transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-pg-text-main text-white text-sm font-bold flex items-center justify-center">
              {user.initial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-pg-text-main leading-tight">{user.name}</p>
              <p className="text-[10px] text-pg-text-soft font-medium">{user.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-pg-text-soft hidden sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-pg-border rounded-xl shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-pg-border">
                <p className="text-xs font-bold text-pg-text-main">{user.name}</p>
                <p className="text-[10px] text-pg-text-soft">{user.role}</p>
              </div>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-xs font-medium text-pg-critical hover:bg-red-50"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout?.();
                }}
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
