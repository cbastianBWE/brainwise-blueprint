// Un-instrumented access to the generated Supabase client.
//
// The app-wide alias points "@/integrations/supabase/client" at
// ./instrumented, so anything that must NOT be instrumented (the error
// capture layer itself) imports from here instead. The relative specifier
// below is never aliased, so it always resolves to the generated file.
export { supabase } from "./client";
