import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home, Calendar as CalendarIcon, Users, Package, LogOut, UserCog, BarChart3, Receipt, History } from 'lucide-react';
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
  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const activeTabRef = React.useRef<HTMLAnchorElement>(null);

  // Auto-scroll the active tab into view in mobile horizontal bar
  React.useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [location.pathname]);

  const links = [
    { to: "/", icon: Home, label: "Dashboard", color: "text-indigo-500" },
    { to: "/analysis", icon: BarChart3, label: "Análise", color: "text-indigo-500" },
    { to: "/eudora", icon: Package, label: "Eudora", color: "text-purple-500" },
    { to: "/tupperware", icon: Package, label: "Tupper", color: "text-teal-500" },
    { to: "/boletos", icon: Receipt, label: "Boletos", color: "text-amber-500" },
    { to: "/consortium", icon: Users, label: "Consórcio", color: "text-pink-500" },
    { to: "/clients", icon: Users, label: "Consultas", color: "text-orange-500" },
    { to: "/manage-clients", icon: UserCog, label: "Clientes", color: "text-cyan-500" },
    { to: "/calendar", icon: CalendarIcon, label: "Agenda", color: "text-blue-500" },
    { to: "/activity", icon: History, label: "Histórico", color: "text-slate-500" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 z-30">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent">
            Minha Agenda
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Controle de Vendas
          </p>
        </div>
        <button
          onClick={signOut}
          title="Sair do sistema"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10 shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-teal-600 bg-clip-text text-transparent">
            Minha Agenda
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-semibold">
            Controle de Vendas
          </p>
        </div>

        <nav className="flex-1 px-4 flex flex-col justify-between overflow-y-auto pb-4">
          <div className="space-y-1.5">
            {links.map((link) => {
              const active = location.pathname === link.to;

              let hoverColors = "hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40";
              if (link.to === '/analysis') hoverColors = "hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40";
              if (link.to === '/eudora') hoverColors = "hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40";
              if (link.to === '/tupperware') hoverColors = "hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40";
              if (link.to === '/boletos') hoverColors = "hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40";
              if (link.to === '/calendar') hoverColors = "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40";
              if (link.to === '/clients') hoverColors = "hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/40";
              if (link.to === '/manage-clients') hoverColors = "hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-950/40";
              if (link.to === '/consortium') hoverColors = "hover:bg-pink-50 hover:text-pink-700 dark:hover:bg-pink-950/40";
              if (link.to === '/activity') hoverColors = "hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800";

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center space-x-3 p-2.5 rounded-xl transition-colors text-sm",
                    active
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
                      : `text-slate-600 dark:text-slate-300 ${hoverColors}`
                  )}
                >
                  <link.icon className={cn("w-4 h-4 shrink-0", link.color)} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-4">
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 p-2.5 rounded-xl transition-colors text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300 text-left text-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-0 relative z-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav with ALL tabs scrollable and active centering */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-40">
        <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth px-2 py-1.5 gap-1">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                ref={active ? activeTabRef : null}
                className={cn(
                  "flex flex-col items-center justify-center shrink-0 min-w-[62px] px-2 py-1.5 rounded-xl text-[11px] font-medium transition-all select-none",
                  active
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50"
                )}
              >
                <link.icon className={cn("w-5 h-5 mb-0.5 shrink-0", active ? "text-white" : link.color)} />
                <span className="truncate max-w-[66px] text-center leading-tight tracking-tight">{link.label}</span>
              </Link>
            );
          })}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

          <button
            onClick={signOut}
            className="flex flex-col items-center justify-center shrink-0 min-w-[54px] px-2 py-1.5 rounded-xl text-[11px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors select-none"
          >
            <LogOut className="w-5 h-5 mb-0.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[54px] text-center leading-tight">Sair</span>
          </button>
        </div>
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
