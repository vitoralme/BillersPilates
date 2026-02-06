# Biller's Pilates Studio 🧘‍♂️

Uma plataforma moderna e inteligente para a gestão completa de estúdios de Pilates, combinando controle administrativo com o poder da Inteligência Artificial.

<div align="center">
  <img width="100%" alt="Banner do Projeto" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 🚀 Sobre o Projeto

O **Biller's Pilates Studio** foi desenvolvido para simplificar a rotina administrativa de proprietários e instrutores de Pilates. O sistema oferece desde o controle básico de alunos e mensalidades até um inovador assistente de IA para planejamento de aulas.

## ✨ Funcionalidades Principais

- **📊 Dashboard Administrativo**: Visão geral de faturamento, estatísticas de alunos ativos/inativos e controle de despesas (fixas, variáveis e manutenção).
- **👥 Gestão de Alunos**: Cadastro completo, anamnese detalhada, controle de planos (mensal, trimestral, etc.), frequência e status de pagamento.
- **📅 Agenda Inteligente**: Grade de horários semanal dinâmica com controle de capacidade, instrutores responsáveis e alunos matriculados por slot.
- **🔄 Controle de Reposições**: Sistema para gerenciar faltas justificadas e agendamento de aulas de reposição de forma organizada.
- **🤖 Planejador de Aula com IA**: Integrado ao Google Gemini, gera sequências de exercícios personalizadas com base no nível dos alunos, equipamentos disponíveis e foco da sessão.
- **⚙️ Configurações de Professores**: Gestão de instrutores com suporte a diferentes modelos de remuneração (salário fixo ou comissão por aula).

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com as tecnologias mais modernas do ecossistema web:

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Inteligência Artificial**: [Google Gemini Pro API](https://ai.google.dev/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Gráficos**: [Recharts](https://recharts.org/)

## ⚙️ Como Executar o Projeto

### Pré-requisitos
- Node.js instalado
- Conta no Supabase
- Chave de API do Google Gemini

### Passo a Passo

1. **Clonar o repositório**:
   ```bash
   git clone <url-do-repositorio>
   cd billers-pilates-studio
   ```

2. **Instalar dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env.local` na raiz do projeto e adicione suas credenciais:
   ```env
   VITE_SUPABASE_URL=seu_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   VITE_GEMINI_API_KEY=sua_chave_do_gemini
   ```

4. **Configurar o Banco de Dados**:
   Utilize os arquivos SQL na raiz do projeto para criar as tabelas necessárias no seu projeto Supabase:
   - `supabase_setup.sql`: Estrutura das tabelas.
   - `fix_permissions.sql`: Políticas de segurança (RLS).

5. **Rodar a aplicação**:
   ```bash
   npm run dev
   ```
   O projeto estará disponível em `http://localhost:5173`.

---

Desenvolvido com foco em eficiência e tecnologia para estúdios de Pilates.
