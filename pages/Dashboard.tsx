
import React, { useState, useEffect } from 'react';
import { persistenceService } from '../services/persistenceService';
import { Cliente } from '../types';

const Dashboard: React.FC = () => {
  const [data, setData] = useState(persistenceService.load());
  
  const currentYear = new Date().getFullYear();
  const months = [
    { n: 1, s: 'Jan' }, { n: 2, s: 'Fev' }, { n: 3, s: 'Mar' },
    { n: 4, s: 'Abr' }, { n: 5, s: 'Mai' }, { n: 6, s: 'Jun' },
    { n: 7, s: 'Jul' }, { n: 8, s: 'Ago' }, { n: 9, s: 'Set' },
    { n: 10, s: 'Out' }, { n: 11, s: 'Nov' }, { n: 12, s: 'Dez' }
  ];

  const handleToggle = (clienteId: string, mes: number, ano: number) => {
    const updated = persistenceService.toggleManualPayment(clienteId, mes, ano);
    setData(updated);
  };

  /**
   * Define o status visual de cada célula baseado na regra de início de cobrança
   */
  const getStatus = (cliente: Cliente, mes: number, ano: number) => {
    const [startYear, startMonth] = cliente.inicioCobranca.split('-').map(Number);
    
    // REGRA FUNDAMENTAL: Não gerar ou cobrar meses antes do início do contrato
    if (ano < startYear || (ano === startYear && mes < startMonth)) {
      return 'disabled';
    }

    const pagamento = data.pagamentos.find(
      p => p.clienteId === cliente.id && p.mes === mes && p.ano === ano
    );

    if (pagamento) {
      return pagamento.origem === 'manual' ? 'paid-manual' : 'paid-ia';
    }

    return 'pending';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Conciliação <span className="text-blue-600">SaaS</span></h1>
            <p className="text-gray-500 mt-1">Status de faturamento e competência - Ano {currentYear}</p>
          </div>
          <div className="flex flex-wrap gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <span className="w-4 h-4 bg-green-500 rounded-sm"></span> Manual
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <span className="w-4 h-4 bg-blue-500 rounded-sm"></span> IA
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <span className="w-4 h-4 bg-red-100 border border-red-200 rounded-sm"></span> Pendente
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <span className="w-4 h-4 bg-gray-100 rounded-sm"></span> N/A
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                  CLIENTE / CONTRATO
                </th>
                {months.map(m => (
                  <th key={m.n} scope="col" className="px-3 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    {m.s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-5 whitespace-nowrap sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-gray-100">
                    <div className="text-base font-bold text-gray-800">{cliente.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded">ID: {cliente.id}</span>
                       <span className="text-[10px] font-bold text-gray-400">Desde: {cliente.inicioCobranca}</span>
                    </div>
                  </td>
                  {months.map(m => {
                    const status = getStatus(cliente, m.n, currentYear);
                    return (
                      <td key={m.n} className="px-3 py-5 whitespace-nowrap text-center">
                        {status === 'disabled' ? (
                          <div className="w-10 h-10 mx-auto bg-gray-50 rounded-xl flex items-center justify-center text-gray-200">
                            <i className="fa-solid fa-lock text-[10px]"></i>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggle(cliente.id, m.n, currentYear)}
                            title={status === 'pending' ? 'Marcar como pago' : 'Remover pagamento'}
                            className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all transform active:scale-90 shadow-sm ${
                              status === 'paid-manual' 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : status === 'paid-ia'
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-red-50 border-2 border-red-100 text-red-200 hover:border-red-300 hover:bg-red-100 hover:text-red-400'
                            }`}
                          >
                            {status === 'paid-manual' && <i className="fa-solid fa-check text-xs"></i>}
                            {status === 'paid-ia' && <i className="fa-solid fa-robot text-xs"></i>}
                            {status === 'pending' && <i className="fa-solid fa-plus text-[10px] opacity-0 group-hover:opacity-100"></i>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
             <i className="fa-solid fa-check"></i>
           </div>
           <h3 className="font-bold text-gray-800">Marcação Manual</h3>
           <p className="text-sm text-gray-500 mt-2">Clique em qualquer mês para marcar manualmente. Dados salvos localmente.</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
             <i className="fa-solid fa-robot"></i>
           </div>
           <h3 className="font-bold text-gray-800">Inteligência Artificial</h3>
           <p className="text-sm text-gray-500 mt-2">Importe extratos para que a IA identifique pagamentos e associe aos clientes.</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
             <i className="fa-solid fa-calendar-day"></i>
           </div>
           <h3 className="font-bold text-gray-800">Contratos Ativos</h3>
           <p className="text-sm text-gray-500 mt-2">Meses cinzas com cadeado indicam períodos anteriores ao início do contrato.</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
           <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
             <i className="fa-solid fa-database"></i>
           </div>
           <h3 className="font-bold text-gray-800">Zero Backend</h3>
           <p className="text-sm text-gray-500 mt-2">Não usamos banco de dados. Tudo permanece privado no seu navegador.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
