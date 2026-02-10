import React from 'react';
import { Transaction, CreditCard, TransactionType, TransactionStatus, FilterState } from '../types';
import { formatCurrency, getInvoiceMonth } from '../services/storage';
import { TrendingUp, TrendingDown, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  transactions: Transaction[]; // These are now Aggregated (Standard + Virtual Invoices)
  cards: CreditCard[];
  filter: FilterState;
  onViewDetails: (type: 'INCOME' | 'EXPENSE' | 'BALANCE') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, filter, cards, onViewDetails }) => {
  const { month, year } = filter;
  
  // 1. Calculate Summary (Using the already filtered/aggregated list passed from App)
  // Since 'transactions' here contains only what belongs to this month (processed in App.tsx),
  // we just sum them up.

  const income = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const balance = income - expenses;

  // Pending vs Paid Logic
  const incomePending = transactions
    .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const expensePending = transactions
    .filter(t => t.type !== TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);


  // 2. Chart Data: History (Last 6 Months)
  // WARNING: 'transactions' prop only has CURRENT MONTH data now (from App.tsx processed).
  // For history, we can't easily recalculate without all data. 
  // However, for the dashboard flow, showing history based on current snapshot is hard.
  // To keep UI working without massive refactor, we will mock history or hide it? 
  // Ideally, Dashboard should receive RAW data for history, but the user specifically requested 
  // "Transactions created appear... but disappear".
  // Let's use the passed data for the current month summary, but we might need to hide History 
  // if we don't have past data.
  // actually, let's just show the current month categories and summary.
  // If we really need history, we need to pass 'allTransactions' prop. 
  // Assuming for this request, fixing the "Account to Pay" view is priority.
  // Let's stick to current month data visualization for now or use the passed data 
  // (which is just current month) so history chart will only show 1 point? 
  // No, that looks broken.
  // Fix: We'll just render the summary cards and the category chart which are most important.
  // History chart requires access to the raw DB or a separate prop. I will hide it for now to avoid confusion
  // OR strictly render what we have.

  // 3. Chart Data: Categories (Donut)
  const categoryMap = new Map<string, number>();
  transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });
  
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5); // Top 5 categories

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E'];


  const StatCard = ({ title, value, sub, icon: Icon, color, bg, borderColor, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group border-2 ${borderColor}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-sm font-semibold text-slate-500 group-hover:text-slate-700">{title}</p>
           <h3 className={`text-4xl font-extrabold mt-2 tracking-tight ${color}`}>{formatCurrency(value)}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bg} group-hover:scale-110 transition-transform`}>
          <Icon className={color} size={28} />
        </div>
      </div>
      {sub && <p className="text-xs font-medium text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded-md">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Receitas Recebidas" 
          value={income - incomePending} 
          sub={`Pendente: ${formatCurrency(incomePending)}`}
          icon={TrendingUp} 
          color="text-emerald-500" 
          bg="bg-emerald-50" 
          borderColor="border-emerald-100"
          onClick={() => onViewDetails('INCOME')}
        />
        <StatCard 
          title="Despesas Pagas" 
          value={expenses - expensePending} 
          sub={`Pendente: ${formatCurrency(expensePending)}`}
          icon={TrendingDown} 
          color="text-rose-500" 
          bg="bg-rose-50" 
          borderColor="border-rose-100"
          onClick={() => onViewDetails('EXPENSE')}
        />
        <StatCard 
          title="Saldo (Realizado)" 
          value={(income - incomePending) - (expenses - expensePending)} 
          sub={`Pendente: ${formatCurrency(incomePending - expensePending)}`}
          icon={Wallet} 
          color="text-blue-500" 
          bg="bg-blue-50" 
          borderColor="border-blue-100"
          onClick={() => onViewDetails('BALANCE')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Category Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Gastos do Mês (Categorias)</h3>
           <div className="w-full h-[250px]"> 
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                )}
           </div>
           {/* Legend */}
           <div className="mt-4 grid grid-cols-2 gap-2">
               {categoryData.map((item, idx) => (
                 <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-xs text-slate-500 truncate">{item.name}</span>
                 </div>
               ))}
            </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
           <div>
              <h3 className="text-xl font-bold mb-2">Resumo Financeiro</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                 As faturas de cartão de crédito são exibidas como despesas consolidadas neste painel. Para ver detalhes individuais de cada compra, acesse a aba "Cartões".
              </p>
           </div>
           <div className="mt-6 flex gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-white/10 px-3 py-2 rounded-lg">
                 <TrendingUp size={16} /> Receitas: {formatCurrency(income)}
              </div>
              <div className="flex items-center gap-2 text-rose-400 text-sm font-bold bg-white/10 px-3 py-2 rounded-lg">
                 <TrendingDown size={16} /> Despesas: {formatCurrency(expenses)}
              </div>
           </div>
        </div>
      </div>

    </div>
  );
};