import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Package, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Sale, Installment } from '../types';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { differenceInDays } from 'date-fns';

type SortOption = 'alfabetica' | 'gastou_mais' | 'gastou_menos' | 'qtd_compras' | 'data_recente';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<'Todas' | 'Eudora' | 'Tupperware'>('Todas');
  const [sortOrder, setSortOrder] = useState<SortOption>('alfabetica');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const toggleClient = (id: string) => {
    const newSet = new Set(expandedClients);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedClients(newSet);
  };

  useEffect(() => {
    async function load() {
      const [c, s] = await Promise.all([
        dbService.getClients(),
        dbService.getSales()
      ]);
      setClients(c);
      setSales(s);
      setLoading(false);
    }
    load();
  }, []);

  const processedClients = useMemo(() => {
    let result = clients.map(client => {
      const clientSales = sales.filter(s => s.clientId === client.id);
      
      const totalSpend = clientSales.reduce((acc, s) => acc + s.totalValue, 0);
      const totalPaid = clientSales.reduce((acc, s) => acc + s.paidValue, 0);
      const totalDue = clientSales.reduce((acc, s) => acc + s.remainingValue, 0);
      const eudoraSales = clientSales.filter(s => s.brand === 'Eudora');
      const tupperSales = clientSales.filter(s => s.brand === 'Tupperware');
      
      const lastSaleDate = clientSales.length > 0 ? Math.max(...clientSales.map(s => new Date(s.date).getTime())) : 0;
      
      // Inactive check: > 60 days since last sale AND no pending payments
      const daysSinceLastSale = lastSaleDate ? differenceInDays(new Date(), new Date(lastSaleDate)) : 999;
      const isInactive = daysSinceLastSale >= 60 && totalDue <= 0 && clientSales.length > 0;

      return {
        ...client,
        clientSales,
        eudoraSales,
        tupperSales,
        totalSpend,
        totalPaid,
        totalDue,
        lastSaleDate,
        isInactive,
      };
    });

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(c => {
        if (c.name.toLowerCase().includes(searchLower)) return true;
        return c.clientSales.some(s => s.description.toLowerCase().includes(searchLower));
      });
    }

    if (brandFilter !== 'Todas') {
      result = result.filter(c => c.clientSales.some(s => s.brand === brandFilter));
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case 'gastou_mais': return b.totalSpend - a.totalSpend;
        case 'gastou_menos': return a.totalSpend - b.totalSpend;
        case 'qtd_compras': return b.clientSales.length - a.clientSales.length;
        case 'data_recente': return b.lastSaleDate - a.lastSaleDate;
        case 'alfabetica': 
        default: 
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [clients, sales, search, brandFilter, sortOrder]);

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando clientes...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consulta Geral</h1>
        <p className="text-slate-500">Busque clientes e produtos e veja o histórico completo.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            className="pl-10 h-14 text-lg" 
            placeholder="Pesquisar cliente ou produto..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOption)}
            className="h-14 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="alfabetica">Ordem Alfabética (A-Z)</option>
            <option value="gastou_mais">Quem gastou mais</option>
            <option value="gastou_menos">Quem gastou menos</option>
            <option value="qtd_compras">Maior quantidade de compras</option>
            <option value="data_recente">Compras mais recentes</option>
          </select>
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 h-14">
              <button 
                  className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", brandFilter === 'Todas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
                  onClick={() => setBrandFilter('Todas')}
              >
                  Todas
              </button>
              <button 
                  className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", brandFilter === 'Eudora' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700')}
                  onClick={() => setBrandFilter('Eudora')}
              >
                  Eudora
              </button>
              <button 
                  className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", brandFilter === 'Tupperware' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700')}
                  onClick={() => setBrandFilter('Tupperware')}
              >
                  Tupperware
              </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {processedClients.map(client => {
          const isExpanded = expandedClients.has(client.id);

          return (
            <div key={client.id} className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden transition-all", client.isInactive ? "border-amber-200 bg-amber-50/10" : "border-slate-100")}>
              {/* Header (Clickable) */}
              <div 
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleClient(client.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", client.isInactive ? "bg-amber-100 text-amber-500" : "bg-slate-100 text-slate-400")}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
                      {client.isInactive && (
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                          <AlertTriangle className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{client.phone || 'Sem telefone'} • {client.clientSales.length} compras</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end w-full sm:w-auto">
                    {/* Valors */}
                    <div className="flex gap-3 sm:gap-6 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase mb-0.5">Total Comprado</p>
                          <p className="font-bold text-slate-800 text-base sm:text-lg">{client.totalSpend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs text-green-600/80 font-bold uppercase mb-0.5">Valor Pago</p>
                          <p className="font-bold text-green-700 text-base sm:text-lg">{client.totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-xs text-red-500/80 font-bold uppercase mb-0.5">Falta Pagar</p>
                          <p className="font-bold text-red-600 text-base sm:text-lg">{client.totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>
                    
                    <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </div>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm">
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                      <p className="text-xs text-purple-600/80 mb-1 font-bold uppercase">Eudora (Devido)</p>
                      <p className="font-bold text-purple-900">{client.eudoraSales.reduce((acc, s) => acc + s.remainingValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-xl border border-teal-100 text-center">
                      <p className="text-xs text-teal-600/80 mb-1 font-bold uppercase">Tupperware (Devido)</p>
                      <p className="font-bold text-teal-900">{client.tupperSales.reduce((acc, s) => acc + s.remainingValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {client.eudoraSales.length > 0 && (
                      <div>
                        <h3 className="font-bold text-purple-700 flex items-center gap-2 mb-3 border-b border-purple-100 pb-2">
                          <Package className="w-4 h-4" /> Compras Eudora
                        </h3>
                        <div className="space-y-3">
                          {client.eudoraSales.map(sale => <SaleCard key={sale.id} sale={sale} />)}
                        </div>
                      </div>
                    )}
                    {client.tupperSales.length > 0 && (
                      <div>
                        <h3 className="font-bold text-teal-700 flex items-center gap-2 mb-3 border-b border-teal-100 pb-2">
                          <Package className="w-4 h-4" /> Compras Tupperware
                        </h3>
                        <div className="space-y-3">
                          {client.tupperSales.map(sale => <SaleCard key={sale.id} sale={sale} />)}
                        </div>
                      </div>
                    )}
                    
                    {client.clientSales.length === 0 && (
                      <p className="text-slate-400 text-sm text-center">Nenhuma compra registrada para esta cliente.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {processedClients.length === 0 && (
          <div className="p-12 text-center text-slate-400">Nenhum cliente encontrado.</div>
        )}
      </div>

    </div>
  );
}

const SaleCard: React.FC<{ sale: Sale }> = ({ sale }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <p className="font-semibold text-slate-800">{sale.description}</p>
        <p className="text-xs text-slate-500">Registrada em {new Date(sale.date).toLocaleDateString('pt-BR')} • {sale.installmentsCount} parcelas</p>
      </div>
      <div className="text-right flex items-center justify-between sm:block mt-2 sm:mt-0">
        <StatusBadge status={sale.status} paidAmount={sale.paidValue} />
        <div className="mt-1">
          <p className="text-xs text-slate-500">Restante</p>
          <p className="font-bold text-slate-800">{sale.remainingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, paidAmount }: { status: string, paidAmount?: number }) {
  let color = 'bg-slate-100 text-slate-700';
  let text = 'Desconhecido';
  if (status === 'pendente') { color = 'bg-amber-100 text-amber-700'; text = 'Pendente'; }
  if (status === 'pago') { color = 'bg-green-100 text-green-700'; text = 'Pago'; }
  if (status === 'pago_parcial') { 
    color = 'bg-blue-100 text-blue-700'; 
    text = paidAmount ? `Ent./Pago: ${paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Pago Parcial'; 
  }
  if (status === 'atrasado') { color = 'bg-red-100 text-red-700'; text = 'Atrasado'; }

  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold inline-block", color)}>{text}</span>;
}
