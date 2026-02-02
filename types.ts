
export type OrigemPagamento = 'manual' | 'ia';

export interface Cliente {
  id: string;
  nome: string;
  inicioCobranca: string; // YYYY-MM
}

export interface Pagamento {
  clienteId: string;
  mes: number; // 1-12
  ano: number;
  dataPagamento: string;
  valor: number;
  origem: OrigemPagamento;
}

export interface StorageData {
  clientes: Cliente[];
  pagamentos: Pagamento[];
}

export interface ImportResult {
  pagamentos: Pagamento[];
  novosClientes: Cliente[];
}
