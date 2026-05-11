import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Package } from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Sale, Installment } from '../types';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<'Todas' | 'Eudora' | 'Tupperware'>('Todas');

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

  const filteredClients = useMemo(() => {
    let result = clients;
    
    // Filtro por termo (nome do cliente ou produto)
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(c => {
        // match client name
        if (c.name.toLowerCase().includes(searchLower)) return true;
        
        // match products
        const clientSales = sales.filter(s => s.clientId === c.id);
        return clientSales.some(s => s.description.toLowerCase().includes(searchLower));
      });
    }

    return result;
  }, [clients, sales, search]);

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
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button 
                className={cn("px-4 py-3 rounded-lg text-sm font-bold transition-all", brandFilter === 'Todas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
                onClick={() => setBrandFilter('Todas')}
            >
                Todas
            </button>
            <button 
                className={cn("px-4 py-3 rounded-lg text-sm font-bold transition-all", brandFilter === 'Eudora' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700')}
                onClick={() => setBrandFilter('Eudora')}
            >
                Eudora
            </button>
            <button 
                className={cn("px-4 py-3 rounded-lg text-sm font-bold transition-all", brandFilter === 'Tupperware' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700')}
                onClick={() => setBrandFilter('Tupperware')}
            >
                Tupperware
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredClients.map(client => {
          let clientSales = sales.filter(s => s.clientId === client.id);
          
          if (brandFilter !== 'Todas') {
              clientSales = clientSales.filter(s => s.brand === brandFilter);
          }

          if (search.trim()) {
              const searchLower = search.toLowerCase();
              // Se a busca achar no nome do cliente exato, mostra todas as vendas
              // Se não achar no nome, filtra as vendas que tem os produtos
              if (!client.name.toLowerCase().includes(searchLower)) {
                  clientSales = clientSales.filter(s => s.description.toLowerCase().includes(searchLower));
              }
          }

          // Se tiver filtro de marca/produto e não sobrar nada, não mostra o cliente (se o search já não for o nome do cliente)
          if (clientSales.length === 0 && (brandFilter !== 'Todas' || !client.name.toLowerCase().includes(search.toLowerCase()))) {
              return null;
          }

          const eudoraSales = clientSales.filter(s => s.brand === 'Eudora');
          const tupperSales = clientSales.filter(s => s.brand === 'Tupperware');
          
          let totalDueEudora = eudoraSales.reduce((acc, s) => acc + s.remainingValue, 0);
          let totalDueTupperware = tupperSales.reduce((acc, s) => acc + s.remainingValue, 0);
          let totalDue = totalDueEudora + totalDueTupperware;

          return (
            <div key={client.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
                  <p className="text-slate-500">{client.phone || 'Sem telefone'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Total Devido</p>
                  <p className="font-bold text-slate-800">{totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                  <p className="text-xs text-purple-600/80 mb-1 font-bold uppercase">Eudora</p>
                  <p className="font-bold text-purple-900">{totalDueEudora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-100 text-center">
                  <p className="text-xs text-teal-600/80 mb-1 font-bold uppercase">Tupperware</p>
                  <p className="font-bold text-teal-900">{totalDueTupperware.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>

              <div className="space-y-6">
                {eudoraSales.length > 0 && (
                  <div>
                    <h3 className="font-bold text-purple-700 flex items-center gap-2 mb-3 border-b border-purple-100 pb-2">
                      <Package className="w-4 h-4" /> Compras Eudora
                    </h3>
                    <div className="space-y-3">
                      {eudoraSales.map(sale => <SaleCard key={sale.id} sale={sale} />)}
                    </div>
                  </div>
                )}
                {tupperSales.length > 0 && (
                  <div>
                    <h3 className="font-bold text-teal-700 flex items-center gap-2 mb-3 border-b border-teal-100 pb-2">
                      <Package className="w-4 h-4" /> Compras Tupperware
                    </h3>
                    <div className="space-y-3">
                      {tupperSales.map(sale => <SaleCard key={sale.id} sale={sale} />)}
                    </div>
                  </div>
                )}
                
                {clientSales.length === 0 && (
                  <p className="text-slate-400 text-sm text-center">Nenhuma compra registrada para esta cliente.</p>
                )}
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
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
