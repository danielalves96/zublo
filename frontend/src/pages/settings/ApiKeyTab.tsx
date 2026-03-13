import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Key } from "lucide-react";

function useUserMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pb.collection("users").update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function ApiKeyTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserMutation();

  const generateNewKey = () => {
    // Basic API Key generation (in a real scenario, should be generated securely on the server)
    const newKey = "wk_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    mut.mutate({ api_key: newKey });
  };

  const removeKey = () => {
    if (confirm("Are you sure you want to remove your API key? This will break any integrations using it.")) {
      mut.mutate({ api_key: "" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Key className="w-8 h-8 text-primary" />
          {t("api_key")}
        </h2>
        <p className="text-muted-foreground">Manage your personal API key for integrations and automated access.</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Your API Key</Label>
              <p className="text-sm text-muted-foreground mb-4">
                This key allows other applications to act on your behalf. Keep it perfectly secret.
              </p>
            </div>
            
            {user?.api_key ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input 
                    readOnly 
                    value={user.api_key} 
                    className="font-mono text-sm tracking-wider bg-muted h-12 rounded-xl"
                  />
                  <Button 
                    variant="ghost" 
                    className="h-12 w-12 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={removeKey}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={generateNewKey} 
                  className="rounded-xl w-full"
                >
                  Generate New Key
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
                <p className="text-muted-foreground mb-4">You don't have an active API key.</p>
                <Button onClick={generateNewKey} className="rounded-xl shadow-lg shadow-primary/20">
                  <Key className="w-4 h-4 mr-2" />
                  Generate API Key
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
