import React, { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { NetworkMap } from '@/components/NetworkMap';
import { Validation } from '@/components/Validation';
import { LoginPage } from '@/components/LoginPage';
import { clearSession, readSession } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState(() => readSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    setActiveTab('dashboard');
    setSidebarOpen(false);
    setSearchQuery('');
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard searchQuery={searchQuery} />;
      case 'network':
        return <NetworkMap />;
      case 'metrics':
        return <Validation />;
      default:
        return <Dashboard searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-pg-surface-soft">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Header
          activeTab={activeTab}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          onLogout={handleLogout}
        />

        <div className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-auto py-5 px-8 border-t border-pg-border bg-white text-center">
          <p className="text-xs font-medium text-pg-text-soft">
            © 2026 PipelineGuard AI · Pemeliharaan preskriptif industri
          </p>
        </footer>
      </main>
    </div>
  );
}
