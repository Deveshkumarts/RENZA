import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://donoeezambswdjcrjuft.supabase.co'
// Using the anon key provided
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbm9lZXphbWJzd2RqY3JqdWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTE4NDMsImV4cCI6MjEwMDI4Nzg0M30.37qSJvXQaRc04h1q5prFi8D9Y2DAIKjU4a_A50SDRlo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
