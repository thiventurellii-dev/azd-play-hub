import { useState } from "react";
import { Link } from "react-router-dom";
import { Pin, Lock, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityTopics, useTopicCategories } from "@/hooks/useCommunityDiscussions";
import CreateTopicDialog from "./CreateTopicDialog";
import ManageCategoriesDialog from "./ManageCategoriesDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  communityId: string;
  communitySlug: string;
  isMember: boolean;
  canModerate: boolean;
}

const DiscussionsTab = ({ communityId, communitySlug, isMember, canModerate }: Props) => {
  const [activeCat, setActiveCat] = useState<string>("all");
  const { data: categories = [] } = useTopicCategories(communityId);
  const { data: topics = [], isLoading } = useCommunityTopics(
    communityId,
    activeCat === "all" ? null : activeCat
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={activeCat} onValueChange={setActiveCat} className="flex-1 min-w-0">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">Todas</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          {canModerate && <ManageCategoriesDialog communityId={communityId} />}
          {isMember && (
            <CreateTopicDialog
              communityId={communityId}
              defaultCategoryId={activeCat === "all" ? categories[0]?.id ?? null : activeCat}
            />
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum tópico ainda.</p>
              {isMember && <p className="text-xs text-muted-foreground">Seja o primeiro a abrir uma discussão!</p>}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/comunidades/${communitySlug}/discussao/${t.id}`}
                    className="flex items-start gap-3 py-3 hover:bg-secondary/30 -mx-2 px-2 rounded transition-colors"
                  >
                    {t.author?.avatar_url ? (
                      <img src={t.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover mt-0.5" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-gold text-xs font-bold mt-0.5">
                        {(t.author?.nickname || t.author?.name || "?").charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.pinned && <Pin className="h-3.5 w-3.5 text-gold" />}
                        {t.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <p className="font-medium text-sm truncate">{t.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.author?.nickname || t.author?.name || "—"} •{" "}
                        {format(new Date(t.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {t.category.name}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" /> {t.comments_count ?? 0}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscussionsTab;
