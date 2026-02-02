
import { ai, MODELS } from '../lib/gemini';
import { Cliente, Pagamento, ImportResult } from '../types';
import { Type } from "@google/genai";

export interface FileData {
  data: string; // base64
  mimeType: string;
  name: string;
}

export const conciliationService = {
  async processDualImport(
    billing: string | FileData, 
    statement: string | FileData, 
    knownClients: Cliente[]
  ): Promise<ImportResult> {
    
    const parts: any[] = [];

    // Adiciona instrução de contexto
    let prompt = `
      Persona: Auditor Financeiro Especialista em Conciliação Bancária SaaS.
      Tarefa: Comparar dois conjuntos de dados (Base de Faturamento e Extrato Bancário) para realizar a conciliação automática.

      LISTA DE CLIENTES CADASTRADOS (REFERÊNCIA):
      ${JSON.stringify(knownClients.map(c => ({ id: c.id, nome: c.nome })))}

      INSTRUÇÕES DE AUDITORIA:
      1. CRUZAMENTO: Identifique quais itens da 'Base de Faturamento' têm correspondência na 'Movimentação do Banco'.
      2. MATCH SEMÂNTICO: Nomes podem variar (ex: 'Angelita Avanci' vs 'ANGELITA A DE OLIVEIRA'). Use inteligência para associar.
      3. NOVOS CLIENTES: Se encontrar nomes na Base de Faturamento que não estão na lista de referência, sugira-os em 'novosClientes'.
      4. RESULTADO: Retorne apenas o JSON com os pagamentos encontrados (valor, data, competência) e novos clientes.
      5. FORMATO DE DATA: Use YYYY-MM-DD para dataPagamento.
    `;

    parts.push({ text: prompt });

    // Adiciona Base de Faturamento (Texto ou Arquivo)
    parts.push({ text: "DOCUMENTO 1: BASE DE FATURAMENTO / LISTA DE COBRANÇA" });
    if (typeof billing === 'string') {
      parts.push({ text: billing });
    } else {
      parts.push({
        inlineData: {
          data: billing.data,
          mimeType: billing.mimeType
        }
      });
    }

    // Adiciona Extrato Bancário (Texto ou Arquivo)
    parts.push({ text: "DOCUMENTO 2: EXTRATO BANCÁRIO / MOVIMENTAÇÃO DO BANCO" });
    if (typeof statement === 'string') {
      parts.push({ text: statement });
    } else {
      parts.push({
        inlineData: {
          data: statement.data,
          mimeType: statement.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: MODELS.flash,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pagamentos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clienteId: { type: Type.STRING },
                  mes: { type: Type.INTEGER },
                  ano: { type: Type.INTEGER },
                  valor: { type: Type.NUMBER },
                  dataPagamento: { type: Type.STRING }
                },
                required: ["clienteId", "mes", "ano", "valor", "dataPagamento"]
              }
            },
            novosClientes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  inicioCobranca: { type: Type.STRING }
                },
                required: ["id", "nome", "inicioCobranca"]
              }
            }
          },
          required: ["pagamentos", "novosClientes"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{"pagamentos": [], "novosClientes": []}');
      return {
        pagamentos: data.pagamentos.map((p: any) => ({ ...p, origem: 'ia' })),
        novosClientes: data.novosClientes
      };
    } catch (e) {
      console.error("Erro na conciliação IA:", e);
      return { pagamentos: [], novosClientes: [] };
    }
  }
};
