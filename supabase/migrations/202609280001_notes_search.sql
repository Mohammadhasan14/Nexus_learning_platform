-- Private notes belong to a learner and an immutable lesson version.
create table public.lesson_notes (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null references public.lessons(id),
 body text not null check (length(body)<=10000),
 revision integer not null check (revision>0),
 request_id uuid not null,
 updated_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
alter table public.lesson_notes enable row level security;
create policy own_notes on public.lesson_notes for select to authenticated using(user_id=auth.uid());
revoke all on public.lesson_notes from public,anon,authenticated;
grant select on public.lesson_notes to authenticated;

create function public.save_lesson_note(lesson text, body text, expected integer, request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); previous public.lesson_notes; saved public.lesson_notes;
begin
 if learner is null or not learning_private.can_practice(learner,lesson) then
  raise exception 'Enrol and complete prerequisite practice first' using errcode='42501';
 end if;
 if body is null or length(body)>10000 or expected is null or expected<0 or request is null then
  raise exception 'Invalid note' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('note:'||learner::text||':'||lesson,0));
 select * into previous from public.lesson_notes n where n.user_id=learner and n.lesson_id=lesson;
 if found and previous.request_id=request then
  if previous.body<>body or previous.revision-1<>expected then
   raise exception 'Save identity already used' using errcode='22023';
  end if;
  return jsonb_build_object('revision',previous.revision,'updated_at',previous.updated_at);
 end if;
 if coalesce(previous.revision,0)<>expected then
  raise exception 'A newer note exists' using errcode='40001';
 end if;
 insert into public.lesson_notes as n(user_id,lesson_id,body,revision,request_id)
 values(learner,lesson,body,expected+1,request)
 on conflict(user_id,lesson_id) do update set body=excluded.body,revision=excluded.revision,
 request_id=excluded.request_id,updated_at=now() returning * into saved;
 return jsonb_build_object('revision',saved.revision,'updated_at',saved.updated_at);
end $$;
revoke all on function public.save_lesson_note(text,text,integer,uuid) from public,anon;
grant execute on function public.save_lesson_note(text,text,integer,uuid) to authenticated;

-- Small beta catalogue: literal case-insensitive substring matching, no external index.
-- Access filtering happens before any result leaves the database; private notes/keys/drafts are not searched.
create function public.search_lessons(query text) returns table (
 lesson_id text,course_id text,title text,objective text,course_title text,course_version integer
) language plpgsql stable security definer set search_path='' as $$
declare term text:=lower(btrim(query));
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if term is null or length(term)>100 then raise exception 'Search is limited to 100 characters' using errcode='22023'; end if;
 if length(term)<2 then return; end if;
 return query select l.id,l.course_id,l.title,l.objective,c.title,c.version
 from public.lessons l join public.course_versions c on c.id=l.course_id
 where learning_private.can_practice(auth.uid(),l.id)
 and strpos(lower(l.title||' '||l.objective||' '||l.body||' '||c.title),term)>0
 order by (strpos(lower(l.title),term)>0) desc,c.title,c.version desc,l.position,l.id
 limit 21;
end $$;
revoke all on function public.search_lessons(text) from public,anon;
grant execute on function public.search_lessons(text) to authenticated;
