
import { Student, StudentStatus, FinancialRecord, ClassSession, ReplacementRequest } from './types';

export const MOCK_STUDENTS: Student[] = [];

export const FINANCIAL_DATA: FinancialRecord[] = [
  { month: 'Mai', revenue: 12500, expenses: 8000 },
  { month: 'Jun', revenue: 13200, expenses: 8200 },
  { month: 'Jul', revenue: 14800, expenses: 8500 },
  { month: 'Ago', revenue: 13900, expenses: 8100 },
  { month: 'Set', revenue: 15500, expenses: 9000 },
  { month: 'Out', revenue: 16200, expenses: 8800 },
];

// Helper para gerar aulas pré-criadas (Agora vazio para produção)
const generateFullSchedule = (): ClassSession[] => {
  return [];
};

export const WEEKLY_CLASSES: ClassSession[] = generateFullSchedule();

export const REPLACEMENT_REQUESTS: ReplacementRequest[] = [];

export const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];