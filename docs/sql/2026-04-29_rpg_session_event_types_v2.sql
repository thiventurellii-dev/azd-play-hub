-- Adiciona novos tipos de evento de sessão de RPG ao enum rpg_session_event_type.
-- Rodar no SQL Editor do banco externo (npinawelxdtsrcvzzvvs).
-- ATENÇÃO: ALTER TYPE ... ADD VALUE não pode rodar dentro de transação no pgAdmin antigo,
-- mas funciona normalmente no SQL Editor do Supabase.

ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'alliance';
ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'rivalry';
ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'revelation';
ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'discovery';
ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'defeat';
ALTER TYPE public.rpg_session_event_type ADD VALUE IF NOT EXISTS 'moral_dilemma';
