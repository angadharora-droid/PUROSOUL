import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Card>
      <EmptyState
        icon={<SearchX className="h-7 w-7" />}
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={<Button onClick={() => navigate('/')}>Back to Dashboard</Button>}
      />
    </Card>
  );
}
