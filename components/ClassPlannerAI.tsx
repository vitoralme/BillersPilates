import React, { useState } from 'react';
import { generateClassPlan } from '../services/geminiService';
import { AIClassPlan } from '../types';
import { Sparkles, Loader2, Dumbbell, LayoutTemplate, Box } from 'lucide-react';

const EQUIPMENTS = ['Reformer', 'Cadillac', 'Chair', 'Barrel'];

const ClassPlannerAI: React.FC = () => {
  const [focus, setFocus] = useState('');
  const [level, setLevel] = useState('Intermediário');
  const [classType, setClassType] = useState<'Mat' | 'Apparatus'>('Apparatus');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Reformer']);
  
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIClassPlan | null>(null);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev => 
      prev.includes(eq) 
        ? prev.filter(item => item !== eq)
        : [...prev, eq]
    );
  };

  const handleGenerate = async () => {
    if (!focus) return;
    // Se for aparelho mas nenhum selecionado, avisa ou seleciona um default
    if (classType === 'Apparatus' && selectedEquipment.length === 0) {
        alert("Selecione pelo menos um aparelho.");
        return;
    }

    setLoading(true);
    const result = await generateClassPlan(focus, level, classType, selectedEquipment);
    setPlan(result);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Assistente de Aulas AI</h2>
          <p className="text-xs text-zinc-500">Planeje aulas criativas em segundos</p>
        </div>
      </div>

      <div className="space-y-4 mb-6 shrink-0">
        {/* Tipo de Aula */}
        <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Modalidade</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-lg">
                <button
                    onClick={() => setClassType('Mat')}
                    className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all
                        ${classType === 'Mat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                    <LayoutTemplate className="w-4 h-4" />
                    Mat Pilates
                </button>
                <button
                    onClick={() => setClassType('Apparatus')}
                    className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all
                        ${classType === 'Apparatus' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                    <Box className="w-4 h-4" />
                    Aparelhos
                </button>
            </div>
        </div>

        {/* Seleção de Aparelhos (Condicional) */}
        {classType === 'Apparatus' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Aparelhos Disponíveis</label>
                <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENTS.map(eq => (
                        <button
                            key={eq}
                            onClick={() => toggleEquipment(eq)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-all
                                ${selectedEquipment.includes(eq) 
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center
                                ${selectedEquipment.includes(eq) ? 'border-yellow-600 bg-yellow-400' : 'border-zinc-300'}`}>
                                {selectedEquipment.includes(eq) && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                            </div>
                            {eq}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Foco e Nível */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Foco da Aula</label>
                <input 
                    type="text" 
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="Ex: Mobilidade de coluna, Core..."
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm bg-white text-zinc-900"
                />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nível</label>
                <select 
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm bg-white text-zinc-900"
                >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Idosos">Idosos</option>
                    <option value="Gestantes">Gestantes</option>
                    <option value="Pós-Reabilitação">Pós-Reabilitação</option>
                </select>
            </div>
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={loading || !focus}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-zinc-200"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-black fill-black" />}
          Gerar Plano com IA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar border-t border-zinc-100 pt-4">
        {plan ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
            <div className="flex items-start justify-between mb-2">
                 <h3 className="font-bold text-lg leading-tight text-zinc-900">{plan.title}</h3>
                 <span className="shrink-0 px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded">
                    {classType === 'Mat' ? 'Mat' : 'Aparelhos'}
                 </span>
            </div>
            
            <div className="flex gap-4 text-xs text-zinc-500 mb-6 border-b border-zinc-100 pb-4">
              <span className="flex items-center gap-1">⏱ {plan.duration}</span>
              <span className="flex items-center gap-1">📊 {plan.level}</span>
            </div>

            <div className="space-y-4">
              {plan.exercises.map((ex, idx) => (
                <div key={idx} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-yellow-200 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-zinc-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-xs font-mono text-zinc-400 group-hover:border-yellow-400 group-hover:text-yellow-600 transition-colors">
                        {idx + 1}
                      </div>
                      {ex.name}
                    </span>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-zinc-200 text-zinc-600">
                      {ex.reps}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed pl-8 border-l-2 border-zinc-200 ml-3">
                    {ex.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-medium text-zinc-500">Seu plano aparecerá aqui</p>
            <p className="text-xs mt-1">Configure as opções acima e clique em Gerar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassPlannerAI;