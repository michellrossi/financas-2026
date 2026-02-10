import { Transaction, CreditCard, TransactionType, TransactionStatus, User, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs
} from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCe-tyLRk2tsV-_uVWhpUgIgF3b-Jz_F_0",
  authDomain: "controle-financeiro-definitivo.firebaseapp.com",
  projectId: "controle-financeiro-definitivo",
  storageBucket: "controle-financeiro-definitivo.firebasestorage.app",
  messagingSenderId: "659709682670",
  appId: "1:659709682670:web:e4898612b3f04948e9a4ff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
export const db = getFirestore(app);

// Helpers
export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const getInvoiceMonth = (date: Date, closingDay: number): Date => {
  const d = new Date(date);
  if (d.getDate() > closingDay) {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
};

export const generateInstallments = (baseTransaction: Transaction, totalInstallments: number, amountType: 'total' | 'installment' = 'installment'): Transaction[] => {
  if (totalInstallments <= 1) return [baseTransaction];

  const transactions: Transaction[] = [];
  const groupId = crypto.randomUUID();
  const baseDate = new Date(baseTransaction.date);

  // Calculate amount per installment
  const installmentValue = amountType === 'total' 
    ? baseTransaction.amount / totalInstallments 
    : baseTransaction.amount;

  for (let i = 0; i < totalInstallments; i++) {
    const newDate = new Date(baseDate);
    newDate.setMonth(baseDate.getMonth() + i);

    transactions.push({
      ...baseTransaction,
      id: crypto.randomUUID(), // Temp ID, will be replaced by Firestore
      amount: parseFloat(installmentValue.toFixed(2)),
      date: newDate.toISOString(),
      installments: {
        current: i + 1,
        total: totalInstallments,
        groupId
      }
    });
  }
  return transactions;
};

// Async Service Layer
export const StorageService = {
  // --- Auth ---
  authInstance: auth,
  
  observeAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${fbUser.displayName || 'U'}&background=10B981&color=fff`
        });
      } else {
        callback(null);
      }
    });
  },

  loginGoogle: async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  loginEmail: async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  registerEmail: async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  // --- Transactions ---
  // Standard Path: Root collection 'transactions' filtered by userId
  
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (userId: string, t: Transaction) => {
    const { id, ...data } = t; 
    await addDoc(collection(db, "transactions"), { ...data, userId });
  },

  updateTransaction: async (userId: string, t: Transaction) => {
    const { id, ...data } = t;
    const ref = doc(db, "transactions", id);
    await updateDoc(ref, data);
  },

  deleteTransaction: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "transactions", id));
  },

  toggleStatus: async (userId: string, t: Transaction) => {
    const newStatus = t.status === TransactionStatus.COMPLETED ? TransactionStatus.PENDING : TransactionStatus.COMPLETED;
    const ref = doc(db, "transactions", t.id);
    await updateDoc(ref, { status: newStatus });
  },

  // --- Cards ---
  // Standard Path: Root collection 'cards' filtered by userId

  getCards: async (userId: string): Promise<CreditCard[]> => {
    const q = query(collection(db, "cards"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCard));
  },

  addCard: async (userId: string, c: CreditCard) => {
    const { id, ...data } = c;
    await addDoc(collection(db, "cards"), { ...data, userId });
  },

  updateCard: async (userId: string, c: CreditCard) => {
    const { id, ...data } = c;
    const ref = doc(db, "cards", id);
    await updateDoc(ref, data);
  },

  deleteCard: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "cards", id));
  }
};