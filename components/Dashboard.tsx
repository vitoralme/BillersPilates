import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Wallet, Building2, Calendar, Circle, Plus, DollarSign, X, Check, ArrowUpRight, ArrowDownRight, CreditCard, Banknote } from 'lucide-react';
import { Student, StudentStatus, Expense, TeacherConfig } from '../types';
import { dataService } from '../services/dataService';
import { Loader2 } from 'lucide-react';

interface DashboardProps {
    students: Student[];
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    teachers: TeacherConfig[];
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    label: string;
    subLabel: string;
    amount: number;
    date: string;
    method: string;
}

interface TeacherEarning {
    id: string;
    name: string;
    fixed: number;
    commission: number;
    passThrough: number; // Repasse de musculação
    total: number;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CURRENT_DATE = new Date();
const CURRENT_REAL_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_REAL_MONTH = CURRENT_DATE.getMonth();
const YEARS = [CURRENT_REAL_YEAR - 1, CURRENT_REAL_YEAR, CURRENT_REAL_YEAR + 1];

const Dashboard: React.FC<DashboardProps> = ({ students, expenses, setExpenses, teachers }) => {
    const [selectedMonth, setSelectedMonth] = useState(CURRENT_REAL_MONTH);
    const [selectedYear, setSelectedYear] = useState(CURRENT_REAL_YEAR);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Fixo' });

    // Calcula os dados financeiros do mês selecionado
    const dashboardData = useMemo(() => {
        let revenueAparelhos = 0;
        let revenueMat = 0;
        let revenueMatCombo = 0;
        let revenueApparatusCombo = 0;

        // Receita "Pura" do Studio (base para comissões padrão)
        let revenueStudioBase = 0;
        // Receita de "Repasse" (Combos Musculação - não fica para empresa)
        let revenuePassThrough = 0;

        let totalRevenue = 0;
        let activeStudentsCount = 0;

        const transactionsList: Transaction[] = [];

        // Inicializa mapa de ganhos dos professores
        const earningsMap = new Map<string, TeacherEarning>();
        teachers.forEach(t => {
            earningsMap.set(t.id, {
                id: t.id,
                name: t.name,
                fixed: 0,
                commission: 0,
                passThrough: 0,
                total: 0
            });
        });

        // Receita (Alunos)
        students.forEach(student => {
            const joinDate = new Date(student.joinDate);
            const studentJoinMonth = joinDate.getMonth();
            const studentJoinYear = joinDate.getFullYear();

            // Verifica se o aluno é válido para este mês/ano
            const isAfterJoin = (selectedYear > studentJoinYear) || (selectedYear === studentJoinYear && selectedMonth >= studentJoinMonth);

            if (isAfterJoin && student.status === StudentStatus.ACTIVE) {
                const price = student.monthlyFee !== undefined ? student.monthlyFee : 0;

                if (student.planCategory === 'Aparelhos') {
                    revenueAparelhos += price;
                    revenueStudioBase += price;
                }
                else if (student.planCategory === 'Mat Pilates') {
                    revenueMat += price;
                    revenueStudioBase += price;
                }
                else if (student.planCategory === 'Mat Pilates + Musculação') {
                    revenueMatCombo += price;
                    revenuePassThrough += price;
                }
                else if (student.planCategory === 'Aparelhos + Musculação') {
                    revenueApparatusCombo += price;
                    revenuePassThrough += price;
                }

                totalRevenue += price;
                activeStudentsCount++;

                // Adiciona à lista de transações
                const paymentDay = new Date(student.lastPaymentDate).getDate();
                const displayDate = new Date(selectedYear, selectedMonth, paymentDay).toISOString().split('T')[0];

                transactionsList.push({
                    id: `inc-${student.id}`,
                    type: 'income',
                    label: student.name,
                    subLabel: student.planCategory,
                    amount: price,
                    date: displayDate,
                    method: student.paymentMethod
                });
            }
        });

        // Despesas Operacionais
        let operationalExpenses = 0;
        expenses.forEach(expense => {
            const d = new Date(expense.date);
            if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
                operationalExpenses += expense.amount;

                transactionsList.push({
                    id: `exp-${expense.id}`,
                    type: 'expense',
                    label: expense.description,
                    subLabel: expense.category,
                    amount: expense.amount,
                    date: expense.date,
                    method: 'Saída'
                });
            }
        });

        // Custo da Equipe (Professores)
        let teamFixedCost = 0;
        let teamCommissionCost = 0;

        // 1. Processamento Normal (Fixos e Comissões sobre Planos de Studio)
        teachers.forEach(teacher => {
            const earning = earningsMap.get(teacher.id)!;

            if (teacher.paymentType === 'fixed') {
                teamFixedCost += teacher.value;
                earning.fixed += teacher.value;
                earning.total += teacher.value;

                transactionsList.push({
                    id: `salary-${teacher.id}`,
                    type: 'expense',
                    label: `Salário: ${teacher.name}`,
                    subLabel: 'Pessoal (Fixo)',
                    amount: teacher.value,
                    date: new Date(selectedYear, selectedMonth, 5).toISOString().split('T')[0],
                    method: 'Transferência'
                });
            } else {
                // Comissão agora incide APENAS sobre a Receita do Studio (Mat/Aparelhos Puros)
                const commission = revenueStudioBase * (teacher.value / 100);
                teamCommissionCost += commission;

                earning.commission += commission;
                earning.total += commission;

                if (commission > 0) {
                    transactionsList.push({
                        id: `comm-${teacher.id}`,
                        type: 'expense',
                        label: `Comissão: ${teacher.name}`,
                        subLabel: `Pessoal (${teacher.value}% sobre Base)`,
                        amount: commission,
                        date: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0],
                        method: 'Transferência'
                    });
                }
            }
        });

        // 2. Processamento dos Combos (Musculação) - Split 80/20
        if (revenuePassThrough > 0 && teachers.length > 0) {
            const teacher1 = teachers[0];
            const teacher2 = teachers.length > 1 ? teachers[1] : null;

            const share80 = teacher2 ? revenuePassThrough * 0.8 : revenuePassThrough;
            const share20 = teacher2 ? revenuePassThrough * 0.2 : 0;

            // Atualiza Teacher 1
            const t1Earning = earningsMap.get(teacher1.id);
            if (t1Earning) {
                t1Earning.passThrough += share80;
                t1Earning.total += share80;
            }

            teamCommissionCost += share80;
            transactionsList.push({
                id: `pass-80-${teacher1.id}`,
                type: 'expense',
                label: `Repasse Musculação: ${teacher1.name}`,
                subLabel: teacher2 ? 'Split 80% (Planos Combo)' : 'Repasse Integral',
                amount: share80,
                date: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0],
                method: 'Repasse'
            });

            // Atualiza Teacher 2
            if (teacher2 && share20 > 0) {
                const t2Earning = earningsMap.get(teacher2.id);
                if (t2Earning) {
                    t2Earning.passThrough += share20;
                    t2Earning.total += share20;
                }

                teamCommissionCost += share20;
                transactionsList.push({
                    id: `pass-20-${teacher2.id}`,
                    type: 'expense',
                    label: `Repasse Musculação: ${teacher2.name}`,
                    subLabel: 'Split 20% (Planos Combo)',
                    amount: share20,
                    date: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0],
                    method: 'Repasse'
                });
            }
        }

        const totalTeamCost = teamFixedCost + teamCommissionCost;
        const totalExpenses = operationalExpenses + totalTeamCost;

        // Ordenar transações por dia
        transactionsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Cálculos Finais
        const studioNetProfit = totalRevenue - totalExpenses;

        const distributionData = [
            { name: 'Equipe', value: totalTeamCost, color: '#a1a1aa' },
            { name: 'Despesas Op.', value: operationalExpenses, color: '#f87171' },
            { name: 'Caixa (Lucro)', value: Math.max(0, studioNetProfit), color: '#facc15' }
        ];

        return {
            totalRevenue,
            revenueAparelhos,
            revenueMat,
            revenueMatCombo,
            revenueApparatusCombo,
            activeStudentsCount,
            totalExpenses,
            operationalExpenses,
            totalTeamCost,
            studioNetProfit,
            distributionData,
            transactionsList,
            teacherEarnings: Array.from(earningsMap.values())
        };
    }, [students, expenses, teachers, selectedMonth, selectedYear]);

    // Handler para criar despesa
    const handleCreateExpense = async () => {
        if (!newExpense.description || !newExpense.amount) return;
        setIsSavingExpense(true);

        try {
            const now = new Date();
            let dateStr = now.toISOString().split('T')[0];

            if (selectedMonth !== now.getMonth() || selectedYear !== now.getFullYear()) {
                const d = new Date(selectedYear, selectedMonth, 1);
                dateStr = d.toISOString().split('T')[0];
            }

            const expenseToSave: Partial<Expense> = {
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                date: dateStr,
                category: newExpense.category
            };

            // Salvar no Supabase
            await dataService.saveExpense(expenseToSave);

            // Atualizar estado local
            const refreshedExpenses = await dataService.fetchExpenses();
            setExpenses(refreshedExpenses);

            setIsExpenseModalOpen(false);
            setNewExpense({ description: '', amount: '', category: 'Fixo' });
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
            alert("Erro ao salvar despesa. Verifique a conexão.");
        } finally {
            setIsSavingExpense(false);
        }
    };

    const isFutureMonth = selectedYear > CURRENT_REAL_YEAR || (selectedYear === CURRENT_REAL_YEAR && selectedMonth > CURRENT_REAL_MONTH);

    return (
        <div className="space-y-6">
            {/* Filtros e Ações */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-zinc-600">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold text-sm">Competência:</span>
                </div>
                <div className="flex gap-4 w-full md:w-auto items-center">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="flex-1 md:w-40 p-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-24 p-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    >
                        {YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <div className="h-6 w-px bg-zinc-200 mx-2 hidden md:block"></div>

                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Faturamento Total */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${isFutureMonth ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-900 text-yellow-400'}`}>
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Faturamento Total</p>
                            <h3 className="text-2xl font-bold">R$ {dashboardData.totalRevenue.toLocaleString('pt-BR')}</h3>
                            <p className="text-xs text-zinc-400 mt-1">{dashboardData.activeStudentsCount} alunos ativos</p>
                        </div>
                    </div>
                </div>

                {/* Repasse Professor */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-100 rounded-lg text-zinc-500">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Custo Equipe</p>
                            <h3 className="text-2xl font-bold text-zinc-700">R$ {dashboardData.totalTeamCost.toLocaleString('pt-BR')}</h3>
                            <p className="text-xs text-zinc-400 mt-1">Salários + Repasses</p>
                        </div>
                    </div>
                </div>

                {/* Despesas */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <DollarSign className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-red-50 rounded-lg text-red-500 border border-red-100">
                            <TrendingUp className="w-6 h-6 rotate-180" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Despesas Totais</p>
                            <h3 className="text-2xl font-bold text-red-600">- R$ {dashboardData.totalExpenses.toLocaleString('pt-BR')}</h3>
                            <p className="text-xs text-zinc-400 mt-1">Operacionais + Equipe</p>
                        </div>
                    </div>
                </div>

                {/* Caixa Líquido */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building2 className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-lg ${dashboardData.studioNetProfit >= 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Caixa Líquido</p>
                            <h3 className={`text-2xl font-bold ${dashboardData.studioNetProfit >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                                R$ {dashboardData.studioNetProfit.toLocaleString('pt-BR')}
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">Lucro Real</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* GRÁFICO: Distribuição Financeira */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-lg font-bold">Distribuição Financeira</h2>
                            <p className="text-sm text-zinc-500">Para onde vai o dinheiro em {MONTHS[selectedMonth]}</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full flex items-center justify-center relative">
                        {dashboardData.totalRevenue > 0 || dashboardData.totalExpenses > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={90}
                                            outerRadius={120}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {dashboardData.distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '8px',
                                                border: '1px solid #e4e4e7',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            itemStyle={{ color: '#18181b', fontSize: '12px', fontWeight: 600 }}
                                            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Texto Central */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                                    <span className="text-xs text-zinc-400 uppercase font-bold tracking-widest block mb-1">Resultado</span>
                                    <span className={`text-2xl font-bold ${dashboardData.studioNetProfit >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                                        {dashboardData.totalRevenue > 0 ? ((dashboardData.studioNetProfit / dashboardData.totalRevenue) * 100).toFixed(1) : 0}%
                                    </span>
                                    <span className="text-[10px] text-zinc-400">Margem Líquida</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-400">
                                <div className="w-32 h-32 rounded-full border-4 border-zinc-100 mb-4 border-dashed"></div>
                                <p>Sem movimentação financeira</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resumo Lateral (Planos) */}
                <div className="bg-white text-zinc-900 p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Resumo do Mês
                    </h3>
                    <p className="text-zinc-500 text-xs mb-6 -mt-4">Origem do faturamento por modalidade</p>

                    <div className="space-y-6 flex-1">
                        <div>
                            <div className="flex justify-between text-sm text-zinc-500 mb-2">
                                <span>Pilates Aparelhos</span>
                                <span className="font-medium text-zinc-900">{dashboardData.totalRevenue > 0 ? ((dashboardData.revenueAparelhos / dashboardData.totalRevenue) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-2">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${dashboardData.totalRevenue > 0 ? (dashboardData.revenueAparelhos / dashboardData.totalRevenue) * 100 : 0}%` }}></div>
                            </div>
                            <p className="text-lg font-bold">R$ {dashboardData.revenueAparelhos.toLocaleString('pt-BR')}</p>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm text-zinc-500 mb-2">
                                <span>Mat Pilates</span>
                                <span className="font-medium text-zinc-900">{dashboardData.totalRevenue > 0 ? ((dashboardData.revenueMat / dashboardData.totalRevenue) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-2">
                                <div className="bg-zinc-400 h-1.5 rounded-full" style={{ width: `${dashboardData.totalRevenue > 0 ? (dashboardData.revenueMat / dashboardData.totalRevenue) * 100 : 0}%` }}></div>
                            </div>
                            <p className="text-lg font-bold">R$ {dashboardData.revenueMat.toLocaleString('pt-BR')}</p>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm text-zinc-500 mb-2">
                                <span>Mat + Musculação</span>
                                <span className="font-medium text-zinc-900">{dashboardData.totalRevenue > 0 ? ((dashboardData.revenueMatCombo / dashboardData.totalRevenue) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-2">
                                <div className="bg-zinc-600 h-1.5 rounded-full" style={{ width: `${dashboardData.totalRevenue > 0 ? (dashboardData.revenueMatCombo / dashboardData.totalRevenue) * 100 : 0}%` }}></div>
                            </div>
                            <p className="text-lg font-bold">R$ {dashboardData.revenueMatCombo.toLocaleString('pt-BR')}</p>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm text-zinc-500 mb-2">
                                <span>Aparelhos + Musculação</span>
                                <span className="font-medium text-zinc-900">{dashboardData.totalRevenue > 0 ? ((dashboardData.revenueApparatusCombo / dashboardData.totalRevenue) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-2">
                                <div className="bg-zinc-900 h-1.5 rounded-full" style={{ width: `${dashboardData.totalRevenue > 0 ? (dashboardData.revenueApparatusCombo / dashboardData.totalRevenue) * 100 : 0}%` }}></div>
                            </div>
                            <p className="text-lg font-bold">R$ {dashboardData.revenueApparatusCombo.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-500">Ticket Médio</span>
                            <span className="text-xl font-bold text-zinc-900">
                                R$ {dashboardData.activeStudentsCount > 0 ? (dashboardData.totalRevenue / dashboardData.activeStudentsCount).toFixed(0) : '0'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* NOVA SEÇÃO: PREVISÃO DE PAGAMENTOS */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                    <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-yellow-500" />
                        Previsão de Pagamentos
                    </h2>
                    <p className="text-sm text-zinc-500">Valores a pagar aos professores em {MONTHS[selectedMonth]}</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dashboardData.teacherEarnings.length > 0 ? (
                            dashboardData.teacherEarnings.map((teacher) => (
                                <div key={teacher.id} className="bg-zinc-50 rounded-xl border border-zinc-100 p-4 hover:border-yellow-300 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900">{teacher.name}</h4>
                                            <p className="text-xs text-zinc-500">Resumo de Ganhos</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {teacher.fixed > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">Salário Fixo</span>
                                                <span className="font-medium text-zinc-900">R$ {teacher.fixed.toLocaleString('pt-BR')}</span>
                                            </div>
                                        )}
                                        {teacher.commission > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">Comissão (Studio)</span>
                                                <span className="font-medium text-zinc-900">R$ {teacher.commission.toLocaleString('pt-BR')}</span>
                                            </div>
                                        )}
                                        {teacher.passThrough > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">Repasse (Musculação)</span>
                                                <span className="font-medium text-zinc-900">R$ {teacher.passThrough.toLocaleString('pt-BR')}</span>
                                            </div>
                                        )}
                                        {teacher.total === 0 && (
                                            <div className="text-center text-xs text-zinc-400 italic py-2">
                                                Sem ganhos previstos este mês.
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase text-zinc-400">Total a Pagar</span>
                                        <span className="text-lg font-bold text-green-600">R$ {teacher.total.toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 text-center text-zinc-400 py-4">
                                Nenhum professor cadastrado.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Extrato Detalhado */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900">Extrato Financeiro</h2>
                        <p className="text-sm text-zinc-500">Detalhamento de Entradas e Saídas em {MONTHS[selectedMonth]}</p>
                    </div>
                    <div className="flex gap-4 text-xs font-medium">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                            <ArrowUpRight className="w-3 h-3" />
                            Entradas
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                            <ArrowDownRight className="w-3 h-3" />
                            Saídas
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase text-xs border-b border-zinc-100">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição / Aluno</th>
                                <th className="px-6 py-4">Categoria / Método</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {dashboardData.transactionsList.length > 0 ? (
                                dashboardData.transactionsList.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                                            {new Date(tx.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tx.type === 'income' ? <Users className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900">{tx.label}</div>
                                                    <div className="text-xs text-zinc-400">{tx.subLabel}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-xs font-medium">
                                                {tx.method}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                            {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                                        Nenhuma transação registrada neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Nova Despesa */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsExpenseModalOpen(false)}
                    ></div>
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                            <h3 className="font-bold text-zinc-900">Lançar Despesa</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                                <input
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    placeholder="Ex: Conta de Luz, Material..."
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    placeholder="0,00"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
                                <select
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white text-zinc-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    <option value="Fixo">Custo Fixo</option>
                                    <option value="Variável">Custo Variável</option>
                                    <option value="Manutenção">Manutenção</option>
                                    <option value="Pessoal">Pessoal</option>
                                </select>
                            </div>
                            <div className="pt-2 text-xs text-zinc-400 italic">
                                * A despesa será lançada no mês de {MONTHS[selectedMonth]}.
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                            <button
                                onClick={() => setIsExpenseModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateExpense}
                                className="px-4 py-2 text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {isSavingExpense ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;