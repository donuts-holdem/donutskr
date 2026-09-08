-- DO:NUTS CLASS — PostgreSQL schema draft
-- 개발 시작용 초안. 운영 DB migration tool(Prisma/Drizzle/etc.)에 맞춰 변환.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','WITHDRAWN');
CREATE TYPE class_session_status AS ENUM ('SCHEDULED','IN_PROGRESS','COMPLETED');
CREATE TYPE meeting_host_type AS ENUM ('DONUTS','CLUB');
CREATE TYPE meeting_application_status AS ENUM ('APPLIED','CANCELLED');
CREATE TYPE xp_source_type AS ENUM ('CLASS_ATTENDANCE','DAILY_LEARNING','ADMIN_ADJUSTMENT');
CREATE TYPE daily_assignment_status AS ENUM ('ASSIGNED','STARTED','COMPLETED');

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  school_id uuid REFERENCES schools(id),
  other_school_name text,
  status user_status NOT NULL DEFAULT 'PENDING',
  consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_id uuid REFERENCES schools(id),
  description text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_memberships (
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id,user_id)
);

CREATE TABLE club_leaders (
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_admin_id uuid REFERENCES admin_accounts(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id,user_id)
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  place text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE class_memberships (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id,user_id)
);

CREATE TABLE class_leaders (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_admin_id uuid REFERENCES admin_accounts(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id,user_id)
);

CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_no integer NOT NULL CHECK (session_no BETWEEN 1 AND 12),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status class_session_status NOT NULL DEFAULT 'SCHEDULED',
  cancelled boolean NOT NULL DEFAULT false,
  attendance_locked boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id,session_no)
);

CREATE TABLE class_attendance (
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT false,
  checked_by_user_id uuid REFERENCES users(id),
  checked_by_admin_id uuid REFERENCES admin_accounts(id),
  checked_at timestamptz,
  PRIMARY KEY(session_id,user_id)
);

CREATE TABLE signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_school_id uuid REFERENCES schools(id),
  requested_other_school text,
  requested_club_id uuid REFERENCES clubs(id),
  requested_class_id uuid REFERENCES classes(id),
  approved_by_user_id uuid REFERENCES users(id),
  approved_by_admin_id uuid REFERENCES admin_accounts(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_type meeting_host_type NOT NULL,
  host_club_id uuid REFERENCES clubs(id),
  created_by_user_id uuid REFERENCES users(id),
  created_by_admin_id uuid REFERENCES admin_accounts(id),
  title text NOT NULL,
  meeting_date date NOT NULL,
  meeting_time time NOT NULL,
  place text NOT NULL,
  description text NOT NULL DEFAULT '',
  guest_allowed boolean NOT NULL DEFAULT false,
  application_enabled boolean NOT NULL DEFAULT true,
  application_closed boolean NOT NULL DEFAULT false,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  hot boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  archive_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((host_type='DONUTS' AND host_club_id IS NULL) OR (host_type='CLUB' AND host_club_id IS NOT NULL))
);

CREATE TABLE meeting_applications (
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status meeting_application_status NOT NULL DEFAULT 'APPLIED',
  applied_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  PRIMARY KEY(meeting_id,user_id)
);

CREATE INDEX meetings_active_sort_idx ON meetings(archived, hot DESC, meeting_date, meeting_time);
CREATE INDEX meeting_applications_status_idx ON meeting_applications(meeting_id,status);

CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  logo_url text,
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- XP ledger
CREATE TABLE xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type xp_source_type NOT NULL,
  source_id uuid,
  amount integer NOT NULL,
  reason text NOT NULL,
  idempotency_key text UNIQUE NOT NULL,
  created_by_admin_id uuid REFERENCES admin_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xp_user_created_idx ON xp_transactions(user_id,created_at DESC);

-- Daily learning
CREATE TABLE learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key date,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  published_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  difficulty text,
  prompt text NOT NULL,
  explanation text NOT NULL,
  source_label text,
  source_version text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  content text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  UNIQUE(question_id,option_key)
);

CREATE TABLE lesson_questions (
  lesson_id uuid NOT NULL REFERENCES learning_lessons(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  PRIMARY KEY(lesson_id,question_id)
);

CREATE TABLE daily_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key date NOT NULL,
  lesson_id uuid NOT NULL REFERENCES learning_lessons(id),
  status daily_assignment_status NOT NULL DEFAULT 'ASSIGNED',
  completed_at timestamptz,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,date_key)
);

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES daily_assignments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id),
  selected_option_id uuid NOT NULL REFERENCES quiz_options(id),
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id,question_id)
);

CREATE TABLE learning_streaks (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completed_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Recommended integrity rule:
-- ensure exactly one correct option per question at application/publish validation time.
