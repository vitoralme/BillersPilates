import React, { useState, useEffect } from 'react';
import { StudentStatus, Student, ClassSession } from '../types';
import { Search, UserPlus, FileText, X, Phone, CreditCard, Activity, Save, Check, AlertCircle, MessageCircle, Filter, Calendar, Clock, Dumbbell, Target, CalendarCheck, Plus, Trash2, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';

const emptyStudent: Omit<Student, 'id' | 'joinDate'> = {
  name: '',
  email: '',
  phone: '',
  status: StudentStatus.ACTIVE,
  planCategory: 'Aparelhos',
  daysPerWeek: 2,
  monthlyFee: 0,
  lastPaymentDate: new Date().toISOString().split('T')[0],
  planExpirationDate: '', // Will be calculated
  paymentMethod: 'Pix',
  anamnesis: {
    injuries: '',
    goals: '',
    observations: ''
  },
  fixedSchedule: [] // Inicializa lista vazia
};

const KANBAN_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6; // 06:00 to 22:00
  return `${hour.toString().padStart(2, '0')}:00`;
});

interface StudentsProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: ClassSession[];
}

const Students: React.FC<StudentsProps> = ({ students, setStudents, classes }) => {
  // O estado 'students' agora vem via props, removemos o useState local para a lista principal
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estados para Modais e Edição
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState<any>(emptyStudent);

  // Estado temporário para adicionar novo horário fixo
  const [newScheduleSlot, setNewScheduleSlot] = useState({ day: 'Segunda', time: '08:00' });

  // Atualiza a lista filtrada e ORDENADA quando a lista principal, busca ou filtro mudam
  useEffect(() => {
    let result = [...students];

    // 1. Filtragem por Texto
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(student =>
        student.name.toLowerCase().includes(lowerTerm) ||
        student.email.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Filtragem por Status (Dropdown)
    if (statusFilter !== 'all') {
      result = result.filter(student => student.status === statusFilter);
    }

    // 3. Ordenação: Status (Ativo > Pendente > Inativo) e depois Vencimento (Mais recente primeiro)
    result.sort((a, b) => {
      // Pesos para os status
      const statusWeight: Record<string, number> = {
        [StudentStatus.ACTIVE]: 1,
        [StudentStatus.PENDING]: 2,
        [StudentStatus.INACTIVE]: 3
      };

      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;

      if (weightA !== weightB) {
        return weightA - weightB; // Menor peso (1) aparece primeiro
      }

      // Se o status for igual, ordena por data de vencimento (Mais recente primeiro / Decrescente)
      // Convertendo para timestamp para comparar
      const dateA = new Date(a.planExpirationDate).getTime();
      const dateB = new Date(b.planExpirationDate).getTime();

      return dateB - dateA;
    });

    setFilteredStudents(result);
  }, [searchTerm, students, statusFilter]);

  // Inicializa a data de vencimento baseada na data de pagamento inicial
  useEffect(() => {
    if (isCreating && formData.lastPaymentDate && !formData.planExpirationDate) {
      handlePaymentDateChange(formData.lastPaymentDate);
    }
  }, [isCreating]);

  // Helper para calcular a data da aula baseado na semana e dia
  const getClassDate = (weekId: number, dayName: string) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 (Dom) a 6 (Sab)

    // Calcula a Segunda-feira da semana ATUAL (Semana 1)
    const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const mondayCurrentWeek = new Date(today);
    mondayCurrentWeek.setDate(today.getDate() - diffToMonday);

    // Calcula a Segunda-feira da semana ALVO baseada no weekId
    const mondayTargetWeek = new Date(mondayCurrentWeek);
    mondayTargetWeek.setDate(mondayCurrentWeek.getDate() + ((weekId - 1) * 7));

    // Encontra o índice do dia da aula
    const dayIndex = KANBAN_DAYS.indexOf(dayName);

    if (dayIndex === -1) return null;

    // Soma os dias à Segunda-feira da semana alvo
    const targetDate = new Date(mondayTargetWeek);
    targetDate.setDate(mondayTargetWeek.getDate() + dayIndex);

    return targetDate;
  };

  // Handler para iniciar a criação
  const handleStartCreate = () => {
    setFormData(emptyStudent);
    // Recalculate date for initial state
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    setFormData({
      ...emptyStudent,
      monthlyFee: 0,
      lastPaymentDate: today.toISOString().split('T')[0],
      planExpirationDate: nextMonth.toISOString().split('T')[0],
      fixedSchedule: []
    });

    setIsCreating(true);
    setSelectedStudent(null);
    setIsEditing(false);
  };

  // Handler para iniciar a edição
  const handleStartEdit = () => {
    if (selectedStudent) {
      setFormData({
        ...selectedStudent,
        monthlyFee: selectedStudent.monthlyFee || 0,
        fixedSchedule: selectedStudent.fixedSchedule || []
      });
      setIsEditing(true);
    }
  };

  // Handler para salvar novo aluno
  const handleCreateStudent = async () => {
    if (!formData.name || !formData.email) return; // Validação básica
    setIsSaving(true);

    try {
      const newStudent: Partial<Student> = {
        ...formData,
        joinDate: new Date().toISOString()
      };

      await dataService.saveStudent(newStudent);

      // Refresh list
      const refreshedList = await dataService.fetchStudents();
      setStudents(refreshedList);
      setIsCreating(false);
    } catch (error) {
      console.error("Erro ao criar aluno:", error);
      alert("Erro ao criar aluno.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler para salvar edição (Anamnese e dados)
  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);

    try {
      const updatedStudent: Partial<Student> = {
        ...formData,
        id: selectedStudent.id,
        joinDate: selectedStudent.joinDate
      };

      await dataService.saveStudent(updatedStudent);

      // Refresh list
      const refreshedList = await dataService.fetchStudents();
      setStudents(refreshedList);

      setSelectedStudent(updatedStudent as Student);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar aluno:", error);
      alert("Erro ao atualizar aluno.");
    } finally {
      setIsSaving(false);
    }
  };

  // Utilitário para atualizar campos aninhados do form
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Funções para gerenciar Horários Fixos (Adicionar/Remover)
  const addFixedSlot = () => {
    // Evita duplicatas
    const exists = formData.fixedSchedule.some(
      (slot: any) => slot.day === newScheduleSlot.day && slot.time === newScheduleSlot.time
    );

    if (!exists) {
      const updatedSchedule = [...formData.fixedSchedule, newScheduleSlot];
      // Ordena
      updatedSchedule.sort((a, b) => {
        const dayDiff = KANBAN_DAYS.indexOf(a.day) - KANBAN_DAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
      });
      updateField('fixedSchedule', updatedSchedule);
    }
  };

  const removeFixedSlot = (day: string, time: string) => {
    const updatedSchedule = formData.fixedSchedule.filter(
      (slot: any) => !(slot.day === day && slot.time === time)
    );
    updateField('fixedSchedule', updatedSchedule);
  };

  const handlePaymentDateChange = (dateStr: string) => {
    if (!dateStr) {
      updateField('lastPaymentDate', dateStr);
      return;
    }
    const date = new Date(dateStr);
    // Add 1 month
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1);

    setFormData((prev: any) => ({
      ...prev,
      lastPaymentDate: dateStr,
      planExpirationDate: nextMonth.toISOString().split('T')[0]
    }));
  };

  const updateAnamnesis = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      anamnesis: { ...prev.anamnesis, [field]: value }
    }));
  };

  // Helper para gerar link do WhatsApp
  const getWhatsappLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${finalPhone}`;
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-4 md:p-6 border-b border-zinc-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-xl font-bold">Alunos Cadastrados</h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            {/* Filtro de Status */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                <option value="all">Todos os Status</option>
                <option value={StudentStatus.ACTIVE}>Ativos</option>
                <option value={StudentStatus.PENDING}>Pendentes</option>
                <option value={StudentStatus.INACTIVE}>Inativos</option>
              </select>
            </div>

            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aluno..."
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Novo Aluno
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 font-medium sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Mensalidade</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudents.map((student) => {
                const waLink = getWhatsappLink(student.phone);

                return (
                  <tr key={student.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-zinc-900">{student.name}</div>
                        <div className="text-xs text-zinc-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <span>{student.phone}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-600 hover:bg-green-50 p-1.5 rounded-full transition-colors"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">{student.planCategory}</span>
                        <span className="text-xs text-zinc-500">{student.daysPerWeek}x na semana</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-900 font-medium">
                      R$ {(student.monthlyFee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 font-mono">
                      {new Date(student.planExpirationDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${student.status === StudentStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                          student.status === StudentStatus.INACTIVE ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsEditing(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors flex items-center gap-1 ml-auto"
                      >
                        <FileText className="w-3 h-3" />
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              Nenhum aluno encontrado.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Detalhes ou Criação */}
      {(selectedStudent || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setSelectedStudent(null);
              setIsCreating(false);
              setIsEditing(false);
            }}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                {isCreating ? (
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                    {selectedStudent?.name.charAt(0) || 'A'}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                    {isCreating ? 'Novo Aluno' : (isEditing ? 'Editar Aluno' : selectedStudent?.name)}
                  </h3>
                  {!isCreating && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {isEditing ? (
                        <select
                          className="p-1 rounded border border-zinc-200 bg-zinc-50 text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          value={formData.status}
                          onChange={(e) => updateField('status', e.target.value)}
                        >
                          <option value={StudentStatus.ACTIVE}>Ativo</option>
                          <option value={StudentStatus.PENDING}>Pendente</option>
                          <option value={StudentStatus.INACTIVE}>Inativo</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full 
                            ${selectedStudent?.status === StudentStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`}
                          />
                          <span className="text-zinc-500">
                            {selectedStudent?.status} • Desde {selectedStudent ? new Date(selectedStudent.joinDate).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {isCreating && (
                    <select
                      className="mt-1 p-1 rounded border border-zinc-200 bg-zinc-50 text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      value={formData.status}
                      onChange={(e) => updateField('status', e.target.value)}
                    >
                      <option value={StudentStatus.ACTIVE}>Status: Ativo</option>
                      <option value={StudentStatus.PENDING}>Status: Pendente</option>
                      <option value={StudentStatus.INACTIVE}>Status: Inativo</option>
                    </select>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-8 overflow-y-auto">

              {/* Seção 1: Dados Pessoais e Plano */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados de Contato */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-50 rounded-lg text-zinc-500">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-zinc-500 uppercase font-semibold">Dados Pessoais</p>
                      {isEditing || isCreating ? (
                        <>
                          <input
                            className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            placeholder="Nome Completo"
                            value={formData.name}
                            onChange={e => updateField('name', e.target.value)}
                          />
                          <input
                            className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            placeholder="Telefone"
                            value={formData.phone}
                            onChange={e => updateField('phone', e.target.value)}
                          />
                          <input
                            className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            placeholder="Email"
                            value={formData.email}
                            onChange={e => updateField('email', e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-zinc-900 font-medium">{selectedStudent?.name}</p>
                          <p className="text-zinc-600">{selectedStudent?.phone}</p>
                          <p className="text-zinc-500 text-sm break-all">{selectedStudent?.email}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dados Financeiros/Plano */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-50 rounded-lg text-zinc-500">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-zinc-500 uppercase font-semibold">Plano & Pagamento</p>
                      {isEditing || isCreating ? (
                        <>
                          <select
                            className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            value={formData.planCategory}
                            onChange={e => updateField('planCategory', e.target.value)}
                          >
                            <option value="Aparelhos">Aparelhos</option>
                            <option value="Mat Pilates">Mat Pilates</option>
                            <option value="Mat Pilates + Musculação">Mat Pilates + Musculação</option>
                            <option value="Aparelhos + Musculação">Aparelhos + Musculação</option>
                          </select>

                          <div className="flex gap-2 items-center">
                            {/* Selector for days per week with better arrow styling */}
                            <div className="relative w-24">
                              <select
                                className="w-full p-2 pr-8 border border-zinc-200 rounded text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none appearance-none"
                                value={formData.daysPerWeek}
                                onChange={e => updateField('daysPerWeek', parseInt(e.target.value))}
                              >
                                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                  <option key={num} value={num}>{num}</option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                </svg>
                              </div>
                            </div>
                            <span className="self-center text-sm text-zinc-500">dias/sem</span>
                          </div>

                          <div className="relative">
                            <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Valor da Mensalidade (R$)</label>
                            <input
                              type="number"
                              className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0.00"
                              value={formData.monthlyFee}
                              onChange={e => updateField('monthlyFee', parseFloat(e.target.value))}
                            />
                          </div>

                          <select
                            className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            value={formData.paymentMethod}
                            onChange={e => updateField('paymentMethod', e.target.value)}
                          >
                            <option value="Pix">Pix</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Boleto">Boleto</option>
                            <option value="Dinheiro">Dinheiro</option>
                          </select>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Data Pagamento</label>
                              <input
                                type="date"
                                className="w-full p-2 border border-zinc-200 rounded text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                value={formData.lastPaymentDate}
                                onChange={e => handlePaymentDateChange(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Vencimento</label>
                              <input
                                type="date"
                                disabled
                                className="w-full p-2 border border-zinc-200 rounded text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed"
                                value={formData.planExpirationDate}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-zinc-900 font-medium">{selectedStudent?.planCategory} ({selectedStudent?.daysPerWeek}x)</p>
                          <p className="text-zinc-900 font-bold text-lg mt-1">R$ {(selectedStudent?.monthlyFee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês</p>
                          <p className="text-zinc-600 mt-1">Via {selectedStudent?.paymentMethod}</p>
                          <p className="text-zinc-500 text-sm flex items-center gap-1 mt-2">
                            <span className="text-xs text-zinc-400">Vence em:</span>
                            <span className="font-mono text-zinc-900">{selectedStudent ? new Date(selectedStudent.planExpirationDate).toLocaleDateString('pt-BR') : ''}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 1.5: Horários Fixos (Manual) */}
              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck className="w-5 h-5 text-yellow-600" />
                  <h4 className="text-lg font-bold text-zinc-900">Dias e Horários Fixos</h4>
                </div>

                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  {isEditing || isCreating ? (
                    <>
                      <div className="flex items-end gap-2 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Dia</label>
                          <select
                            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            value={newScheduleSlot.day}
                            onChange={e => setNewScheduleSlot({ ...newScheduleSlot, day: e.target.value })}
                          >
                            {KANBAN_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário</label>
                          <select
                            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            value={newScheduleSlot.time}
                            onChange={e => setNewScheduleSlot({ ...newScheduleSlot, time: e.target.value })}
                          >
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={addFixedSlot}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-black transition-colors h-[38px] w-[38px] flex items-center justify-center"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Lista de Horários Adicionados */}
                      <div className="flex flex-wrap gap-2">
                        {formData.fixedSchedule && formData.fixedSchedule.length > 0 ? (
                          formData.fixedSchedule.map((slot: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 bg-white pl-3 pr-2 py-1.5 rounded-lg border border-zinc-200 shadow-sm animate-in zoom-in-95 duration-200">
                              <span className="text-xs font-bold uppercase text-zinc-500">{slot.day}</span>
                              <div className="h-3 w-px bg-zinc-200"></div>
                              <span className="text-sm font-bold text-zinc-900">{slot.time}</span>
                              <button
                                onClick={() => removeFixedSlot(slot.day, slot.time)}
                                className="ml-1 p-1 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-full transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-400 italic w-full text-center py-2">
                            Nenhum horário fixo adicionado.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    // MODO VISUALIZAÇÃO
                    (() => {
                      const fixedSlots = selectedStudent?.fixedSchedule || [];
                      if (fixedSlots.length === 0) {
                        return (
                          <p className="text-sm text-zinc-400 italic">
                            Nenhum horário fixo registrado.
                          </p>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-3">
                          {fixedSlots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-zinc-200 shadow-sm">
                              <span className="text-xs font-bold uppercase text-zinc-500">{slot.day}</span>
                              <div className="h-3 w-px bg-zinc-200"></div>
                              <span className="text-sm font-bold text-zinc-900">{slot.time}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Seção 2: Anamnese */}
              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-lg font-bold text-zinc-900">Anamnese</h4>
                  </div>
                  {(isEditing || isCreating) && (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Modo de Edição
                    </span>
                  )}
                </div>

                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Histórico de Lesões</p>
                      {isEditing || isCreating ? (
                        <textarea
                          className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none min-h-[80px]"
                          placeholder="Descreva lesões ou cirurgias prévias..."
                          value={formData.anamnesis.injuries}
                          onChange={e => updateAnamnesis('injuries', e.target.value)}
                        />
                      ) : (
                        <p className="text-zinc-800 text-sm leading-relaxed">
                          {selectedStudent?.anamnesis.injuries || 'Nenhuma relatada.'}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Objetivos</p>
                      {isEditing || isCreating ? (
                        <textarea
                          className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none min-h-[80px]"
                          placeholder="Quais os objetivos do aluno?"
                          value={formData.anamnesis.goals}
                          onChange={e => updateAnamnesis('goals', e.target.value)}
                        />
                      ) : (
                        <p className="text-zinc-800 text-sm leading-relaxed">
                          {selectedStudent?.anamnesis.goals}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-200/50 pt-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Observações do Instrutor</p>
                    {isEditing || isCreating ? (
                      <textarea
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none min-h-[80px]"
                        placeholder="Observações técnicas ou cuidados especiais..."
                        value={formData.anamnesis.observations}
                        onChange={e => updateAnamnesis('observations', e.target.value)}
                      />
                    ) : (
                      <p className="text-zinc-800 text-sm leading-relaxed bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
                        {selectedStudent?.anamnesis.observations}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 3: Histórico de Aulas (Aparece apenas ao visualizar, não editando/criando) */}
              {selectedStudent && !isEditing && !isCreating && (
                <div className="border-t border-zinc-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-lg font-bold text-zinc-900">Histórico de Aulas</h4>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    {(() => {
                      const studentClasses = classes.filter(c => c.students.includes(selectedStudent.name));
                      // Ordenar por semana (desc) e depois por dia
                      studentClasses.sort((a, b) => b.weekId - a.weekId);

                      if (studentClasses.length === 0) {
                        return (
                          <div className="p-8 text-center text-zinc-400 bg-zinc-50">
                            <div className="flex justify-center mb-2">
                              <Dumbbell className="w-6 h-6 opacity-30" />
                            </div>
                            <p className="text-sm">Nenhuma aula registrada.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="divide-y divide-zinc-100">
                          {studentClasses.map(session => {
                            const isMat = session.type === 'Mat';
                            const displayType = isMat ? 'Mat Pilates' : 'Pilates com Aparelhos';

                            // Calcula a data específica da aula
                            const dateObj = getClassDate(session.weekId, session.day);
                            const formattedDate = dateObj
                              ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                              : '';

                            return (
                              <div key={session.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 transition-colors gap-3">
                                <div className="flex items-start gap-4">
                                  <div className="bg-zinc-100 p-2 rounded-lg text-zinc-600 mt-1">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-zinc-900 text-sm">
                                      {formattedDate && <span className="text-zinc-500 font-normal mr-1">{formattedDate} •</span>}
                                      {session.day}, {session.time}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                      Semana {session.weekId} • Instrutor: {session.instructor}
                                    </p>
                                    {/* Exibir Foco da Aula se existir */}
                                    {session.sessionFocus && (
                                      <div className="flex items-start gap-1 mt-1.5 text-xs text-zinc-600 bg-yellow-50/50 p-1.5 rounded border border-yellow-100">
                                        <Target className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                                        <span className="italic">{session.sessionFocus}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border self-start sm:self-center
                                                ${isMat ? 'bg-green-50 text-green-700 border-green-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                  {displayType}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com Ações */}
            <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-100 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10 shrink-0">
              {isEditing || isCreating ? (
                <>
                  <button
                    onClick={() => {
                      if (isCreating) {
                        setIsCreating(false);
                      } else {
                        setIsEditing(false);
                      }
                    }}
                    disabled={isSaving}
                    className="px-6 py-2 border border-zinc-200 text-zinc-600 rounded-lg font-medium hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isCreating ? handleCreateStudent : handleUpdateStudent}
                    disabled={isSaving}
                    className="px-6 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg font-medium flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg font-bold shadow-sm"
                >
                  Editar Cadastro
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Students;