import React, {useState} from 'react';
import {login} from '../api/client';
import type {ApiError} from '../lib/apiError';
import {Lock, User} from 'lucide-react';
import {useAuth} from '../hooks';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Label} from '../components/ui/label';
import {Alert, AlertDescription} from '../components/ui/alert';
import {AuthCard} from '../components';

const loginErrorMessage = (status: number): string => {
  if (status === 429) {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }
  if (status === 403) {
    return 'The server blocked this request. This is likely a server configuration issue, not a problem with your credentials.';
  }
  if (status >= 500) {
    return 'The server is unavailable or returned an error. Please try again later.';
  }
  return 'Invalid username or password';
};

const LoginPage = (): React.JSX.Element => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {setAuthenticated} = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      await setAuthenticated(true);
      const returnTo = searchParams.get('returnTo');
      // Only allow same-origin paths: must start with "/" but not "//" or "/\"
      const safeReturnTo = returnTo && returnTo.startsWith('/') && !/^\/[/\\]/.test(returnTo) ? returnTo : '/';
      navigate(safeReturnTo, {replace: true});
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 0) {
        setError('Login failed. Please try again.');
      } else {
        setError(loginErrorMessage(apiError.status));
      }
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
          <AuthCard title="Sign in to your account" subtitle="Please enter your email and password">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input
                  id="email"
                  data-testid="email"
                  name="email"
                  type="email"
                  required
                  placeholder="Email"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
                <Input
                  id="password"
                  data-testid="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
          </AuthCard>
    </div>
  );
};

export {LoginPage};
