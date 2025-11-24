import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null; // Or a loading spinner
  
  return user ? <Component /> : null;
}

function Router() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to home if already logged in and trying to access auth pages
  useEffect(() => {
    if (user && (location === "/auth" || location === "/forgot-password")) {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
