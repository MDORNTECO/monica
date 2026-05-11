import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Client } from '../types';
import { Users, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export default function ManageClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const data = await dbService.getClients();
    setClients(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName.trim()) return;

    await dbService.createClient({
      name: newClientName,
      phone: newClientPhone
    });

    setNewClientName('');
    setNewClientPhone('');
    loadData();
  }

  async function handleDeleteClient(id: string) {
    await dbService.deleteClient(id);
    setClientToDelete(null);
    loadData();
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando clientes...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciar Clientes</h1>
        <p className="text-slate-500">Adicione novos clientes ou exclua os existentes.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>Novo Cliente</span>
        </h2>
        <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Telefone (opcional)</label>
            <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Adicionar Cliente
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Lista de Clientes ({clients.length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
            {clients.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum cliente cadastrado.</div>
            ) : clients.map(client => (
                <div key={client.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                        <p className="font-bold text-slate-800">{client.name}</p>
                        {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
                    </div>
                    <button 
                        onClick={() => setClientToDelete(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Cliente"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>
      </div>

      <Modal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} title="Excluir Cliente">
        <div className="space-y-4">
            <p className="text-slate-600">
                Tem certeza que deseja excluir este cliente? Se ele tiver vendas, o histórico ficará sem nome.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setClientToDelete(null)}>Cancelar</Button>
                <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => clientToDelete && handleDeleteClient(clientToDelete)}>Excluir Cliente</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
