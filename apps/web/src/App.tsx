import { useState, useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createAppRouter } from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
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
  }, [router, auth]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
