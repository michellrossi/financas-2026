export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  CARD_EXPENSE = 'CARD_EXPENSE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO String YYYY-MM-DD
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  cardId?: string; // If CARD_EXPENSE
  installments?: {
    current: number;
    total: number;
    groupId: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type ViewState = 'DASHBOARD' | 'INCOMES' | 'EXPENSES' | 'CARDS';

// Filter/Sort State
export interface FilterState {
  month: number; // 0-11
  year: number;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export const INCOME_CATEGORIES = [
  'Salário', 'Bonificação', '13°', 'Vale Alimentação', 
  'Vale Refeição', 'ISK', 'Periculosidade', 'Saldo Anterior', 'Outros'
];

export const EXPENSE_CATEGORIES = [
  'Alimentação', 'Mercado', 'Ifood', 'Transporte', 'Carro', 
  'Apê', 'Assinaturas', 'Lazer', 'Viagem', 'Saúde', 
  'Estudo', 'Pessoais', 'Presente', 'Lucas', 'Besteiras', 'Outros'
];