import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home, Calendar as CalendarIcon, Users, Package, LogOut, UserCog, Video, BarChart3 } from 'lucide-react';
import { cn } from './lib/utils';
import DashboardPage from './pages/Dashboard';
import AnalysisPage from './pages/Analysis';
import EudoraPage from './pages/Eudora';
import TupperwarePage from './pages/Tupperware';
import ClientsPage from './pages/Clients';
import CalendarPage from './pages/Calendar';
import ManageClientsPage from './pages/ManageClients';
import ConsortiumPage from './pages/Consortium';
import ActivityLogPage from './pages/ActivityLog';
import BoletosPage from './pages/Boletos';
import Login from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  const links = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/analysis", icon: BarChart3, label: "Análise" },
    { to: "/eudora", icon: Package, label: "Eudora" },
    { to: "/tupperware", icon: Package, label: "Tupper" },
    { to: "/boletos", icon: Package, label: "Boletos" },
    { to: "/consortium", icon: Users, label: "Consórcio" },
    { to: "/clients", icon: Users, label: "Consultas" },
    { to: "/manage-clients", icon: UserCog, label: "Clientes" },
    { to: "/calendar", icon: CalendarIcon, label: "Agenda" },
    { to: "/activity", icon: Users, label: "Histórico" },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent">Minha Agenda</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-semibold">Controle de Vendas</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {links.map(link => {
            const active = location.pathname === link.to;
            
            let hoverColors = "hover:bg-indigo-50 hover:text-indigo-700";
            if (link.to === '/analysis') hoverColors = "hover:bg-indigo-50 hover:text-indigo-700";
            if (link.to === '/eudora') hoverColors = "hover:bg-purple-50 hover:text-purple-700";
            if (link.to === '/tupperware') hoverColors = "hover:bg-teal-50 hover:text-teal-700";
            if (link.to === '/calendar') hoverColors = "hover:bg-blue-50 hover:text-blue-700";
            if (link.to === '/clients') hoverColors = "hover:bg-orange-50 hover:text-orange-700";
            if (link.to === '/consortium') hoverColors = "hover:bg-pink-50 hover:text-pink-700";
            if (link.to === '/activity') hoverColors = "hover:bg-slate-50 hover:text-slate-700";

            return (
              <Link key={link.to} to={link.to} className={cn("flex items-center space-x-3 p-3 rounded-xl transition-colors", active ? "bg-slate-100 text-slate-900 font-medium" : `text-slate-600 ${hoverColors}`)}>
                <link.icon className={cn("w-5 h-5", link.to === '/eudora' && 'text-purple-500', link.to === '/tupperware' && 'text-teal-500', link.to === '/consortium' && 'text-pink-500', link.to === '/analysis' && 'text-indigo-500')} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <button onClick={signOut} className="w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-slate-600 hover:bg-red-50 hover:text-red-700 text-left mt-auto">
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-16 md:pb-0 relative">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around p-2 pb-safe shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-50">
        {links.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} className={cn("flex flex-col items-center justify-center p-2 rounded-xl text-xs", active ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 dark:text-slate-400")}>
              <link.icon className={cn("w-6 h-6 mb-1", active && "fill-indigo-100 dark:fill-indigo-900/30")} />
              {link.label}
            </Link>
          );
        })}
        <button onClick={signOut} className="flex flex-col items-center justify-center p-2 rounded-xl text-xs text-slate-500 hover:text-red-600">
          <LogOut className="w-6 h-6 mb-1" />
          Sair
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/analysis" element={<PrivateRoute><AnalysisPage /></PrivateRoute>} />
          <Route path="/eudora" element={<PrivateRoute><EudoraPage /></PrivateRoute>} />
          <Route path="/tupperware" element={<PrivateRoute><TupperwarePage /></PrivateRoute>} />
          <Route path="/boletos" element={<PrivateRoute><BoletosPage /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
          <Route path="/manage-clients" element={<PrivateRoute><ManageClientsPage /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
          <Route path="/consortium" element={<PrivateRoute><ConsortiumPage /></PrivateRoute>} />
          <Route path="/activity" element={<PrivateRoute><ActivityLogPage /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
