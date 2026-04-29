import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateCampaignPost,
  useDeleteCampaignPost,
} from '@/hooks/useRpgCampaignDetail';
import { useAuth } from '@/contexts/AuthContext';
import type { RpgCampaignPost, PublicProfileLite } from '@/types/rpg';

interface PostWithAuthor extends RpgCampaignPost {
  author: PublicProfileLite | null;
}

interface Props {
  campaignId: string;
  posts: PostWithAuthor[];
  canPost: boolean;
  masterId: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const CampaignWall = ({ campaignId, posts, canPost, masterId }: Props) => {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const create = useCreateCampaignPost(campaignId);
  const remove = useDeleteCampaignPost();

  const submit = async () => {
    if (!body.trim()) return;
    try {
      await create.mutateAsync(body.trim());
      setBody('');
    } catch (e: any) {
      toast.error('Erro ao publicar: ' + (e?.message || ''));
    }
  };

  return (
    <div className="space-y-3">
      {canPost && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <Textarea
            placeholder="Escreva algo para a mesa..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={create.isPending || !body.trim()}>
              Publicar
            </Button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Nada no mural ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => {
            const canDelete = user?.id === p.author_id || user?.id === masterId;
            return (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card p-3 flex gap-3"
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={p.author?.avatar_url || undefined} />
                  <AvatarFallback>{p.author?.name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs">
                      <span className="font-semibold">
                        {p.author?.nickname || p.author?.name || 'Anônimo'}
                      </span>
                      {p.author_id === masterId && (
                        <span className="ml-1.5 text-gold text-[10px]">★ Mestre</span>
                      )}
                      <span className="text-muted-foreground ml-2">
                        {formatTime(p.created_at)}
                      </span>
                    </p>
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => remove.mutate(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-1">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignWall;
