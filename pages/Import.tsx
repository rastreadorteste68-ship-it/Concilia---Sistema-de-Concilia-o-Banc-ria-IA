
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { conciliationService, FileData } from '../services/conciliationService';
import { persistenceService } from '../services/persistenceService';
import { ImportResult } from '../types';

const Import: React.FC = () => {
  const [billingInput, setBillingInput] = useState<string | FileData>('');
  const [statementInput, setStatementInput] = useState<string | FileData>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const billingFileRef = useRef<HTMLInputElement>(null);
  const statementFileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, setter: (val: string | FileData) => void) => {
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt || '');
    const isPdf = fileExt === 'pdf';

    // Se for Excel/CSV, convertemos para texto (CSV) para garantir compatibilidade com a IA
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setter(csv);
        } catch (err) {
          console.error("Erro ao ler Excel:", err);
          setError("Não foi possível ler o arquivo Excel. Tente converter para CSV ou PDF.");
        }
      };
      reader.readAsArrayBuffer(file);
    } 
    // Se for PDF, o Gemini 3 suporta nativamente como inlineData
    else if (isPdf) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setter({
          data: base64,
          mimeType: file.type || 'application/pdf',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
    // Fallback para outros tipos de texto
    else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => setter(e.target?.result as string);
      reader.readAsText(file);
    } else {
      setError("Formato de arquivo não suportado. Use PDF, Excel (xlsx/xls), CSV ou TXT.");
    }
  };

  const handleStartIA = async () => {
    if (!billingInput || !statementInput) {
      setError("Por favor, selecione os dois documentos (Faturamento e Extrato) para continuar.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const currentData = persistenceService.load();
      const result = await conciliationService.processDualImport(billingInput, statementInput, currentData.clientes);
      
      if (result.pagamentos.length === 0 && result.novosClientes.length === 0) {
        setError("Nenhum dado pôde ser extraído ou conciliado. Verifique se os nomes e valores estão legíveis nos documentos.");
      } else {
        setPreviewData(result);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("MIME type")) {
        setError("Erro de formato: A IA não suporta este tipo de arquivo diretamente. O sistema tentou converter, mas falhou. Tente usar CSV ou PDF.");
      } else {
        setError("Falha no processamento. Verifique sua conexão e chave de API.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCard = (
    number: string,
    title: string,
    subtitle: string,
    icon: string,
    color: string,
    input: string | FileData,
    setInput: (val: string | FileData) => void,
    fileRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const isFile = typeof input !== 'string';
    const isText = typeof input === 'string' && input !== '';
    const isEmpty = input === '';

    return (
      <div className="flex flex-col w-full">
        <label className={`text-[11px] font-black uppercase tracking-widest mb-6 ${color}`}>
          {number}. {title}
        </label>
        <div 
          className="relative min-h-[380px] bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center transition-all hover:border-gray-300 group overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], setInput);
          }}
        >
          {isEmpty ? (
            <>
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <i className={`${icon} text-3xl text-gray-300`}></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{subtitle}</h3>
              <p className="text-sm text-gray-400 font-medium mb-8">Excel, PDF, CSV ou TXT</p>
              
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                <button 
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors"
                >
                  Fazer upload do arquivo
                </button>
                <div className="text-[10px] text-gray-300 font-bold uppercase">ou</div>
                <textarea 
                  className="w-full h-10 p-2 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-100 outline-none resize-none overflow-hidden"
                  placeholder="Cole o texto aqui..."
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg ${color.replace('text', 'bg')}`}>
                <i className={isFile ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-csv'}></i>
              </div>
              <div className="font-bold text-gray-900 truncate max-w-full px-4">
                {isFile ? (input as FileData).name : "Planilha/Texto Processado"}
              </div>
              <button 
                onClick={() => setInput('')}
                className="mt-6 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest"
              >
                Remover e Alterar
              </button>
              {isText && (
                <div className="mt-4 px-6 text-[10px] text-gray-400 font-mono line-clamp-3 text-center opacity-50">
                  {input as string}
                </div>
              )}
            </div>
          )}
          <input 
            type="file" 
            ref={fileRef} 
            className="hidden" 
            accept=".pdf,.xlsx,.xls,.csv,.txt"
            onChange={(e) => e.target.files && handleFile(e.target.files[0], setInput)}
          />
        </div>
      </div>
    );
  };

  if (previewData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white shadow-2xl rounded-[3rem] p-12 border border-blue-50">
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Análise Concluída</h2>
              <p className="text-gray-400 font-medium">Confirme os dados abaixo para atualizar seu dashboard.</p>
            </div>
            <button 
              onClick={() => setPreviewData(null)}
              className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div className="grid gap-8">
            <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100">
              <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-6">Pagamentos Conciliados ({previewData.pagamentos.length})</h3>
              <div className="space-y-3">
                {previewData.pagamentos.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 transition-transform hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <i className="fa-solid fa-check text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{p.clienteId}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{p.mes}/{p.ano} • Competência</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-600 tracking-tight">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{p.dataPagamento}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {previewData.novosClientes.length > 0 && (
              <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100">
                <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-6">Novos Clientes Identificados ({previewData.novosClientes.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewData.novosClientes.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-blue-50 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <i className="fa-solid fa-user-plus text-sm"></i>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">{c.nome}</div>
                        <div className="text-[10px] text-blue-400 font-bold uppercase">ID Sugerido: {c.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => setPreviewData(null)}
              className="flex-1 py-5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest transition-all"
            >
              Descartar e Voltar
            </button>
            <button 
              onClick={() => {
                persistenceService.processImport(previewData.pagamentos, previewData.novosClientes);
                navigate('/');
              }}
              className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              Confirmar Conciliação
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center">
      <header className="text-center max-w-2xl mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-6 leading-[0.9]">
          Conciliação Inteligente
        </h1>
        <p className="text-gray-400 text-xl font-medium leading-relaxed">
          Carregue seus documentos para auditoria instantânea via IA. 
          Cruzamento automático de dados bancários e faturamento.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-6xl mb-12">
        {renderCard(
          "01",
          "LISTA DE COBRANÇA / CLIENTES",
          "Base de Faturamento",
          "fa-regular fa-file-lines",
          "text-blue-500",
          billingInput,
          setBillingInput,
          billingFileRef
        )}
        {renderCard(
          "02",
          "EXTRATO BANCÁRIO",
          "Movimentação do Banco",
          "fa-solid fa-building-columns",
          "text-emerald-500",
          statementInput,
          setStatementInput,
          statementFileRef
        )}
      </div>

      {error && (
        <div className="mb-12 w-full max-w-[600px] p-8 bg-red-50/60 text-red-600 rounded-[2rem] border border-red-100/50 font-bold text-sm flex items-center gap-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-triangle-exclamation text-lg"></i>
          </div>
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <button
        onClick={handleStartIA}
        disabled={isProcessing}
        className={`group relative flex items-center gap-5 px-16 py-8 rounded-[2.5rem] font-black text-2xl tracking-tight transition-all shadow-[0_20px_50px_rgba(0,0,0,0.15)] transform active:scale-95 ${
          isProcessing
            ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
            : 'bg-[#0f172a] text-white hover:bg-black hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)]'
        }`}
      >
        {isProcessing ? (
          <i className="fa-solid fa-spinner fa-spin"></i>
        ) : (
          <i className="fa-solid fa-bolt-lightning text-yellow-400 group-hover:scale-125 transition-transform"></i>
        )}
        <span className="uppercase tracking-tight">{isProcessing ? 'PROCESSANDO DOCUMENTOS...' : 'INICIAR CONCILIAÇÃO IA'}</span>
      </button>

      <footer className="mt-24 flex flex-wrap justify-center gap-16 text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em] opacity-80">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-shield-halved text-emerald-500 text-sm"></i>
          <span>Processamento Seguro (Gemini 3.0)</span>
        </div>
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-cloud-arrow-up text-blue-500 text-sm"></i>
          <span>Vercel Cloud Ready</span>
        </div>
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-file-pdf text-red-500 text-sm"></i>
          <span>Suporte a PDF e Excel</span>
        </div>
      </footer>
    </div>
  );
};

export default Import;
