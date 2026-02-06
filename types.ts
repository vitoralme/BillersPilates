
export enum StudentStatus {
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo',
  PENDING = 'Pendente'
}

export interface Anamnesis {
  injuries: string;
  goals: string;
  observations: string;
}

export interface ScheduleSlot {
  day: string;
  time: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: StudentStatus;
  planCategory: 'Aparelhos' | 'Mat Pilates' | 'Mat Pilates + Musculação' | 'Aparelhos + Musculação';
  daysPerWeek: number;
  monthlyFee?: number; // Added: Custom price per student
  lastPaymentDate: string;
  planExpirationDate: string;
  paymentMethod: string;
  anamnesis: Anamnesis;
  joinDate: string;
  fixedSchedule?: ScheduleSlot[]; // Novo campo: Horários fixos manuais
}

export interface FinancialRecord {
  month: string;
  revenue: number;
  expenses: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO Date YYYY-MM-DD
  category: string;
}

export interface ClassSession {
  id: string;
  weekId: number; // Added: 1, 2, 3, or 4
  day: string; // 'Segunda', 'Terça', etc.
  time: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  students: string[]; // Added: List of student names enrolled
  type: 'Mat' | 'Reformer' | 'Chair' | 'Aparelhos';
  sessionFocus?: string; // Novo campo: Foco da aula
}

export interface ReplacementRequest {
  id: string;
  studentName: string;
  originalDate: string;
  requestedDate?: string; // Optional because we might select a class directly
  targetClassId: string; // ID of the ClassSession
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  reason: string;
}

export interface AIClassPlan {
  title: string;
  duration: string;
  level: string;
  exercises: Array<{
    name: string;
    reps: string;
    notes: string;
  }>;
}

// Settings Types
export interface TeacherConfig {
  id: string;
  name: string;
  paymentType: 'commission' | 'fixed';
  value: number; // Percentage (if commission) or Amount (if fixed)
}

// Plan types removed as they are no longer used in Settings
export interface PlanTier {
  days: number;
  price: number;
}

export interface PlanConfig {
  category: 'Aparelhos' | 'Mat Pilates' | 'Mat Pilates + Musculação' | 'Aparelhos + Musculação';
  tiers: PlanTier[];
}