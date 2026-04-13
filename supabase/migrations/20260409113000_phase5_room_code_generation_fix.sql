-- Phase 5 fix: make room-code generation independent from pgcrypto schema search_path.
-- Supabase can install pgcrypto functions outside `public`, while create_round/join_round
-- run with `search_path = public`. This keeps code generation working everywhere.

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code_length constant integer := 8;
  random_bytes bytea := decode(
    md5(random()::text || clock_timestamp()::text || txid_current()::text),
    'hex'
  );
  generated_code text := '';
  i integer;
  next_index integer;
begin
  for i in 0..(code_length - 1) loop
    next_index := (get_byte(random_bytes, i) % char_length(alphabet)) + 1;
    generated_code := generated_code || substr(alphabet, next_index, 1);
  end loop;

  return generated_code;
end;
$$;
