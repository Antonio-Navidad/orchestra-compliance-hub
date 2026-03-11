import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LegalKnowledge() {
  const { data: laws = [], isLoading } = useQuery({
    queryKey: ["legal-knowledge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_knowledge")
        .select("*")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <BookOpen size={18} className="text-primary" />
          <h1 className="text-lg font-bold">Legal Knowledge Database</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground font-mono text-sm text-center py-12">LOADING...</p>
        ) : laws.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-muted-foreground">No regulations stored yet.</p>
            <p className="text-xs text-muted-foreground">Send data via the Make.com webhook to populate this database.</p>
          </div>
        ) : (
          laws.map((law) => (
            <div key={law.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold">{law.title}</h3>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {new Date(law.effective_date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{law.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="font-mono text-[10px]">{law.jurisdiction}</Badge>
                <Badge variant="outline" className="font-mono text-[10px]">{law.regulation_body}</Badge>
                {law.hs_codes_affected?.map((code: string) => (
                  <Badge key={code} variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                    HS {code}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
