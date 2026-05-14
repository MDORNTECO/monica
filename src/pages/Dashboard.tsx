import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseISO, isThisWeek, isThisMonth, isSameMonth, isToday, isPast, isFuture, startOfDay, format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, AlertCircle, Clock, CheckCircle2, TrendingUp, Package, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { dbService } from '../services/db';
import { Installment, Sale, Client } from '../types';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Input } from '../components/ui/Input';

export default function DashboardPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthStr, setSelectedMonthStr] = useState(format(startOfDay(new Date()), 'yyyy-MM'));

  useEffect(() => {
    async function loadData() {
      // In a real app we'd paginate or use snapshots, but for simplicity we fetch all non-paid
      const [allSales, allInstallments, allClients] = await Promise.all([
        dbService.getSales(),
        dbService.getInstallments(),
        dbService.getClients()
      ]);
      setSales(allSales);
      setInstallments(allInstallments);
      setClients(allClients);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando resumo...</div>;

  const pendingInst = installments.filter(i => i.status !== 'pago');
  const selectedMonth = parseISO(`${selectedMonthStr}-01`);

  const handlePrevMonth = () => setSelectedMonthStr(format(subMonths(selectedMonth, 1), 'yyyy-MM'));
  const handleNextMonth = () => setSelectedMonthStr(format(addMonths(selectedMonth, 1), 'yyyy-MM'));

  let weekTotal = 0;
  let monthTotal = 0;
  let overdueTotal = 0;
  let todayTotal = 0;
  let totalEudora = 0;
  let totalTupperware = 0;
  let totalToReceiveAllTime = 0;
  const overdueInst: Installment[] = [];
  const todayInst: Installment[] = [];

  pendingInst.forEach(inst => {
    const due = parseISO(inst.dueDate);
    
    totalToReceiveAllTime += inst.remainingAmount;

    if (isThisWeek(due)) weekTotal += inst.remainingAmount;
    if (isSameMonth(due, selectedMonth)) {
      monthTotal += inst.remainingAmount;
      if (inst.brand === 'Eudora') totalEudora += inst.remainingAmount;
      if (inst.brand === 'Tupperware') totalTupperware += inst.remainingAmount;
    }
    
    if (isPast(due) && !isToday(due)) {
      overdueTotal += inst.remainingAmount;
      overdueInst.push(inst);
    } else if (isToday(due)) {
      todayTotal += inst.remainingAmount;
      todayInst.push(inst);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-sm text-white">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold flex items-center gap-2">
                 Olá Monica! ✨
             </h1>
             <div className="relative flex h-3 w-3 mt-1" title="Online">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
             </div>
          </div>
          <p className="text-indigo-100 mt-1">Veja o que você tem para receber hoje.</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-red-500/20 text-red-100 px-4 py-2 rounded-full text-sm font-bold border border-red-500/30 shadow-sm backdrop-blur-sm">🚨 {overdueInst.length} Atrasados</span>
          <span className="bg-amber-500/20 text-amber-100 px-4 py-2 rounded-full text-sm font-bold border border-amber-500/30 shadow-sm backdrop-blur-sm">⏳ {todayInst.length} Hoje</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total a Receber Geral */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1 text-slate-400">
            <Wallet className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Total Geral</p>
          </div>
          <p className="text-2xl font-black text-slate-800">
            {totalToReceiveAllTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* Receber na Semana */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1">A receber (Semana)</p>
          <p className="text-2xl font-black text-slate-800">
            {weekTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* Receber no Mês */}
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm relative group">
          <div className="flex flex-col mb-1 gap-1">
            <p className="text-xs text-indigo-400 font-bold uppercase whitespace-nowrap">A receber no Mês</p>
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-indigo-100 px-1 py-0.5">
              <button title="Mês anterior" onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-600 uppercase px-1 text-center">
                {format(selectedMonth, 'MMM/yy', { locale: ptBR })}
              </span>
              <button title="Próximo mês" onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {monthTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* Total Atrasado */}
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
          <p className="text-xs text-red-400 font-bold uppercase mb-1">Total Atrasado</p>
          <p className="text-2xl font-black text-red-600">
            {overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* Hoje a receber */}
        <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
          <p className="text-xs text-green-400 font-bold uppercase mb-1">Hoje a receber</p>
          <p className="text-2xl font-black text-green-600">
            {todayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eudora Pendente */}
        <div className="bg-white rounded-3xl p-6 border-l-8 border-purple-600 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Eudora</span>
              <h3 className="text-xl font-bold mt-2 text-slate-800">Valor Pendente</h3>
            </div>
            <span className="text-3xl">💄</span>
          </div>
          <p className="text-3xl font-black text-purple-800">
            {totalEudora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="mt-4 w-full bg-purple-50 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '50%' }}></div>
          </div>
        </div>

        {/* Tupperware Pendente */}
        <div className="bg-white rounded-3xl p-6 border-l-8 border-teal-600 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Tupperware</span>
              <h3 className="text-xl font-bold mt-2 text-slate-800">Valor Pendente</h3>
            </div>
            <span className="text-3xl">🥣</span>
          </div>
          <p className="text-3xl font-black text-teal-800">
            {totalTupperware.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="mt-4 w-full bg-teal-50 h-2 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-2 rounded-full" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Atrasados e Hoje</h3>
          <Link to="/calendar" className="text-indigo-600 font-bold text-sm hover:underline italic">Ver Calendário Completo</Link>
        </div>
        <div className="flex-1 overflow-x-auto">
          {overdueInst.length === 0 && todayInst.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum pagamento pendente para hoje ou atrasado.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <th className="px-6 py-3">Cliente (Id)</th>
                  <th className="px-6 py-3">Marca</th>
                  <th className="px-6 py-3">Parcela</th>
                  <th className="px-6 py-3">Vencimento</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...overdueInst, ...todayInst].map(inst => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {clients.find(c => c.id === inst.clientId)?.name || 'Desconhecido'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={inst.brand === 'Eudora' ? "text-purple-600 font-medium" : "text-teal-600 font-medium"}>{inst.brand}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">Nº {inst.number}</td>
                    <td className={cn("px-6 py-4 font-bold", isPast(parseISO(inst.dueDate)) && !isToday(parseISO(inst.dueDate)) ? "text-red-500" : "text-amber-600")}>
                      {isToday(parseISO(inst.dueDate)) ? 'Hoje' : `${new Date(inst.dueDate).toLocaleDateString('pt-BR')} (Atrasado)`}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{inst.remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}
