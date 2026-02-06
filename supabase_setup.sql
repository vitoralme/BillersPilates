-- Create tables for Biller's Pilates Studio

-- 1. Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo',
    plan_category TEXT NOT NULL,
    days_per_week INTEGER NOT NULL,
    monthly_fee NUMERIC,
    last_payment_date DATE,
    plan_expiration_date DATE,
    payment_method TEXT,
    anamnesis JSONB DEFAULT '{}'::jsonb,
    join_date DATE DEFAULT CURRENT_DATE,
    fixed_schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Teachers (TeacherConfig) Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    payment_type TEXT NOT NULL, -- 'commission' or 'fixed'
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Class Sessions Table
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_id INTEGER NOT NULL, -- 1, 2, 3, or 4
    day TEXT NOT NULL, -- 'Segunda', 'Terça', etc.
    time TEXT NOT NULL,
    instructor TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    enrolled INTEGER DEFAULT 0,
    students TEXT[] DEFAULT ARRAY[]::TEXT[], -- Names of students
    type TEXT NOT NULL, -- 'Mat', 'Reformer', etc.
    session_focus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Replacement Requests Table
CREATE TABLE replacement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT NOT NULL,
    original_date DATE NOT NULL,
    requested_date DATE,
    target_class_id UUID REFERENCES class_sessions(id),
    status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Recusado'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Plan Configurations (Optional, if you want to store global settings)
CREATE TABLE plan_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    tiers JSONB NOT NULL, -- Array of {days, price}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replacement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_configs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users (simple for now)
-- You can refine this later if you have different user roles
CREATE POLICY "Enable all for authenticated users" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON teachers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON class_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON replacement_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON plan_configs FOR ALL TO authenticated USING (true);
