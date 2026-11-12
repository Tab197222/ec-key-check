/*
  Connection to the member system (Supabase).
  Paste the two values from Supabase > Project Settings > API.
  Both are safe to publish: the database's own rules decide what each visitor can do.
  While they are empty, the member pages show a "being set up" notice.
*/
window.ILL_CONFIG = {
  supabaseUrl: '',
  supabaseKey: ''
};
