import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SteamCallback = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    const process = async () => {
      if (!user) {
        setStatus("error");
        return;
      }

      const claimedId = searchParams.get("openid.claimed_id");
      if (!claimedId) {
        setStatus("error");
        toast.error("Resposta da Steam inválida");
        navigate("/profile");
        return;
      }

      // Extract 17-digit Steam ID from claimed_id URL
      const match = claimedId.match(/(\d{17})$/);
      if (!match) {
        setStatus("error");
        toast.error("ID da Steam não encontrado");
        navigate("/profile");
        return;
      }

      const steamId = match[1];

      const { error } = await supabase
        .from("profiles")
        .update({ steam_id: steamId } as any)
        .eq("id", user.id);

      if (error) {
        setStatus("error");
        toast.error("Erro ao vincular Steam");
      } else {
        setStatus("success");
        toast.success("Steam vinculada com sucesso!");
      }

      // Get user nickname to redirect to profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single();

      navigate(profile?.nickname ? `/perfil/${profile.nickname}` : "/profile");
    };

    process();
  }, [user, searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      {status === "processing" && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-muted-foreground">Vinculando sua conta Steam...</p>
        </>
      )}
      {status === "error" && (
        <p className="text-destructive">Erro ao processar retorno da Steam.</p>
      )}
    </div>
  );
};

export default SteamCallback;
