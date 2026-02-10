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

  // Tenta formato YYYY-MM-DD (padrão enviado pela IA)
  const matchISO = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchISO) {
    year = Number(matchISO[1]);
    month = Number(matchISO[2]);
    day = Number(matchISO[3]);
  } else {
    // Tenta formato DD/MM/YYYY (fallback)
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
  return isNaN(date.getTime()) ? null : date;
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

  // Seleção automática do primeiro cartão disponível
  useEffect(() => {
    if (isOpen && cards.length > 0 && !selectedCardId) {
      setSelectedCardId(cards[0].id);
    }
  }, [isOpen, cards, selectedCardId]);

  const handleSelectApiKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setNeedsApiKey(false);
        setError('');
      }
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
        setError('Configuração de API necessária.');
      } else {
        setError('Erro ao processar extrato com IA.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const selectedCard = cards.find(c => c.id === selectedCardId);
    if (!selectedCard) return;

    const { cycleStart } = getInvoiceCycle(selectedMonth, selectedYear, selectedCard.closingDay);

    const transactions: Transaction[] = parsedData.map(item => {
      const parsedDate = parseDateBR(item.date);
      let finalDateStr = new Date().toISOString();

      if (parsedDate) {
        finalDateStr = parsedDate.toISOString();
      } else if (item.date.length <= 2) {
        // Fallback: se a IA mandou só o dia, usa o mês/ano selecionado no Modal
        const day = Number(item.date);
        const adjustedDate = new Date(cycleStart);
        adjustedDate.setDate(day);
        finalDateStr = adjustedDate.toISOString();
      }

      return {
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        date: finalDateStr,
        type: item.type === 'INCOME' ? TransactionType.INCOME : TransactionType.CARD_EXPENSE,
        category: item.category,
        status: TransactionStatus.COMPLETED,
        cardId: selectedCardId
      };
    });
    
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato com IA" maxWidth="max-w-2xl">
      {step === 'INPUT' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Cartão de destino</label>
            <select
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mês da Fatura</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ano</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Cole o texto da sua fatura aqui..."
          />

          {error && <div className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}

          {needsApiKey ? (
            <button onClick={handleSelectApiKey} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <Key size={18} /> Configurar Chave de API
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={loading || !text.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Processar com IA
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-80 overflow-y-auto border rounded-xl divide-y">
            {parsedData.map((t, i) => (
              <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <p className="font-bold text-slate-700">{t.description}</p>
                  <p className="text-xs text-slate-500">{t.date} • {t.category}</p>
                </div>
                <span className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {t.type === 'INCOME' ? '+ ' : ''}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('INPUT')} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600">Voltar</button>
            <button onClick={handleConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <CheckCircle size={18} /> Confirmar Importação
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};