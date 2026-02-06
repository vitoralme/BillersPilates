import { supabase } from '../lib/supabase';
import { Student, Expense, TeacherConfig, ClassSession, ReplacementRequest } from '../types';

export const dataService = {
    // Students
    async fetchStudents(): Promise<Student[]> {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('name');

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            status: item.status,
            planCategory: item.plan_category,
            daysPerWeek: item.days_per_week,
            monthlyFee: item.monthly_fee,
            lastPaymentDate: item.last_payment_date,
            planExpirationDate: item.plan_expiration_date,
            paymentMethod: item.payment_method,
            anamnesis: item.anamnesis,
            joinDate: item.join_date,
            fixedSchedule: item.fixed_schedule
        }));
    },

    async saveStudent(student: Partial<Student>) {
        const payload = {
            name: student.name,
            email: student.email,
            phone: student.phone,
            status: student.status,
            plan_category: student.planCategory,
            days_per_week: student.daysPerWeek,
            monthly_fee: student.monthlyFee,
            last_payment_date: student.lastPaymentDate,
            plan_expiration_date: student.planExpirationDate,
            payment_method: student.paymentMethod,
            anamnesis: student.anamnesis,
            join_date: student.joinDate,
            fixed_schedule: student.fixedSchedule
        };

        if (student.id) {
            const { error } = await supabase
                .from('students')
                .update(payload)
                .eq('id', student.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('students')
                .insert([payload]);
            if (error) throw error;
        }
    },

    // Expenses
    async fetchExpenses(): Promise<Expense[]> {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    },

    async saveExpense(expense: Partial<Expense>) {
        if (expense.id) {
            const { error } = await supabase
                .from('expenses')
                .update(expense)
                .eq('id', expense.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('expenses')
                .insert([expense]);
            if (error) throw error;
        }
    },

    // Teachers
    async fetchTeachers(): Promise<TeacherConfig[]> {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .order('name');

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            name: item.name,
            paymentType: item.payment_type,
            value: item.value
        }));
    },

    async saveTeacher(teacher: Partial<TeacherConfig>) {
        const payload = {
            name: teacher.name,
            payment_type: teacher.paymentType,
            value: teacher.value
        };

        // Verifica se é um update de um registro existente (UUID válido)
        // UUID regex simples
        const isValidUUID = (id?: string) => {
            return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        };

        if (teacher.id && isValidUUID(teacher.id)) {
            const { error } = await supabase
                .from('teachers')
                .update(payload)
                .eq('id', teacher.id);
            if (error) throw error;
        } else {
            // Se não tem ID ou o ID é temporário (math.random), insere novo
            const { error } = await supabase
                .from('teachers')
                .insert([payload]);
            if (error) throw error;
        }
    },

    // Class Sessions
    async fetchClasses(): Promise<ClassSession[]> {
        const { data, error } = await supabase
            .from('class_sessions')
            .select('*');

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            weekId: item.week_id,
            day: item.day,
            time: item.time,
            instructor: item.instructor,
            capacity: item.capacity,
            enrolled: item.enrolled,
            students: item.students,
            type: item.type,
            sessionFocus: item.session_focus
        }));
    },

    // Replacement Requests
    async fetchReplacements(): Promise<ReplacementRequest[]> {
        const { data, error } = await supabase
            .from('replacement_requests')
            .select('*');

        if (error) throw error;

        return data.map(item => ({
            id: item.id,
            studentName: item.student_name,
            originalDate: item.original_date,
            requestedDate: item.requested_date,
            targetClassId: item.target_class_id,
            status: item.status,
            reason: item.reason
        }));
    }
};
