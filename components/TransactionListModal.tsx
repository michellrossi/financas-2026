import React from 'react';
import { Modal } from './ui/Modal';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency } from '../services/storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
}

export const TransactionListModal: React.FC<TransactionListModalProps> = ({ isOpen, onClose, title, transactions }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nenhuma transação encontrada.</p>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${
                    t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' :
                    t.type === TransactionType.CARD_EXPENSE ? 'bg-indigo-100 text-indigo-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {t.type === TransactionType.INCOME ? <ArrowUpRight size={16} /> : 
                     t.type === TransactionType.CARD_EXPENSE ? <CreditCard size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{t.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t.category}</span>
                    </div>
                  </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                </p>
                {t.status === TransactionStatus.PENDING && (
                  <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Pendente</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};