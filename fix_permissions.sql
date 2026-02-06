-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing restrictive policies (if they exist)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON teachers;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON class_sessions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON replacement_requests;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON plan_configs;

-- 2. Create new policies allowing access to the application (Anon Key)
-- Since we are handling login locally in the app, we need to allow the "anon" role to read/write.
CREATE POLICY "Allow access to anon" ON students FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to anon" ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to anon" ON teachers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to anon" ON class_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to anon" ON replacement_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to anon" ON plan_configs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Also allow "service_role" just in case you use it server-side later
CREATE POLICY "Allow access to service_role" ON students FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to service_role" ON expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to service_role" ON teachers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to service_role" ON class_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to service_role" ON replacement_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow access to service_role" ON plan_configs FOR ALL TO service_role USING (true) WITH CHECK (true);
