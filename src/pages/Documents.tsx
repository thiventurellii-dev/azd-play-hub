import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotification } from '@/components/NotificationDialog';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDocuments } from '@/hooks/useDocuments';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const Documents = () => {
  const { notify } = useNotification();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: docs = [], isLoading } = useDocuments();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!title || !file) throw new Error('Título e arquivo são obrigatórios');
      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('community-docs').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('community-docs').getPublicUrl(path);
      const { error } = await supabase.from('community_documents').insert({ title, file_url: urlData.publicUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      notify('success', 'Documento adicionado!');
      setTitle(''); setFile(null);
      queryClient.invalidateQueries({ queryKey: ["community-documents"] });
    },
    onError: (e: any) => notify('error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('community_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify('success', 'Documento removido');
      queryClient.invalidateQueries({ queryKey: ["community-documents"] });
    },
    onError: (e: any) => notify('error', e.message),
  });

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-8 w-8 text-gold" />
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Documentos da comunidade AzD</p>
        </div>
      </div>

      {isAdmin && (
        <Card className="bg-card border-border mb-8">
          <CardHeader><CardTitle className="text-base">Adicionar Documento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Regulamento Season 1" />
              </div>
              <div className="space-y-2">
                <Label>Arquivo (PDF)</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <Button variant="gold" onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
              <Upload className="h-4 w-4 mr-1" /> {uploadMutation.isPending ? 'Enviando...' : 'Enviar Documento'}
            </Button>
          </CardContent>
        </Card>
      )}

      {docs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum documento disponível ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-border">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gold flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                    </a>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
