import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import psmLogo from '@assets/stripe logo PSM_1759024099266.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const twoFactorSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must only contain numbers'),
});

type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>('');
  const [twoFactorEmail, setTwoFactorEmail] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      // Trim whitespace from email and password to avoid copy/paste issues
      const trimmedEmail = data.email.trim();
      const trimmedPassword = data.password.trim();
      
      console.log('Attempting login with email:', trimmedEmail);
      
      // First, try to authenticate with email and password
      const response = await apiRequest('POST', '/api/auth/login', {
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      const result = await response.json();
      
      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        console.log('[Login] 2FA required for user');
        setTwoFactorUserId(result.userId);
        setTwoFactorEmail(result.email);
        setShowTwoFactorDialog(true);
        setIsLoading(false);
        
        // In development mode, show the 2FA code in the UI
        if (result.devCode) {
          toast({
            title: 'Development Mode - 2FA Code',
            description: `Your verification code is: ${result.devCode}. Enter this code to complete login.`,
            duration: 15000, // Show for 15 seconds
          });
        } else {
          toast({
            title: 'Verification Required',
            description: `A verification code has been sent to ${result.email}`,
          });
        }
        return;
      }
      
      // If no 2FA required, proceed with regular login
      if (result.user && result.recruiter) {
        // Update auth context with the user data
        queryClient.setQueryData(['/api/auth/me'], {
          user: result.user,
          recruiter: result.recruiter
        });
        
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        
        // Navigate to dashboard
        setLocation('/');
      }
    } catch (error: any) {
      console.error('Login error details:', {
        message: error?.message,
        stack: error?.stack,
        fullError: error,
        attemptedEmail: data.email.trim()
      });
      toast({
        title: 'Login failed',
        description: error?.message || 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const onVerifyTwoFactor = async (data: TwoFactorFormData) => {
    try {
      setIsVerifying(true);
      
      const response = await apiRequest('POST', '/api/auth/verify-2fa', {
        userId: twoFactorUserId,
        code: data.code,
      });
      
      const result = await response.json();
      
      if (result.user && result.recruiter) {
        // Update auth context with the user data
        queryClient.setQueryData(['/api/auth/me'], {
          user: result.user,
          recruiter: result.recruiter
        });
        
        setShowTwoFactorDialog(false);
        
        toast({
          title: 'Welcome back!',
          description: 'Two-factor authentication successful.',
        });
        
        // Navigate to dashboard
        setLocation('/');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      toast({
        title: 'Verification failed',
        description: error?.message || 'Invalid or expired verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onResendTwoFactor = async () => {
    try {
      setIsResending(true);
      
      const response = await apiRequest('POST', '/api/auth/resend-2fa', {
        userId: twoFactorUserId,
      });
      
      const result = await response.json();
      
      // In development mode, show the resent 2FA code
      if (result.devCode) {
        toast({
          title: 'Development Mode - New 2FA Code',
          description: `Your new verification code is: ${result.devCode}. Enter this code to complete login.`,
          duration: 15000, // Show for 15 seconds
        });
      } else {
        toast({
          title: 'Code resent',
          description: result.message || 'A new verification code has been sent to your email.',
        });
      }
      
      // Clear the form
      twoFactorForm.reset();
    } catch (error: any) {
      console.error('2FA resend error:', error);
      toast({
        title: 'Resend failed',
        description: error?.message || 'Failed to resend verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const onForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      setIsSendingReset(true);
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: data.email,
      });
      const result = await response.json();
      
      // In development mode, show the reset link
      if (result.devResetLink) {
        toast({
          title: 'Development Mode - Password Reset Link',
          description: `Open this link to reset your password: ${result.devResetLink}`,
          duration: 20000, // Show for 20 seconds
        });
      } else {
        toast({
          title: 'Password reset email sent!',
          description: 'Please check your email for instructions to reset your password. The link will expire in 24 hours.',
        });
      }
      
      setShowForgotDialog(false);
      forgotForm.reset();
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Failed to send reset email',
        description: error?.message || 'Failed to send password reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={psmLogo} 
              alt="PSM Logo" 
              className="h-12"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your PSM Recruiting account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotDialog(true)}
                  className="text-sm text-primary hover:underline"
                  data-testid="button-forgot-password"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Your Password?</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password. The link will expire in 24 hours.
            </DialogDescription>
          </DialogHeader>
          <Form {...forgotForm}>
            <form onSubmit={forgotForm.handleSubmit(onForgotPassword)} className="space-y-4">
              <FormField
                control={forgotForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-forgot-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSendingReset}
                data-testid="button-send-reset-email"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Email...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Send Reset Email
                  </>
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Authentication Dialog */}
      <Dialog open={showTwoFactorDialog} onOpenChange={(open) => {
        if (!open && !isVerifying) {
          setShowTwoFactorDialog(false);
          twoFactorForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
            <DialogDescription className="text-center">
              Enter the 6-digit verification code sent to {twoFactorEmail}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...twoFactorForm}>
            <form onSubmit={twoFactorForm.handleSubmit(onVerifyTwoFactor)} className="space-y-4">
              <FormField
                control={twoFactorForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block">Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-wider"
                        autoComplete="one-time-code"
                        data-testid="input-2fa-code"
                        {...field}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isVerifying}
                  data-testid="button-verify-2fa"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify Code
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isResending}
                  onClick={onResendTwoFactor}
                  data-testid="button-resend-2fa"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                The code will expire in 10 minutes. If you didn't request this code, please contact support immediately.
              </p>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
