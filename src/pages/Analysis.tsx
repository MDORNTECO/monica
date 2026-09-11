import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { Sale, Brand } from '../types';
import { format, parseISO, isSameMonth, isAfter, isBefore, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart3, Calendar, Filter, TrendingUp, Package, Trophy, 
  ShoppingBag, Target, PieChart, Star, ChevronDown, ChevronUp, Search, X
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { cn } from '../lib/utils';

// --- Parsing Logic ---

interface ParsedProduct {
  id: string;
  name: string;
  quantity: number;
  category: string;
  size: string;
  brand: string;
  revenue: number;
  date: string;
  monthYear: string;
}

function getCategory(namePart: string, brand: string): string {
    let category = 'Outros';
    const lowerName = namePart.toLowerCase();
    
    if (brand === 'Tupperware') {
      if (lowerName.includes('tigela') || lowerName.includes('tupper') || lowerName.includes('pote') || lowerName.includes('refribox') || lowerName.includes('murano') || lowerName.includes('jeitosinho') || lowerName.includes('caçarola') || lowerName.includes('panela')) {
        category = 'Potes e Vasilhas';
      } else if (lowerName.includes('garrafa') || lowerName.includes('eco')) {
        category = 'Garrafas';
      } else if (lowerName.includes('jarra')) {
        category = 'Jarras';
      } else if (lowerName.includes('faca') || lowerName.includes('tábua')) {
        category = 'Utensílios';
      }
    } else if (brand === 'Eudora') {
      if (lowerName.includes('perfume') || lowerName.includes('colônia') || lowerName.includes('spray') || lowerName.includes('desodorante')) {
        category = 'Perfumaria';
      } else if (lowerName.includes('batom') || lowerName.includes('gloss') || lowerName.includes('maquiagem') || lowerName.includes('base') || lowerName.includes('máscara')) {
        category = 'Maquiagem';
      } else if (lowerName.includes('hidratante') || lowerName.includes('loção') || lowerName.includes('creme') || lowerName.includes('óleo')) {
        category = 'Corpo e Banho';
      } else if (lowerName.includes('shampoo') || lowerName.includes('condicionador') || lowerName.includes('cabelo') || lowerName.includes('capilar')) {
        category = 'Cabelos';
      } else if (lowerName.includes('sabonete') || lowerName.includes('banho')) {
        category = 'Sabonetes';
      } else if (lowerName.includes('rosto') || lowerName.includes('facial') || lowerName.includes('serum') || lowerName.includes('protetor')) {
         category = 'Rosto';
      }
    }
    return category;
}

function parseSaleDescription(sale: Sale): ParsedProduct[] {
  const lines = (sale.description || '').split('\n').map(l => l.trim()).filter(Boolean);
  const products: ParsedProduct[] = [];
  
  // Total sale value fallback
  let totalParsedRevenue = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let qty = 1;
    let namePart = line;
    let price = 0;

    // leading price (e.g., 112,90 refil)
    const leadingPriceMatch = namePart.match(/^(?:R\$)?\s*(\d+,\d+)\s*/i);
    if (leadingPriceMatch) {
      price = parseFloat(leadingPriceMatch[1].replace(',', '.'));
      namePart = namePart.replace(/^(?:R\$)?\s*\d+,\d+\s*/i, '').trim();
    }

    const qtyMatch = namePart.match(/^0*(\d+)\s+(.*)/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10);
      namePart = qtyMatch[2];
    }
    
    // trailing price
    const trailingPriceMatch = namePart.match(/(?:R\$)?\s*(\d+,\d+)\s*(?:cada)?$/i);
    const trailingIntPriceMatch = namePart.match(/\s+(\d+)$/);
    let isCada = false;
    
    if (trailingPriceMatch) {
      price = parseFloat(trailingPriceMatch[1].replace(',', '.'));
      if (namePart.toLowerCase().includes('cada')) isCada = true;
      namePart = namePart.replace(/(?:cada)?\s*(?:R\$)?\s*\d+,\d+\s*(?:cada)?$/i, '').trim();
    } else if (trailingIntPriceMatch) {
      price = parseInt(trailingIntPriceMatch[1], 10);
      namePart = namePart.replace(/\s+\d+$/, '').trim();
    }
    
    // size extraction
    let size = 'Padrão';
    const sizeMatch = namePart.match(/(\d+(?:,\d+)?\s*(?:L|ml|litros|kg|g))\b/i);
    if (sizeMatch) {
      size = sizeMatch[1].trim();
      // Optional: don't remove size from name to keep it readable, just extract it
    }

    let revenue = 0;
    if (price > 0) {
      revenue = isCada ? price * qty : price * qty; 
      // If we assumed unit price, qty*price. If they wrote total, it might overestimate, but it's a heuristic.
    }
    
    // Clean name a bit more
    namePart = namePart.replace(/^[-*•]\s*/, '').trim();
    if (!namePart) namePart = 'Produto não especificado';

    const category = getCategory(namePart, sale.brand);

    products.push({
      id: `${sale.id}-${i}`,
      name: namePart,
      quantity: qty,
      category,
      size,
      brand: sale.brand || 'Outras',
      revenue,
      date: sale.date,
      monthYear: sale.monthYear
    });
    
    totalParsedRevenue += revenue;
  }
  
  // If we completely failed to find prices, distribute the totalValue proportionally or evenly
  if (totalParsedRevenue === 0 && sale.totalValue > 0 && products.length > 0) {
     const valuePerItem = sale.totalValue / products.reduce((acc, p) => acc + p.quantity, 0);
     products.forEach(p => p.revenue = valuePerItem * p.quantity);
  }

  return products;
}

export default function AnalysisPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState('12m'); // all, year, last_year, 12m, 6m, 3m, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [brandFilter, setBrandFilter] = useState('Todas');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [productSearch, setProductSearch] = useState('');

  // UI States
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await dbService.getSales();
        setSales(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allProducts = useMemo(() => {
    return sales.flatMap(s => parseSaleDescription(s));
  }, [sales]);

  // Derived filter options
  const availableCategories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category));
    return ['Todas', ...Array.from(cats).sort()];
  }, [allProducts]);

  // Apply Filters
  const filteredProducts = useMemo(() => {
    const today = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (periodFilter === 'year') {
      startDate = startOfYear(today);
      endDate = endOfYear(today);
    } else if (periodFilter === 'last_year') {
      startDate = startOfYear(subYears(today, 1));
      endDate = endOfYear(subYears(today, 1));
    } else if (periodFilter === '12m') {
      startDate = subMonths(today, 12);
      endDate = today;
    } else if (periodFilter === '6m') {
      startDate = subMonths(today, 6);
      endDate = today;
    } else if (periodFilter === '3m') {
      startDate = subMonths(today, 3);
      endDate = today;
    } else if (periodFilter === 'month') {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
    } else if (periodFilter === 'custom' && customStart && customEnd) {
      startDate = parseISO(customStart);
      endDate = parseISO(customEnd);
    }

    return allProducts.filter(p => {
      // Date filter
      if (startDate && endDate) {
         const pDate = parseISO(p.date);
         if (!isWithinInterval(pDate, { start: startDate, end: endDate })) {
           return false;
         }
      }

      // Brand
      if (brandFilter !== 'Todas' && p.brand !== brandFilter) return false;

      // Category
      if (categoryFilter !== 'Todas' && p.category !== categoryFilter) return false;

      // Product search
      if (productSearch) {
        if (!p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
      }

      return true;
    });
  }, [allProducts, periodFilter, customStart, customEnd, brandFilter, categoryFilter, productSearch]);

  // Aggregations
  const totalQuantity = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);
  const totalRevenue = filteredProducts.reduce((acc, p) => acc + p.revenue, 0);

  // Unique Months for averages
  const uniqueMonthsCount = useMemo(() => {
     const months = new Set(filteredProducts.map(p => p.monthYear));
     return Math.max(1, months.size); // avoid div by 0
  }, [filteredProducts]);

  const avgPerMonth = totalQuantity / uniqueMonthsCount;

  // Top Product
  const productStats = useMemo(() => {
    const stats: Record<string, { qty: number, revenue: number, brand: string, category: string }> = {};
    filteredProducts.forEach(p => {
      const key = p.name.toLowerCase();
      if (!stats[key]) stats[key] = { qty: 0, revenue: 0, brand: p.brand, category: p.category };
      stats[key].qty += p.quantity;
      stats[key].revenue += p.revenue;
    });
    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.qty - a.qty);
  }, [filteredProducts]);

  const topProduct = productStats[0] || null;

  // Top Brand
  const brandStats = useMemo(() => {
    const stats: Record<string, { qty: number, revenue: number }> = {};
    filteredProducts.forEach(p => {
      if (!stats[p.brand]) stats[p.brand] = { qty: 0, revenue: 0 };
      stats[p.brand].qty += p.quantity;
      stats[p.brand].revenue += p.revenue;
    });
    return Object.entries(stats).map(([brand, data]) => ({ brand, ...data })).sort((a,b) => b.qty - a.qty);
  }, [filteredProducts]);
  const topBrand = brandStats[0] || null;

  // Top Category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { qty: number, revenue: number }> = {};
    filteredProducts.forEach(p => {
      if (!stats[p.category]) stats[p.category] = { qty: 0, revenue: 0 };
      stats[p.category].qty += p.quantity;
      stats[p.category].revenue += p.revenue;
    });
    return Object.entries(stats).map(([category, data]) => ({ category, ...data })).sort((a,b) => b.qty - a.qty);
  }, [filteredProducts]);
  const topCategory = categoryStats[0] || null;

  // Month Stats
  const monthStats = useMemo(() => {
    const stats: Record<string, { qty: number, revenue: number }> = {};
    filteredProducts.forEach(p => {
      if (!stats[p.monthYear]) stats[p.monthYear] = { qty: 0, revenue: 0 };
      stats[p.monthYear].qty += p.quantity;
      stats[p.monthYear].revenue += p.revenue;
    });
    return Object.entries(stats).map(([monthYear, data]) => ({ monthYear, ...data })).sort((a,b) => a.monthYear.localeCompare(b.monthYear));
  }, [filteredProducts]);
  
  const bestMonth = [...monthStats].sort((a,b) => b.qty - a.qty)[0] || null;

  // Seasonality (Quarters)
  const quarterStats = useMemo(() => {
    const stats = { '1º Trimestre': 0, '2º Trimestre': 0, '3º Trimestre': 0, '4º Trimestre': 0 };
    filteredProducts.forEach(p => {
       const m = parseInt(p.monthYear.split('-')[1], 10);
       if (m >= 1 && m <= 3) stats['1º Trimestre'] += p.quantity;
       else if (m >= 4 && m <= 6) stats['2º Trimestre'] += p.quantity;
       else if (m >= 7 && m <= 9) stats['3º Trimestre'] += p.quantity;
       else if (m >= 10 && m <= 12) stats['4º Trimestre'] += p.quantity;
    });
    return Object.entries(stats).map(([quarter, qty]) => ({ quarter, qty, percent: totalQuantity ? (qty/totalQuantity)*100 : 0 }));
  }, [filteredProducts, totalQuantity]);
  const bestQuarter = [...quarterStats].sort((a,b) => b.qty - a.qty)[0] || null;

  // Tupperware Size Stats
  const sizeStats = useMemo(() => {
     const stats: Record<string, number> = {};
     filteredProducts.filter(p => p.brand === 'Tupperware' && p.size && p.size !== 'Padrão').forEach(p => {
        if (!stats[p.size]) stats[p.size] = 0;
        stats[p.size] += p.quantity;
     });
     return Object.entries(stats).map(([size, qty]) => ({ size, qty })).sort((a,b) => b.qty - a.qty);
  }, [filteredProducts]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análise de Vendas</h1>
          <p className="text-slate-500 text-sm mt-1">Inteligência e histórico de produtos vendidos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-5 h-5 text-indigo-500" />
          <h2 className="font-bold text-slate-800">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase">Período</label>
             <select 
               className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={periodFilter}
               onChange={(e) => setPeriodFilter(e.target.value)}
             >
                <option value="all">Todo o período</option>
                <option value="year">Este ano</option>
                <option value="last_year">Ano passado</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="6m">Últimos 6 meses</option>
                <option value="3m">Últimos 3 meses</option>
                <option value="month">Mês atual</option>
                <option value="custom">Personalizado</option>
             </select>
          </div>

          {periodFilter === 'custom' && (
             <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1 flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Início</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Fim</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
             </div>
          )}

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase">Marca</label>
             <select 
               className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={brandFilter}
               onChange={(e) => setBrandFilter(e.target.value)}
             >
                <option value="Todas">Todas</option>
                <option value="Tupperware">Tupperware</option>
                <option value="Eudora">Eudora</option>
                <option value="Outras">Outras</option>
             </select>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
             <select 
               className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
             >
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase">Produto</label>
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} className="absolute right-3 top-3">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
             <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nenhuma venda encontrada</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Não encontramos registros para os filtros selecionados. Tente alterar o período ou os termos de pesquisa.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Package className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Produtos</p>
               </div>
               <p className="text-3xl font-black text-slate-800">{totalQuantity}</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Média/Mês</p>
               </div>
               <p className="text-3xl font-black text-slate-800">{avgPerMonth.toFixed(1)}</p>
               <p className="text-xs text-slate-400 mt-1">no período</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Trophy className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Top Produto</p>
               </div>
               <p className="text-lg font-bold text-slate-800 truncate" title={topProduct?.name}>{topProduct?.name || '-'}</p>
               <p className="text-sm text-slate-500">{topProduct?.qty || 0} un.</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Star className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Top Marca</p>
               </div>
               <p className="text-lg font-bold text-slate-800 truncate" title={topBrand?.brand}>{topBrand?.brand || '-'}</p>
               <p className="text-sm text-slate-500">{topBrand?.qty || 0} un.</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Target className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Top Categoria</p>
               </div>
               <p className="text-lg font-bold text-slate-800 truncate" title={topCategory?.category}>{topCategory?.category || '-'}</p>
               <p className="text-sm text-slate-500">{topCategory?.qty || 0} un.</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 col-span-2 lg:col-span-1">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Melhor Mês</p>
               </div>
               <p className="text-lg font-bold text-slate-800 truncate">{bestMonth ? format(parseISO(bestMonth.monthYear + '-01'), 'MMM/yyyy', { locale: ptBR }) : '-'}</p>
               <p className="text-sm text-slate-500">{bestMonth?.qty || 0} un.</p>
             </div>

             <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 col-span-2 lg:col-span-2">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><BarChart3 className="w-5 h-5" /></div>
                  <p className="text-sm font-semibold text-slate-500">Faturamento</p>
               </div>
               <p className="text-3xl font-black text-slate-800">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                 <TrendingUp className="w-5 h-5 text-indigo-500" />
                 Evolução das Vendas (Qtd)
               </h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthStats}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis 
                         dataKey="monthYear" 
                         tickFormatter={(val) => {
                           const d = parseISO(val + '-01');
                           return format(d, 'MMM yy', { locale: ptBR });
                         }}
                         stroke="#94a3b8"
                         fontSize={12}
                         tickLine={false}
                         axisLine={false}
                       />
                       <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                       <RechartsTooltip 
                         formatter={(value: number) => [`${value} produtos`, 'Vendidos']}
                         labelFormatter={(label) => format(parseISO(label + '-01'), 'MMMM yyyy', { locale: ptBR })}
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Line type="monotone" dataKey="qty" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Top Products */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Star className="w-5 h-5 text-amber-500" />
                   Produtos mais vendidos
                 </h3>
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2">
                  <div className="space-y-4">
                    {(showAllProducts ? productStats : productStats.slice(0, 5)).map((prod, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <span className={cn("w-6 text-center font-bold", idx < 3 ? 'text-amber-500' : 'text-slate-400')}>
                             {idx + 1}º
                           </span>
                           <div className="min-w-0">
                             <p className="font-semibold text-slate-800 truncate">{prod.name}</p>
                             <p className="text-xs text-slate-500">{prod.brand} • {prod.category}</p>
                           </div>
                         </div>
                         <div className="text-right shrink-0">
                           <p className="font-bold text-indigo-600">{prod.qty} un.</p>
                           <p className="text-xs text-slate-400">{totalQuantity ? ((prod.qty/totalQuantity)*100).toFixed(1) : 0}%</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               {productStats.length > 5 && (
                 <button 
                   onClick={() => setShowAllProducts(!showAllProducts)}
                   className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                 >
                   {showAllProducts ? (
                     <>Ver menos <ChevronUp className="w-4 h-4" /></>
                   ) : (
                     <>Ver todos ({productStats.length}) <ChevronDown className="w-4 h-4" /></>
                   )}
                 </button>
               )}
            </div>
          </div>

          {/* Deep Dives */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Category Ranking */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Target className="w-5 h-5 text-emerald-500" /> Categorias
               </h3>
               <div className="space-y-4">
                 {categoryStats.slice(0, 5).map((cat, idx) => (
                   <div key={cat.category}>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium text-slate-700">{cat.category}</span>
                       <span className="font-bold text-slate-900">{cat.qty} un.</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(cat.qty/totalQuantity)*100}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Seasonality */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-orange-500" /> Sazonalidade
               </h3>
               <div className="space-y-3">
                 {quarterStats.map((q) => (
                   <div key={q.quarter} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50">
                     <span className="font-medium text-slate-700">{q.quarter}</span>
                     <div className="text-right">
                       <span className="font-bold text-slate-900 block">{q.qty} un.</span>
                       <span className="text-xs text-slate-500">{q.percent.toFixed(1)}%</span>
                     </div>
                   </div>
                 ))}
               </div>
               {bestQuarter && bestQuarter.qty > 0 && quarterStats.some(q => q.qty > 0) && (
                 <p className="mt-4 text-sm text-slate-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                   Seu período de maior venda costuma ser o <b>{bestQuarter.quarter}</b>.
                 </p>
               )}
            </div>

            {/* Brands or Sizes depending on filter */}
            {brandFilter === 'Todas' ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <PieChart className="w-5 h-5 text-blue-500" /> Comparação de Marcas
                 </h3>
                 <div className="space-y-4">
                   {brandStats.map(b => (
                     <div key={b.brand} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", b.brand === 'Tupperware' ? 'bg-teal-500' : b.brand === 'Eudora' ? 'bg-purple-500' : 'bg-slate-400')}></div>
                          <span className="font-bold text-slate-700">{b.brand}</span>
                       </div>
                       <div className="text-right">
                          <p className="font-bold text-slate-900">{b.qty} un.</p>
                          <p className="text-xs text-slate-500">{b.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            ) : brandFilter === 'Tupperware' ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Target className="w-5 h-5 text-teal-500" /> Tamanhos (Tupperware)
                 </h3>
                 {sizeStats.length > 0 ? (
                   <div className="space-y-3">
                     {sizeStats.slice(0,6).map(s => (
                       <div key={s.size} className="flex justify-between items-center p-2 border-b border-slate-100 last:border-0">
                         <span className="font-medium text-slate-700">{s.size}</span>
                         <span className="font-bold text-teal-600">{s.qty} un.</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-sm text-slate-500">Poucos dados de tamanho identificados.</p>
                 )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-purple-500" /> Top {brandFilter} Média Mensal
                 </h3>
                 <div className="space-y-3">
                   {productStats.slice(0,5).map(p => (
                     <div key={p.name} className="flex justify-between items-center p-2 border-b border-slate-100 last:border-0">
                       <span className="font-medium text-slate-700 truncate pr-2">{p.name}</span>
                       <span className="font-bold text-purple-600 shrink-0">{(p.qty/uniqueMonthsCount).toFixed(1)}/mês</span>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
          
          {/* Best / Worst Month */}
          {monthStats.length > 1 && (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-6">
                <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-full"><Trophy className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-green-800 font-medium">Mês com Maior Venda</p>
                    <p className="text-xl font-black text-green-900">
                      {bestMonth ? format(parseISO(bestMonth.monthYear + '-01'), 'MMMM yyyy', { locale: ptBR }) : '-'}
                    </p>
                    <p className="text-green-700 text-sm mt-0.5">{bestMonth?.qty} produtos vendidos</p>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className="p-3 bg-slate-200 text-slate-500 rounded-full"><TrendingUp className="w-6 h-6 rotate-180" /></div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Mês com Menor Venda</p>
                    <p className="text-xl font-black text-slate-800">
                      {monthStats[0] ? format(parseISO(monthStats[0].monthYear + '-01'), 'MMMM yyyy', { locale: ptBR }) : '-'}
                    </p>
                    <p className="text-slate-500 text-sm mt-0.5">{monthStats[0]?.qty} produtos vendidos</p>
                  </div>
                </div>
             </div>
          )}

        </>
      )}
    </div>
  );
}
