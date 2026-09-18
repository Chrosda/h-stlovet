-- PostgreSQL production foundation. NOT connected to the hosted D1 demonstration.
-- Monetary values are integer öre. Timestamps use timestamptz in production.
BEGIN;
CREATE TABLE household (id uuid PRIMARY KEY, owner_subject text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE parent_user (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, subject text UNIQUE NOT NULL, display_name text NOT NULL);
CREATE TABLE child_profile (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, nickname varchar(30) NOT NULL, phone text, token_hash text UNIQUE, token_expires_at timestamptz, session_version integer NOT NULL DEFAULT 0, deleted_at timestamptz);
CREATE TABLE challenge_template (id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, amount bigint NOT NULL CHECK(amount>0), description text NOT NULL);
CREATE TYPE challenge_status AS ENUM ('Assigned','Selected','Started','Claimed','Approved','Issuing','Delivered','Rejected','Failed','ManualReview');
CREATE TABLE assigned_challenge (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, child_id uuid NOT NULL REFERENCES child_profile, template_id text NOT NULL REFERENCES challenge_template, amount bigint NOT NULL CHECK(amount>0), status challenge_status NOT NULL DEFAULT 'Assigned', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE completion_claim (id uuid PRIMARY KEY, challenge_id uuid NOT NULL REFERENCES assigned_challenge, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE approval (id uuid PRIMARY KEY, challenge_id uuid UNIQUE NOT NULL REFERENCES assigned_challenge, parent_id uuid NOT NULL REFERENCES parent_user, idempotency_key text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE payment (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, amount bigint NOT NULL CHECK(amount>0), method text NOT NULL CHECK(method IN ('swish','card')), status text NOT NULL, idempotency_key text UNIQUE NOT NULL, provider_ref text UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ledger_transaction (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, idempotency_key text UNIQUE NOT NULL, available bigint NOT NULL DEFAULT 0, reserved bigint NOT NULL DEFAULT 0, spent bigint NOT NULL DEFAULT 0, refunded bigint NOT NULL DEFAULT 0, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE reward_order (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, challenge_id uuid UNIQUE NOT NULL REFERENCES assigned_challenge, idempotency_key text UNIQUE NOT NULL, status challenge_status NOT NULL DEFAULT 'Approved', attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, error_code text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE coupon (id uuid PRIMARY KEY, order_id uuid UNIQUE NOT NULL REFERENCES reward_order, provider_ref text UNIQUE NOT NULL, issuance_status text NOT NULL, redemption_status text NOT NULL DEFAULT 'not_redeemed');
CREATE TABLE notification (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, child_id uuid NOT NULL REFERENCES child_profile, order_id uuid REFERENCES reward_order, idempotency_key text UNIQUE NOT NULL, body text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_event (id uuid PRIMARY KEY, household_id uuid NOT NULL REFERENCES household, actor_id text NOT NULL, event text NOT NULL, reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE child_session (token_hash text PRIMARY KEY, child_id uuid NOT NULL REFERENCES child_profile, session_version integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE webhook_receipt (provider text NOT NULL, event_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(provider,event_id));
CREATE INDEX idx_ledger_household ON ledger_transaction(household_id);
CREATE INDEX idx_order_queue ON reward_order(status,next_attempt_at);
CREATE INDEX idx_challenge_child ON assigned_challenge(household_id,child_id,status);
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Append-only record'; END $$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON ledger_transaction FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_event FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE FUNCTION guard_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a bigint; r bigint; s bigint; f bigint;
BEGIN
 -- Serialize every journal write per household before checking aggregate balances.
 PERFORM 1 FROM household WHERE id=NEW.household_id FOR UPDATE;
 SELECT COALESCE(SUM(available),0),COALESCE(SUM(reserved),0),COALESCE(SUM(spent),0),COALESCE(SUM(refunded),0) INTO a,r,s,f FROM ledger_transaction WHERE household_id=NEW.household_id;
 IF a+NEW.available<0 OR r+NEW.reserved<0 OR s+NEW.spent<0 OR f+NEW.refunded<0 THEN RAISE EXCEPTION 'Insufficient funds'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER balance_guard BEFORE INSERT ON ledger_transaction FOR EACH ROW EXECUTE FUNCTION guard_balance();
CREATE FUNCTION approve_challenge(p_household uuid,p_parent uuid,p_challenge uuid,p_key text,p_approval uuid,p_order uuid,p_ledger uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE a assigned_challenge; existing_order uuid;
BEGIN
 PERFORM 1 FROM household WHERE id=p_household FOR UPDATE;
 IF NOT EXISTS (SELECT 1 FROM parent_user WHERE id=p_parent AND household_id=p_household) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT * INTO a FROM assigned_challenge WHERE id=p_challenge AND household_id=p_household FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown challenge'; END IF;
 SELECT id INTO existing_order FROM reward_order WHERE challenge_id=a.id;
 IF existing_order IS NOT NULL THEN RETURN existing_order; END IF;
 IF a.status<>'Claimed' THEN RAISE EXCEPTION 'Invalid challenge state'; END IF;
 INSERT INTO approval(id,challenge_id,parent_id,idempotency_key) VALUES(p_approval,a.id,p_parent,p_key);
 INSERT INTO ledger_transaction(id,household_id,idempotency_key,available,reserved,reason) VALUES(p_ledger,p_household,'reserve:'||a.id,-a.amount,a.amount,'Approved reward reservation');
 INSERT INTO reward_order(id,household_id,challenge_id,idempotency_key) VALUES(p_order,p_household,a.id,'coupon:'||a.id);
 UPDATE assigned_challenge SET status='Approved' WHERE id=a.id;
 RETURN p_order;
END $$;
COMMIT;
-- Deployment must restrict the runtime role: no DDL, no trigger disabling, no direct
-- writes outside approved transaction paths. Validate READ COMMITTED concurrency with
-- real PostgreSQL before wiring. Worker should claim orders with FOR UPDATE SKIP LOCKED.

-- Product experience additions; apply with the PostgreSQL adapter migration before launch.
CREATE TABLE challenge_details (challenge uuid PRIMARY KEY REFERENCES assigned_challenge(id),title TEXT NOT NULL,instructions TEXT NOT NULL,reward TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'gift',image TEXT NOT NULL DEFAULT '',greeting TEXT NOT NULL DEFAULT 'Bra jobbat!',opened INTEGER NOT NULL DEFAULT 0);
CREATE TABLE suggestions (id TEXT PRIMARY KEY,household TEXT NOT NULL,child TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Pending',created TEXT NOT NULL);
CREATE TABLE child_preferences (child TEXT PRIMARY KEY,avatar TEXT NOT NULL DEFAULT 'sun');
