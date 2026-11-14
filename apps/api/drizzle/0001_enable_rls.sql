-- The API connects as the table owner and enforces per-user access itself. Supabase also exposes
-- the public schema through its REST API to the anon/authenticated roles; RLS with no policies
-- shuts that door, so user data is reachable only through this API.
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dictionary_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "active_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_banks" ENABLE ROW LEVEL SECURITY;
