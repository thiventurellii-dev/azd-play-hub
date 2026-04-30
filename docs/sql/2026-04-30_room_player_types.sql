-- Adiciona novos tipos de participação em salas de partida
-- Rodar no SQL Editor da instância EXTERNA (npinawelxdtsrcvzzvvs)

-- match_room_player_type já tem: 'confirmed', 'waitlist'
-- Adicionamos: invited (convidado, aguardando aceite), observer (observador), moderator (moderador/co-host)

ALTER TYPE public.match_room_player_type ADD VALUE IF NOT EXISTS 'invited';
ALTER TYPE public.match_room_player_type ADD VALUE IF NOT EXISTS 'observer';
ALTER TYPE public.match_room_player_type ADD VALUE IF NOT EXISTS 'moderator';
