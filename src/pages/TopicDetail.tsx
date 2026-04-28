import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pin, Lock, Trash2, Send, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useTopicDetail,
  useTopicComments,
  useCreateComment,
  useDeleteComment,
  useUpdateTopic,
  useDeleteTopic,
} from "@/hooks/useCommunityDiscussions";
import { useCommunityDetail } from "@/hooks/useCommunityDetail";
import { useCommunityMembership } from "@/hooks/useCommunityMembership";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TopicDetail = () => {
  const { slug, topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: community } = useCommunityDetail(slug);
  const { data: topic, isLoading } = useTopicDetail(topicId);
  const { data: comments = [] } = useTopicComments(topicId);
  const { state: membership } = useCommunityMembership(community?.id, community?.join_policy);
  const [body, setBody] = useState("");
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  useEffect(() => {
    if (topic) document.title = `${topic.title} | Discussões`;
  }, [topic]);

  if (isLoading || !topic || !community) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  const isMember = membership.status === "active";
  const isMod =
    isMember && (membership.role === "leader" || membership.role === "moderator");
  const isAuthor = user?.id === topic.author_id;
  const canComment = isMember && !topic.locked;

  const handleSubmit = async () => {
    if (!body.trim()) return;
    await createComment.mutateAsync({ topic_id: topic.id, body: body.trim() });
    setBody("");
  };

  return (
    <div className="container py-4 space-y-4 pb-24 md:pb-8 max-w-3xl">
      <Link to={`/comunidades/${slug}`}>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para {community.name}
        </Button>
      </Link>

      <Card className="bg-card border-border">
        <CardContent className="py-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {topic.pinned && <Pin className="h-4 w-4 text-gold" />}
                {topic.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                <h1 className="text-xl md:text-2xl font-bold">{topic.title}</h1>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {topic.author?.nickname || topic.author?.name || "—"}
                </span>
                <span>•</span>
                <span>{format(new Date(topic.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                {topic.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {topic.category.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {isMod && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTopic.mutate({ id: topic.id, pinned: !topic.pinned })}
                  >
                    <Pin className="h-3.5 w-3.5 mr-1" />
                    {topic.pinned ? "Desafixar" : "Fixar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTopic.mutate({ id: topic.id, locked: !topic.locked })}
                  >
                    {topic.locked ? (
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-1" />
                    )}
                    {topic.locked ? "Reabrir" : "Fechar"}
                  </Button>
                </>
              )}
              {(isMod || isAuthor) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm("Excluir este tópico?")) {
                      await deleteTopic.mutateAsync({ id: topic.id, community_id: community.id });
                      navigate(`/comunidades/${slug}`);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
          {topic.body && (
            <div className="text-sm whitespace-pre-line border-t border-border pt-3">
              {topic.body}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
          {comments.length} {comments.length === 1 ? "comentário" : "comentários"}
        </h2>
        <div className="space-y-2">
          {comments.map((c) => {
            const canDelete = c.author_id === user?.id || isMod;
            return (
              <Card key={c.id} className="bg-card border-border">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-gold text-xs font-bold">
                        {(c.author?.nickname || c.author?.name || "?").charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs">
                          <span className="font-semibold">
                            {c.author?.nickname || c.author?.name || "—"}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {format(new Date(c.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </p>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteComment.mutate({ id: c.id, topic_id: topic.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-line mt-1">{c.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {canComment ? (
        <Card className="bg-card border-border">
          <CardContent className="py-3 space-y-2">
            <Textarea
              placeholder="Escreva um comentário..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                variant="gold"
                size="sm"
                onClick={handleSubmit}
                disabled={!body.trim() || createComment.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {createComment.isPending ? "Enviando..." : "Comentar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          {topic.locked
            ? "Este tópico está fechado para comentários."
            : "Entre na comunidade para comentar."}
        </p>
      )}
    </div>
  );
};

export default TopicDetail;
