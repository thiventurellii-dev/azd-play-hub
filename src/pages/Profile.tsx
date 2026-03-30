import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Profile = () => {
  const { user, role } = useAuth();

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-gold font-bold text-2xl">
              {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <CardTitle>{user?.user_metadata?.name || 'Sem nome'}</CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-1" variant={role === 'admin' ? 'default' : 'secondary'}>
                {role === 'admin' ? 'Admin' : 'Player'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conta criada em {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
