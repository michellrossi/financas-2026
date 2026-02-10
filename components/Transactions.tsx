import React, { useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus, FilterState } from '../types';
import { formatCurrency } from '../services/storage';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUp, ArrowDown, CreditCard, Edit2, Trash2, Calendar, DollarSign, Receipt } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  filter: FilterState;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onSortChange: (field: 'date' | 'amount') => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, filter, onEdit, onDelete, onToggleStatus, onSortChange 
}) => {
  const { month, year, sortBy, sortOrder } = filter;

  // Note: 'transactions' prop passed here is already filtered/aggregated by App.tsx
  // We just need to sort it.
  const filteredTransactions = useMemo(() => {
    return transactions.sort((a, b) => {
        let valA = sortBy === 'date' ? new Date(a.date).getTime() : a.amount;
        let valB = sortBy === 'date' ? new Date(b.date).getTime() : b.amount;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [transactions, sortBy, sortOrder]);

  const getStatusInfo = (t: Transaction) => {
     const isCompleted = t.status === TransactionStatus.COMPLETED;
     const today = startOfDay(new Date());
     const txDate = startOfDay(new Date(t.date));
     const isOverdue = !isCompleted && isBefore(txDate, today);

     if (isCompleted) {
         return {
             label: t.type === TransactionType.INCOME ? 'Recebido' : 'Pago',
             style: 'bg-emerald-100 text-emerald-600 border-emerald-200'
         };
     }
     
     if (isOverdue) {
         return {
             label: 'Vencido',
             style: 'bg-rose-100 text-rose-600 border-rose-200'
         };
     }

     return {
         label: t.type === TransactionType.INCOME ? 'A Receber' : 'A Pagar',
         style: 'bg-orange-100 text-orange-600 border-orange-200'
     };
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Header Sort Toggle */}
      <div className="flex justify-end mb-2">
         <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
           <button 
             onClick={() => onSortChange('date')}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'date' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <Calendar size={14} /> Data {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
           <button 
             onClick={() => onSortChange('amount')}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'amount' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <DollarSign size={14} /> Valor {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
         </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredTransactions.length === 0 ? (
           <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <Calendar size={32} />
             </div>
             <p className="text-slate-500 font-medium">Nenhuma transação neste período.</p>
           </div>
        ) : filteredTransactions.map((t) => {
          const statusInfo = getStatusInfo(t);
          const isVirtual = t.isVirtual === true;
          
          return (
            <div key={t.id} className={`bg-white rounded-2xl p-4 flex flex-row items-center justify-between shadow-sm border ${isVirtual ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100'} hover:shadow-md transition-all gap-4`}>
              
              {/* Left Section: Icon & Details */}
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-500' :
                    isVirtual ? 'bg-indigo-100 text-indigo-600' :
                    'bg-rose-50 text-rose-500'
                  }`}>
                    {t.type === TransactionType.INCOME ? <ArrowUp size={24} /> : 
                     isVirtual ? <Receipt size={24} /> : <ArrowDown size={24} />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-800 text-base flex items-center gap-2">
                        {t.description}
                        {isVirtual && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">Fatura</span>}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase font-semibold text-[10px] tracking-wide">{t.category}</span>
                      {t.installments && (
                        <span className="text-slate-400">({t.installments.current}/{t.installments.total})</span>
                      )}
                    </div>
                  </div>
              </div>

              {/* Right Section: Amount & Actions (Vertical Stack) */}
              <div className="flex flex-col items-end gap-2">
                  <span className={`text-xl font-bold whitespace-nowrap ${
                    t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-700'
                  }`}>
                    {t.type === TransactionType.INCOME ? '+ ' : ''} {formatCurrency(t.amount)}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onToggleStatus(t.id)}
                      disabled={isVirtual}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${statusInfo.style} ${isVirtual ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {statusInfo.label}
                    </button>
                    
                    {!isVirtual && (
                        <>
                        <button onClick={() => onEdit(t)} className="text-slate-400 hover:text-blue-500 transition-colors">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                        </button>
                        </>
                    )}
                    {isVirtual && (
                         <button onClick={() => onEdit(t)} className="text-indigo-400 hover:text-indigo-600 transition-colors" title="Ver detalhes no cartão">
                            <CreditCard size={16} />
                         </button>
                    )}
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};