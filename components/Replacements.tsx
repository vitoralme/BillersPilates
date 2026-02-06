import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Plus, X, Edit, CalendarCheck, Search, ChevronDown } from 'lucide-react';
import { ReplacementRequest, ClassSession, Student } from '../types';

interface ReplacementsProps {
  replacements: ReplacementRequest[];
  setReplacements: React.Dispatch<React.SetStateAction<ReplacementRequest[]>>;
  classes: ClassSession[];
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>;
  students: Student[];
}

const KANBAN_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const Replacements: React.FC<ReplacementsProps> = ({ 
  replacements, 
  setReplacements, 
  classes, 
  setClasses,
  students 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado para o autocomplete de aluno
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const initialFormState = {
    studentName: '',
    originalDate: new Date().toISOString().split('T')[0],
    targetClassId: '',
    reason: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fecha as sugestões se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowStudentSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Lógica de Data das Aulas ---
  const getClassDate = (weekId: number, dayName: string) => {
    const today = new Date();
    // Normaliza o dia da semana (0-6) considerando Domingo como 0
    const currentDayOfWeek = today.getDay(); 
    
    // Calcula a Segunda-feira da semana ATUAL (Semana 1)
    // Se hoje é Domingo (0), volta 6 dias. Se é Seg (1), volta 0.
    const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const mondayCurrentWeek = new Date(today);
    mondayCurrentWeek.setDate(today.getDate() - diffToMonday);
    
    // Calcula a Segunda-feira da semana ALVO baseada no weekId
    const mondayTargetWeek = new Date(mondayCurrentWeek);
    mondayTargetWeek.setDate(mondayCurrentWeek.getDate() + ((weekId - 1) * 7));

    // Encontra o índice do dia da aula (Segunda=0, Terça=1...)
    const dayIndex = KANBAN_DAYS.indexOf(dayName); 
    
    if (dayIndex === -1) return null;

    // Soma os dias à Segunda-feira da semana alvo
    const targetDate = new Date(mondayTargetWeek);
    targetDate.setDate(mondayTargetWeek.getDate() + dayIndex);

    return targetDate;
  };

  // Helper to find class details for list display
  const getClassDetails = (classId: string) => {
    const c = classes.find(cl => cl.id === classId);
    if (!c) return 'Aula não encontrada';
    
    const date = getClassDate(c.weekId, c.day);
    const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    
    return `${dateStr} (${c.day}) - ${c.time}`;
  };

  // Gera lista de opções de aula ordenadas cronologicamente E filtradas pela data da falta
  const sortedClassOptions = useMemo(() => {
    // Definir o limite de tempo: Final do dia da falta
    // Parse manual para evitar problemas de timezone com string YYYY-MM-DD
    const [y, m, d] = formData.originalDate.split('-').map(Number);
    // Cria data local para o final do dia da falta (23:59:59)
    const absenceCutoff = new Date(y, m - 1, d, 23, 59, 59);

    return classes
      .map(c => {
        const date = getClassDate(c.weekId, c.day);
        return {
          ...c,
          dateObj: date,
          dateString: date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'
        };
      })
      .filter(c => {
          // 1. Deve ter data válida
          // 2. Data da aula deve ser estritamente DEPOIS do dia da falta (Cutoff)
          return c.dateObj && c.dateObj > absenceCutoff;
      })
      .sort((a, b) => {
        // Ordena por Data
        const timeA = a.dateObj?.getTime() || 0;
        const timeB = b.dateObj?.getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        
        // Se data igual, ordena por Horário
        return a.time.localeCompare(b.time);
      });
  }, [classes, formData.originalDate]);

  const handleOpenModal = (rep?: ReplacementRequest) => {
    if (rep) {
      setEditingId(rep.id);
      setFormData({
        studentName: rep.studentName,
        originalDate: rep.originalDate,
        targetClassId: rep.targetClassId,
        reason: rep.reason
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
    setShowStudentSuggestions(false);
  };

  const handleSave = () => {
    if (!formData.studentName || !formData.targetClassId) return;

    // Se estiver criando, atualizar a capacidade da turma alvo E adicionar o aluno à lista
    if (!editingId) {
       setClasses(prev => prev.map(c => {
           if (c.id === formData.targetClassId) {
               // Verifica se já está na aula para não duplicar
               const alreadyIn = c.students.includes(formData.studentName);
               return { 
                   ...c, 
                   enrolled: alreadyIn ? c.enrolled : c.enrolled + 1,
                   students: alreadyIn ? c.students : [...c.students, formData.studentName]
               };
           }
           return c;
       }));
    }

    if (editingId) {
      // Edit Mode
      setReplacements(prev => prev.map(r => 
        r.id === editingId 
        ? { ...r, ...formData } 
        : r
      ));
    } else {
      // Create Mode
      const newReplacement: ReplacementRequest = {
        id: Math.random().toString(36).substr(2, 9),
        status: 'Pendente',
        ...formData
      };
      setReplacements(prev => [...prev, newReplacement]);
    }
    setIsModalOpen(false);
  };

  const filteredStudents = useMemo(() => {
    if (!formData.studentName) return [];
    const term = formData.studentName.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(term));
  }, [students, formData.studentName]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm h-full flex flex-col">
      <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold">Solicitações de Reposição</h2>
            <p className="text-sm text-zinc-500 mt-1">Gerencie os pedidos de mudança de horário</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg text-sm transition-colors"
        >
            <Plus className="w-4 h-4" />
            Nova Reposição
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {replacements.map((request) => (
          <div key={request.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-zinc-50 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-zinc-900">{request.studentName}</h3>
                {/* Badge de status removido */}
              </div>
              <p className="text-sm text-zinc-600 mb-2">
                Motivo: <span className="italic">{request.reason}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                <div className="flex items-center gap-2 text-red-500 bg-red-50 px-2 py-1 rounded-md">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Falta:</span> 
                  <span className="text-xs">{new Date(request.originalDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="text-zinc-300">➜</div>
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Reposição:</span>
                  <span className="text-xs font-bold">{getClassDetails(request.targetClassId)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto items-center">
                <button 
                    onClick={() => handleOpenModal(request)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Edit className="w-4 h-4" />
                </button>
            </div>
          </div>
        ))}
        
        {replacements.length === 0 && (
          <div className="p-12 text-center text-zinc-400">
            <p>Nenhuma solicitação encontrada.</p>
          </div>
        )}
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <h3 className="font-bold text-zinc-900">
                        {editingId ? 'Editar Reposição' : 'Nova Reposição'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    
                    {/* BUSCA DE ALUNO (AUTOCOMPLETE) */}
                    <div ref={searchWrapperRef} className="relative">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Aluno</label>
                        <div className="relative">
                            <input 
                                className="w-full pl-9 p-2.5 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none placeholder:text-zinc-400"
                                placeholder="Busque pelo nome..."
                                value={formData.studentName}
                                onChange={(e) => {
                                    setFormData({...formData, studentName: e.target.value});
                                    setShowStudentSuggestions(true);
                                }}
                                onFocus={() => setShowStudentSuggestions(true)}
                                disabled={!!editingId} // Travar nome na edição
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        </div>
                        
                        {/* Lista de Sugestões */}
                        {showStudentSuggestions && formData.studentName && filteredStudents.length > 0 && !editingId && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                {filteredStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => {
                                            setFormData({...formData, studentName: student.name});
                                            setShowStudentSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                            {student.name.charAt(0)}
                                        </div>
                                        {student.name}
                                    </button>
                                ))}
                            </div>
                        )}
                         {showStudentSuggestions && formData.studentName && filteredStudents.length === 0 && !editingId && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 p-3 text-center text-xs text-zinc-400">
                                Nenhum aluno encontrado.
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Data da Falta</label>
                        <input 
                            type="date"
                            className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            value={formData.originalDate}
                            onChange={(e) => setFormData({...formData, originalDate: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Aula de Reposição (Alvo)</label>
                        <div className="relative">
                            <select 
                                className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none appearance-none"
                                value={formData.targetClassId}
                                onChange={(e) => setFormData({...formData, targetClassId: e.target.value})}
                            >
                                <option value="">Selecione a aula...</option>
                                {sortedClassOptions.length > 0 ? (
                                    sortedClassOptions.map(c => {
                                        const isFull = c.enrolled >= c.capacity;
                                        const label = `${c.dateString} (${c.day.substring(0,3)}) • ${c.time} - ${c.instructor}`;
                                        
                                        return (
                                            <option key={c.id} value={c.id} disabled={isFull}>
                                                {label} {isFull ? '[LOTADO]' : ''}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value="" disabled>Nenhuma aula futura disponível</option>
                                )}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 italic">
                          Mostrando apenas aulas após a data da falta.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo</label>
                        <input 
                            className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none placeholder:text-zinc-400"
                            placeholder="Ex: Doença, Viagem..."
                            value={formData.reason}
                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        />
                    </div>
                </div>

                <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!formData.studentName || !formData.targetClassId}
                        className="px-4 py-2 text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Replacements;