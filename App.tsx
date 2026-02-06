import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Replacements from './components/Replacements';
import Settings from './components/Settings';
import Login from './components/Login';
import { MOCK_STUDENTS, WEEKLY_CLASSES, REPLACEMENT_REQUESTS } from './constants';
import { Student, Expense, TeacherConfig, ClassSession, ReplacementRequest } from './types';
import { Menu, Loader2 } from 'lucide-react';
import { dataService } from './services/dataService';
import { useEffect } from 'react';

// Função para gerar grade dinâmica baseada nos professores disponíveis
const generateScheduleFromTeachers = (teachers: TeacherConfig[]): ClassSession[] => {
  if (teachers.length === 0) return [];

  // Combina todos os professores em uma única string (ex: "Gabriela/Isabela")
  const combinedInstructorName = teachers.map(t => t.name).join('/');

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const startHour = 6;
  const endHour = 16;
  const weeks = [1, 2, 3, 4];

  const sessions: ClassSession[] = [];
  let idCounter = 1;

  weeks.forEach(weekId => {
    days.forEach((day, dayIndex) => {
      for (let h = startHour; h <= endHour; h++) {
        const time = `${h.toString().padStart(2, '0')}:00`;

        // Tipo de aula (exemplo)
        const type = h % 3 === 0 ? 'Mat' : 'Aparelhos';

        sessions.push({
          id: `gen-${idCounter++}`, // ID temporário
          weekId,
          day,
          time,
          instructor: combinedInstructorName, // Nome combinado fixo para todas as aulas
          capacity: 4,
          enrolled: 0,
          students: [],
          type
        });
      }
    });
  });

  return sessions;
};

const MOCK_EXPENSES: Expense[] = [
  { id: '1', description: 'Aluguel Sala', amount: 2500, date: '2023-10-05', category: 'Fixo' },
  { id: '2', description: 'Conta de Luz', amount: 350, date: '2023-10-10', category: 'Variável' },
  { id: '3', description: 'Material Limpeza', amount: 120, date: '2023-10-15', category: 'Variável' },
  { id: '4', description: 'Manutenção Reformer', amount: 450, date: '2023-10-20', category: 'Manutenção' },
];

const MOCK_TEACHERS: TeacherConfig[] = [
  { id: '1', name: 'Júlia', paymentType: 'commission', value: 40 },
  { id: '2', name: 'Pedro', paymentType: 'fixed', value: 2500 }
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Estado global
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [teachers, setTeachers] = useState<TeacherConfig[]>(MOCK_TEACHERS);
  const [classes, setClasses] = useState<ClassSession[]>(WEEKLY_CLASSES);
  const [replacements, setReplacements] = useState<ReplacementRequest[]>(REPLACEMENT_REQUESTS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Carregar dados do Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          dbStudents,
          dbExpenses,
          dbTeachers,
          dbClasses,
          dbReplacements
        ] = await Promise.all([
          dataService.fetchStudents(),
          dataService.fetchExpenses(),
          dataService.fetchTeachers(),
          dataService.fetchClasses(),
          dataService.fetchReplacements()
        ]);

        if (dbStudents.length > 0) setStudents(dbStudents);
        if (dbExpenses.length > 0) setExpenses(dbExpenses);

        let loadedTeachers = dbTeachers;
        if (dbTeachers.length > 0) {
          setTeachers(dbTeachers);
        } else {
          loadedTeachers = MOCK_TEACHERS; // Fallback se não tiver professores no banco
          setTeachers(MOCK_TEACHERS);
        }

        if (dbClasses.length > 0) {
          setClasses(dbClasses);
        } else {
          // SE NÃO TIVER AULAS NO BANCO: Gera grade vazia baseada nos professores reais
          // Gera slots para cada professor (Alternando horários para exemplo)
          const generated = generateScheduleFromTeachers(loadedTeachers);
          setClasses(generated);
        }

        if (dbReplacements.length > 0) setReplacements(dbReplacements);
      } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard students={students} expenses={expenses} setExpenses={setExpenses} teachers={teachers} />;
      case 'students':
        return <Students students={students} setStudents={setStudents} classes={classes} />;
      case 'schedule':
        return <Schedule classes={classes} setClasses={setClasses} students={students} replacements={replacements} />;
      case 'replacements':
        return (
          <Replacements
            replacements={replacements}
            setReplacements={setReplacements}
            classes={classes}
            setClasses={setClasses}
            students={students}
          />
        );
      case 'settings':
        return <Settings teachers={teachers} setTeachers={setTeachers} />;
      default:
        return <Dashboard students={students} expenses={expenses} setExpenses={setExpenses} teachers={teachers} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        <p className="text-zinc-500 font-medium animate-pulse">Carregando Studio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={() => setIsAuthenticated(false)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 
        md:ml-64 ensures content is pushed right on desktop where sidebar is fixed.
        On mobile (default), ml-0 allows content to use full width.
      */}
      <main className="md:ml-64 p-4 md:p-8 min-h-screen flex flex-col transition-all duration-300">

        {/* Header Mobile & Desktop */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-600 hover:bg-zinc-200 rounded-lg md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-zinc-900">
                {activeView === 'dashboard' && 'Visão Geral'}
                {activeView === 'students' && 'Gerenciar Alunos'}
                {activeView === 'schedule' && 'Agenda de Aulas'}
                {activeView === 'replacements' && 'Controle de Reposições'}
                {activeView === 'settings' && 'Configurações'}
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm mt-1">
                Bem-vindo ao painel do Studio.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Espaço para ações globais futuras */}
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 w-full max-w-[100vw] overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;