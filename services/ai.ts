// 1. Tentar obter a chave de várias fontes possíveis
let apiKey = '';

// Vite (import.meta.env)
if (import.meta.env.VITE_API_KEY) {
  apiKey = import.meta.env.VITE_API_KEY;
}

// Create React App (process.env)
if (!apiKey && process.env.REACT_APP_API_KEY) {
  apiKey = process.env.REACT_APP_API_KEY;
}

// Fallback genérico
if (!apiKey && process.env.API_KEY) {
  apiKey = process.env.API_KEY;
}

if (!apiKey) {
  console.error("API Key não encontrada.");
  console.log("API Key carregada:", apiKey ? "✓ SIM" : "✗ NÃO");
  console.log("Primeiros caracteres:", apiKey ? apiKey.substring(0, 10) + "..." : "nenhum");
  console.error("Certifique-se de criar um arquivo .env com VITE_API_KEY ou REACT_APP_API_KEY");
  throw new Error("API_KEY_MISSING");
}