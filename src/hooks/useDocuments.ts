import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

export interface CommunityDocument {
  id: string;
  title: string;
  file_url: string;
  created_at: string;
}

const fetchDocuments = async (): Promise<CommunityDocument[]> => {
  const { data } = await supabase.from("community_documents").select("*").order("created_at", { ascending: false });
  return (data || []) as CommunityDocument[];
};

export const useDocuments = () => {
  return useQuery({
    queryKey: ["community-documents"],
    queryFn: fetchDocuments,
  });
};
