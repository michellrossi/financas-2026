import { GoogleGenAI, Type } from "@google/genai";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../types";

export interface AIParsedTransaction {
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  type: 'INCOME' | 'EXPENSE';
}

export const AIService = {
  // Used for both Bank Statements and Credit Card Statements
  parseStatement: async (text: string): Promise<AIParsedTransaction[]> => {
    console.log("Iniciando processamento de IA...");
    console.log("🔥🔥🔥 CÓDIGO NOVO CARREGADO 🔥🔥🔥");
    
    // DEBUG: Verificar TODAS as variáveis de ambiente
    console.log("=== DEBUG VARIÁVEIS DE AMBIENTE ===");
    console.log("import.meta.env completo:", import.meta.env);
    console.log("VITE_API_KEY existe?", import.meta.env.VITE_API_KEY ? "SIM" : "NÃO");
    
    // 1. Tentar obter a chave de várias fontes possíveis
    let apiKey = '';
    
    // Vite (import.meta.env)
    if (import.meta.env.VITE_API_KEY) {
      apiKey = import.meta.env.VITE_API_KEY;
      console.log("✓ API Key encontrada via import.meta.env.VITE_API_KEY");
    }
    
    // Create React App (process.env)
    if (!apiKey && typeof process !== 'undefined' && process.env?.REACT_APP_API_KEY) {
      apiKey = process.env.REACT_APP_API_KEY;
      console.log("✓ API Key encontrada via process.env.REACT_APP_API_KEY");
    }
    
    // Fallback genérico
    if (!apiKey && typeof process !== 'undefined' && process.env?.API_KEY) {
      apiKey = process.env.API_KEY;
      console.log("✓ API Key encontrada via process.env.API_KEY");
    }
    
    // LOGS DE VERIFICAÇÃO
    console.log("=== RESULTADO ===");
    console.log("API Key carregada:", apiKey ? "✓ SIM" : "✗ NÃO");
    if (apiKey) {
      console.log("Primeiros 15 caracteres:", apiKey.substring(0, 15) + "...");
      console.log("Tamanho da chave:", apiKey.length, "caracteres");
    }
    
    if (!apiKey) {
      console.error("❌ API Key não encontrada.");
      console.error("Certifique-se de:");
      console.error("1. Arquivo .env.local existe na raiz do projeto");
      console.error("2. Contém: VITE_API_KEY=sua_chave_aqui");
      console.error("3. Servidor foi reiniciado após criar o .env.local");
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
      console.log("Enviando prompt para Gemini...");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é um assistente financeiro especialista. Analise o texto do extrato bancário/fatura e extraia as transações.
        
        Categorias de Entrada (INCOME) permitidas: ${INCOME_CATEGORIES.join(", ")}.
        Categorias de Saída (EXPENSE) permitidas: ${EXPENSE_CATEGORIES.join(", ")}.
        
        Regras:
        1. Extraia a descrição, valor (sempre positivo), data e categoria.
        2. Use o campo "type" com valor "INCOME" para créditos/depósitos e "EXPENSE" para débitos/gastos.
        3. Formate a data estritamente como YYYY-MM-DD. Assuma o ano ${new Date().getFullYear()} se não estiver explícito.
        4. Ignore cabeçalhos, saldos totais ou linhas informativas que não sejam transações.
        5. Se a categoria não for óbvia, use "Outros".
        
        Texto do extrato:
        ${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                category: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] }
              },
              required: ["description", "amount", "date", "category", "type"]
            }
          }
        }
      });

      console.log("Resposta da IA recebida");
      if (response.text) {
        return JSON.parse(response.text) as AIParsedTransaction[];
      }
      return [];
    } catch (error: any) {
      console.error("AI Parsing Error Detalhado:", error);
      throw new Error(`Falha na IA: ${error.message || 'Erro desconhecido'}`);
    }
  }
};