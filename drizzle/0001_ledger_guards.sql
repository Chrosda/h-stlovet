-- Repair of failed initial trigger migration: hosting splits statements at semicolons.
-- Enforce monetary bounds through atomic account updates (next migration). The journal has no mutation API.
CREATE INDEX IF NOT EXISTS idx_ledger_household ON ledger_transactions(household);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_challenges_household ON assigned_challenges(household,child,status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_orders_queue ON reward_orders(household,status,next_attempt);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_children_token ON child_profiles(token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_household ON audit_events(household,created);
