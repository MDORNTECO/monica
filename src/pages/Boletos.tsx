import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Boleto, Installment, Brand } from '../types';
import { Plus, ChevronDown, ChevronUp, CheckCircle, Circle, Trash2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthGroup {
  monthKey: string; // YYYY-MM
  label: string;
  boletos: Boleto[];
  installments: Installment[];
  totalGasto: number;
  totalRecebido: number;
  totalAReceber: number;
  isFinalized: boolean;
}

export default function BoletosPage() {
  const [filterBrand, setFilterBrand] = useState<'All' | Brand>('All');
  const [showFinalized, setShowFinalized] = useState(false);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  // Grouped data
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [expandedBoletosMonths, setExpandedBoletosMonths] = useState<string[]>([]);
  const [expandedReceiptsMonths, setExpandedReceiptsMonths] = useState<string[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBrand, setNewBrand] = useState<Brand>('Eudora');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadData();
  }, [filterBrand]);

  async function loadData() {
    setLoading(true);
    const [b, i] = await Promise.all([
      dbService.getBoletos(filterBrand !== 'All' ? { brand: filterBrand } : undefined),
      dbService.getInstallments() // No easy brand filter on standard method, we'll filter client side
    ]);

    let filteredInstallments = i;
    if (filterBrand !== 'All') {
      filteredInstallments = i.filter(inst => inst.brand === filterBrand);
    }

    setBoletos(b);
    setInstallments(filteredInstallments);

    // Grouping
    const groupsMap = new Map<string, MonthGroup>();

    const getGroup = (dateStr: string) => {
      const d = parseISO(dateStr);
      const key = format(d, 'yyyy-MM');
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          monthKey: key,
          label: format(d, 'MMMM yyyy', { locale: ptBR }),
          boletos: [],
          installments: [],
          totalGasto: 0,
          totalRecebido: 0,
          totalAReceber: 0,
          isFinalized: false
        });
      }
      return groupsMap.get(key)!;
    };

    b.forEach(boleto => {
      const g = getGroup(boleto.dueDate);
      g.boletos.push(boleto);
      g.totalGasto += boleto.amount;
    });

    filteredInstallments.forEach(inst => {
      const g = getGroup(inst.dueDate);
      g.installments.push(inst);
      g.totalRecebido += inst.paidAmount;
      g.totalAReceber += inst.remainingAmount;
    });

    const sortedGroups = Array.from(groupsMap.values())
      .map(g => ({
        ...g,
        isFinalized: (g.boletos.length > 0 || g.installments.length > 0) &&
                     g.boletos.every(b => b.status === 'pago') &&
                     g.installments.every(i => i.status === 'pago')
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      
    setGroups(sortedGroups);

    setLoading(false);
  }

  const toggleBoletoMonth = (key: string) => {
    setExpandedBoletosMonths(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleReceiptsMonth = (key: string) => {
    setExpandedReceiptsMonths(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  async function handleAddBoleto(e: React.FormEvent) {
    e.preventDefault();
    await dbService.createBoleto({
      brand: newBrand,
      description: newDesc,
      amount: parseFloat(newAmount.replace(',', '.')),
      dueDate: newDueDate
    });
    setIsModalOpen(false);
    setNewDesc('');
    setNewAmount('');
    loadData();
  }

  async function toggleBoletoStatus(b: Boleto) {
    await dbService.updateBoleto(b.id, { status: b.status === 'pago' ? 'pendente' : 'pago' });
    loadData();
  }

  async function handleDeleteBoleto(id: string) {
    if (confirm('Deseja excluir este boleto?')) {
      await dbService.deleteBoleto(id);
      loadData();
    }
  }

  const displayedGroups = groups.filter(g => showFinalized ? g.isFinalized : !g.isFinalized);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Boletos & Recebimentos</h1>
          <p className="text-slate-500 mt-1">Gerencie seus gastos e acompanhe os recebimentos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setShowFinalized(!showFinalized)}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold border transition-all", showFinalized ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
          >
            {showFinalized ? "Ocultar Finalizados" : "Meses Finalizados"}
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button 
              onClick={() => setFilterBrand('All')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterBrand === 'All' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterBrand('Eudora')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterBrand === 'Eudora' ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-purple-600")}
            >
              Eudora
            </button>
            <button 
              onClick={() => setFilterBrand('Tupperware')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", filterBrand === 'Tupperware' ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:text-teal-600")}
            >
              Tupperware
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Boletos (Gastos) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Boletos a Pagar / Gastos</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Boleto
            </button>
          </div>

          {loading ? (
            <div className="text-slate-500 p-8 text-center">Carregando...</div>
          ) : displayedGroups.length === 0 ? (
            <div className="text-slate-500 p-8 text-center bg-white rounded-2xl border border-slate-200">Nenhum dado encontrado.</div>
          ) : (
            displayedGroups.map(group => (
              <div key={group.monthKey} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleBoletoMonth(group.monthKey)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg text-slate-800 capitalize">{group.label}</span>
                    <span className="text-slate-500 text-sm">Gasto: {group.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                  </div>
                  {expandedBoletosMonths.includes(group.monthKey) ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </button>
                
                {expandedBoletosMonths.includes(group.monthKey) && (
                  <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                    {group.boletos.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">Nenhum boleto lançado para este mês.</p>
                    ) : (
                      group.boletos.sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(boleto => (
                        <div key={boleto.id} className="bg-white border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 sm:items-center shadow-sm">
                          <div className="flex gap-3 items-start">
                            <button onClick={() => toggleBoletoStatus(boleto)} className="mt-0.5">
                              {boleto.status === 'pago' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                              )}
                            </button>
                            <div>
                              <p className={cn("font-bold text-slate-800", boleto.status === 'pago' && 'line-through text-slate-400')}>
                                {boleto.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs font-medium mt-1">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider", boleto.brand === 'Eudora' ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700")}>
                                  {boleto.brand}
                                </span>
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(boleto.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                            <span className={cn("font-black text-lg", boleto.status === 'pago' ? "text-slate-400" : "text-slate-900")}>
                              {boleto.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <button onClick={() => handleDeleteBoleto(boleto.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Column: Recebimentos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Recebimentos a Receber / Recebidos</h2>
          </div>

          {loading ? (
            <div className="text-slate-500 p-8 text-center">Carregando...</div>
          ) : displayedGroups.length === 0 ? (
            <div className="text-slate-500 p-8 text-center bg-white rounded-2xl border border-slate-200">Nenhum dado encontrado.</div>
          ) : (
            displayedGroups.map(group => (
              <div key={group.monthKey} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleReceiptsMonth(group.monthKey)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-start w-full pr-4">
                    <span className="font-bold text-lg text-slate-800 capitalize mb-1">{group.label}</span>
                    <div className="flex flex-col sm:flex-row sm:gap-4 w-full text-sm">
                      <span className="text-green-600 font-medium">Já recebi: {group.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                      <span className="text-amber-600 font-medium">Falta receber: {group.totalAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                    </div>
                  </div>
                  {expandedReceiptsMonths.includes(group.monthKey) ? <ChevronUp className="text-slate-400 shrink-0" /> : <ChevronDown className="text-slate-400 shrink-0" />}
                </button>
                
                {expandedReceiptsMonths.includes(group.monthKey) && (
                  <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                    {group.installments.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">Nenhuma parcela para este mês.</p>
                    ) : (
                      group.installments.sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(inst => (
                        <div key={inst.id} className="bg-white border border-slate-100 p-3 rounded-xl flex flex-col sm:flex-row justify-between gap-3 sm:items-center shadow-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", inst.status === 'pago' ? 'bg-green-500' : inst.status === 'pago_parcial' ? 'bg-blue-500' : inst.status === 'atrasado' ? 'bg-red-500' : 'bg-amber-500')}></span>
                              <p className="font-bold text-slate-800 text-sm">Parcela Nº {inst.number}</p>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider", inst.brand === 'Eudora' ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700")}>
                                {inst.brand}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Venc: {new Date(inst.dueDateMs).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-xs text-slate-500">
                              Recebido: {inst.paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Boleto</h2>
            </div>
            <form onSubmit={handleAddBoleto} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Marca</label>
                <select 
                  required 
                  value={newBrand} 
                  onChange={e => setNewBrand(e.target.value as Brand)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                >
                  <option value="Eudora">Eudora</option>
                  <option value="Tupperware">Tupperware</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Descrição</label>
                <input 
                  required 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Ex: Pedido Ciclo 12"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data de Vencimento</label>
                  <input 
                    required 
                    type="date"
                    value={newDueDate} 
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
                  <input 
                    required 
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newAmount} 
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="250,00"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors">
                  Salvar Boleto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
