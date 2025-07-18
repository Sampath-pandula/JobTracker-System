-- Job Tracker Database Schema
-- Execute this SQL in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for regular users)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  user_metadata JSONB DEFAULT '{}'
);

-- Applications table (job applications from all users)
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_title VARCHAR NOT NULL,
  company VARCHAR NOT NULL,
  description TEXT,
  url VARCHAR,
  location VARCHAR,
  salary_info VARCHAR,
  application_type VARCHAR CHECK (application_type IN ('Easy Apply', 'Long Application', 'Manual Entry')),
  date_applied DATE NOT NULL,
  portal_used VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'applied' CHECK (status IN ('applied', 'interviewing', 'rejected', 'offer', 'withdrawn')),
  screenshot_url VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table (separate from regular users)
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  role VARCHAR DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}'
);

-- System logs table (for admin monitoring)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id VARCHAR REFERENCES admin_users(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application notes table (for detailed notes on applications)
CREATE TABLE IF NOT EXISTS application_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  note_type VARCHAR DEFAULT 'general' CHECK (note_type IN ('general', 'interview', 'follow_up', 'feedback')),
  title VARCHAR,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application status history table (for tracking status changes)
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  old_status VARCHAR,
  new_status VARCHAR NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_date_applied ON applications(date_applied);
CREATE INDEX IF NOT EXISTS idx_applications_portal_used ON applications(portal_used);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_application_notes_application_id ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_note_type ON application_notes(note_type);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_created_at ON application_status_history(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_applications
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_application_notes
    BEFORE UPDATE ON application_notes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Applications policies
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own applications" ON applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own applications" ON applications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own applications" ON applications
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Application notes policies
CREATE POLICY "Users can view own application notes" ON application_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_notes.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own application notes" ON application_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_notes.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own application notes" ON application_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_notes.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own application notes" ON application_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_notes.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

-- Application status history policies
CREATE POLICY "Users can view own application status history" ON application_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_status_history.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own application status history" ON application_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_status_history.application_id 
            AND applications.user_id::text = auth.uid()::text
        )
    );

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Admin access policies (bypass RLS for service role)
CREATE POLICY "Admin full access to users" ON users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
    );

CREATE POLICY "Admin full access to applications" ON applications
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.jwt() ->> 'email')
    );

-- Functions for common operations

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_applications', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE date_applied >= date_trunc('month', CURRENT_DATE)),
        'this_week', COUNT(*) FILTER (WHERE date_applied >= date_trunc('week', CURRENT_DATE)),
        'today', COUNT(*) FILTER (WHERE date_applied = CURRENT_DATE),
        'by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM applications
                WHERE user_id = user_uuid
                GROUP BY status
            ) sub
        ),
        'by_portal', (
            SELECT json_object_agg(portal_used, count)
            FROM (
                SELECT portal_used, COUNT(*) as count
                FROM applications
                WHERE user_id = user_uuid
                GROUP BY portal_used
            ) sub
        )
    ) INTO result
    FROM applications
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system-wide statistics (admin only)
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users),
        'total_applications', (SELECT COUNT(*) FROM applications),
        'active_users', (
            SELECT COUNT(DISTINCT user_id)
            FROM applications
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'new_users_this_month', (
            SELECT COUNT(*)
            FROM users
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        ),
        'applications_this_month', (
            SELECT COUNT(*)
            FROM applications
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        ),
        'top_portals', (
            SELECT json_agg(
                json_build_object(
                    'portal', portal_used,
                    'count', count,
                    'percentage', ROUND((count * 100.0 / total_apps), 2)
                )
            )
            FROM (
                SELECT 
                    portal_used,
                    COUNT(*) as count,
                    (SELECT COUNT(*) FROM applications) as total_apps
                FROM applications
                GROUP BY portal_used, total_apps
                ORDER BY count DESC
                LIMIT 10
            ) sub
        ),
        'status_distribution', (
            SELECT json_agg(
                json_build_object(
                    'status', status,
                    'count', count,
                    'percentage', ROUND((count * 100.0 / total_apps), 2)
                )
            )
            FROM (
                SELECT 
                    status,
                    COUNT(*) as count,
                    (SELECT COUNT(*) FROM applications) as total_apps
                FROM applications
                GROUP BY status, total_apps
                ORDER BY count DESC
            ) sub
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
    event_type_param VARCHAR,
    user_id_param UUID DEFAULT NULL,
    admin_id_param VARCHAR DEFAULT NULL,
    description_param TEXT DEFAULT NULL,
    metadata_param JSONB DEFAULT '{}'::JSONB,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO system_logs (
        event_type,
        user_id,
        admin_id,
        description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        event_type_param,
        user_id_param,
        admin_id_param,
        description_param,
        metadata_param,
        ip_address_param,
        user_agent_param
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- Insert some sample admin users
INSERT INTO admin_users (id, email, role) VALUES
    ('admin_admin', 'admin@jobtracker.com', 'super_admin'),
    ('admin_manager', 'manager@jobtracker.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Sample data for testing (remove in production)
-- INSERT INTO users (id, email) VALUES
--     ('00000000-0000-0000-0000-000000000001', 'test@example.com'),
--     ('00000000-0000-0000-0000-000000000002', 'demo@example.com')
-- ON CONFLICT (email) DO NOTHING;

-- Views for analytics

-- User analytics view
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    u.last_login,
    COUNT(a.id) as total_applications,
    COUNT(a.id) FILTER (WHERE a.created_at >= date_trunc('month', CURRENT_DATE)) as applications_this_month,
    COUNT(a.id) FILTER (WHERE a.status = 'offer') as offers_received,
    COUNT(a.id) FILTER (WHERE a.status = 'rejected') as rejections,
    COUNT(a.id) FILTER (WHERE a.status = 'interviewing') as active_interviews,
    CASE 
        WHEN COUNT(a.id) > 0 THEN ROUND((COUNT(a.id) FILTER (WHERE a.status = 'offer') * 100.0 / COUNT(a.id)), 2)
        ELSE 0 
    END as success_rate,
    MAX(a.created_at) as last_application_date,
    array_agg(DISTINCT a.portal_used) FILTER (WHERE a.portal_used IS NOT NULL) as portals_used
FROM users u
LEFT JOIN applications a ON u.id = a.user_id
GROUP BY u.id, u.email, u.created_at, u.last_login;

-- Application analytics view
CREATE OR REPLACE VIEW application_analytics AS
SELECT 
    DATE(a.date_applied) as application_date,
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE a.status = 'applied') as applied_count,
    COUNT(*) FILTER (WHERE a.status = 'interviewing') as interviewing_count,
    COUNT(*) FILTER (WHERE a.status = 'offer') as offer_count,
    COUNT(*) FILTER (WHERE a.status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE a.status = 'withdrawn') as withdrawn_count,
    COUNT(DISTINCT a.user_id) as unique_users,
    COUNT(DISTINCT a.company) as unique_companies,
    COUNT(DISTINCT a.portal_used) as unique_portals
FROM applications a
GROUP BY DATE(a.date_applied)
ORDER BY application_date DESC;

-- Portal performance view
CREATE OR REPLACE VIEW portal_performance AS
SELECT 
    a.portal_used,
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE a.status = 'offer') as offers,
    COUNT(*) FILTER (WHERE a.status = 'rejected') as rejections,
    COUNT(*) FILTER (WHERE a.status = 'interviewing') as interviews,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.status = 'offer') * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as success_rate,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE a.status IN ('interviewing', 'offer')) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as response_rate,
    COUNT(DISTINCT a.user_id) as unique_users,
    AVG(CASE WHEN a.status = 'offer' THEN EXTRACT(DAY FROM (a.updated_at - a.created_at)) END) as avg_days_to_offer
FROM applications a
GROUP BY a.portal_used
ORDER BY total_applications DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions for views
GRANT SELECT ON user_analytics TO service_role;
GRANT SELECT ON application_analytics TO service_role;
GRANT SELECT ON portal_performance TO service_role;

-- Comment on tables and important columns
COMMENT ON TABLE users IS 'Regular users of the job tracker system';
COMMENT ON TABLE applications IS 'Job applications tracked by users';
COMMENT ON TABLE admin_users IS 'Administrative users with system access';
COMMENT ON TABLE system_logs IS 'System events and audit trail';
COMMENT ON TABLE application_notes IS 'Detailed notes on job applications';
COMMENT ON TABLE application_status_history IS 'History of status changes for applications';

COMMENT ON COLUMN applications.application_type IS 'Type of application: Easy Apply, Long Application, or Manual Entry';
COMMENT ON COLUMN applications.status IS 'Current status: applied, interviewing, rejected, offer, withdrawn';
COMMENT ON COLUMN users.preferences IS 'JSON object storing user preferences and settings';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining admin permissions';

-- Create completion message
DO $$
BEGIN
    RAISE NOTICE 'Job Tracker database schema has been successfully created!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure your Supabase Auth settings';
    RAISE NOTICE '2. Set up your environment variables in your applications';
    RAISE NOTICE '3. Test the connection from your user and admin portals';
    RAISE NOTICE '4. Deploy your Chrome extension and web applications';
END $$;