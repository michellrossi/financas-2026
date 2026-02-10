import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import {
  CreditCard,
  Transaction,
  TransactionType,
  TransactionStatus
} from '../types';
import { AIService, AIParsedTransaction } from '../services/ai';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Key
} from 'lucide-react';
import { formatCurrency } from '../services/storage';

/* =========================
   UTILIDADES DE DATA
========================= */

function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;

  const clean = dateStr.trim();
  let day, month, year;

  // Tenta formato YYYY-MM-DD (que a IA está enviando)
  const matchISO = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchISO) {
    year = Number(matchISO[1]);
    month = Number(matchISO[2]);
    day = Number(matchISO[3]);
  } else {
    // Tenta formato DD/MM/YYYY (fallback brasileiro)
    const matchBR = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchBR) {
      day = Number(matchBR[1]);
      month = Number(matchBR[2]);
      year = Number(matchBR[3]);
    } else {
      return null;
    }
  }

  // Cria a data ao meio-dia para evitar problemas de fuso horário
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (isNaN(date.getTime())) return null;

  return date;
}

function getInvoiceCycle(invoiceMonth: number, invoiceYear: number, closingDay: number) {
  // Início do ciclo: Dia de fechamento do mês anterior
  const cycleStart = new Date(invoiceYear, invoiceMonth - 1, closingDay, 0, 0, 0);
  
  // Fim do ciclo: Um dia antes do fechamento do mês atual
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

  /* =========================
     SELEÇÃO AUTOMÁTICA DE CARTÃO
  ========================= */

  useEffect(() => {
    if (isOpen && cards.length > 0) {
      const exists = cards.find(c => c.id === selectedCardId);
      if (!exists) {
        setSelectedCardId(cards[0].id);
      }
    }
  }, [isOpen, cards, selectedCardId]);

  /* =========================
     IA
  ========================= */

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
    setNeedsApiKey(false);

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
        setError('Conecte sua conta Google para usar a IA.');
      } else {
        setError('Erro ao processar extrato.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     CONFIRMAÇÃO COM CICLO
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

  const transactions: Transaction[] = [];

  parsedData.forEach((item) => {
    const transactionDate = parseDateBR(item.date);
    if (!transactionDate) return;

    // VALIDAR SE ESTÁ NO CICLO
    if (transactionDate < cycleStart || transactionDate > cycleEnd) {
      return;
    }

    // SOLUÇÃO: Criar a data forçando o Mês e Ano selecionados no Modal
    // Isso garante que todas caiam em Janeiro, mantendo o dia original da compra.
    const finalDate = new Date(selectedYear, selectedMonth, transactionDate.getDate(), 12, 0, 0);

    transactions.push({
      id: crypto.randomUUID(),
      description: item.description,
      amount: item.amount,
      date: finalDate.toISOString(), // Salva exatamente no mês de destino
      type: item.type === 'INCOME' ? TransactionType.INCOME : TransactionType.CARD_EXPENSE,
      category: item.category,
      status: TransactionStatus.COMPLETED,
      cardId: selectedCardId
    });
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Extrato com IA"
      maxWidth="max-w-2xl"
    >
      {step === 'INPUT' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Cartão de crédito
            </label>
            <select
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              {cards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Mês da fatura
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value={0}>Janeiro</option>
                <option value={1}>Fevereiro</option>
                <option value={2}>Março</option>
                <option value={3}>Abril</option>
                <option value={4}>Maio</option>
                <option value={5}>Junho</option>
                <option value={6}>Julho</option>
                <option value={7}>Agosto</option>
                <option value={8}>Setembro</option>
                <option value={9}>Outubro</option>
                <option value={10}>Novembro</option>
                <option value={11}>Dezembro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Ano
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            placeholder="Cole aqui o texto do extrato"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {needsApiKey ? (
            <button
              onClick={handleSelectApiKey}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Key size={16} /> Conectar Google
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Processar extrato
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto divide-y">
            {parsedData.map((t, i) => (
              <div key={i} className="p-3 flex justify-between text-sm">
                <div>
                  <p className="font-bold">{t.description}</p>
                  <p className="text-xs text-slate-500">{t.date}</p>
                </div>
                <span className="font-bold">
                  {t.type === 'INCOME' ? '+ ' : ''}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> Confirmar Importação
          </button>
        </div>
      )}
    </Modal>
  );
};
