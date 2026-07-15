import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, Trash2, Calendar, CreditCard, CheckCircle, AlertCircle, ChevronDown, ChevronUp, DollarSign, ChevronLeft, ChevronRight, Trophy, Settings, Gift } from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Consortium } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, isPast, parseISO, startOfDay, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DrawModule } from '../components/DrawModule';
import { ManageDrawParticipants } from '../components/ManageDrawParticipants';

export default function ConsortiumPage() {
  const [consortiums, setConsortiums] = useState<Consortium[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Consortium Form
  const [groupType, setGroupType] = useState<'amigos' | 'cartorio'>('amigos');
  const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [durationMonths, setDurationMonths] = useState('10');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [expandedAmigos, setExpandedAmigos] = useState(true);
  const [expandedCartorio, setExpandedCartorio] = useState(true);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  
  // Draw State
  const [isDrawModuleOpen, setIsDrawModuleOpen] = useState(false);
  const [isManageParticipantsOpen, setIsManageParticipantsOpen] = useState(false);
  const [selectedHistoryClient, setSelectedHistoryClient] = useState<Consortium | null>(null);
  const [activeDrawGroup, setActiveDrawGroup] = useState<'amigos' | 'cartorio'>('amigos');
  const [activeHistoryGroup, setActiveHistoryGroup] = useState<'amigos' | 'cartorio'>('amigos');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [cons, cls] = await Promise.all([
      dbService.getConsortiums(),
      dbService.getClients()
    ]);
    setConsortiums(cons.sort((a, b) => b.createdAt - a.createdAt));
    setClients(cls);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const dMonths = parseInt(durationMonths);
    
    let finalClientName = newClientName;
    if (clientType === 'existing') {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;
      finalClientName = client.name;
    }

    await dbService.createConsortium({
      groupType,
      clientType,
      clientId: clientType === 'existing' ? clientId : null,
      clientName: finalClientName,
      monthlyValue: 50,
      durationMonths: dMonths,
      startDate
    });

    setIsModalOpen(false);
    resetForm();
    loadData();
  }

  function resetForm() {
    setGroupType('amigos');
    setClientType('existing');
    setClientId('');
    setNewClientName('');
    setDurationMonths('10');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir este membro do consórcio? Todos os pagamentos registrados para esta pessoa serão apagados.')) {
      await dbService.deleteConsortium(id);
      loadData();
    }
  }

  async function handleActionClick(c: Consortium, toPayIds: string[], toUnpayId?: string) {
    if (toPayIds.length > 0) {
      await dbService.markConsortiumInstallments(c.id, toPayIds, true);
    } else if (toUnpayId) {
      await dbService.markConsortiumInstallments(c.id, [toUnpayId], false);
    }
    loadData();
  }

  async function handleDrawWin(winner: Consortium) {
    await dbService.registerDrawWin(winner.id, Date.now());
    loadData();
  }

  async function handleClearDrawHistory(clientId: string) {
    if (confirm("Tem certeza que deseja remover todo o histórico de contemplações deste cliente?")) {
      await dbService.clearDrawHistory(clientId);
      setSelectedHistoryClient(null);
      loadData();
    }
  }

  const now = currentViewDate;
  const monthStart = startOfMonth(now);

  const renderList = (type: 'amigos' | 'cartorio') => {
    const list = consortiums.filter(c => c.groupType === type);
    if (list.length === 0) return <div className="p-4 text-slate-500 text-sm text-center">Nenhum membro cadastrado.</div>;

    return (
      <div className="divide-y divide-slate-100">
        {list.map(c => {
          const installments = c.installments || [];
          
          // Find past unpaid
          const pastUnpaid = installments.filter(i => parseISO(i.dueDate) < monthStart && !i.paid);
          // Find current month
          const currentInst = installments.find(i => isSameMonth(parseISO(i.dueDate), now));
          
          const pendingAmount = pastUnpaid.length * c.monthlyValue;
          let currentDue = 0;
          let isCurrentPaid = false;
          let toPayIds: string[] = pastUnpaid.map(i => i.id);
          let toUnpayId: string | undefined = undefined;

          if (currentInst) {
            if (!currentInst.paid) {
              currentDue = c.monthlyValue;
              toPayIds.push(currentInst.id);
            } else {
              isCurrentPaid = true;
              // If we want to undo, we'll undo the current month
              toUnpayId = currentInst.id;
            }
          } else {
            // If there's no current month, maybe they finished or haven't started.
            // If they are fully paid, let's find the last paid one to unpay just in case.
            if (pastUnpaid.length === 0) {
               const lastPaid = [...installments].reverse().find(i => i.paid);
               if (lastPaid) toUnpayId = lastPaid.id;
            }
          }

          const totalDue = pendingAmount + currentDue;
          const isUpToDate = totalDue === 0;

          return (
            <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800">{c.clientName}</h3>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide", c.participatesInDraw !== false ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                    {c.participatesInDraw !== false ? 'Participando' : 'Excluído'}
                  </span>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-sm text-slate-500 mt-0.5">
                  {currentInst ? `Mês Atual: ${format(parseISO(currentInst.dueDate), 'MMMM/yyyy', { locale: ptBR })}` : 'Fora de vigência'}
                </div>
                
                {pastUnpaid.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-red-600 bg-red-50 inline-flex px-2 py-1 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pagamentos anteriores pendentes! (Somados)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={cn("text-lg font-bold", isUpToDate ? "text-slate-400 line-through" : "text-slate-800")}>
                    {totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  {isUpToDate && <div className="text-xs font-bold text-green-600 uppercase tracking-wider">Pago</div>}
                </div>
                
                <button
                  onClick={() => handleActionClick(c, toPayIds, toUnpayId)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm border-2",
                    isUpToDate 
                      ? "bg-green-500 border-green-500 text-white hover:bg-green-600" 
                      : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-green-500 hover:border-green-500"
                  )}
                  title={isUpToDate ? "Desfazer pagamento" : "Marcar pendências como pago"}
                >
                  <CheckCircle className={cn("w-6 h-6", isUpToDate && "text-white")} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Financial calculations (Consortium only)
  let totalReceivedThisMonth = 0;
  let totalPendingThisMonth = 0;

  consortiums.forEach(c => {
    const installments = c.installments || [];
    // Only current month installments
    const currentInsts = installments.filter(i => isSameMonth(parseISO(i.dueDate), now));
    currentInsts.forEach(i => {
      if (i.paid) totalReceivedThisMonth += c.monthlyValue;
      else totalPendingThisMonth += c.monthlyValue;
    });
    
    // Also add past unpaid to pending? The user might want total pending. Let's include past unpaid.
    const pastUnpaid = installments.filter(i => parseISO(i.dueDate) < monthStart && !i.paid);
    totalPendingThisMonth += (pastUnpaid.length * c.monthlyValue);
  });

  const winnersRanking = [...consortiums].sort((a, b) => {
    const aWins = a.drawWins?.length || 0;
    const bWins = b.drawWins?.length || 0;
    return bWins - aWins;
  }).filter(c => (c.drawWins?.length || 0) > 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consórcios</h1>
            <p className="text-slate-500">Gerenciamento mensal de Consórcio Amigos e Cartório.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1">
              <button 
                onClick={() => setCurrentViewDate(prev => subMonths(prev, 1))}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-32 text-center font-semibold text-slate-700 text-sm uppercase tracking-wide">
                {format(currentViewDate, 'MMMM yyyy', { locale: ptBR })}
              </div>
              <button 
                onClick={() => setCurrentViewDate(prev => addMonths(prev, 1))}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              Novo Membro
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-500 mb-1">Recebido este Mês (Consórcio)</div>
            <div className="text-2xl font-black text-green-600">
              {totalReceivedThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <div className="w-px bg-slate-100 hidden sm:block"></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-500 mb-1">Pendente (Total)</div>
            <div className="text-2xl font-black text-red-600">
              {totalPendingThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Amigos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedAmigos(!expandedAmigos)}
              className="w-full flex items-center justify-between p-4 bg-pink-50 hover:bg-pink-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                <h2 className="text-lg font-bold text-pink-900">Consórcio Amigos</h2>
              </div>
              {expandedAmigos ? <ChevronUp className="w-5 h-5 text-pink-600" /> : <ChevronDown className="w-5 h-5 text-pink-600" />}
            </button>
            {expandedAmigos && renderList('amigos')}
          </div>

          {/* Cartorio */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedCartorio(!expandedCartorio)}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-blue-900">Consórcio Cartório</h2>
              </div>
              {expandedCartorio ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
            </button>
            {expandedCartorio && renderList('cartorio')}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Draw Module */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
        
        {/* Draw Controls */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2 text-pink-400">
            <Gift className="w-6 h-6" />
            <h2 className="text-lg font-bold">Sorteio Mensal</h2>
          </div>
          
          <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
            <button 
              onClick={() => setActiveDrawGroup('amigos')}
              className={cn("flex-1 py-1.5 text-sm font-bold rounded-md transition-colors", activeDrawGroup === 'amigos' ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white")}
            >
              Amigos
            </button>
            <button 
              onClick={() => setActiveDrawGroup('cartorio')}
              className={cn("flex-1 py-1.5 text-sm font-bold rounded-md transition-colors", activeDrawGroup === 'cartorio' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}
            >
              Cartório
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-4">Realize o sorteio entre os participantes ativos do Consórcio {activeDrawGroup === 'amigos' ? 'Amigos' : 'Cartório'}.</p>
          
          <button
            onClick={() => setIsDrawModuleOpen(true)}
            className={cn("w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all mb-3", activeDrawGroup === 'amigos' ? "bg-pink-600 hover:bg-pink-700" : "bg-blue-600 hover:bg-blue-700")}
          >
            Sortear {activeDrawGroup === 'amigos' ? 'Amigos' : 'Cartório'}
          </button>
          <button
            onClick={() => setIsManageParticipantsOpen(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            Participantes
          </button>
        </div>

        {/* History Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Contemplados
              </h3>
            </div>
            <div className="flex bg-slate-200/50 rounded-lg p-1">
              <button 
                onClick={() => setActiveHistoryGroup('amigos')}
                className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-colors", activeHistoryGroup === 'amigos' ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Amigos
              </button>
              <button 
                onClick={() => setActiveHistoryGroup('cartorio')}
                className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-colors", activeHistoryGroup === 'cartorio' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Cartório
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {winnersRanking.filter(c => c.groupType === activeHistoryGroup).map(winner => (
              <div 
                key={winner.id}
                onClick={() => setSelectedHistoryClient(winner)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">{winner.clientName}</div>
                  <div className="text-xs text-slate-500">Consórcio {winner.groupType === 'amigos' ? 'Amigos' : 'Cartório'}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  {winner.drawWins?.length || 0}
                </div>
              </div>
            ))}
            {winnersRanking.filter(c => c.groupType === activeHistoryGroup).length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhum sorteio realizado ainda.
              </div>
            )}
          </div>
        </div>

      </div>

      <DrawModule 
        isOpen={isDrawModuleOpen} 
        onClose={() => setIsDrawModuleOpen(false)} 
        consortiums={consortiums.filter(c => c.groupType === activeDrawGroup)}
        groupType={activeDrawGroup}
        onComplete={handleDrawWin}
      />

      <ManageDrawParticipants 
        isOpen={isManageParticipantsOpen} 
        onClose={() => setIsManageParticipantsOpen(false)} 
        consortiums={consortiums.filter(c => c.groupType === activeDrawGroup)}
        groupType={activeDrawGroup}
        onUpdate={loadData}
      />

      {/* History Detail Modal */}
      <Modal isOpen={!!selectedHistoryClient} onClose={() => setSelectedHistoryClient(null)} title="Detalhes do Contemplado">
        {selectedHistoryClient && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedHistoryClient.clientName}</h2>
              <p className="text-slate-500 text-sm">
                Consórcio {selectedHistoryClient.groupType === 'amigos' ? 'Amigos' : 'Cartório'}
              </p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-600 text-sm font-medium">Status Atual</span>
                <span className={cn("px-2 py-1 rounded text-xs font-bold", selectedHistoryClient.participatesInDraw !== false ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}>
                  {selectedHistoryClient.participatesInDraw !== false ? 'Participando' : 'Excluído dos Sorteios'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm font-medium">Total de Contemplações</span>
                <span className="text-lg font-black text-slate-800">{selectedHistoryClient.drawWins?.length || 0}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-sm">Histórico de Contemplações</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedHistoryClient.drawWins?.sort((a,b) => b - a).map((ts, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{format(new Date(ts), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={() => handleClearDrawHistory(selectedHistoryClient.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Histórico
              </button>
              <Button onClick={() => setSelectedHistoryClient(null)} className="bg-slate-800 hover:bg-slate-900 text-white">Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Member Modal (Keep original modal code below this block if necessary, I will include it) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Membro">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Grupo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGroupType('amigos')}
                className={cn("p-2 rounded-lg border text-sm font-medium transition-colors", groupType === 'amigos' ? "bg-pink-50 border-pink-200 text-pink-700" : "bg-white border-slate-200 text-slate-600")}
              >
                Amigos
              </button>
              <button
                type="button"
                onClick={() => setGroupType('cartorio')}
                className={cn("p-2 rounded-lg border text-sm font-medium transition-colors", groupType === 'cartorio' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600")}
              >
                Cartório
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de Cliente</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClientType('existing')}
                className={cn("p-2 rounded-lg border text-sm font-medium transition-colors", clientType === 'existing' ? "bg-slate-800 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600")}
              >
                Cliente Existente
              </button>
              <button
                type="button"
                onClick={() => setClientType('new')}
                className={cn("p-2 rounded-lg border text-sm font-medium transition-colors", clientType === 'new' ? "bg-slate-800 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600")}
              >
                Novo Cliente (Só Consórcio)
              </button>
            </div>
          </div>

          {clientType === 'existing' ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Selecione o Cliente</label>
              <Select required value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nome do Novo Cliente</label>
              <Input required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome completo" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Duração (Meses)</label>
              <Input required type="number" min="1" max="60" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Data de Início</label>
              <Input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm flex justify-between items-center">
            <span className="text-slate-600 font-medium">Valor Fixo Mensal:</span>
            <span className="text-slate-900 font-bold text-lg">R$ 50,00</span>
          </div>

          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
            Nota: Os valores de consórcio são independentes e não aparecerão na tela de vendas de Tupperware ou Eudora.
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">Criar Consórcio</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
