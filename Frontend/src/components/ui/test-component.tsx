import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';

export function TestComponent() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">shadcn/ui Test</h1>
      
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card to verify shadcn/ui styling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Test input field" />
          <Button>Test Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="secondary">Secondary Button</Button>
        </CardContent>
      </Card>
    </div>
  );
}


