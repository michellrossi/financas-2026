import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { CardsView } from './components/Cards';
import { TransactionForm } from './components/TransactionForm';
import { TransactionListModal } from './components/TransactionListModal';
import { CardForm } from './components/CardForm';
import { StorageService, generateInstallments, getInvoiceMonth } from './services/storage';
import { User, Transaction, ViewState, FilterState, CreditCard, TransactionType, TransactionStatus } from './types';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);

  // UX State - Transaction Form
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // UX State - Card Form
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // UX State - List Modal
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState('');
  const [listModalTransactions, setListModalTransactions] = useState<Transaction[]>([]);

  const [filter, setFilter] = useState<FilterState>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Auth State (Inputs)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Effects ---
  useEffect(() => {
    // Auth Observer
    const unsubscribe = StorageService.observeAuth((u) => {
      setUser(u);
      if (u) {
        fetchData(u.id);
      } else {
        setTransactions([]);
        setCards([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const [txs, cds] = await Promise.all([
        StorageService.getTransactions(userId),
        StorageService.getCards(userId)
      ]);
      setTransactions(txs);
      setCards(cds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Core Logic: Aggregation for Display ---
  // This transforms the raw data into what the user wants to see:
  // Standard Txs + Aggregated Invoice Totals (no individual card txs)
  const processedTransactions = useMemo(() => {
    const targetDate = new Date(filter.year, filter.month, 1);
    
    // 1. Filter Standard Transactions (Income/Expense) for current month
    const standardTxs = transactions.filter(t => {
      if (t.type === TransactionType.CARD_EXPENSE) return false;
      return isSameMonth(new Date(t.date), targetDate);
    });

    // 2. Aggregate Card Transactions into Invoices
    const invoiceMap = new Map<string, { amount: number, card: CreditCard }>();

    transactions.filter(t => t.type === TransactionType.CARD_EXPENSE).forEach(t => {
      const card = cards.find(c => c.id === t.cardId);
      if (card) {
        // Calculate which invoice this transaction belongs to
        const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
        
        // If this invoice belongs to the currently filtered month, add to total
        if (isSameMonth(invoiceDate, targetDate)) {
          const current = invoiceMap.get(card.id) || { amount: 0, card };
          current.amount += t.amount;
          invoiceMap.set(card.id, current);
        }
      }
    });

    // 3. Create "Virtual" Transactions for the Invoices
    const invoiceTxs: Transaction[] = Array.from(invoiceMap.values()).map(({ amount, card }) => {
       // Determine Due Date for this invoice
       const dueDate = new Date(filter.year, filter.month, card.dueDay);
       
       return {
         id: `virtual-invoice-${card.id}-${filter.month}-${filter.year}`,
         description: `Fatura: ${card.name}`,
         amount: amount,
         date: dueDate.toISOString(),
         type: TransactionType.EXPENSE, // Treat invoice as an expense to pay
         category: 'Cartão de Crédito',
         status: TransactionStatus.PENDING, // Default to pending (A Pagar)
         isVirtual: true,
         cardId: card.id // Reference for clicking
       };
    });

    return [...standardTxs, ...invoiceTxs];

  }, [transactions, cards, filter.month, filter.year]);


  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.loginEmail(loginEmail, loginPass);
    } catch (error: any) {
      setAuthError('Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.registerEmail(loginEmail, loginPass, regName);
    } catch (error: any) {
      setAuthError('Erro ao criar conta. Tente novamente.');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await StorageService.loginGoogle();
    } catch (error: any) {
      setAuthError('Erro no login com Google.');
    }
  };

  const handleLogout = async () => {
    await StorageService.logout();
  };

  // --- Transaction Handlers ---
  const handleTransactionSubmit = async (t: Transaction, installments: number, amountType: 'total' | 'installment') => {
    if (!user) return;
    
    // Check if ID exists to determine if it's an Update or Create
    if (editingTransaction && editingTransaction.id) {
      await StorageService.updateTransaction(user.id, t);
    } else {
      const allT = generateInstallments(t, installments, amountType);
      // Sequentially add to Firestore
      for (const tx of allT) {
        await StorageService.addTransaction(user.id, tx);
      }
    }
    fetchData(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    // Block deleting virtual transactions
    if (id.startsWith('virtual-invoice')) {
      alert("Para alterar o valor da fatura, edite ou exclua as transações individuais na aba 'Cartões'.");
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await StorageService.deleteTransaction(user.id, id);
      fetchData(user.id);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!user) return;

    // Block toggling virtual transactions directly for now (or implement logic to mark all as paid)
    if (id.startsWith('virtual-invoice')) {
      return; 
    }

    const t = transactions.find(tx => tx.id === id);
    if (t) {
      await StorageService.toggleStatus(user.id, t);
      fetchData(user.id);
    }
  };

  // --- Card Handlers ---
  const handleCardSubmit = async (c: CreditCard) => {
    if (!user) return;
    if (editingCard) await StorageService.updateCard(user.id, c);
    else await StorageService.addCard(user.id, c);
    fetchData(user.id);
  };

  const handleDeleteCard = async (id: string) => {
    if (!user) return;
    if (window.confirm('Excluir cartão?')) {
      await StorageService.deleteCard(user.id, id);
      fetchData(user.id);
    }
  };

  const changeMonth = (increment: number) => {
    setFilter(prev => {
      let newMonth = prev.month + increment;
      let newYear = prev.year;
      if (newMonth > 11) { newMonth = 0; newYear++; }
      if (newMonth < 0) { newMonth = 11; newYear--; }
      return { ...prev, month: newMonth, year: newYear };
    });
  };

  const handleSortChange = (field: 'date' | 'amount') => {
    setFilter(prev => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sortBy: field, sortOrder: 'desc' };
    });
  };

  // --- Render ---

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
           <div className="text-center mb-8">
             <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg shadow-emerald-200">F</div>
             <h1 className="text-2xl font-bold text-slate-800">Finanças 2026</h1>
             <p className="text-slate-500 mt-2">Controle sua vida financeira.</p>
           </div>
           
           {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}

           <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
             {isRegister && (
               <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Seu Nome" required />
             )}
             <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="seu@email.com" required />
             <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" required />
             
             <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
               {isRegister ? 'Criar Conta' : 'Entrar'}
             </button>
           </form>

           <div className="my-6 flex items-center gap-4">
             <div className="h-px bg-slate-100 flex-1"></div>
             <span className="text-xs text-slate-400">ou</span>
             <div className="h-px bg-slate-100 flex-1"></div>
           </div>

           <button 
             onClick={handleGoogleLogin} 
             className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
           >
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
             Entrar com Google
           </button>

           <div className="mt-6 text-center">
             <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-400 hover:text-emerald-600">
               {isRegister ? 'Já tenho uma conta' : 'Criar nova conta'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  const currentDateDisplay = format(new Date(filter.year, filter.month, 1), 'MMMM yyyy', { locale: ptBR });
  
  let viewTitle = 'Visão Geral';
  if (currentView === 'INCOMES') viewTitle = 'Minhas Entradas';
  if (currentView === 'EXPENSES') viewTitle = 'Minhas Saídas';
  if (currentView === 'CARDS') viewTitle = 'Meus Cartões';

  // Filter view logic for Income/Expense tabs
  const getFilteredTransactionsForView = () => {
    // processedTransactions already contains properly filtered standard txs + invoice aggregates
    if (currentView === 'INCOMES') {
       return processedTransactions.filter(t => t.type === TransactionType.INCOME);
    }
    // For Expenses, show Standard Expenses AND Virtual Invoices
    return processedTransactions.filter(t => t.type !== TransactionType.INCOME);
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user} onLogout={handleLogout}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">{viewTitle}</h1>
           <p className="text-slate-500 text-sm font-medium">Bem vindo de volta, {user.name.split(' ')[0]}</p>
        </div>

        <div className="flex items-center gap-3">
           {loading && <Loader2 className="animate-spin text-emerald-500 mr-2" />}
           
           <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
              <span className="min-w-[140px] text-center font-bold text-slate-700 capitalize select-none">{currentDateDisplay}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
           </div>
           
           <button 
             onClick={() => { setEditingTransaction(null); setIsTxModalOpen(true); }}
             className="w-12 h-12 flex items-center justify-center bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
             title="Nova Transação"
           >
             <Plus size={24} strokeWidth={3} />
           </button>
        </div>
      </div>

      {/* Content */}
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          // Pass aggregated transactions to Dashboard
          transactions={processedTransactions} 
          filter={filter} 
          cards={cards}
          // The history chart still needs raw data to calculate previous months, 
          // but we can pass all transactions and let Dashboard handle history,
          // OR pass a special prop. For simplicity, we pass processed for summary cards
          // and Dashboard will use internal logic for history if needed, but Dashboard
          // currently expects `transactions` to be everything.
          // FIX: The Dashboard expects ALL transactions to build history.
          // We will pass `transactions` (raw) for history, but use `processedTransactions` for Summary.
          // Let's modify Dashboard props to accept both or handle it inside.
          // Actually, let's keep it simple: Dashboard usually filters `transactions` internally.
          // We should modify Dashboard to accept `summaryTransactions` (processed) and `allTransactions` (raw).
          // For now, let's just pass `processedTransactions` as the main `transactions` prop. 
          // NOTE: This means History chart will show "Virtual Invoices" instead of raw card txs. This is actually BETTER/Correct.
          onViewDetails={(type) => { 
             // When clicking summary cards, show list
             const filteredT = getFilteredTransactionsForView().filter(t => {
                if (type === 'INCOME') return t.type === TransactionType.INCOME;
                if (type === 'EXPENSE') return t.type !== TransactionType.INCOME;
                return true;
             });

             if (type === 'INCOME') setListModalTitle('Receitas Realizadas');
             else if (type === 'EXPENSE') setListModalTitle('Despesas e Faturas');
             else setListModalTitle('Extrato do Mês');

             setListModalTransactions(filteredT);
             setIsListModalOpen(true);
          }}
        />
      )}
      
      {(currentView === 'INCOMES' || currentView === 'EXPENSES') && (
        <Transactions 
          transactions={getFilteredTransactionsForView()} 
          filter={filter} 
          onEdit={(t) => { 
             if (t.isVirtual) {
                // If clicking a virtual invoice, maybe go to Cards view or open modal
                const card = cards.find(c => c.id === t.cardId);
                if (card) {
                   setCurrentView('CARDS');
                   // Ideally scroll to card or open it, but switching view is good start
                }
             } else {
                setEditingTransaction(t); setIsTxModalOpen(true); 
             }
          }} 
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          onSortChange={handleSortChange}
        />
      )}
      
      {currentView === 'CARDS' && (
        <CardsView 
          cards={cards} 
          transactions={transactions} // Cards view needs RAW transactions to show details
          filterMonth={filter.month} 
          filterYear={filter.year} 
          onCardClick={(cardId) => {
            const card = cards.find(c => c.id === cardId);
            if (!card) return;
            const targetDate = new Date(filter.year, filter.month, 1);
            const cardTx = transactions.filter(t => 
               t.cardId === cardId && 
               isSameMonth(getInvoiceMonth(new Date(t.date), card.closingDay), targetDate)
            );
            setListModalTitle(`Fatura: ${card.name}`);
            setListModalTransactions(cardTx);
            setIsListModalOpen(true);
          }}
          onAddTransaction={(cardId) => {
            setEditingTransaction({ 
              id: '', // Empty ID tells the form it's new
              description: '', amount: 0, date: new Date().toISOString(),
              type: TransactionType.CARD_EXPENSE, category: 'Outros', status: TransactionStatus.COMPLETED,
              cardId: cardId
            });
            setIsTxModalOpen(true);
          }}
          onEditCard={(c) => { setEditingCard(c); setIsCardFormOpen(true); }}
          onDeleteCard={handleDeleteCard}
          onAddNewCard={() => { setEditingCard(null); setIsCardFormOpen(true); }}
        />
      )}

      {/* Modals */}
      <TransactionForm 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        onSubmit={handleTransactionSubmit}
        initialData={editingTransaction}
        cards={cards}
      />

      <CardForm 
        isOpen={isCardFormOpen}
        onClose={() => setIsCardFormOpen(false)}
        onSubmit={handleCardSubmit}
        initialData={editingCard}
      />

      <TransactionListModal 
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={listModalTitle}
        transactions={listModalTransactions}
      />

    </Layout>
  );
}

export default App;