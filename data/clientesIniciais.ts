
import { Cliente } from '../types';

/**
 * LISTA FIXA DE CLIENTES (Fácil de editar conforme solicitado)
 * A data de início de cobrança (YYYY-MM) impede cobranças retroativas.
 */
export const CLIENTES_INICIAIS: Cliente[] = [
  { id: "1", nome: "Angelita Avanci De Oliveira", inicioCobranca: "2025-03" },
  { id: "2", nome: "Rafael Rodrigues Silva", inicioCobranca: "2024-01" },
  { id: "3", nome: "Emptech Máquinas De Manutenção Eireli", inicioCobranca: "2023-11" }
];
