import React, { useState } from 'react';
import { Save, Plus, Trash2, Percent, Users, Info, CheckCircle2 } from 'lucide-react';
import { TeacherConfig } from '../types';
import { dataService } from '../services/dataService';

interface SettingsProps {
  teachers: TeacherConfig[];
  setTeachers: React.Dispatch<React.SetStateAction<TeacherConfig[]>>;
}

const Settings: React.FC<SettingsProps> = ({ teachers, setTeachers }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Helpers de Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const parseCurrencyInput = (value: string): number => {
    // Remove tudo que não for dígito
    const digits = value.replace(/\D/g, "");
    // Divide por 100 para considerar os centavos
    return Number(digits) / 100;
  };

  // Handlers
  const addTeacher = () => {
    const newTeacher: TeacherConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      paymentType: 'commission',
      value: 0
    };
    setTeachers([...teachers, newTeacher]);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  const updateTeacher = (id: string, field: keyof TeacherConfig, value: any) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateTeacherValue = (id: string, rawValue: string, type: 'commission' | 'fixed') => {
    let numericValue = 0;
    if (type === 'commission') {
      // Para comissão, aceita apenas números inteiros ou decimais simples
      numericValue = parseFloat(rawValue) || 0;
    } else {
      // Para fixo, usa lógica de moeda
      numericValue = parseCurrencyInput(rawValue);
    }
    updateTeacher(id, 'value', numericValue);
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      // Envia todos os contratos para o Supabase
      await Promise.all(teachers.map(teacher => dataService.saveTeacher(teacher)));

      // Remove (opcionalmente) professores deletados se implementasse lógica de deleção real no banco, 
      // mas aqui estamos apenas fazendo upsert por simplicidade.

      const refreshed = await dataService.fetchTeachers();
      setTeachers(refreshed);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">

      {/* Action Header - Removido sticky e margens negativas para evitar sobreposição */}
      <div className="flex justify-end items-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-sm w-full md:w-auto justify-center
                ${success
              ? 'bg-green-500 text-white shadow-green-200'
              : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-200'}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </span>
          ) : success ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      {/* Gestão de Professores */}
      <div className="w-full">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 md:p-8 flex flex-col">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-900 rounded-xl text-yellow-400 shadow-lg shadow-zinc-200">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-zinc-900">Equipe & Contratos</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Defina o modelo de remuneração</p>
              </div>
            </div>
            <button
              onClick={addTeacher}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Prof.
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {/* Header da Tabela */}
            <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider hidden md:grid">
              <div className="col-span-5">Profissional</div>
              <div className="col-span-4">Tipo de Contrato</div>
              <div className="col-span-3">Remuneração</div>
            </div>

            <div className="space-y-3">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-zinc-50 hover:bg-white p-4 rounded-xl border border-zinc-200 transition-all hover:shadow-md group">
                  {/* Nome */}
                  <div className="md:col-span-5">
                    <label className="md:hidden text-xs font-bold text-zinc-400 mb-1 block">Nome</label>
                    <input
                      type="text"
                      placeholder="Nome do Professor"
                      value={teacher.name}
                      onChange={(e) => updateTeacher(teacher.id, 'name', e.target.value)}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium placeholder:text-zinc-400"
                    />
                  </div>

                  {/* Tipo de Pagamento */}
                  <div className="md:col-span-4">
                    <label className="md:hidden text-xs font-bold text-zinc-400 mb-1 block">Contrato</label>
                    <div className="relative">
                      <select
                        value={teacher.paymentType}
                        onChange={(e) => updateTeacher(teacher.id, 'paymentType', e.target.value)}
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer"
                      >
                        <option value="commission">Comissão (%)</option>
                        <option value="fixed">Salário Fixo (R$)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Valor e Ações */}
                  <div className="md:col-span-3 flex items-center gap-2">
                    <label className="md:hidden text-xs font-bold text-zinc-400 mb-1 block w-full">Valor</label>
                    <div className="relative flex-1">
                      {teacher.paymentType === 'commission' ? (
                        <>
                          <input
                            type="number"
                            value={teacher.value}
                            onChange={(e) => updateTeacherValue(teacher.id, e.target.value, 'commission')}
                            className="w-full p-2.5 pr-8 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-right font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        </>
                      ) : (
                        <>
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium">R$</span>
                          <input
                            type="text"
                            value={formatCurrency(teacher.value)}
                            onChange={(e) => updateTeacherValue(teacher.id, e.target.value, 'fixed')}
                            className="w-full p-2.5 pl-8 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-right font-bold"
                          />
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeTeacher(teacher.id)}
                      className="p-2.5 bg-white text-zinc-300 hover:text-red-500 hover:bg-red-50 border border-zinc-200 hover:border-red-100 rounded-lg transition-all"
                      title="Remover Professor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {teachers.length === 0 && (
                <div className="text-center py-12 text-zinc-400 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200">
                  Nenhum professor cadastrado.
                </div>
              )}
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-8 bg-yellow-50/80 p-5 rounded-xl border border-yellow-100 flex flex-col md:flex-row gap-4">
            <div className="shrink-0 mt-1">
              <Info className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-zinc-600">
              <div>
                <strong className="block text-zinc-900 mb-1">Comissão Variável</strong>
                O valor percentual incide sobre o total das aulas ministradas. O cálculo é feito automaticamente no fechamento do mês.
              </div>
              <div>
                <strong className="block text-zinc-900 mb-1">Salário Fixo</strong>
                Gera um lançamento automático de despesa na categoria "Pessoal" todo dia 05, independente da quantidade de aulas.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;