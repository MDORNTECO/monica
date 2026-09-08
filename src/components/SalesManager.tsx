import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { dbService } from '../services/db';
import { Sale, Brand, Client, Installment, Payment } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { cn } from '../lib/utils';
import { addMonths, format } from 'date-fns';

interface Props {
  brand: Brand;
}

export default function SalesManager({ brand }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  // Form states
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [firstDueDate, setFirstDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const isEudora = brand === 'Eudora';
  const colorClass = isEudora ? 'fuchsia' : 'teal';

  async function loadData() {
    setLoading(true);
    const [s, c, i] = await Promise.all([
      dbService.getSales({ brand }),
      dbService.getClients(),
      dbService.getInstallments()
    ]);
    setSales(s.sort((a, b) => b.createdAt - a.createdAt));
    setClients(c);
    setInstallments(i);
    setLoading(false);
  }

  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [brand]);

  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editSaleDesc, setEditSaleDesc] = useState('');
  const [editSaleTotal, setEditSaleTotal] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editSaleAction, setEditSaleAction] = useState<'redistribute' | 'new_installment' | 'none'>('none');
  
  const [instToEdit, setInstToEdit] = useState<Installment | null>(null);
  const [editInstAmount, setEditInstAmount] = useState('');
  const [editInstDueDate, setEditInstDueDate] = useState('');

  async function handleEditSaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleToEdit) return;
    
    // Convert comma to dot
    const newTotal = parseFloat(editSaleTotal.replace(',', '.')) || saleToEdit.totalValue;

    const saleInstallments = installments.filter(i => i.saleId === saleToEdit.id);
    const hasOnlyOneInstallment = saleInstallments.length === 1;

    let finalAction = editSaleAction;
    if (hasOnlyOneInstallment && newTotal !== saleToEdit.totalValue) {
      finalAction = 'redistribute';
    }

    if (newTotal !== saleToEdit.totalValue) {
       await dbService.updateSaleAdvanced(saleToEdit.id, newTotal, editSaleDesc, finalAction);
       if (editSaleDate !== saleToEdit.date) {
         await dbService.updateSale(saleToEdit.id, { date: editSaleDate });
       }
    } else {
       await dbService.updateSale(saleToEdit.id, {
         description: editSaleDesc,
         date: editSaleDate
       });
    }
    
    setSaleToEdit(null);
    setEditSaleAction('none');
    loadData();
  }

  function openEditSale(sale: Sale) {
    setSaleToEdit(sale);
    setEditSaleDesc(sale.description);
    setEditSaleTotal(sale.totalValue.toString());
    setEditSaleDate(sale.date);
    setEditSaleAction('none');
  }

  async function handleEditInstSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instToEdit) return;

    let dueDateMs = instToEdit.dueDateMs;
    let dueDate = instToEdit.dueDate;
    if (editInstDueDate) {
      const [y, m, d] = editInstDueDate.split('-').map(Number);
      dueDateMs = new Date(y, m - 1, d, 12, 0, 0).getTime();
      dueDate = editInstDueDate;
    }

    await dbService.updateInstallment(instToEdit.id, {
      amount: parseFloat(editInstAmount) || instToEdit.amount,
      dueDateMs,
      dueDate
    });

    setInstToEdit(null);
    loadData();
  }

  function openEditInst(inst: Installment) {
    setInstToEdit(inst);
    setEditInstAmount(inst.amount.toString());
    setEditInstDueDate(format(new Date(inst.dueDateMs), 'yyyy-MM-dd'));
  }

  const [recentlyDeleted, setRecentlyDeleted] = useState<{sale: Sale | null, installments: Installment[], payments: Payment[]} | null>(null);

  async function handleDeleteSale(saleId: string) {
    const deleted = await dbService.deleteSale(saleId);
    if (deleted) {
      setRecentlyDeleted(deleted);
      // Auto-hide undo after 10 seconds
      setTimeout(() => setRecentlyDeleted(null), 10000);
    }
    setSaleToDelete(null);
    loadData();
  }

  async function handleUndoDelete() {
    if (!recentlyDeleted) return;
    await dbService.restoreSale(recentlyDeleted);
    setRecentlyDeleted(null);
    loadData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let finalClientId = clientId;

    if (clientId === 'new') {
      const c = await dbService.createClient({ name: newClientName, phone: newClientPhone });
      finalClientId = c.id;
    }

    const count = parseInt(installmentsCount, 10);
    // Generate dates based on first due date
    const parsedStart = new Date(firstDueDate + "T12:00:00");
    const dates = [];
    for (let i = 0; i < count; i++) {
        dates.push(format(addMonths(parsedStart, i), 'yyyy-MM-dd'));
    }

    const saleTotal = parseFloat(totalValue);
    const saleEntry = entryValue ? parseFloat(entryValue) : 0;

    await dbService.createSaleAndInstallments({
      clientId: finalClientId,
      brand,
      date: saleDate,
      monthYear: saleDate.substring(0, 7),
      description,
      totalValue: saleTotal,
      paymentMethod,
      installmentsCount: count,
      notes: ''
    }, count, dates, saleEntry);

    setIsModalOpen(false);
    resetForm();
    loadData();
  }

  function resetForm() {
    setClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setDescription('');
    setTotalValue('');
    setEntryValue('');
    setPaymentMethod('dinheiro');
    setInstallmentsCount('1');
    setSaleDate(format(new Date(), 'yyyy-MM-dd'));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vendas {brand}</h1>
          <p className="text-slate-500">Gerencie todas as vendas e parcelas da {brand}.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant={isEudora ? 'eudora' : 'tupper'} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nova Venda
        </Button>
      </div>

      {recentlyDeleted && (
        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>A venda foi excluída. Pressione Restaurar caso tenha sido um erro.</span>
          <button 
            onClick={handleUndoDelete}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Restaurar Venda
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhuma venda registrada ainda.
            <br />
            Clique em "Nova Venda" para começar.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sales.map(sale => {
              const client = clients.find(c => c.id === sale.clientId);
              const saleInsts = installments.filter(i => i.saleId === sale.id).sort((a,b) => a.number - b.number);
              const isExpanded = expandedSale === sale.id;

              return (
                <div key={sale.id} className="flex flex-col">
                  {/* Sale Row Summary */}
                  <div 
                    onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800">{client?.name || 'Cliente Desconhecido'}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{sale.description}</p>
                    </div>
                    <div className="text-right mr-4 hidden sm:block">
                      <p className="font-bold text-slate-800">{sale.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-xs text-slate-500">{sale.installmentsCount}x no {sale.paymentMethod}</p>
                    </div>
                    <div className="text-right mr-4">
                      <StatusBadge status={sale.status} paidAmount={sale.paidValue} />
                      <p className="text-xs text-slate-500 mt-1 sm:hidden">{sale.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEditSale(sale); }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            title="Editar Venda"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSaleToDelete(sale.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            title="Excluir Venda"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                  </div>

                  {/* Expanded Installments Details */}
                  {isExpanded && (
                    <div className="bg-slate-50 p-4 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Parcelas</h4>
                      <div className="space-y-2">
                        {saleInsts.map(inst => (
                          <div key={inst.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                {inst.number}
                              </span>
                              <div>
                                {inst.status === 'pago_parcial' ? (
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-400 line-through text-sm">
                                      {inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                    <p className="font-bold text-amber-600">
                                      {inst.remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} restando
                                    </p>
                                  </div>
                                ) : (
                                  <p className="font-medium text-slate-800">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                )}
                                <p className="text-xs text-slate-500">Vencimento: {new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <StatusBadge status={inst.status} paidAmount={inst.paidAmount} />
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openEditInst(inst); }}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Parcela"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {inst.status !== 'pago' && (
                                <PaymentModalButton inst={inst} onReload={loadData} colorClass={colorClass} isEudora={isEudora} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Nova Venda ${brand}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Cliente</label>
            <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione a cliente...</option>
              <option value="new">+ Cadastrar Nova Cliente</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          {clientId === 'new' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <Input placeholder="Nome" required value={newClientName} onChange={e => setNewClientName(e.target.value)} />
              <Input placeholder="Telefone" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Produtos (Separe por vírgula ou quebra de linha)</label>
            <textarea 
              required 
              rows={2}
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Ex: Batom Eudora, Base, Perfume..." 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Valor Total (R$)</label>
              <Input required type="number" step="0.01" min="0.01" value={totalValue} onChange={e => setTotalValue(e.target.value)} placeholder="150.00" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Valor de Entrada (R$)</label>
              <Input type="number" step="0.01" value={entryValue} onChange={e => setEntryValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Pagamento</label>
              <Select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Parcelas (Restante)</label>
              <Select required value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Data da Venda</label>
              <Input required type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Data do 1º Pagamento</label>
              <Input required type="date" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant={isEudora ? 'eudora' : 'tupper'}>Salvar Venda</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!saleToDelete} onClose={() => setSaleToDelete(null)} title="Excluir Venda">
        <div className="space-y-4">
            <p className="text-slate-600">
                Tem certeza que deseja excluir esta venda? Todos os pagamentos e parcelas associados serão excluídos permanentemente.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setSaleToDelete(null)}>Cancelar</Button>
                <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => saleToDelete && handleDeleteSale(saleToDelete)}>Excluir Venda</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={!!saleToEdit} onClose={() => setSaleToEdit(null)} title="Editar Venda">
        <form onSubmit={handleEditSaleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Data da Venda</label>
              <Input required type="date" value={editSaleDate} onChange={e => setEditSaleDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Valor Total (R$)</label>
              <Input required type="number" step="0.01" min="0.01" value={editSaleTotal} onChange={e => setEditSaleTotal(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Descrição dos Produtos</label>
            <textarea 
              rows={3} 
              required 
              value={editSaleDesc} 
              onChange={e => setEditSaleDesc(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-none"
            />
          </div>
          
          <div className="space-y-1">
            {saleToEdit && parseFloat(editSaleTotal.replace(',', '.')) !== saleToEdit.totalValue && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <p className="text-sm text-amber-800 font-medium">
                  {parseFloat(editSaleTotal.replace(',', '.')) > saleToEdit.totalValue 
                    ? `O valor total da venda aumentou em ${(parseFloat(editSaleTotal.replace(',', '.')) - saleToEdit.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` 
                    : `O valor total da venda diminuiu em ${Math.abs(parseFloat(editSaleTotal.replace(',', '.')) - saleToEdit.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`}
                </p>
                {installments.filter(i => i.saleId === saleToEdit.id).length === 1 ? (
                  <p className="text-sm text-amber-900 font-bold">
                    O valor da parcela única será atualizado automaticamente.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-amber-800 font-medium">Como deseja ajustar as parcelas pendentes?</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" className="mt-1 text-amber-600 focus:ring-amber-500" name="editSaleAction" value="redistribute" checked={editSaleAction === 'redistribute'} onChange={() => setEditSaleAction('redistribute')} />
                        <span className="text-sm text-amber-900">Distribuir diferença entre parcelas pendentes</span>
                      </label>
                      {parseFloat(editSaleTotal.replace(',', '.')) > saleToEdit.totalValue && (
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input type="radio" className="mt-1 text-amber-600 focus:ring-amber-500" name="editSaleAction" value="new_installment" checked={editSaleAction === 'new_installment'} onChange={() => setEditSaleAction('new_installment')} />
                          <span className="text-sm text-amber-900">Criar uma nova parcela com o valor restante no próximo mês</span>
                        </label>
                      )}
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" className="mt-1 text-amber-600 focus:ring-amber-500" name="editSaleAction" value="none" checked={editSaleAction === 'none'} onChange={() => setEditSaleAction('none')} />
                        <span className="text-sm text-amber-900">Não alterar as parcelas (apenas atualizar total)</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSaleToEdit(null)}>Cancelar</Button>
            <Button type="submit" variant={isEudora ? 'eudora' : 'tupper'}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!instToEdit} onClose={() => setInstToEdit(null)} title="Editar Parcela">
        <form onSubmit={handleEditInstSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Data de Vencimento</label>
            <Input required type="date" value={editInstDueDate} onChange={e => setEditInstDueDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Novo Valor da Parcela (R$)</label>
            <Input required type="number" step="0.01" min="0.01" value={editInstAmount} onChange={e => setEditInstAmount(e.target.value)} />
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setInstToEdit(null)}>Cancelar</Button>
            <Button type="submit" variant={isEudora ? 'eudora' : 'tupper'}>Salvar Parcela</Button>
          </div>
        </form>
      </Modal>
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
    text = paidAmount ? `Entrada/Pago: ${paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Pago Parcial'; 
  }
  if (status === 'atrasado') { color = 'bg-red-100 text-red-700'; text = 'Atrasado'; }

  return <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center", color)}>{text}</span>;
}

function PaymentModalButton({ inst, onReload, colorClass, isEudora }: { inst: Installment, onReload: () => void, colorClass: string, isEudora: boolean }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(inst.remainingAmount.toString());
  const [method, setMethod] = useState('pix');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rollover, setRollover] = useState(false);
  const [loading, setLoading] = useState(false);

  const amountNumber = parseFloat(amount.replace(',', '.')) || 0;
  const isPartial = amountNumber > 0 && amountNumber < inst.remainingAmount;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await dbService.registerPayment(inst, amountNumber, method, date, "", rollover && isPartial);
    setLoading(false);
    setOpen(false);
    onReload();
  }

  return (
    <>
      <Button size="sm" variant={isEudora ? 'eudora' : 'tupper'} onClick={() => setOpen(true)}>
        Receber
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Receber Parcela ${inst.number}`}>
        <form onSubmit={handlePay} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl text-center mb-4">
            <p className="text-slate-500 text-sm">Valor Pendente</p>
            <p className="text-3xl font-bold text-slate-800">{inst.remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Valor a Receber (R$)</label>
            <Input required type="number" step="0.01" max={inst.remainingAmount} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Data de Pagamento</label>
              <Input required type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Forma</label>
              <Select required value={method} onChange={e => setMethod(e.target.value)}>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
              </Select>
            </div>
          </div>
          
          {isPartial && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col gap-3">
              <p className="text-sm text-amber-800">
                Você informou <b>{amountNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>. 
                Restará <b>{(inst.remainingAmount - amountNumber).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b> pendente.
              </p>
              <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-200">
                <input 
                  type="checkbox" 
                  id="rolloverCheckbox" 
                  checked={rollover} 
                  onChange={(e) => setRollover(e.target.checked)}
                  className="mt-1 w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="rolloverCheckbox" className="text-sm text-amber-900 cursor-pointer select-none leading-tight">
                  <span className="block font-bold mb-0.5">Mover saldo atual para o mês seguinte</span>
                  <span className="text-amber-700 text-xs">Soma o que faltou na próxima parcela. Se não houver, cria uma nova. (Se desmarcado, continua pendente neste mês/atrasado)</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} variant={isEudora ? 'eudora' : 'tupper'}>
              Confirmar Pagamento
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
