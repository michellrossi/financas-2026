import React from 'react';
import { Modal } from './ui/Modal';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency } from '../services/storage';
import { format, isBefore, startOfDay } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, CreditCard, Edit2, Trash2 } from 'lucide-react';

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
  onEdit?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const TransactionListModal: React.FC<TransactionListModalProps> = ({ 
  isOpen, onClose, title, transactions, onEdit, onDelete 
}) => {
  
  const getStatusDisplay = (t: Transaction) => {
      const isCompleted = t.status === TransactionStatus.COMPLETED;
      const today = startOfDay(new Date());
      const txDate = startOfDay(new Date(t.date));
      const isOverdue = !isCompleted && isBefore(txDate, today);

      if (isCompleted) return null;

      if (isOverdue) {
          return <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold uppercase">Vencido</span>;
      }
      return <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded uppercase">Pendente</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nenhuma transação encontrada.</p>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
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
                    <p className="font-medium text-slate-800 text-sm flex items-center gap-2">
                        {t.description}
                        {t.installments && <span className="text-[10px] text-slate-400">({t.installments.current}/{t.installments.total})</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t.category}</span>
                    </div>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-bold text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                  </p>
                  {getStatusDisplay(t)}
                </div>
                
                {/* Actions (Only show if handlers provided) */}
                {(onEdit || onDelete) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:bg-white hover:text-blue-500 rounded-md transition-all">
                                <Edit2 size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={() => onDelete(t.id)} className="p-1.5 text-slate-400 hover:bg-white hover:text-red-500 rounded-md transition-all">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};