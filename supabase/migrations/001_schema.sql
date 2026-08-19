-- ============================================================
-- HomeschoolCompliance Pack (slug: homeschoolcompliancepack)
-- Shared-database schema: every object is slug-prefixed.
-- Applies top-to-bottom in one pass on a fresh Supabase project.
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE homeschoolcompliancepack_regulation_level AS ENUM ('none','low','moderate','high');
CREATE TYPE homeschoolcompliancepack_requirement_type AS ENUM ('notice_of_intent','standardized_testing','portfolio_review','progress_report','curriculum_plan','instruction_hours','recordkeeping','other');
CREATE TYPE homeschoolcompliancepack_recurrence AS ENUM ('annual','quarterly','one_time','relative');
CREATE TYPE homeschoolcompliancepack_deadline_status AS ENUM ('upcoming','completed','dismissed');
CREATE TYPE homeschoolcompliancepack_document_type AS ENUM ('notice_of_intent','withdrawal_letter');
CREATE TYPE homeschoolcompliancepack_document_status AS ENUM ('draft','finalized');
CREATE TYPE homeschoolcompliancepack_payment_status AS ENUM ('pending','succeeded','failed','refunded');
CREATE TYPE homeschoolcompliancepack_subscription_status AS ENUM ('trialing','active','past_due','canceled','incomplete');
CREATE TYPE homeschoolcompliancepack_plan_interval AS ENUM ('one_time','month','year');

-- ---------- CATALOG TABLES (public read, no user columns) ----------
CREATE TABLE homeschoolcompliancepack_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (char_length(code) = 2),
  name text NOT NULL,
  regulation_level homeschoolcompliancepack_regulation_level NOT NULL,
  notice_required boolean NOT NULL DEFAULT false,
  testing_required boolean NOT NULL DEFAULT false,
  files_with text,
  summary text NOT NULL,
  statute_citation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_state_requirements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code text NOT NULL REFERENCES homeschoolcompliancepack_states(code) ON DELETE CASCADE,
  requirement_type homeschoolcompliancepack_requirement_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  recurrence homeschoolcompliancepack_recurrence NOT NULL DEFAULT 'annual',
  due_month int CHECK (due_month BETWEEN 1 AND 12),
  due_day int CHECK (due_day BETWEEN 1 AND 31),
  due_rule text,
  applies_grades text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  plan_interval homeschoolcompliancepack_plan_interval NOT NULL DEFAULT 'one_time',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- PROFILES ----------
CREATE TABLE homeschoolcompliancepack_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  state_code text REFERENCES homeschoolcompliancepack_states(code),
  mailing_address text,
  school_district text,
  school_year_start_month int NOT NULL DEFAULT 8 CHECK (school_year_start_month BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- USER-OWNED CORE TABLES ----------
CREATE TABLE homeschoolcompliancepack_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'homeschoolcompliancepack',
  first_name text NOT NULL,
  last_name text,
  birth_date date,
  grade_level text CHECK (grade_level IS NULL OR grade_level IN ('PK','K','1','2','3','4','5','6','7','8','9','10','11','12')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_deadlines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'homeschoolcompliancepack',
  student_id uuid REFERENCES homeschoolcompliancepack_students(id) ON DELETE SET NULL,
  requirement_id uuid REFERENCES homeschoolcompliancepack_state_requirements(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  school_year text NOT NULL CHECK (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  due_date date NOT NULL,
  remind_at date GENERATED ALWAYS AS (due_date - 14) STORED,
  reminder_sent_at timestamptz,
  status homeschoolcompliancepack_deadline_status NOT NULL DEFAULT 'upcoming',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'homeschoolcompliancepack',
  state_code text NOT NULL REFERENCES homeschoolcompliancepack_states(code),
  doc_type homeschoolcompliancepack_document_type NOT NULL DEFAULT 'notice_of_intent',
  school_year text NOT NULL CHECK (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  title text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  body text,
  status homeschoolcompliancepack_document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- BILLING TABLES (written by service role via webhook) ----------
CREATE TABLE homeschoolcompliancepack_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'homeschoolcompliancepack',
  plan_key text NOT NULL DEFAULT 'complete' REFERENCES homeschoolcompliancepack_plans(key),
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status homeschoolcompliancepack_payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'homeschoolcompliancepack',
  plan_key text REFERENCES homeschoolcompliancepack_plans(key),
  stripe_customer_id text,
  stripe_subscription_id text,
  status homeschoolcompliancepack_subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homeschoolcompliancepack_stripe_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- FUNCTIONS & TRIGGERS ----------
CREATE OR REPLACE FUNCTION homeschoolcompliancepack_update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION homeschoolcompliancepack_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.homeschoolcompliancepack_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER homeschoolcompliancepack_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_handle_new_user();

CREATE TRIGGER homeschoolcompliancepack_states_touch BEFORE UPDATE ON homeschoolcompliancepack_states FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_state_requirements_touch BEFORE UPDATE ON homeschoolcompliancepack_state_requirements FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_plans_touch BEFORE UPDATE ON homeschoolcompliancepack_plans FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_profiles_touch BEFORE UPDATE ON homeschoolcompliancepack_profiles FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_students_touch BEFORE UPDATE ON homeschoolcompliancepack_students FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_deadlines_touch BEFORE UPDATE ON homeschoolcompliancepack_deadlines FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_documents_touch BEFORE UPDATE ON homeschoolcompliancepack_documents FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_payments_touch BEFORE UPDATE ON homeschoolcompliancepack_payments FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_subscriptions_touch BEFORE UPDATE ON homeschoolcompliancepack_subscriptions FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();
CREATE TRIGGER homeschoolcompliancepack_stripe_events_touch BEFORE UPDATE ON homeschoolcompliancepack_stripe_events FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_update_updated_at();

-- ---------- INDEXES ----------
CREATE INDEX homeschoolcompliancepack_state_requirements_state_idx ON homeschoolcompliancepack_state_requirements (state_code);
CREATE INDEX homeschoolcompliancepack_profiles_state_idx ON homeschoolcompliancepack_profiles (state_code);
CREATE INDEX homeschoolcompliancepack_students_user_idx ON homeschoolcompliancepack_students (user_id);
CREATE INDEX homeschoolcompliancepack_deadlines_user_idx ON homeschoolcompliancepack_deadlines (user_id);
CREATE INDEX homeschoolcompliancepack_deadlines_student_idx ON homeschoolcompliancepack_deadlines (student_id);
CREATE INDEX homeschoolcompliancepack_deadlines_requirement_idx ON homeschoolcompliancepack_deadlines (requirement_id);
CREATE INDEX homeschoolcompliancepack_deadlines_user_due_idx ON homeschoolcompliancepack_deadlines (user_id, due_date);
CREATE INDEX homeschoolcompliancepack_deadlines_reminder_idx ON homeschoolcompliancepack_deadlines (remind_at) WHERE reminder_sent_at IS NULL AND status = 'upcoming';
CREATE INDEX homeschoolcompliancepack_documents_user_idx ON homeschoolcompliancepack_documents (user_id);
CREATE INDEX homeschoolcompliancepack_documents_state_idx ON homeschoolcompliancepack_documents (state_code);
CREATE INDEX homeschoolcompliancepack_payments_user_idx ON homeschoolcompliancepack_payments (user_id);
CREATE INDEX homeschoolcompliancepack_payments_plan_idx ON homeschoolcompliancepack_payments (plan_key);
CREATE INDEX homeschoolcompliancepack_payments_succeeded_idx ON homeschoolcompliancepack_payments (user_id) WHERE status = 'succeeded';
CREATE UNIQUE INDEX homeschoolcompliancepack_payments_intent_key ON homeschoolcompliancepack_payments (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX homeschoolcompliancepack_payments_session_key ON homeschoolcompliancepack_payments (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX homeschoolcompliancepack_subscriptions_user_idx ON homeschoolcompliancepack_subscriptions (user_id);
CREATE INDEX homeschoolcompliancepack_subscriptions_plan_idx ON homeschoolcompliancepack_subscriptions (plan_key);
CREATE INDEX homeschoolcompliancepack_subscriptions_active_idx ON homeschoolcompliancepack_subscriptions (user_id) WHERE status = 'active';
CREATE UNIQUE INDEX homeschoolcompliancepack_subscriptions_sub_key ON homeschoolcompliancepack_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ---------- ROW LEVEL SECURITY ----------
ALTER TABLE homeschoolcompliancepack_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_state_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschoolcompliancepack_stripe_events ENABLE ROW LEVEL SECURITY;

-- Public catalog reads (declared in manifest as public_content_tables)
CREATE POLICY "homeschoolcompliancepack_states_public_read" ON homeschoolcompliancepack_states
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "homeschoolcompliancepack_state_requirements_public_read" ON homeschoolcompliancepack_state_requirements
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "homeschoolcompliancepack_plans_public_read" ON homeschoolcompliancepack_plans
  FOR SELECT TO anon, authenticated USING (true);

-- Admin catalog maintenance
CREATE POLICY "homeschoolcompliancepack_states_admin" ON homeschoolcompliancepack_states
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "homeschoolcompliancepack_state_requirements_admin" ON homeschoolcompliancepack_state_requirements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "homeschoolcompliancepack_plans_admin" ON homeschoolcompliancepack_plans
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM homeschoolcompliancepack_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Owner policies
CREATE POLICY "homeschoolcompliancepack_profiles_owner" ON homeschoolcompliancepack_profiles
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "homeschoolcompliancepack_students_owner" ON homeschoolcompliancepack_students
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack')
  WITH CHECK (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack');
CREATE POLICY "homeschoolcompliancepack_deadlines_owner" ON homeschoolcompliancepack_deadlines
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack')
  WITH CHECK (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack');
CREATE POLICY "homeschoolcompliancepack_documents_owner" ON homeschoolcompliancepack_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack')
  WITH CHECK (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack');

-- Billing: owners read only; writes come from the service role webhook
CREATE POLICY "homeschoolcompliancepack_payments_owner_read" ON homeschoolcompliancepack_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack');
CREATE POLICY "homeschoolcompliancepack_subscriptions_owner_read" ON homeschoolcompliancepack_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'homeschoolcompliancepack');
-- stripe_events: RLS enabled, no policies (service role only)

-- ---------- SEED: PLANS ----------
INSERT INTO homeschoolcompliancepack_plans (key, name, description, price_cents, currency, plan_interval, features, is_active, sort_order) VALUES
('free', 'Free Preview', 'Browse your state''s homeschool requirements and see a sample compliance calendar.', 0, 'usd', 'one_time', '["Requirement summaries for all 50 states and DC","Regulation level guide","Sample compliance calendar"]'::jsonb, true, 1),
('complete', 'Compliance Pack', 'One flat price for a full compliance toolkit built around your state.', 2900, 'usd', 'one_time', '["Pre-filled notice of intent for your state","Personal calendar of every filing and testing date","Dashboard reminders two weeks before each deadline","Unlimited students","Updates to your state''s requirements included"]'::jsonb, true, 2);

-- ---------- SEED: STATES ----------
INSERT INTO homeschoolcompliancepack_states (code, name, regulation_level, notice_required, testing_required, files_with, summary, statute_citation) VALUES
('AK','Alaska','none',false,false,NULL,'No notice or reporting is required to homeschool in Alaska.',NULL),
('AL','Alabama','low',true,false,'church school or local superintendent','Homeschool through a church school enrollment or a certified private tutor; the school files enrollment with the local superintendent.',NULL),
('AR','Arkansas','low',true,false,'local superintendent','File a written notice of intent with your local superintendent by August 15 each year.',NULL),
('AZ','Arizona','low',true,false,'county school superintendent','File a one-time affidavit of intent with the county school superintendent within 30 days of starting.',NULL),
('CA','California','low',true,false,'California Department of Education','File a Private School Affidavit each year during the October 1 to 15 window.','Cal. Educ. Code § 33190'),
('CO','Colorado','moderate',true,true,'local school district','Give the district 14 days notice before starting each year and test or evaluate in grades 3, 5, 7, 9, and 11.','C.R.S. § 22-33-104.5'),
('CT','Connecticut','none',false,false,NULL,'No filing is required; keeping a portfolio of work is recommended under state guidelines.',NULL),
('DC','District of Columbia','moderate',true,false,'Office of the State Superintendent of Education','File a notice of intent with OSSE by August 15 and keep a portfolio of your student''s work.',NULL),
('DE','Delaware','low',true,false,'Delaware Department of Education','Register your homeschool and report enrollment each fall through the state online system.',NULL),
('FL','Florida','moderate',true,true,'district superintendent','File a notice of intent within 30 days of starting and complete an annual evaluation each year.','Fla. Stat. § 1002.41'),
('GA','Georgia','moderate',true,true,'Georgia Department of Education','Submit a declaration of intent by September 1 or within 30 days of starting, write an annual progress report, and test every three years beginning in grade 3.',NULL),
('HI','Hawaii','moderate',true,true,'local school principal','File Form 4140 with your local school before starting, submit an annual progress report, and test in grades 3, 5, 8, and 10.',NULL),
('IA','Iowa','none',false,false,NULL,'Independent private instruction requires no notice, testing, or reporting.',NULL),
('ID','Idaho','none',false,false,NULL,'No notice or reporting is required to homeschool in Idaho.',NULL),
('IL','Illinois','none',false,false,NULL,'Homeschools operate as private schools with no registration or reporting required.',NULL),
('IN','Indiana','none',false,false,NULL,'No notice is required; keep attendance records equivalent to those of public schools.',NULL),
('KS','Kansas','low',true,false,'Kansas State Department of Education','Register your homeschool once as a nonaccredited private school with the state.',NULL),
('KY','Kentucky','low',true,false,'local board of education','Send a letter to your local board of education within two weeks of the start of each school year.',NULL),
('LA','Louisiana','moderate',true,false,'Louisiana Department of Education','Apply for home study approval within 15 days of starting and renew the application each year.',NULL),
('MA','Massachusetts','high',true,true,'local school committee or superintendent','Submit your education plan for approval before starting each year and report progress as agreed with your district.','Care and Protection of Charles, 399 Mass. 324 (1987)'),
('MD','Maryland','moderate',true,false,'local superintendent','File a notice of consent 15 days before starting and make your portfolio available for district review.','COMAR 13A.10.01'),
('ME','Maine','moderate',true,true,'local superintendent and Maine DOE','File a notice within 10 days of starting, then send an annual letter with assessment results by September 1.',NULL),
('MI','Michigan','none',false,false,NULL,'No notice or reporting is required under the home education option.',NULL),
('MN','Minnesota','moderate',true,true,'local superintendent','Submit your initial report by October 1 and administer a nationally normed test each year.',NULL),
('MO','Missouri','none',false,false,NULL,'No notice is required; log 1,000 hours of instruction per year and keep a record book.','Mo. Rev. Stat. § 167.031'),
('MS','Mississippi','low',true,false,'school attendance officer','File a certificate of enrollment with your county attendance officer by September 15 each year.',NULL),
('MT','Montana','low',true,false,'county superintendent','Notify the county superintendent at the start of each school year and keep attendance and immunization records.',NULL),
('NC','North Carolina','moderate',true,true,'NC Division of Non-Public Education','File a notice of intent when opening your school, keep attendance and immunization records, and administer an annual standardized test.','N.C. Gen. Stat. § 115C-563'),
('ND','North Dakota','moderate',true,true,'local superintendent','File a statement of intent 14 days before starting each year and test in grades 4, 6, 8, and 10.',NULL),
('NE','Nebraska','low',true,false,'Nebraska Department of Education','File the annual exemption paperwork with the state before the school year begins.',NULL),
('NH','New Hampshire','moderate',true,true,'participating agency','Notify a participating agency within 5 business days of starting and complete an annual evaluation by July 1.',NULL),
('NJ','New Jersey','none',false,false,NULL,'No notice, testing, or reporting is required to homeschool in New Jersey.',NULL),
('NM','New Mexico','low',true,false,'New Mexico Public Education Department','File a notice of establishment within 30 days of starting and renew your notification each school year.',NULL),
('NV','Nevada','low',true,false,'local school district','File a one-time notice of intent with your local district; no renewals, testing, or reporting after that.','Nev. Rev. Stat. § 388D.020'),
('NY','New York','high',true,true,'district superintendent','File a notice of intent by July 1, submit an IHIP, send four quarterly reports, and file an annual assessment.','8 NYCRR § 100.10'),
('OH','Ohio','low',true,false,'district superintendent','Notify your district superintendent by August 30 or within 5 days of withdrawing from school; renew each year.','Ohio Rev. Code § 3321.042'),
('OK','Oklahoma','none',false,false,NULL,'No notice or reporting is required; homeschooling is protected by the state constitution.',NULL),
('OR','Oregon','moderate',true,true,'education service district','File a one-time notice with your education service district and test in grades 3, 5, 8, and 10.',NULL),
('PA','Pennsylvania','high',true,true,'district superintendent','File a notarized affidavit by August 1 each year, keep a portfolio, and submit a certified evaluation by June 30.','24 P.S. § 13-1327.1'),
('RI','Rhode Island','high',true,false,'local school committee','Obtain approval from your local school committee before starting and keep an attendance register.','R.I. Gen. Laws § 16-19-2'),
('SC','South Carolina','moderate',true,false,'homeschool association or district','Homeschool through district approval or a homeschool association and keep the required records and portfolio.',NULL),
('SD','South Dakota','low',true,false,'South Dakota Department of Education','File a one-time public school exemption form with the state.',NULL),
('TN','Tennessee','moderate',true,true,'director of schools','Register with your district or an umbrella school by August 1 and test in grades 5, 7, and 9 under the independent option.',NULL),
('TX','Texas','none',false,false,NULL,'No notice or reporting is required; teach reading, spelling, grammar, math, and good citizenship from a written curriculum.','Leeper v. Arlington ISD (Tex. 1994)'),
('UT','Utah','low',true,false,'local school board','File a one-time notice of intent affidavit with your local school board.',NULL),
('VA','Virginia','moderate',true,true,'division superintendent','File a notice of intent by August 15 and submit evidence of progress by August 1 the following year.','Va. Code § 22.1-254.1'),
('VT','Vermont','high',true,true,'Vermont Agency of Education','File an enrollment notice with the Agency of Education each year and submit an end of year assessment.','16 V.S.A. § 166b'),
('WA','Washington','moderate',true,true,'local superintendent','File an annual declaration of intent by September 15, meet parent qualifications, and test or assess each year.','RCW 28A.200'),
('WI','Wisconsin','low',true,false,'Wisconsin Department of Public Instruction','File the PI-1206 homeschool report online by October 15 each year.','Wis. Stat. § 118.165'),
('WV','West Virginia','moderate',true,true,'county superintendent','File a notice of intent before starting and submit an academic assessment each year, with results filed by June 30 in grades 3, 5, 8, and 11.',NULL),
('WY','Wyoming','low',true,false,'local board of trustees','Submit your curriculum plan to the local school board each year before instruction begins.',NULL);

-- ---------- SEED: STATE REQUIREMENTS ----------
INSERT INTO homeschoolcompliancepack_state_requirements (state_code, requirement_type, title, description, recurrence, due_month, due_day, due_rule, applies_grades, sort_order) VALUES
('AK','recordkeeping','Keep basic records','No filings are required in Alaska. Keep attendance and samples of work for your own protection.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('AL','notice_of_intent','Enroll through a church school or tutor','Enroll your homeschool under a church school or use a certified private tutor. The school files the enrollment form with the superintendent.','annual',NULL,NULL,'At the start of each school year',NULL,1),
('AR','notice_of_intent','File your notice of intent','Deliver the written notice of intent to your local superintendent.','annual',8,15,'By August 15 each year',NULL,1),
('AZ','notice_of_intent','File the affidavit of intent','File the affidavit with your county school superintendent. One filing per child.','one_time',NULL,NULL,'Within 30 days of beginning instruction',NULL,1),
('CA','notice_of_intent','File the Private School Affidavit','File the PSA with the California Department of Education each fall.','annual',10,15,'File between October 1 and October 15',NULL,1),
('CO','notice_of_intent','File your notice of intent','Send written notice to a Colorado school district each year.','annual',NULL,NULL,'14 days before beginning instruction each year',NULL,1),
('CO','standardized_testing','Test or evaluate in required grades','Administer a nationally standardized test or have a qualified person evaluate progress.','relative',NULL,NULL,'During grades 3, 5, 7, 9, and 11','3,5,7,9,11',2),
('CT','recordkeeping','Maintain a portfolio','Keep a portfolio of attendance and work in line with state guidelines.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('DC','notice_of_intent','File your notice of intent with OSSE','File the notification form with the Office of the State Superintendent of Education.','annual',8,15,'By August 15, or 15 days before starting mid year',NULL,1),
('DC','recordkeeping','Keep a portfolio','Maintain a portfolio of instruction and work samples for possible review.','annual',NULL,NULL,'Ongoing through the school year',NULL,2),
('DE','notice_of_intent','Report fall enrollment','Report your homeschool enrollment to the Delaware Department of Education through the online system.','annual',9,30,'By September 30 each year',NULL,1),
('FL','notice_of_intent','File your notice of intent','Send a written notice to your district superintendent when you begin.','one_time',NULL,NULL,'Within 30 days of beginning instruction',NULL,1),
('FL','portfolio_review','Complete the annual evaluation','Have a certified teacher review the portfolio, administer a standardized test, or use another approved method.','annual',NULL,NULL,'By the anniversary date of your notice of intent',NULL,2),
('GA','notice_of_intent','File the declaration of intent','Submit the declaration to the Georgia Department of Education.','annual',9,1,'By September 1, or within 30 days of starting',NULL,1),
('GA','progress_report','Write the annual progress report','Write and keep a progress assessment for each student. You keep this on file.','annual',NULL,NULL,'At the end of each school year',NULL,2),
('GA','standardized_testing','Test every three years','Administer a nationally normed test beginning in grade 3 and every three years after.','relative',NULL,NULL,'Beginning in grade 3, then every three years','3,6,9,12',3),
('HI','notice_of_intent','File Form 4140','File the notice of intent with the principal of your local public school.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('HI','progress_report','Submit the annual progress report','Send the annual report to your local school.','annual',NULL,NULL,'At the end of each school year',NULL,2),
('HI','standardized_testing','Test in required grades','Administer the required assessment in grades 3, 5, 8, and 10.','relative',NULL,NULL,'During grades 3, 5, 8, and 10','3,5,8,10',3),
('IA','recordkeeping','Keep instruction records','Independent private instruction requires no filings. Keep records of instruction for your own protection.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('ID','recordkeeping','Keep basic records','No filings are required in Idaho. Keep attendance and samples of work for your own protection.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('IL','recordkeeping','Keep basic records','Homeschools operate as private schools with no registration. Keep records showing instruction in the required branches of education.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('IN','recordkeeping','Keep attendance records','Maintain attendance records equivalent to public school records and provide them if the state superintendent requests.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('KS','notice_of_intent','Register your school','Register the name and address of your nonaccredited private school with the Kansas State Department of Education.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('KY','notice_of_intent','Send your annual letter','Send a letter with student names, ages, and your address to your local board of education.','annual',NULL,NULL,'Within two weeks of the start of the school year',NULL,1),
('LA','notice_of_intent','Apply for home study approval','Submit the home study application to the Louisiana Department of Education and renew it each year.','annual',NULL,NULL,'Within 15 days of starting, then annually',NULL,1),
('MA','curriculum_plan','Submit your education plan','Submit your plan to the school committee or superintendent and receive approval.','annual',NULL,NULL,'Before beginning instruction each year',NULL,1),
('MA','progress_report','Report progress as agreed','Send progress reports, portfolio materials, or test results on the schedule set in your approval.','annual',NULL,NULL,'On the schedule agreed with your district',NULL,2),
('MD','notice_of_intent','File the notice of consent','File Form OF-2 with your local school system.','one_time',NULL,NULL,'15 days before beginning instruction',NULL,1),
('MD','portfolio_review','Be ready for portfolio review','Keep a portfolio of materials and make it available when the district requests a review, up to three times per year.','annual',NULL,NULL,'When requested by the district',NULL,2),
('ME','notice_of_intent','File your initial notice','Send the notice of intent to your superintendent and the Maine Department of Education.','one_time',NULL,NULL,'Within 10 days of beginning instruction',NULL,1),
('ME','progress_report','File the subsequent year letter','Send the annual letter with assessment results each year after your first.','annual',9,1,'By September 1 each year',NULL,2),
('MI','recordkeeping','Keep basic records','No filings are required under the home education option. Keep records of instruction in the required subjects.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('MN','notice_of_intent','Submit the initial report','Submit the full report to your local superintendent, then the shorter letter in later years.','annual',10,1,'By October 1 each year',NULL,1),
('MN','standardized_testing','Give the annual test','Administer a nationally normed standardized test each year.','annual',NULL,NULL,'Each school year',NULL,2),
('MO','instruction_hours','Log 1,000 instruction hours','Record at least 1,000 hours of instruction, with 600 in reading, math, language arts, science, and social studies, in a plan book or log.','annual',NULL,NULL,'Track from July 1 through June 30',NULL,1),
('MS','notice_of_intent','File the certificate of enrollment','File the certificate with your county school attendance officer.','annual',9,15,'By September 15 each year',NULL,1),
('MT','notice_of_intent','Notify the county superintendent','Send your annual notice to the county superintendent of schools.','annual',NULL,NULL,'At the start of each school year',NULL,1),
('MT','recordkeeping','Keep attendance and immunization records','Maintain attendance and immunization records and make them available on request.','annual',NULL,NULL,'Ongoing through the school year',NULL,2),
('NC','notice_of_intent','File your notice of intent','File the notice with the Division of Non-Public Education when you open your school.','one_time',NULL,NULL,'When opening your homeschool',NULL,1),
('NC','standardized_testing','Give the annual test','Administer a nationally standardized test each year and keep the results on file.','annual',NULL,NULL,'Each school year',NULL,2),
('NC','recordkeeping','Keep attendance and immunization records','Maintain attendance and immunization records for each student.','annual',NULL,NULL,'Ongoing through the school year',NULL,3),
('ND','notice_of_intent','File the statement of intent','File with your local superintendent each year.','annual',NULL,NULL,'14 days before beginning instruction each year',NULL,1),
('ND','standardized_testing','Test in required grades','Administer a standardized test in grades 4, 6, 8, and 10 unless you qualify for an exemption.','relative',NULL,NULL,'During grades 4, 6, 8, and 10','4,6,8,10',2),
('NE','notice_of_intent','File the exemption paperwork','File Form A and the required statements with the Nebraska Department of Education.','annual',8,1,'By August 1, or 30 days before starting mid year',NULL,1),
('NH','notice_of_intent','Notify a participating agency','Send written notice to your local superintendent or another participating agency.','one_time',NULL,NULL,'Within 5 business days of beginning instruction',NULL,1),
('NH','portfolio_review','Complete the annual evaluation','Evaluate each student by portfolio review or standardized test and keep the results.','annual',7,1,'By July 1 each year',NULL,2),
('NJ','recordkeeping','Keep basic records','No filings are required in New Jersey. Keep records showing instruction equivalent to public school.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('NM','notice_of_intent','File the notice of establishment','File with the Public Education Department online.','one_time',NULL,NULL,'Within 30 days of beginning instruction',NULL,1),
('NM','notice_of_intent','Renew your notification','Renotify the Public Education Department each school year.','annual',8,1,'By August 1 each year',NULL,2),
('NV','notice_of_intent','File your one-time notice','File the notice of intent with your local school district. No renewals are required.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('NY','notice_of_intent','File your notice of intent','Send written notice to your district superintendent.','annual',7,1,'By July 1, or within 14 days of starting mid year',NULL,1),
('NY','curriculum_plan','Submit the IHIP','Submit an Individualized Home Instruction Plan for each student.','annual',8,15,'Within four weeks of receiving the forms, or by August 15',NULL,2),
('NY','progress_report','File quarterly reports','Send four quarterly reports on the dates listed in your IHIP.','quarterly',NULL,NULL,'On the dates set in your IHIP',NULL,3),
('NY','standardized_testing','File the annual assessment','File a standardized test result or written narrative evaluation. Tests are required at least every other year in grades 4 through 8 and every year in grades 9 through 12.','annual',6,30,'By June 30 each year',NULL,4),
('OH','notice_of_intent','Notify your district','Send the annual notice to your district superintendent.','annual',8,30,'By August 30, or within 5 days of withdrawing from school',NULL,1),
('OK','recordkeeping','Keep basic records','No filings are required in Oklahoma. Keep attendance and samples of work for your own protection.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('OR','notice_of_intent','File your notice with the ESD','Send the one-time notice to your education service district.','one_time',NULL,NULL,'Within 10 days of beginning instruction',NULL,1),
('OR','standardized_testing','Test in required grades','Administer an approved test in grades 3, 5, 8, and 10 and keep the results.','relative',NULL,NULL,'During grades 3, 5, 8, and 10','3,5,8,10',2),
('PA','notice_of_intent','File the notarized affidavit','File the affidavit and objectives with your district superintendent.','annual',8,1,'By August 1, or before starting mid year',NULL,1),
('PA','portfolio_review','Submit the portfolio evaluation','Have an approved evaluator certify progress and send the evaluation to your superintendent.','annual',6,30,'By June 30 each year',NULL,2),
('PA','standardized_testing','Test in required grades','Include standardized test results in the portfolio in grades 3, 5, and 8.','relative',NULL,NULL,'During grades 3, 5, and 8','3,5,8',3),
('RI','notice_of_intent','Obtain school committee approval','Submit your homeschool program to the local school committee for approval each year.','annual',NULL,NULL,'Before beginning instruction each year',NULL,1),
('RI','recordkeeping','Keep the attendance register','Maintain an attendance register and make it available to the district.','annual',NULL,NULL,'Ongoing through the school year',NULL,2),
('SC','notice_of_intent','Choose your compliance option','Get district approval or join a homeschool association under Option 2 or Option 3.','annual',NULL,NULL,'Before the school year begins',NULL,1),
('SC','recordkeeping','Keep records and a portfolio','Keep a plan book, a portfolio with work samples, and attendance for 180 days of instruction.','annual',NULL,NULL,'Ongoing through the school year',NULL,2),
('SD','notice_of_intent','File the exemption form','File the public school exemption form with the Department of Education. One filing covers future years.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('TN','notice_of_intent','Register your homeschool','Register with your local director of schools or enroll through an umbrella school.','annual',8,1,'By August 1 each year',NULL,1),
('TN','standardized_testing','Test in required grades','Administer the state required test in grades 5, 7, and 9 under the independent option.','relative',NULL,NULL,'During grades 5, 7, and 9','5,7,9',2),
('TX','recordkeeping','Use a written curriculum','Teach reading, spelling, grammar, math, and good citizenship from a written curriculum. No filings are required.','annual',NULL,NULL,'Ongoing through the school year',NULL,1),
('UT','notice_of_intent','File the affidavit','File the one-time notice of intent affidavit with your local school board.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('VA','notice_of_intent','File your notice of intent','Send the notice and curriculum description to your division superintendent.','annual',8,15,'By August 15 each year',NULL,1),
('VA','standardized_testing','Submit evidence of progress','Send test results or an approved evaluation to your division superintendent.','annual',8,1,'By August 1 following each school year',NULL,2),
('VT','notice_of_intent','File the enrollment notice','Send the home study enrollment notice to the Agency of Education. Filings open March 1.','annual',NULL,NULL,'Before beginning instruction each year',NULL,1),
('VT','standardized_testing','Submit the end of year assessment','Send the assessment for each student at the end of the enrollment year.','annual',NULL,NULL,'At the end of each enrollment year',NULL,2),
('WA','notice_of_intent','File the declaration of intent','File with your local superintendent each year.','annual',9,15,'By September 15, or within two weeks of the start of any quarter',NULL,1),
('WA','other','Meet parent qualifications','Qualify by completing 45 college credit hours, a parent qualifying course, or supervision by a certified teacher.','one_time',NULL,NULL,'Before beginning instruction',NULL,2),
('WA','standardized_testing','Test or assess each year','Administer an approved test or have a qualified person assess progress, and keep the results.','annual',NULL,NULL,'Each school year',NULL,3),
('WI','notice_of_intent','File the PI-1206 report','File the homeschool report online with the Department of Public Instruction.','annual',10,15,'By October 15 each year',NULL,1),
('WV','notice_of_intent','File your notice of intent','File the notice with your county superintendent.','one_time',NULL,NULL,'Before beginning instruction',NULL,1),
('WV','standardized_testing','Complete the annual assessment','Assess each student annually. File results with the county for grades 3, 5, 8, and 11.','annual',6,30,'Results due June 30 for grades 3, 5, 8, and 11','3,5,8,11',2),
('WY','curriculum_plan','Submit your curriculum plan','Send your curriculum to the local board of trustees each year.','annual',NULL,NULL,'Before instruction begins each year',NULL,1);

-- ============================================================
-- CONSOLIDATED HARDENING & SHARED-INFRA BLOCK (rewrite of all
-- prior patch layers — one definition per object, all prefixed,
-- shapes match the runtime writers exactly)
-- ============================================================

-- 1) SECURITY: block role self-escalation through PostgREST.
--    auth.uid() IS NULL only in service-role / auth-trigger contexts,
--    so end-user sessions can never change role.
CREATE OR REPLACE FUNCTION homeschoolcompliancepack_guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'user';
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homeschoolcompliancepack_profiles_role_guard
  ON homeschoolcompliancepack_profiles;
CREATE TRIGGER homeschoolcompliancepack_profiles_role_guard
BEFORE INSERT OR UPDATE ON homeschoolcompliancepack_profiles
FOR EACH ROW EXECUTE FUNCTION homeschoolcompliancepack_guard_profile_role();

-- 2) PERFORMANCE: composite index for the hottest query pattern
--    (owner + school year, ordered by due date).
CREATE INDEX IF NOT EXISTS homeschoolcompliancepack_deadlines_user_year_due_idx
  ON homeschoolcompliancepack_deadlines (user_id, school_year, due_date);

-- 3) RATE LIMITING (slug-prefixed; shared-DB safe).
--    Backs lib/rate-limit.ts: one row per (bucket, rl_key, day); the RPC below
--    is the ONLY writer and performs an atomic upsert-increment in a single
--    round trip. RLS on with no policies = service role and the RPC only.
CREATE TABLE IF NOT EXISTS homeschoolcompliancepack_zo_rate_limits (
  bucket text NOT NULL,
  rl_key text NOT NULL,
  day date NOT NULL,
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, rl_key, day)
);

ALTER TABLE homeschoolcompliancepack_zo_rate_limits ENABLE ROW LEVEL SECURITY;
-- no policies: the SECURITY DEFINER RPC below is the sole sanctioned mutation path

CREATE OR REPLACE FUNCTION homeschoolcompliancepack_zo_rate_limit_bump(p_bucket text, p_rl_key text, p_day date)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO homeschoolcompliancepack_zo_rate_limits (bucket, rl_key, day, count)
  VALUES (p_bucket, p_rl_key, p_day, 1)
  ON CONFLICT (bucket, rl_key, day)
  DO UPDATE SET count = homeschoolcompliancepack_zo_rate_limits.count + 1, updated_at = now()
  RETURNING count
$$;

GRANT EXECUTE ON FUNCTION homeschoolcompliancepack_zo_rate_limit_bump(text, text, date) TO anon, authenticated, service_role;

-- 4) PRODUCT METRICS (slug-prefixed; shared-DB safe).
--    Columns match the two runtime writers exactly — lib/db/metrics.ts and
--    app/(auth)/auth/confirm/route.ts insert (product_slug, event, path).
--    RLS on with no policies: written/read via the service-role client only.
CREATE TABLE IF NOT EXISTS homeschoolcompliancepack_zo_product_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug text NOT NULL,
  event text NOT NULL,
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homeschoolcompliancepack_zo_product_metrics_event_created_idx
  ON homeschoolcompliancepack_zo_product_metrics (event, created_at DESC);

ALTER TABLE homeschoolcompliancepack_zo_product_metrics ENABLE ROW LEVEL SECURITY;