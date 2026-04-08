import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AboutUs = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('about_us').select('content').limit(1).single();
      if (data) setContent(data.content);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-3xl">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl">Sobre Nós</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground">
            {content.split('\n').map((line, i) => {
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-3 text-muted-foreground'}>
                  {parts.map((part, j) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutUs;
