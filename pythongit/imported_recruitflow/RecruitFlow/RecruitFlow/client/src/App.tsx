import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Candidates from "@/pages/Candidates";
import Clients from "@/pages/Clients";
import Positions from "@/pages/Positions";
import Interviews from "@/pages/Interviews";
import Applications from "@/pages/Applications";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/candidates">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Candidates />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Clients />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/positions">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Positions />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/interviews">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Interviews />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/applications">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Applications />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground">Reporting and analytics coming soon...</p></div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">System settings coming soon...</p></div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
