import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, Trash2, Calendar, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { dbService } from '../services/db';
import { Client, Consortium } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { format, isPast, parseISO, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';

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
    if (confirm('Tem certeza que deseja excluir este consórcio?')) {
      await dbService.deleteConsortium(id);
      loadData();
    }
  }

  async function handleToggleInstallment(consortiumId: string, installmentId: string) {
    await dbService.toggleConsortiumInstallment(consortiumId, installmentId);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consórcios</h1>
          <p className="text-slate-500">Gerencie Consórcio Amigos e Consórcio Cartório (Valor Fixo: R$ 50,00).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Consórcio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">Carregando...</div>
        ) : consortiums.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum consórcio ativo</p>
            <p className="text-slate-400 text-sm mt-1">Clique em "Novo Consórcio" para começar.</p>
          </div>
        ) : (
          consortiums.map(c => {
            const installments = c.installments || [];
            const paidInstallments = installments.filter(i => i.paid);
            const totalPaid = paidInstallments.length * c.monthlyValue;
            const progress = Math.min(100, Math.round((paidInstallments.length / c.durationMonths) * 100));
            const isCompleted = c.status === 'completed';

            const now = startOfDay(new Date());
            const pendingInstallments = installments.filter(i => !i.paid && startOfDay(parseISO(i.dueDate)) < now);
            const pendingAmount = pendingInstallments.length * c.monthlyValue;

            return (
              <div key={c.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative group">
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir Consórcio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{c.clientName}</h3>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-md", c.groupType === 'amigos' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700')}>
                      Consórcio {c.groupType === 'amigos' ? 'Amigos' : 'Cartório'}
                    </span>
                  </div>
                </div>

                {pendingAmount > 0 && !isCompleted && (
                  <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm font-medium">
                      Pendente: {pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                )}

                <div className="space-y-3 flex-1 mb-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Início</span>
                    <span className="font-medium text-slate-700">{new Date(c.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="my-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">Pagamentos Mensais</div>
                  <div className="flex flex-wrap gap-2">
                    {installments.map((inst) => {
                      const dueDate = startOfDay(parseISO(inst.dueDate));
                      const isPastDue = dueDate < now && !inst.paid;
                      return (
                        <button
                          key={inst.id}
                          onClick={() => handleToggleInstallment(c.id, inst.id)}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                            inst.paid 
                              ? "bg-green-500 border-green-500 text-white" 
                              : isPastDue 
                                ? "bg-red-50 border-red-400 text-red-700 hover:bg-red-100" 
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                          title={`Mês ${inst.monthIndex + 1} - Vencimento: ${format(dueDate, 'dd/MM/yyyy')}`}
                        >
                          {inst.paid ? <CheckCircle className="w-5 h-5" /> : inst.monthIndex + 1}
                        </button>
                      )
                    })}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Clique na bolinha para confirmar ou desfazer o pagamento.</div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-pink-600">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pago</span>
                    <span className="text-slate-400">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", isCompleted ? "bg-green-500" : "bg-pink-500")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {isCompleted && (
                  <div className="mt-4 bg-green-50 text-green-700 p-3 rounded-xl flex items-center justify-center gap-2 font-bold">
                    <CheckCircle className="w-5 h-5" />
                    Consórcio Finalizado
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Consórcio">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de Consórcio</label>
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
