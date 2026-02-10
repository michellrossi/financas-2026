import React from 'react';
import { Modal } from './ui/Modal';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency } from '../services/storage';
import { format } from 'date-fns';
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
  
  // Filter only COMPLETED (Paid/Received) transactions for this view as requested
  const visibleTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-2">
        {visibleTransactions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Nenhuma transação concluída neste período.</p>
        ) : (
          visibleTransactions.map(t => (
            <div key={t.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
              {/* Left: Icon & Description */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className={`p-2 rounded-lg shrink-0 ${
                    t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' :
                    t.type === TransactionType.CARD_EXPENSE ? 'bg-indigo-100 text-indigo-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {t.type === TransactionType.INCOME ? <ArrowUpRight size={16} /> : 
                     t.type === TransactionType.CARD_EXPENSE ? <CreditCard size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm flex items-center gap-2 truncate">
                        {t.description}
                        {t.installments && <span className="text-[10px] text-slate-400 shrink-0">({t.installments.current}/{t.installments.total})</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                      <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{t.category}</span>
                    </div>
                  </div>
              </div>
              
              {/* Right: Amount & Actions */}
              <div className="flex items-center gap-4 pl-4">
                <p className={`font-bold text-sm whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                </p>
                
                {/* Actions (Only show if handlers provided) */}
                {(onEdit || onDelete) && (
                    <div className="flex gap-1">
                        {onEdit && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(t); }} 
                                className="p-1.5 text-slate-300 hover:bg-white hover:text-blue-500 rounded-md transition-all"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} 
                                className="p-1.5 text-slate-300 hover:bg-white hover:text-red-500 rounded-md transition-all"
                            >
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