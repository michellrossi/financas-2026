import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CreditCard, Transaction, TransactionType, TransactionStatus } from '../types';
import { AIService, AIParsedTransaction } from '../services/ai';
import { Sparkles, Loader2, CheckCircle, AlertCircle, ArrowUp, ArrowDown, Key } from 'lucide-react';
import { formatCurrency } from '../services/storage';

/* =========================
   UTILIDADES DE DATA
========================= */

function parseDateBR(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date;
}

function getInvoiceCycle(
  invoiceMonth: number, // 0-11
  invoiceYear: number,
  closingDay: number
) {
  const cycleStart = new Date(invoiceYear, invoiceMonth - 1, closingDay, 0, 0, 0);
  const cycleEnd = new Date(invoiceYear, invoiceMonth, closingDay - 1, 23, 59, 59);

  return { cycleStart, cycleEnd };
}

/* =========================
   COMPONENTE
========================= */

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  onImport: (transactions: Transaction[]) => void;
}

export const AIImportModal: React.FC<AIImportModalProps> = ({
  isOpen,
  onClose,
  cards,
  onImport
}) => {
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [text, setText] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<AIParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const [needsApiKey, setNeedsApiKey] = useState(false);

  useEffect(() => {
    if (isOpen && cards.length > 0) {
      const exists = cards.find(c => c.id === selectedCardId);
      if (!exists) setSelectedCardId(cards[0].id);
    }
  }, [isOpen, cards, selectedCardId]);

  const handleSelectApiKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      setError('');
      if (text) handleProcess();
    } catch {
      setError('Falha ao conectar com o Google AI Studio.');
    }
  };

  const handleProcess = async () => {
    if (!selectedCardId) {
      setError('Selecione um cartão.');
      return;
    }

    if (!text.trim()) {
      setError('Cole o texto do extrato.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = await AIService.parseStatement(text);
      if (!results.length) {
        setError('Nenhuma transação identificada.');
        return;
      }
      setParsedData(results);
      setStep('PREVIEW');
    } catch (e: any) {
      if (e.message === 'API_KEY_MISSING') {
        setNeedsApiKey(true);
        setError('Conecte sua conta Google para usar IA.');
      } else {
        setError('Erro ao processar extrato.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     IMPORTAÇÃO COM CICLO
  ========================= */

  const handleConfirm = () => {
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) {
      setError('Cartão inválido.');
      return;
    }

    const closingDay = card.closingDay ?? 1;

    const { cycleStart, cycleEnd } = getInvoiceCycle(
      selectedMonth,
      selectedYear,
      closingDay
    );

    console.log('🧾 Ciclo da fatura');
    console.log('Início:', cycleStart.toISOString());
    console.log('Fim:', cycleEnd.toISOString());

    const transactions: Transaction[] = [];

    parsedData.forEach((item, index) => {
      const transactionDate = parseDateBR(item.date);

      console.log(`📄 ${index + 1} ${item.description}`);
      console.log('Data extrato:', transactionDate.toISOString());

      if (transactionDate < cycleStart || transactionDate > cycleEnd) {
        console.warn('⛔ Fora do ciclo');
        return;
      }

      transactions.push({
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        date: transactionDate.toISOString(),
        type:
          item.type === 'INCOME'
            ? TransactionType.INCOME
            : TransactionType.CARD_EXPENSE,
        category: item.category,
        status: TransactionStatus.COMPLETED,
        cardId: selectedCardId
      });

      console.log('✅ Importada');
    });

    if (!transactions.length) {
      setError('Nenhuma transação pertence a esta fatura.');
      return;
    }

    onImport(transactions);
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setParsedData([]);
    setStep('INPUT');
    setError('');
    setNeedsApiKey(false);
    onClose();
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato com IA" maxWidth="max-w-2xl">
      {step === 'INPUT' ? (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-48 p-3 border rounded-xl font-mono text-xs"
            placeholder="Cole aqui o texto do extrato"
          />

          {error && (
            <div className="text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {needsApiKey ? (
            <button
              onClick={handleSelectApiKey}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold"
            >
              <Key size={16} /> Conectar Google
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Processar
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto divide-y">
            {parsedData.map((t, i) => (
              <div key={i} className="p-3 flex justify-between text-sm">
                <span>{t.description}</span>
                <span>{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold"
          >
            <CheckCircle size={18} /> Confirmar Importação
          </button>
        </div>
      )}
    </Modal>
  );
};
