-- Adiciona novos tipos de evento de sessão de RPG.
-- Rodar no SQL Editor do banco externo (npinawelxdtsrcvzzvvs).

ALTER TABLE public.rpg_session_events
  DROP CONSTRAINT IF EXISTS rpg_session_events_event_type_check;

ALTER TABLE public.rpg_session_events
  ADD CONSTRAINT rpg_session_events_event_type_check
  CHECK (event_type IN (
    'death','level_up','milestone','legendary_item',
    'important_npc','betrayal','achievement',
    'alliance','rivalry','revelation','discovery','defeat','moral_dilemma'
  ));
