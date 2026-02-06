import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, X, Plus, CalendarDays, Clock, Info, MessageCircle, Trash2, ChevronDown, ChevronLeft, ChevronRight, Search, Phone, Activity, UserMinus, Target } from 'lucide-react';
import { ClassSession, Student, ReplacementRequest, TeacherConfig } from '../types';
import { dataService } from '../services/dataService';

interface ScheduleProps {
    classes: ClassSession[];
    setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>;
    students: Student[];
    replacements: ReplacementRequest[];
}

// Configuração do Kanban / Grade
const KANBAN_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const START_HOUR = 6;
const END_HOUR = 16;
const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
    const hour = i + START_HOUR;
    return `${hour.toString().padStart(2, '0')}:00`;
});

const Schedule: React.FC<ScheduleProps> = ({ classes: allClasses, setClasses, students, replacements }) => {
    const [selectedWeekId, setSelectedWeekId] = useState(1);
    const [weekOffset, setWeekOffset] = useState(0);

    // Modal de Detalhes do Aluno
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [viewingClassId, setViewingClassId] = useState<string | null>(null); // Estado para saber de qual aula o aluno foi clicado

    // Modal de Adicionar Aluno na Aula
    const [classIdToAddStudent, setClassIdToAddStudent] = useState<string | null>(null);
    const [studentToAdd, setStudentToAdd] = useState('');
    const [classFocusInput, setClassFocusInput] = useState(''); // Novo estado para o foco da aula
    const [showStudentSuggestions, setShowStudentSuggestions] = useState(false); // Estado para mostrar sugestões
    const searchWrapperRef = useRef<HTMLDivElement>(null); // Ref para fechar ao clicar fora

    // Modal de Nova Aula
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [newClassData, setNewClassData] = useState({
        day: '',
        time: '',
        instructor: '',
        capacity: 4,
        type: 'Aparelhos' as 'Reformer' | 'Mat' | 'Chair' | 'Aparelhos'
    });

    // Lista de instrutores carregada do banco
    const [availableInstructors, setAvailableInstructors] = useState<TeacherConfig[]>([]);

    // Carregar professores ao montar
    useEffect(() => {
        dataService.fetchTeachers().then(teachers => {
            setAvailableInstructors(teachers);
        }).catch(err => console.error("Erro ao carregar professores:", err));
    }, []);

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

    // Ao abrir o modal de adicionar aluno, preenche o foco se já existir na aula
    useEffect(() => {
        if (classIdToAddStudent) {
            const currentClass = allClasses.find(c => c.id === classIdToAddStudent);
            if (currentClass) {
                setClassFocusInput(currentClass.sessionFocus || '');
            }
        } else {
            setClassFocusInput('');
            setStudentToAdd('');
        }
    }, [classIdToAddStudent, allClasses]);

    // --- LÓGICA DE DATAS DINÂMICAS ---

    // Gera as 4 semanas a partir da data atual
    const weeks = useMemo(() => {
        const today = new Date();
        // Ajustar para a última Segunda-feira (início da semana)
        const dayOfWeek = today.getDay(); // 0 (Dom) a 6 (Sab)
        // Se for Domingo (0), volta 6 dias. Se for outro dia, volta (dayOfWeek - 1)
        const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

        const startOfCurrentWeek = new Date(today.setDate(diff));
        const generatedWeeks = [];

        for (let i = 0; i < 4; i++) {
            // Índice relativo considerando o offset (pode ser negativo)
            const weekIndex = i + weekOffset;

            const start = new Date(startOfCurrentWeek);
            start.setDate(start.getDate() + (weekIndex * 7));

            const end = new Date(start);
            end.setDate(end.getDate() + 6);

            const format = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

            // ID Cíclico: 1, 2, 3, 4 based on weekIndex
            // weekIndex 0 -> 1
            // weekIndex -1 -> 4
            // Formula: ((weekIndex % 4) + 4) % 4 + 1
            const cyclicId = ((weekIndex % 4) + 4) % 4 + 1;

            // Lógica de Label: Semana 0 é a Atual (relative index 0)
            const isCurrentWeek = weekIndex === 0;

            generatedWeeks.push({
                sysId: i, // ID único para a lista
                id: cyclicId, // ID do banco (1-4)
                label: `Semana 0${cyclicId}`,
                subLabel: isCurrentWeek ? 'Semana Atual' : format(start), // Mostra "Atual" ou a data de início
                range: `${format(start)} - ${format(end)}`,
                startDate: start,
                isCurrent: isCurrentWeek,
                weekIndex: weekIndex
            });
        }
        return generatedWeeks;
    }, [weekOffset]);

    // Efeito para ajustar a semana selecionada quando navegamos
    // Se o usuário navegar, tentamos manter o foco na "primeira" da lista ou manter o ID se possível
    // Mas simplificando: ao navegar, podemos resetar para a primeira da nova lista ou manter selectedWeekId?
    // Se mantivermos selectedWeekId, e ele estiver na tela, ótimo.

    // Fallback: se selectedWeekId não estiver nas generatedWeeks (ex: mudou offset drasticamente e o ID mudou? Não, IDs são 1-4)
    // IDs 1-4 sempre estarão presentes se mostrarmos 4 semanas sequenciais
    // Mas a ordem muda.

    const currentWeekObj = weeks.find(w => w.id === selectedWeekId) || weeks[0];

    // Helper para pegar a data específica de um dia da semana na semana selecionada
    const getDateForDay = (dayName: string) => {
        const dayIndex = KANBAN_DAYS.indexOf(dayName); // 0 = Segunda, 1 = Terça...
        const date = new Date(currentWeekObj.startDate);

        if (dayIndex !== -1) {
            date.setDate(date.getDate() + dayIndex);
        }

        return date;
    };

    // --- FIM LÓGICA DE DATAS ---

    // Filtrar aulas pela semana selecionada
    const weeklyClasses = allClasses.filter(c => c.weekId === selectedWeekId);

    const getClassForSlot = (day: string, time: string) => {
        return weeklyClasses.find(c => c.day === day && c.time === time);
    };

    // Verificação de horário passado
    const isClassPast = (dayName: string, time: string) => {
        const today = new Date();
        const startOfViewedWeek = currentWeekObj.startDate;
        const endOfViewedWeek = new Date(startOfViewedWeek);
        endOfViewedWeek.setDate(endOfViewedWeek.getDate() + 6);
        endOfViewedWeek.setHours(23, 59, 59, 999);

        // Se a semana inteira já passou
        if (endOfViewedWeek < today) return true;

        // Se a semana é futura (começa depois de hoje no fim do dia? Não, apenas se o start for maior que hoje?)
        // Cuidado: Today is in the middle of current week.
        // Se start > today (comparando datas completas, today pode estar no meio).
        // Melhor: Se today < startOfViewedWeek (ignoring hours? Or simply date compare)
        // Simplificação: Se a data do dia específico da aula < today

        const classDate = getDateForDay(dayName);
        // Ajustar a hora da aula
        const [h, m] = time.split(':').map(Number);
        const classDateTime = new Date(classDate);
        classDateTime.setHours(h, m, 0, 0);

        return today > classDateTime;
    };

    // Helper para WhatsApp
    const getStudentPhoneLink = (studentName: string) => {
        const student = students.find(s => s.name === studentName);
        if (!student || !student.phone) return null;

        // Remove tudo que não é número
        const cleanPhone = student.phone.replace(/\D/g, '');

        // Assume Brasil (55) se não tiver código de país e tiver tamanho de celular com DDD (11 dígitos)
        const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        return `https://wa.me/${finalPhone}`;
    };

    const handleOpenNewClassModal = (day: string, time: string) => {
        setNewClassData({
            day,
            time,
            instructor: '',
            capacity: 4,
            type: 'Aparelhos'
        });
        setIsClassModalOpen(true);
    };

    const handleCreateClass = () => {
        if (!newClassData.instructor) return;

        const newClass: ClassSession = {
            id: Math.random().toString(36).substr(2, 9),
            weekId: selectedWeekId,
            enrolled: 0,
            students: [],
            ...newClassData
        };

        setClasses([...allClasses, newClass]);
        setIsClassModalOpen(false);
    };

    // Função para adicionar aluno na aula existente
    const handleAddStudentToClass = () => {
        if (!classIdToAddStudent || !studentToAdd) return;

        setClasses(prevClasses => prevClasses.map(c => {
            if (c.id === classIdToAddStudent) {
                // Verifica duplicidade
                if (c.students.includes(studentToAdd)) {
                    // Se já existe, atualiza apenas o foco da aula se foi alterado
                    return {
                        ...c,
                        sessionFocus: classFocusInput
                    };
                }

                return {
                    ...c,
                    students: [...c.students, studentToAdd],
                    enrolled: c.enrolled + 1,
                    sessionFocus: classFocusInput // Salva o foco da aula
                };
            }
            return c;
        }));

        // Reset e fecha modal
        setClassIdToAddStudent(null);
        setStudentToAdd('');
        setClassFocusInput('');
        setShowStudentSuggestions(false);
    };

    // Função para remover aluno da aula
    const handleRemoveStudentFromClass = (classId: string, studentName: string) => {
        if (window.confirm(`Tem certeza que deseja remover ${studentName} desta aula?`)) {
            setClasses(prevClasses => prevClasses.map(c => {
                if (c.id === classId) {
                    return {
                        ...c,
                        students: c.students.filter(s => s !== studentName),
                        enrolled: Math.max(0, c.enrolled - 1)
                    };
                }
                return c;
            }));
            // Fecha o modal de visualização se o aluno foi removido através dele
            if (viewingStudent?.name === studentName) {
                setViewingStudent(null);
                setViewingClassId(null);
            }
        }
    };

    // Função para excluir aula
    const handleDeleteClass = (classId: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta aula permanentemente?")) {
            setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
        }
    };

    // Função para abrir detalhes do aluno (Agora recebe o ID da aula opcionalmente)
    const handleViewStudent = (studentName: string, classId?: string) => {
        const student = students.find(s => s.name === studentName);
        if (student) {
            setViewingStudent(student);
            if (classId) setViewingClassId(classId);
        } else {
            alert(`Detalhes não encontrados para: ${studentName}`);
        }
    };

    // Helper para filtrar alunos no modal de adicionar
    const filteredStudentsForAdd = useMemo(() => {
        if (!classIdToAddStudent) return [];
        const term = studentToAdd.toLowerCase();

        const currentClass = allClasses.find(c => c.id === classIdToAddStudent);
        const currentStudents = currentClass ? currentClass.students : [];

        return students.filter(s => {
            // Filtra quem já está na aula
            if (currentStudents.includes(s.name)) return false;
            // Filtra pelo termo digitado
            return s.name.toLowerCase().includes(term);
        });
    }, [students, studentToAdd, classIdToAddStudent, allClasses]);

    return (
        <div className="h-full flex flex-col relative bg-zinc-50/50">

            {/* 1. Header & Week Navigator */}
            <div className="bg-white border-b border-zinc-200 px-6 py-4 flex flex-col gap-4 shadow-sm shrink-0 z-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-yellow-500" />
                            Agenda de Aulas
                        </h2>
                        <p className="text-sm text-zinc-500">
                            Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setWeekOffset(prev => prev - 1);
                                setSelectedWeekId(prev => prev === 1 ? 4 : prev - 1);
                            }}
                            className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            title="Semana Anterior"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                setWeekOffset(0);
                                setSelectedWeekId(1);
                            }}
                            className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wide text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={() => {
                                setWeekOffset(prev => prev + 1);
                                setSelectedWeekId(prev => prev === 4 ? 1 : prev + 1);
                            }}
                            className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            title="Próxima Semana"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* NAVEGADOR DE SEMANAS (HORIZONTAL) */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 pt-1">
                        {weeks.map((week) => {
                            const isActive = selectedWeekId === week.id;
                            return (
                                <button
                                    key={week.sysId}
                                    onClick={() => setSelectedWeekId(week.id)}
                                    className={`relative flex-1 md:flex-none flex flex-col items-center justify-center px-6 py-4 rounded-2xl text-sm transition-all min-w-[200px] border shadow-sm overflow-hidden
                                ${isActive
                                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-300 transform scale-[1.02] ring-1 ring-zinc-900'
                                            : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                                        }`}
                                >
                                    {/* Accent Bar for Active */}
                                    {isActive && <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400" />}

                                    <span className={`text-base font-bold tracking-tight ${isActive ? 'text-white' : 'text-zinc-900'}`}>
                                        {week.label}
                                    </span>

                                    {/* Sublabel / Badge */}
                                    {week.isCurrent ? (
                                        <span className={`text-[11px] uppercase font-bold mt-1.5 px-2 py-0.5 rounded-full 
                                    ${isActive ? 'bg-yellow-400 text-black' : 'bg-zinc-100 text-zinc-500'}`}>
                                            {week.subLabel}
                                        </span>
                                    ) : (
                                        <span className={`text-[11px] mt-1.5 font-medium ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                            {week.range}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 2. Grid de Aulas (DIAS NA VERTICAL, HORAS NA HORIZONTAL) */}
            <div className="flex-1 overflow-auto bg-zinc-50/50">
                <div className="min-w-max pb-6 pr-6">

                    {/* Cabeçalho de Horários (Sticky Top) */}
                    {/* Ajuste no padding-left para alinhar com a coluna fixa do dia */}
                    <div className="sticky top-0 z-30 flex bg-zinc-50/95 backdrop-blur-sm pt-6 pb-4 pl-[140px] md:pl-[180px] border-b border-zinc-100">
                        {TIME_SLOTS.map(time => (
                            <div key={time} className="w-[220px] shrink-0 text-center border-r border-zinc-100 last:border-0">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-zinc-400 bg-white border border-zinc-100">
                                    <Clock className="w-3 h-3" />
                                    {time}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Linhas dos Dias */}
                    {/* Removido o pl-6 do container principal para garantir que o sticky funcione perfeitamente no mobile */}
                    <div className="space-y-6 pt-4">
                        {KANBAN_DAYS.map((day) => {
                            const dateObj = getDateForDay(day);
                            const dayNumber = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
                            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

                            // Verifica se é hoje para destaque visual
                            const isToday = new Date().toDateString() === dateObj.toDateString();

                            return (
                                <div key={day} className="flex relative group/row">
                                    {/* Cabeçalho do Dia (Sticky Left) - TEMA PRETO UNIFICADO */}
                                    {/* Adicionado bg-zinc-50 e padding interno para substituir o padding do container */}
                                    <div className="sticky left-0 z-20 w-[124px] md:w-[164px] shrink-0 pl-2 md:pl-6 pr-2 md:pr-4 bg-zinc-50">
                                        <div className={`h-full flex flex-col justify-center items-center p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
                            bg-zinc-900 text-white border-zinc-900 shadow-md
                            ${isToday
                                                ? 'shadow-xl shadow-zinc-300 scale-[1.02] ring-1 ring-zinc-900'
                                                : 'opacity-95 hover:opacity-100'
                                            }`}
                                        >
                                            {/* Accent Bar */}
                                            {isToday && <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400" />}

                                            <div className="flex flex-col items-center">
                                                {/* TEXTOS TODOS BRANCOS CONFORME SOLICITADO */}
                                                <span className={`text-[10px] uppercase font-bold tracking-widest mb-1 
                                    ${isToday ? 'text-yellow-400' : 'text-white'}`}>
                                                    {monthName}
                                                </span>
                                                <span className="text-3xl font-black leading-none mb-1 text-white">
                                                    {dayNumber}
                                                </span>
                                                <span className="text-xs font-bold uppercase tracking-wide text-white">
                                                    {day}
                                                </span>
                                            </div>

                                            {/* Indicator Dot */}
                                            <div className={`mt-3 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-yellow-400' : 'bg-zinc-700'}`} />

                                            {isToday && (
                                                <span className="absolute bottom-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest opacity-50">
                                                    Hoje
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Colunas de Horários para este dia */}
                                    <div className="flex gap-4 items-center">
                                        {TIME_SLOTS.map((time) => {
                                            const session = getClassForSlot(day, time);
                                            const isFull = session ? session.enrolled >= session.capacity : false;
                                            const isPast = isClassPast(day, time);

                                            // AULAS DADAS (PASSADAS) COM MESMO DESIGN DAS FUTURAS (BRANCO)
                                            const cardBg = 'bg-white';
                                            const cardBorder = isFull ? 'border-red-200' : 'border-zinc-200';
                                            const textColor = 'text-zinc-900';
                                            const subTextColor = 'text-zinc-500';
                                            const countBg = 'bg-zinc-50';
                                            const barColor = isFull ? 'bg-red-400' : 'bg-yellow-400';
                                            const studentDot = 'bg-zinc-400';
                                            const studentText = 'text-zinc-700';

                                            return (
                                                <div
                                                    key={`${day}-${time}`}
                                                    className={`w-[220px] shrink-0 h-64 relative group transition-all duration-300`}
                                                >
                                                    {session ? (
                                                        // Card de Aula
                                                        <div className={`h-full p-3 rounded-2xl border flex flex-col relative overflow-hidden transition-all
                                            ${cardBg} ${cardBorder} hover:shadow-lg shadow-sm hover:border-yellow-400`}
                                                        >
                                                            {/* Faixa lateral de status */}
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`} />

                                                            {/* Header do Card - REMOVIDO BOTÃO DE LIXEIRA */}
                                                            <div className="pl-3 flex justify-end items-start mb-2">
                                                                <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${countBg} ${isFull ? 'text-red-600' : subTextColor}`}>
                                                                    <Users className="w-3 h-3" />
                                                                    <span>
                                                                        {session.enrolled}/{session.capacity}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="pl-3 mb-2">
                                                                <p className={`text-sm font-bold truncate ${textColor}`}>{session.instructor}</p>
                                                            </div>

                                                            {/* Lista de Alunos Interativa - AGORA MAIS NÍTIDA */}
                                                            <div className="pl-3 flex-1 overflow-y-auto min-h-0 custom-scrollbar space-y-2 pr-1">
                                                                {session.students && session.students.length > 0 ? (
                                                                    session.students.map((studentName, idx) => {
                                                                        const waLink = getStudentPhoneLink(studentName);

                                                                        // Verifica se é aluno de reposição
                                                                        const isReplacement = replacements.some(r =>
                                                                            r.studentName === studentName &&
                                                                            r.targetClassId === session.id
                                                                        );

                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                className={`w-full flex items-center justify-between p-2 rounded-lg bg-zinc-100 
                                                                    ${isReplacement ? 'border-yellow-200 border-2' : 'border-zinc-200 hover:border-yellow-300'} 
                                                                    hover:bg-white hover:shadow-sm transition-all group/item relative`}
                                                                            >
                                                                                <div
                                                                                    className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleViewStudent(studentName, session.id);
                                                                                    }}
                                                                                >
                                                                                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${studentDot}`} />
                                                                                    <span className={`text-[11px] truncate ${studentText} font-semibold leading-tight`}>{studentName}</span>
                                                                                </div>

                                                                                <div className="flex items-center gap-1 shrink-0 relative z-10">
                                                                                    {/* Botão WhatsApp */}
                                                                                    {waLink && (
                                                                                        <a
                                                                                            href={waLink}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="p-1 text-green-500 hover:bg-green-100 rounded transition-colors"
                                                                                            title="WhatsApp"
                                                                                        >
                                                                                            <MessageCircle className="w-3 h-3" />
                                                                                        </a>
                                                                                    )}

                                                                                    {/* Botão Remover Aluno (REINTRODUZIDO PARA FACILITAR) */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleRemoveStudentFromClass(session.id, studentName);
                                                                                        }}
                                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors cursor-pointer"
                                                                                        title="Remover Aluno"
                                                                                    >
                                                                                        <X className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <span className="text-[10px] text-zinc-300 italic block text-center py-2">Vazio</span>
                                                                )}
                                                            </div>

                                                            {/* Botão Adicionar Aluno (Só aparece se não estiver lotado) */}
                                                            {!isFull && !isPast && (
                                                                <div className="pl-3 mt-2 border-t border-zinc-100 pt-2 relative z-10">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setClassIdToAddStudent(session.id);
                                                                            // Limpa estados ao abrir
                                                                            setStudentToAdd('');
                                                                            setShowStudentSuggestions(false);
                                                                        }}
                                                                        className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors uppercase tracking-wide border border-transparent hover:border-yellow-200"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        Adicionar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // Slot Vazio - ESTE BLOCO AGORA SERÁ RARAMENTE USADO POIS AS AULAS SÃO GERADAS AUTOMATICAMENTE
                                                        <button
                                                            onClick={() => !isPast && handleOpenNewClassModal(day, time)}
                                                            disabled={isPast}
                                                            className={`w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer
                                                ${isPast
                                                                    ? 'bg-zinc-100 border-zinc-200 cursor-not-allowed opacity-50'
                                                                    : 'bg-white border-zinc-300 text-zinc-300 hover:border-yellow-400 hover:bg-yellow-50/10 hover:text-yellow-600 group-hover:shadow-sm'}`}
                                                        >
                                                            {!isPast && (
                                                                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                                                                    <Plus className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal Detalhes do Aluno */}
            {viewingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => {
                            setViewingStudent(null);
                            setViewingClassId(null);
                        }}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-zinc-900 p-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">{viewingStudent.name}</h3>
                                <p className="text-zinc-400 text-sm mt-1">{viewingStudent.planCategory}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setViewingStudent(null);
                                    setViewingClassId(null);
                                }}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-1 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold mb-1">
                                        <Phone className="w-3 h-3" /> Contato
                                    </div>
                                    <p className="text-sm font-semibold">{viewingStudent.phone}</p>
                                </div>
                                <div className="flex-1 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold mb-1">
                                        <Clock className="w-3 h-3" /> Frequência
                                    </div>
                                    <p className="text-sm font-semibold">{viewingStudent.daysPerWeek}x na semana</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-900 mb-3 border-b border-zinc-100 pb-2">
                                    <Activity className="w-4 h-4 text-yellow-500" />
                                    Ficha de Anamnese
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Lesões / Restrições</p>
                                        <p className="text-sm text-zinc-800 bg-red-50 p-3 rounded-lg border border-red-100">
                                            {viewingStudent.anamnesis.injuries || "Nenhuma relatada"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Objetivos</p>
                                        <p className="text-sm text-zinc-600">
                                            {viewingStudent.anamnesis.goals || "Não informado"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Observações</p>
                                        <p className="text-sm text-zinc-600 italic">
                                            {viewingStudent.anamnesis.observations || "Nenhuma observação"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-50 p-4 border-t border-zinc-100 flex justify-between items-center gap-4">
                            {viewingClassId ? (
                                <button
                                    onClick={() => handleRemoveStudentFromClass(viewingClassId, viewingStudent.name)}
                                    className="px-4 py-2 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    <UserMinus className="w-4 h-4" />
                                    Remover desta aula
                                </button>
                            ) : (
                                <div></div> // Espaçador
                            )}

                            <button
                                onClick={() => {
                                    setViewingStudent(null);
                                    setViewingClassId(null);
                                }}
                                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-lg text-sm hover:bg-zinc-100 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Aluno na Aula (Com Autocomplete e Foco da Aula) */}
            {classIdToAddStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setClassIdToAddStudent(null)}
                    ></div>
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-visible animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-zinc-900">Incluir Aluno</h3>
                                <p className="text-xs text-zinc-500">Adicionar manualmente nesta aula</p>
                            </div>
                            <button onClick={() => setClassIdToAddStudent(null)} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Busca de Aluno */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Busque o Aluno</label>
                                <div ref={searchWrapperRef} className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 p-2.5 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none placeholder:text-zinc-400"
                                        placeholder="Digite o nome do aluno..."
                                        value={studentToAdd}
                                        onChange={(e) => {
                                            setStudentToAdd(e.target.value);
                                            setShowStudentSuggestions(true);
                                        }}
                                        onFocus={() => setShowStudentSuggestions(true)}
                                    />

                                    {/* Lista de Sugestões */}
                                    {showStudentSuggestions && studentToAdd && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {filteredStudentsForAdd.length > 0 ? (
                                                filteredStudentsForAdd.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setStudentToAdd(s.name);
                                                            setShowStudentSuggestions(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 flex items-center gap-2 text-zinc-700 border-b border-zinc-50 last:border-0"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        {s.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-xs text-zinc-400">
                                                    Nenhum aluno encontrado (ou já inscrito).
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 mt-2 italic">
                                    * Exibindo apenas alunos não inscritos nesta aula.
                                </p>
                            </div>

                            {/* Novo Campo: Foco da Aula */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
                                    <Target className="w-3 h-3" /> Foco da Aula (Opcional)
                                </label>
                                <textarea
                                    className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none placeholder:text-zinc-400 min-h-[80px]"
                                    placeholder="Ex: Ênfase em mobilidade de quadril, fortalecimento de core..."
                                    value={classFocusInput}
                                    onChange={(e) => setClassFocusInput(e.target.value)}
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">
                                    Este foco ficará salvo no histórico da aula para todos os alunos.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2 rounded-b-xl">
                            <button
                                onClick={() => setClassIdToAddStudent(null)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddStudentToClass}
                                disabled={!studentToAdd}
                                className="px-4 py-2 text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cadastrar Nova Aula */}
            {isClassModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsClassModalOpen(false)}
                    ></div>
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                            <div>
                                <h3 className="font-bold text-zinc-900">Nova Aula</h3>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                    <span className="font-semibold text-yellow-600 bg-yellow-50 px-1.5 rounded">Semana {selectedWeekId}</span>
                                    <span>•</span>
                                    <span>{newClassData.day} às {newClassData.time}</span>
                                </p>
                            </div>
                            <button onClick={() => setIsClassModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Instrutor</label>
                                {availableInstructors.length > 0 ? (
                                    <div className="relative">
                                        <select
                                            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none appearance-none"
                                            value={newClassData.instructor}
                                            onChange={e => setNewClassData({ ...newClassData, instructor: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {availableInstructors.map(teacher => (
                                                <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                        placeholder="Nome do Instrutor"
                                        value={newClassData.instructor}
                                        onChange={e => setNewClassData({ ...newClassData, instructor: e.target.value })}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Capacidade (Alunos)</label>
                                <input
                                    type="number"
                                    max={4}
                                    min={1}
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    value={newClassData.capacity}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        if (val > 4) return;
                                        setNewClassData({ ...newClassData, capacity: val })
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                            <button
                                onClick={() => setIsClassModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateClass}
                                disabled={!newClassData.instructor}
                                className="px-4 py-2 text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Criar Aula
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;