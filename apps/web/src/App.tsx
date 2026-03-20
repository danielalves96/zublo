import { useState, useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createAppRouter } from "@/routes";
import { AppMetadata } from "@/components/AppMetadata";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,       // 5 minutes — data is stable; no need to refetch every 30s
      refetchOnWindowFocus: false,  // avoid unnecessary background fetches when switching tabs
    },
  },
});

function InnerApp() {
  const auth = useAuth();
  const [router] = useState(() =>
    createAppRouter({ queryClient, auth }),
  );

  // Keep router context in sync with auth state
  useEffect(() => {
    router.update({
      context: { queryClient, auth },
    });
    router.invalidate();
  }, [router, auth]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppMetadata />
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
