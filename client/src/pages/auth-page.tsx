import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { insertUserSchema } from "@shared/schema";

// Login schema
const loginSchema = z.object({
  username: z.string({ required_error: "Username is required" }).min(3, "Username must be at least 3 characters"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

// Registration schema - use the shared schema to ensure consistency
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    await loginMutation.mutateAsync(data);
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    await registerMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left auth form section */}
      <div className="w-full md:w-1/2 min-h-screen flex flex-col justify-center px-4 py-12 md:p-12 bg-background">
        <div className="mb-8 flex justify-center md:justify-start">
          <div className="flex items-center gap-2">
            <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 6L10 18.5M6.5 8.5L3 12L6.5 15.5M17.5 8.5L21 12L17.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-xl font-bold">LinkInsight</h1>
          </div>
        </div>

        <Card className="max-w-md mx-auto w-full">
          <CardContent className="pt-6">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Welcome back</h2>
                    <p className="text-muted-foreground">Sign in to access your dashboard</p>
                  </div>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="username" 
                                {...field} 
                                autoComplete="username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••" 
                                  {...field} 
                                  autoComplete="current-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                      <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                                      <line x1="2" y1="2" x2="22" y2="22"/>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                            Logging in...
                          </div>
                        ) : "Login"}
                      </Button>
                    </form>
                  </Form>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>
                        Register
                      </Button>
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Create an account</h2>
                    <p className="text-muted-foreground">Sign up to get started</p>
                  </div>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                {...field} 
                                autoComplete="username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="your@email.com" 
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                value={field.value ?? ""}
                                name={field.name}
                                ref={field.ref}
                                autoComplete="email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                {...field} 
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                {...field} 
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                            Creating account...
                          </div>
                        ) : "Register"}
                      </Button>
                    </form>
                  </Form>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>
                        Login
                      </Button>
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Demo account: intern@dacoid.com / Test123
          </p>
        </div>
      </div>

      {/* Right info section */}
      <div className="hidden md:flex md:w-1/2 bg-primary/5 flex-col justify-center items-center p-12">
        <div className="max-w-md">
          <svg className="w-16 h-16 text-primary mb-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 6L10 18.5M6.5 8.5L3 12L6.5 15.5M17.5 8.5L21 12L17.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          
          <h2 className="text-3xl font-bold mb-4">LinkInsight</h2>
          <p className="text-xl text-muted-foreground mb-6">
            Shorten, share, and track your links with powerful analytics.
          </p>
          
          <Separator className="my-8" />
          
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-primary/10 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Create Short Links</h3>
                <p className="text-muted-foreground">Transform long URLs into short, memorable links with optional custom aliases.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-primary/10 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M2 12h5"/>
                  <path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0Z"/>
                  <path d="M12 2a5 5 0 0 0-5 5v10"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Track Performance</h3>
                <p className="text-muted-foreground">Monitor clicks, locations, and device usage with real-time analytics.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-primary/10 p-2 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M3 15h18"/>
                  <path d="M9 3v18"/>
                  <path d="M15 3v18"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Generate QR Codes</h3>
                <p className="text-muted-foreground">Instantly create and download QR codes for your shortened links.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
