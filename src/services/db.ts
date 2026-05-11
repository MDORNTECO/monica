import { Client, Sale, Installment, Payment, PaymentStatus } from '../types';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch, getDoc } from 'firebase/firestore';
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

  deleteSale: async (saleId: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not logged in');
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'sales', saleId));
      
      const instQ = query(collection(db, 'installments'), where('userId', '==', userId), where('saleId', '==', saleId));
      const payQ = query(collection(db, 'payments'), where('userId', '==', userId), where('saleId', '==', saleId));
      
      const [instSnap, paySnap] = await Promise.all([getDocs(instQ), getDocs(payQ)]);
      instSnap.forEach(doc => batch.delete(doc.ref));
      paySnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sales/${saleId}`);
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

  registerPayment: async (installment: Installment, amountPaid: number, method: string, date: string, notes: string): Promise<void> => {
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
        const newPaidAmount = inst.paidAmount + amountPaid;
        const newRemaining = Math.max(0, inst.amount - newPaidAmount);
        let newStatus: PaymentStatus = 'pendente';
        if (newRemaining === 0) newStatus = 'pago';
        else if (newPaidAmount > 0) newStatus = 'pago_parcial';
        
        batch.update(instRef, { paidAmount: newPaidAmount, remainingAmount: newRemaining, status: newStatus, updatedAt: now });
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
        
        batch.update(saleRef, { paidValue: newSalePaid, remainingValue: newSaleRem, status: newSaleStatus, updatedAt: now });
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `installments/${installment.id}`);
      throw e;
    }
  }
};

