import { Client, Sale, Installment, Payment, PaymentStatus } from '../types';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const dbService = {
  getUserId: () => auth.currentUser?.uid,

  logActivity: async (message: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;
    const userName = user.displayName || user.email?.split('@')[0] || 'Usuário';
    const now = Date.now();
    try {
      await setDoc(doc(collection(db, 'activities')), {
        userId: user.uid,
        userName,
        message,
        createdAt: now
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    try {
      const q = query(collection(db, 'clients'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Client);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'clients');
      return [];
    }
  },
  
  createClient: async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Client> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const now = Date.now();
    const newClient: Client = { ...client, id: generateId(), userId, createdAt: now, updatedAt: now };
    
    try {
      await setDoc(doc(db, 'clients', newClient.id), newClient);
      return newClient;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `clients/${newClient.id}`);
      throw e;
    }
  },

  updateClient: async (clientId: string, updates: Partial<Client>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const now = Date.now();
      await updateDoc(doc(db, 'clients', clientId), { ...updates, updatedAt: now });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clients/${clientId}`);
    }
  },

  deleteClient: async (clientId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `clients/${clientId}`);
    }
  },

  // Sales
  getSales: async (filters?: { brand?: string, clientId?: string }): Promise<Sale[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    try {
      let q = query(collection(db, 'sales'), where('userId', '==', userId));
      
      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(doc => doc.data() as Sale);
      if (filters?.brand) list = list.filter(s => s.brand === filters.brand);
      if (filters?.clientId) list = list.filter(s => s.clientId === filters.clientId);
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'sales');
      return [];
    }
  },

  deleteSale: async (saleId: string): Promise<{sale: Sale | null, installments: Installment[], payments: Payment[]} | null> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const saleRef = doc(db, 'sales', saleId);
      const saleSnap = await getDoc(saleRef);
      const saleData = saleSnap.exists() ? (saleSnap.data() as Sale) : null;

      const instQ = query(collection(db, 'installments'), where('userId', '==', userId), where('saleId', '==', saleId));
      const payQ = query(collection(db, 'payments'), where('userId', '==', userId), where('saleId', '==', saleId));
      
      const [instSnap, paySnap] = await Promise.all([getDocs(instQ), getDocs(payQ)]);
      
      const instData = instSnap.docs.map(d => d.data() as Installment);
      const payData = paySnap.docs.map(d => d.data() as Payment);

      const batch = writeBatch(db);
      batch.delete(saleRef);
      instSnap.forEach(doc => batch.delete(doc.ref));
      paySnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();

      const user = auth.currentUser;
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
      await dbService.logActivity(`${userName} apagou uma venda de ${saleData?.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} da ${saleData?.brand}.`);

      return { sale: saleData, installments: instData, payments: payData };
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sales/${saleId}`);
      return null;
    }
  },

  restoreSale: async (data: {sale: Sale | null, installments: Installment[], payments: Payment[]}): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const batch = writeBatch(db);
      
      if (data.sale) {
        batch.set(doc(db, 'sales', data.sale.id), data.sale);
      }
      
      data.installments.forEach(inst => {
        batch.set(doc(db, 'installments', inst.id), inst);
      });
      
      data.payments.forEach(pay => {
        batch.set(doc(db, 'payments', pay.id), pay);
      });
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `sales/restore`);
    }
  },

  updateSale: async (saleId: string, updates: Partial<Sale>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const now = Date.now();
      const saleRef = doc(db, 'sales', saleId);
      const batch = writeBatch(db);
      batch.update(saleRef, { ...updates, updatedAt: now });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `sales/${saleId}`);
    }
  },

  updateSaleAdvanced: async (saleId: string, newTotal: number, newDesc: string, action: 'redistribute' | 'new_installment' | 'none'): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const now = Date.now();
      const saleRef = doc(db, 'sales', saleId);
      const saleSnap = await getDoc(saleRef);
      if (!saleSnap.exists()) return;
      const sale = saleSnap.data() as Sale;

      const difference = Number((newTotal - sale.totalValue).toFixed(2));
      
      const batch = writeBatch(db);
      batch.update(saleRef, { 
        totalValue: newTotal, 
        description: newDesc, 
        updatedAt: now 
      });

      if (action !== 'none' && difference !== 0) {
        const instQ = query(collection(db, 'installments'), where('userId', '==', userId), where('saleId', '==', saleId));
        const instSnap = await getDocs(instQ);
        const installments: Installment[] = [];
        instSnap.forEach(d => installments.push(d.data() as Installment));
        installments.sort((a, b) => a.dueDateMs - b.dueDateMs);
        
        const pendingInsts = installments.filter(i => i.status !== 'pago');

        if (action === 'redistribute' && pendingInsts.length > 0) {
          // Distribute the difference equally among pending installments
          // If difference is negative, we might end up with negative amounts, so bounds check?
          // Simplest is to divide by pending items.
          const diffPerInst = Number((difference / pendingInsts.length).toFixed(2));
          let remainingDiff = difference;

          for (let i = 0; i < pendingInsts.length; i++) {
            const inst = pendingInsts[i];
            let applyDiff = diffPerInst;
            if (i === pendingInsts.length - 1) {
              applyDiff = Number(remainingDiff.toFixed(2));
            }
            
            const newAmount = Number(Math.max(0, inst.amount + applyDiff).toFixed(2));
            const newRemaining = Number(Math.max(0, newAmount - inst.paidAmount).toFixed(2));
            let newStatus: PaymentStatus = inst.status;
            if (newRemaining <= 0) {
               newStatus = 'pago';
            } else if (inst.paidAmount > 0) {
               newStatus = 'pago_parcial';
            } else {
               newStatus = 'pendente'; // simplistic fallback
               // could check if overdue, but calendar UI checks if past due based on dates
               // the status string in DB usually is pendente, pago, pago_parcial. Overdue is derived.
            }

            batch.update(doc(db, 'installments', inst.id), {
              amount: newAmount,
              remainingAmount: newRemaining,
              status: newStatus,
              updatedAt: now
            });
            remainingDiff -= applyDiff;
          }
        } else if (action === 'new_installment' && difference > 0) {
          // Create a new installment
          // Determine the next due date based on the last installment
          let lastDateStr = sale.date; // Use sale date as default
          let lastNumber = 0;
          if (installments.length > 0) {
            const lastInst = installments[installments.length - 1];
            lastDateStr = lastInst.dueDate;
            lastNumber = lastInst.number;
          }

          const nextDueDate = new Date(lastDateStr + "T12:00:00");
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

          const newInstId = generateId();
          const newInst: Installment = {
            id: newInstId,
            userId,
            saleId: sale.id,
            clientId: sale.clientId,
            brand: sale.brand,
            number: lastNumber + 1,
            amount: difference,
            dueDate: nextDueDateStr,
            dueDateMs: nextDueDate.getTime(),
            paidAmount: 0,
            remainingAmount: difference,
            status: 'pendente',
            createdAt: now,
            updatedAt: now
          };
          batch.set(doc(db, 'installments', newInstId), newInst);
        }
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `sales/${saleId}`);
    }
  },

  updateInstallment: async (instId: string, updates: Partial<Installment>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const now = Date.now();
      const instRef = doc(db, 'installments', instId);
      const batch = writeBatch(db);
      batch.update(instRef, { ...updates, updatedAt: now });

      // If amount changes, we need to recalculate remainingAmount
      if (updates.amount !== undefined) {
         const instSnap = await getDoc(instRef);
         if (instSnap.exists()) {
             const currentInst = instSnap.data() as Installment;
             const amount = updates.amount;
             const remainingAmount = Math.max(0, amount - currentInst.paidAmount);
             let status = currentInst.status;
             if (remainingAmount === 0) status = 'pago';
             else if (currentInst.paidAmount > 0) status = 'pago_parcial';
             else status = 'pendente';
             
             batch.update(instRef, { remainingAmount, status, updatedAt: now });
         }
      }
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `installments/${instId}`);
    }
  },

  createSaleAndInstallments: async (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'paidValue' | 'remainingValue' | 'status' | 'userId'>, installmentsCount: number, dueDateStr: string[], entryValue: number = 0): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const now = Date.now();
    
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      userId,
      paidValue: entryValue,
      remainingValue: Math.max(0, sale.totalValue - entryValue),
      status: entryValue >= sale.totalValue ? 'pago' : (entryValue > 0 ? 'pago_parcial' : 'pendente'),
      createdAt: now,
      updatedAt: now
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sales', newSale.id), newSale);

      if (entryValue > 0) {
        const payId = generateId();
        const payment: Payment = {
          id: payId,
          userId,
          saleId: newSale.id,
          installmentId: 'entrada',
          clientId: sale.clientId,
          amount: entryValue,
          date: sale.date,
          method: sale.paymentMethod,
          notes: 'Valor de Entrada',
          createdAt: now,
          updatedAt: now
        };
        batch.set(doc(db, 'payments', payId), payment);
      }

      const valueToInstall = Math.max(0, sale.totalValue - entryValue);
      const amountPerInst = installmentsCount > 0 ? Math.round((valueToInstall / installmentsCount) * 100) / 100 : 0;
      
      if (installmentsCount > 0 && amountPerInst > 0) {
        for (let i = 0; i < installmentsCount; i++) {
            const dateStr = dueDateStr[i] || sale.date;
            const instId = generateId();
            const newInst: Installment = {
              id: instId,
              userId,
              saleId: newSale.id,
              clientId: sale.clientId,
              brand: sale.brand,
              number: i + 1,
              amount: amountPerInst,
              dueDate: dateStr,
              dueDateMs: new Date(dateStr + "T12:00:00").getTime(),
              paidAmount: 0,
              remainingAmount: amountPerInst,
              status: 'pendente',
              createdAt: now,
              updatedAt: now
            };
            batch.set(doc(db, 'installments', instId), newInst);
        }
      }
      
      await batch.commit();

      const user = auth.currentUser;
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
      await dbService.logActivity(`${userName} adicionou uma nova venda de ${sale.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} da ${sale.brand}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sales/${newSale.id}`);
      throw e;
    }
  },

  getInstallments: async (filters?: { saleId?: string, status?: string }): Promise<Installment[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    try {
      let q = query(collection(db, 'installments'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(doc => doc.data() as Installment);
      if (filters?.saleId) list = list.filter(i => i.saleId === filters.saleId);
      if (filters?.status) list = list.filter(i => i.status === filters.status);
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'installments');
      return [];
    }
  },

  registerPayment: async (installment: Installment, amountPaid: number, method: string, date: string, notes: string, rolloverNextMonth: boolean = false): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const now = Date.now();

    try {
      const batch = writeBatch(db);

      // Create Payment
      const payId = generateId();
      batch.set(doc(db, 'payments', payId), {
        id: payId,
        userId,
        saleId: installment.saleId,
        installmentId: installment.id,
        clientId: installment.clientId,
        amount: amountPaid,
        date: date,
        method,
        notes,
        createdAt: now,
        updatedAt: now
      });

      // Update Installment
      const instRef = doc(db, 'installments', installment.id);
      const instSnap = await getDoc(instRef);
      if (instSnap.exists()) {
        const inst = instSnap.data() as Installment;
        const newPaidAmount = Number((inst.paidAmount + amountPaid).toFixed(2));
        let newRemaining = Number(Math.max(0, inst.amount - newPaidAmount).toFixed(2));

        if (rolloverNextMonth && newRemaining > 0) {
          // Change current installment amount to match what was paid, making it fully paid
          batch.update(instRef, { amount: newPaidAmount, paidAmount: newPaidAmount, remainingAmount: 0, status: 'pago', updatedAt: now });

          const allInstQ = query(collection(db, 'installments'), where('userId', '==', userId), where('saleId', '==', inst.saleId));
          const allInstSnap = await getDocs(allInstQ);
          const saleInsts: Installment[] = [];
          allInstSnap.forEach(docSnap => saleInsts.push(docSnap.data() as Installment));
          saleInsts.sort((a, b) => a.dueDateMs - b.dueDateMs);

          let nextInst: Installment | null = null;
          for (const fi of saleInsts) {
            if (fi.id !== inst.id && fi.dueDateMs > inst.dueDateMs && fi.status !== 'pago') {
              nextInst = fi;
              break;
            }
          }

          if (nextInst) {
            batch.update(doc(db, 'installments', nextInst.id), {
               amount: Number((nextInst.amount + newRemaining).toFixed(2)),
               remainingAmount: Number((nextInst.remainingAmount + newRemaining).toFixed(2)),
               updatedAt: now
            });
          } else {
            // Create new installment for the rollover
            const nextDueDate = new Date(inst.dueDate + "T12:00:00");
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
            
            const newInstId = generateId();
            const newInst: Installment = {
              id: newInstId,
              userId,
              saleId: inst.saleId,
              clientId: inst.clientId,
              brand: inst.brand,
              number: inst.number,
              amount: Number(newRemaining.toFixed(2)),
              dueDate: nextDueDateStr,
              dueDateMs: nextDueDate.getTime(),
              paidAmount: 0,
              remainingAmount: Number(newRemaining.toFixed(2)),
              status: 'pendente',
              createdAt: now,
              updatedAt: now
            };
            batch.set(doc(db, 'installments', newInstId), newInst);
          }
        } else {
          let newStatus: PaymentStatus = 'pendente';
          if (newRemaining === 0) newStatus = 'pago';
          else if (newPaidAmount > 0) newStatus = 'pago_parcial';
          batch.update(instRef, { paidAmount: newPaidAmount, remainingAmount: newRemaining, status: newStatus, updatedAt: now });
        }
      }

      // Update Sale
      const saleRef = doc(db, 'sales', installment.saleId);
      const saleSnap = await getDoc(saleRef);
      if (saleSnap.exists()) {
        const sale = saleSnap.data() as Sale;
        const newSalePaid = sale.paidValue + amountPaid;
        const newSaleRem = Math.max(0, sale.totalValue - newSalePaid);
        let newSaleStatus: PaymentStatus = 'pendente';
        if (newSaleRem === 0) newSaleStatus = 'pago';
        else if (newSalePaid > 0) newSaleStatus = 'pago_parcial';
        
        // Rollover doesn't affect the sale's total value, just shifts the installment
        batch.update(saleRef, { paidValue: newSalePaid, remainingValue: newSaleRem, status: newSaleStatus, updatedAt: now });
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `installments/${installment.id}`);
      throw e;
    }
  },

  // Consortiums
  getConsortiums: async (): Promise<any[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    try {
      const q = query(collection(db, 'consortiums'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'consortiums');
      return [];
    }
  },

  createConsortium: async (consortium: Omit<any, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'installments' | 'status'>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const now = Date.now();
    const newId = generateId();
    
    // Generate installments
    const installments: any[] = [];
    const startDate = new Date(consortium.startDate + 'T12:00:00');
    for (let i = 0; i < consortium.durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installments.push({
        id: generateId(),
        monthIndex: i,
        dueDate: dueDate.toISOString().split('T')[0],
        paid: false
      });
    }

    try {
      await setDoc(doc(db, 'consortiums', newId), {
        ...consortium,
        id: newId,
        userId,
        installments,
        status: 'active',
        participatesInDraw: true,
        drawWins: [],
        createdAt: now,
        updatedAt: now
      });
      const user = auth.currentUser;
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
      await dbService.logActivity(`${userName} criou um novo consórcio para ${consortium.clientName}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `consortiums`);
      throw e;
    }
  },

  toggleDrawParticipation: async (consortiumId: string, participates: boolean): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      await updateDoc(doc(db, 'consortiums', consortiumId), {
        participatesInDraw: participates,
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `consortiums`);
      throw e;
    }
  },

  clearDrawHistory: async (consortiumId: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const ref = doc(db, 'consortiums', consortiumId);
      await updateDoc(ref, {
        drawWins: [],
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `consortiums`);
      throw e;
    }
  },

  registerDrawWin: async (consortiumId: string, timestamp: number): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const ref = doc(db, 'consortiums', consortiumId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const wins = data.drawWins || [];
        await updateDoc(ref, {
          drawWins: [...wins, timestamp],
          updatedAt: Date.now()
        });
        const user = auth.currentUser;
        const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
        await dbService.logActivity(`${userName} registrou contemplação de sorteio para ${data.clientName}.`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `consortiums`);
      throw e;
    }
  },

  markConsortiumInstallments: async (consortiumId: string, installmentIds: string[], paid: boolean): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    const now = Date.now();
    try {
      const ref = doc(db, 'consortiums', consortiumId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const installments = data.installments || [];
        
        let changed = false;
        for (const iId of installmentIds) {
          const instIndex = installments.findIndex((i: any) => i.id === iId);
          if (instIndex !== -1 && installments[instIndex].paid !== paid) {
            installments[instIndex].paid = paid;
            installments[instIndex].paidAt = paid ? now : null;
            changed = true;
          }
        }
        
        if (changed) {
          let status = 'active';
          if (installments.every((i: any) => i.paid)) {
            status = 'completed';
          }
          await updateDoc(ref, { installments, status, updatedAt: now });

          const user = auth.currentUser;
          const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
          const actionWord = paid ? 'marcou pagamentos como pagos' : 'desmarcou pagamentos';
          await dbService.logActivity(`${userName} ${actionWord} no consórcio de ${data.clientName}.`);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `consortiums/${consortiumId}`);
      throw e;
    }
  },

  deleteConsortium: async (consortiumId: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const ref = doc(db, 'consortiums', consortiumId);
      const snap = await getDoc(ref);
      let clientName = 'um cliente';
      if (snap.exists()) {
        clientName = snap.data().clientName;
      }
      await deleteDoc(ref);
      
      const user = auth.currentUser;
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
      await dbService.logActivity(`${userName} excluiu o consórcio de ${clientName}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `consortiums/${consortiumId}`);
    }
  }
};

