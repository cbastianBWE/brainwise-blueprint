// Direct access to the generated Supabase client module.
//
// The app-wide alias points "@/integrations/supabase/client" at ./instrumented,
// so the capture layer imports from here to avoid a circular import. Note this
// is NOT real isolation: instrumented.ts mutates that same client object in
// place, so rawSupabase.rpc IS the instrumented rpc. Recursion is prevented
// solely by the CAPTURE_RPC string checks in instrumented.ts and
// errorCapture.ts — do not remove them believing this module isolates anything.
export { supabase } from "./client";
