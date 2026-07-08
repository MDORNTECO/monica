export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
}

export type Brand = 'Eudora' | 'Tupperware';
export type PaymentStatus = 'pendente' | 'pago_parcial' | 'pago' | 'atrasado';

export interface Sale {
  id: string;
  userId: string;
  clientId: string;
  brand: Brand;
  date: string; // YYYY-MM-DD
  monthYear: string; // YYYY-MM
  description: string;
  totalValue: number;
  paymentMethod: string;
  installmentsCount: number;
  paidValue: number;
  remainingValue: number;
  status: PaymentStatus;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Installment {
  id: string;
  userId: string;
  saleId: string;
  clientId: string;
  brand: Brand;
  number: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  dueDateMs: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  userId: string;
  saleId: string;
  installmentId: string;
  clientId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConsortiumInstallment {
  id: string;
  monthIndex: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  paidAt?: number | null;
}

export interface Consortium {
  id: string;
  userId: string;
  groupType: 'amigos' | 'cartorio';
  clientType: 'existing' | 'new';
  clientId: string | null;
  clientName: string;
  monthlyValue: number;
  durationMonths: number;
  startDate: string;
  status: 'active' | 'completed';
  installments: ConsortiumInstallment[];
  participatesInDraw?: boolean;
  drawWins?: number[];
  createdAt: number;
  updatedAt: number;
}

