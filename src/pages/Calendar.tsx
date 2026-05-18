import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dbService } from '../services/db';
import { Installment, Client } from '../types';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [i, c] = await Promise.all([
        dbService.getInstallments(),
        dbService.getClients()
      ]);
      setInstallments(i);
      setClients(c);
      setLoading(false);
    }
    load();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = monthStart; // could adjust to start of week if we want full grid
  const endDate = monthEnd;

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Find installments for selected date
  const selectedDayInstallments = installments.filter(inst => 
    isSameDay(parseISO(inst.dueDate), selectedDate)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendário</h1>
          <p className="text-slate-500">Veja seus recebimentos agendados por dia.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentDate, dateFormat, { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid (Simple) */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Carregando calendário...</div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-4 items-center text-xs font-medium text-slate-500 px-4 pb-4 border-b border-slate-100 bg-slate-50/50">
               <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Legenda:</span>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Pendente Eudora</div>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Pendente Tupperware</div>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Pagos</div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 mb-2">
                <div>DOM</div>
                <div>SEG</div>
                <div>TER</div>
                <div>QUA</div>
                <div>QUI</div>
                <div>SEX</div>
                <div>SAB</div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Padding days for first week */}
                {Array.from({ length: startDate.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-14" />
                ))}
                
                {days.map(day => {
                  const dayInsts = installments.filter(inst => isSameDay(parseISO(inst.dueDate), day));
                  const pendingInsts = dayInsts.filter(i => i.status !== 'pago');
                  const hasAtrasado = pendingInsts.some(i => i.status === 'atrasado');
                  const isSelected = isSameDay(day, selectedDate);
                  
                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-10 sm:h-14 flex flex-col items-center justify-center rounded-xl relative transition-colors",
                        !isSameMonth(day, monthStart) ? "text-slate-300 pointer-events-none" : "text-slate-700",
                        isToday(day) && !isSelected && "bg-slate-100 font-bold",
                        isSelected && "bg-slate-900 text-white font-bold hover:bg-slate-800",
                        !isSelected && isSameMonth(day, monthStart) && "hover:bg-slate-50"
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                      {dayInsts.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap justify-center items-center">
                          {dayInsts.slice(0, 3).map((inst, idx) => {
                             let dotColor = 'bg-slate-300';
                             if (inst.status === 'pago') dotColor = 'bg-blue-500';
                             else if (inst.brand === 'Eudora') dotColor = 'bg-purple-500';
                             else if (inst.brand === 'Tupperware') dotColor = 'bg-teal-500';

                             return (
                               <span key={inst.id} className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
                             );
                          })}
                          {dayInsts.length > 3 && <span className="text-[8px] text-slate-400 font-bold leading-none">+{dayInsts.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">
            Pagamentos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <div className="p-0">
          {selectedDayInstallments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum pagamento agendado para este dia.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedDayInstallments.map(inst => {
                const client = clients.find(c => c.id === inst.clientId);
                const isEudora = inst.brand === 'Eudora';
                return (
                  <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-12 rounded-full", isEudora ? "bg-purple-500" : "bg-teal-500")} />
                      <div>
                        <p className="font-bold text-slate-800">{client?.name}</p>
                        <p className="text-sm text-slate-500">Parcela {inst.number} • {inst.brand}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {inst.status === 'pago_parcial' ? (
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-medium text-slate-400 line-through">
                            {inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="font-bold text-amber-600">
                            {inst.remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-800">{inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      )}
                      <StatusBadge status={inst.status} paidAmount={inst.paidAmount} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, paidAmount }: { status: string, paidAmount?: number }) {
  let color = 'text-slate-500';
  let text = 'Desconhecido';
  if (status === 'pendente') { color = 'text-amber-500'; text = 'Pendente'; }
  if (status === 'pago') { color = 'text-green-500'; text = 'Pago'; }
  if (status === 'pago_parcial') { 
    color = 'text-blue-500'; 
    text = paidAmount ? `Ent./Pago: ${paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Pago Parcial'; 
  }
  if (status === 'atrasado') { color = 'text-red-500'; text = 'Atrasado'; }

  return <p className={cn("text-xs font-semibold mt-1", color)}>{text}</p>;
}
