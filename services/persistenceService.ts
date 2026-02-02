
import { StorageData, Pagamento, Cliente } from '../types';
import { CLIENTES_INICIAIS } from '../data/clientesIniciais';

const STORAGE_KEY = 'concilia_ia_v1';

export const persistenceService = {
  save: (data: StorageData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  load: (): StorageData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Garantir que os CLIENTES_INICIAIS estão sempre presentes
        const currentClients = parsed.clientes || [];
        const mergedClients = [...CLIENTES_INICIAIS];
        
        currentClients.forEach((c: Cliente) => {
          if (!mergedClients.find(m => m.id === c.id)) {
            mergedClients.push(c);
          }
        });

        return {
          clientes: mergedClients,
          pagamentos: parsed.pagamentos || []
        };
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      }
    }
    return {
      clientes: CLIENTES_INICIAIS,
      pagamentos: []
    };
  },

  toggleManualPayment: (clienteId: string, mes: number, ano: number): StorageData => {
    const data = persistenceService.load();
    const existingIndex = data.pagamentos.findIndex(
      p => p.clienteId === clienteId && p.mes === mes && p.ano === ano
    );

    if (existingIndex > -1) {
      if (data.pagamentos[existingIndex].origem === 'manual') {
        data.pagamentos.splice(existingIndex, 1);
      } else {
        data.pagamentos[existingIndex].origem = 'manual';
      }
    } else {
      data.pagamentos.push({
        clienteId,
        mes,
        ano,
        dataPagamento: new Date().toISOString().split('T')[0],
        valor: 0,
        origem: 'manual'
      });
    }

    persistenceService.save(data);
    return data;
  },

  /**
   * Integra novos pagamentos e novos clientes descobertos
   */
  processImport: (newPayments: Pagamento[], newClients: Cliente[]): StorageData => {
    const data = persistenceService.load();
    
    // 1. Adicionar novos clientes que ainda não existem
    newClients.forEach(nc => {
      if (!data.clientes.find(c => c.id === nc.id || c.nome.toLowerCase() === nc.nome.toLowerCase())) {
        data.clientes.push(nc);
      }
    });

    // 2. Adicionar pagamentos (respeitando marcações manuais)
    newPayments.forEach(newPay => {
      const existingIndex = data.pagamentos.findIndex(
        p => p.clienteId === newPay.clienteId && p.mes === newPay.mes && p.ano === newPay.ano
      );

      if (existingIndex > -1) {
        if (data.pagamentos[existingIndex].origem !== 'manual') {
          data.pagamentos[existingIndex] = newPay;
        }
      } else {
        data.pagamentos.push(newPay);
      }
    });

    persistenceService.save(data);
    return data;
  }
};
