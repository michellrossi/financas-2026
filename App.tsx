import React, { useState, useEffect } from 'react';
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
import { AIImportModal } from './components/AIImportModal';

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

  // UX State - AI Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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
    
    if (editingTransaction) {
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

  const handleBatchTransactions = async (newTransactions: Transaction[]) => {
    if (!user) return;
    setLoading(true);
    try {
      for (const t of newTransactions) {
        await StorageService.addTransaction(user.id, t);
      }
      fetchData(user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await StorageService.deleteTransaction(user.id, id);
      fetchData(user.id);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!user) return;
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

  // Sort logic for display
  const getFilteredTransactionsForView = () => {
    const baseList = currentView === 'INCOMES' 
      ? transactions.filter(t => t.type === TransactionType.INCOME)
      : transactions.filter(t => t.type !== TransactionType.INCOME);
    return baseList;
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
          transactions={transactions} 
          filter={filter} 
          cards={cards} 
          onViewDetails={(type) => { 
            const targetDate = new Date(filter.year, filter.month, 1);
            let filteredT = transactions.filter(t => {
               let dateMatch = isSameMonth(new Date(t.date), targetDate);
               if (t.type === TransactionType.CARD_EXPENSE && t.cardId) {
                  const card = cards.find(c => c.id === t.cardId);
                  if (card) dateMatch = isSameMonth(getInvoiceMonth(new Date(t.date), card.closingDay), targetDate);
               }
               return dateMatch;
            });

            if (type === 'INCOME') {
               filteredT = filteredT.filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.COMPLETED);
               setListModalTitle('Receitas Realizadas');
            } else if (type === 'EXPENSE') {
               filteredT = filteredT.filter(t => t.type !== TransactionType.INCOME && t.status === TransactionStatus.COMPLETED);
               setListModalTitle('Despesas Pagas');
            } else {
               filteredT = filteredT.filter(t => t.status === TransactionStatus.COMPLETED);
               setListModalTitle('Extrato Realizado');
            }
            setListModalTransactions(filteredT);
            setIsListModalOpen(true);
          }}
        />
      )}
      
      {(currentView === 'INCOMES' || currentView === 'EXPENSES') && (
        <Transactions 
          transactions={getFilteredTransactionsForView()} 
          filter={filter} 
          onEdit={(t) => { setEditingTransaction(t); setIsTxModalOpen(true); }} 
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          onSortChange={handleSortChange}
        />
      )}
      
      {currentView === 'CARDS' && (
        <CardsView 
          cards={cards} 
          transactions={transactions} 
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
              id: '', description: '', amount: 0, date: new Date().toISOString(),
              type: TransactionType.CARD_EXPENSE, category: 'Outros', status: TransactionStatus.COMPLETED,
              cardId: cardId
            });
            setIsTxModalOpen(true);
          }}
          onEditCard={(c) => { setEditingCard(c); setIsCardFormOpen(true); }}
          onDeleteCard={handleDeleteCard}
          onAddNewCard={() => { setEditingCard(null); setIsCardFormOpen(true); }}
          onAIImport={() => setIsAIModalOpen(true)}
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

      <AIImportModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        cards={cards}
        onImport={handleBatchTransactions}
      />

    </Layout>
  );
}

export default App;