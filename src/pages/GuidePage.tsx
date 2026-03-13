import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { MODULE_INFO, WORKFLOW_EXAMPLES, ROLE_PATHS } from "@/lib/onboardingContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Play, Users, Layers, ArrowRight, ChevronRight, RotateCcw,
  Activity, Search,
} from "lucide-react";

export default function GuidePage() {
  const { restartTour } = useOnboarding();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = searchQuery
    ? MODULE_INFO.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MODULE_INFO;

  const handleReplayTour = () => {
    restartTour();
    navigate("/");
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Orchestra Guide</h1>
              <p className="text-xs font-mono text-muted-foreground">Learn every feature · Workflow examples · Role-based paths</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleReplayTour} variant="outline" size="sm" className="font-mono text-xs gap-1.5">
              <RotateCcw size={12} /> Replay Product Tour
            </Button>
            <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="font-mono text-xs gap-1.5">
              <Activity size={12} /> Go to Dashboard
            </Button>
          </div>
        </div>

        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="modules" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Layers size={12} /> Modules
            </TabsTrigger>
            <TabsTrigger value="workflows" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Play size={12} /> Workflows
            </TabsTrigger>
            <TabsTrigger value="roles" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Users size={12} /> Role Paths
            </TabsTrigger>
          </TabsList>

          {/* ═══ MODULES TAB ═══ */}
          <TabsContent value="modules" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid gap-3">
              {filteredModules.map((mod) => (
                <Card key={mod.id} className="border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <mod.icon size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{mod.name}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[9px] font-mono text-primary gap-0.5"
                            onClick={() => navigate(mod.url)}
                          >
                            Open <ArrowRight size={10} />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">WHO IT'S FOR</p>
                            <p className="text-[11px] text-foreground/80">{mod.whoItsFor}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">DATA PRODUCED</p>
                            <p className="text-[11px] text-foreground/80">{mod.dataProduced}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">KEY ACTIONS</p>
                          <div className="flex flex-wrap gap-1">
                            {mod.actions.map(a => (
                              <Badge key={a} variant="secondary" className="text-[9px] font-mono px-1.5 py-0">{a}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">USE CASES</p>
                          <div className="flex flex-wrap gap-1">
                            {mod.useCases.map(u => (
                              <Badge key={u} variant="outline" className="text-[9px] font-mono px-1.5 py-0">{u}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">NEXT STEPS</p>
                          <div className="flex flex-wrap gap-1">
                            {mod.nextSteps.map(n => (
                              <span key={n} className="text-[10px] text-primary/80 font-mono">
                                {n} →
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ WORKFLOWS TAB ═══ */}
          <TabsContent value="workflows" className="space-y-4">
            <p className="text-xs text-muted-foreground font-mono">Step-by-step examples of common Orchestra workflows.</p>
            <div className="grid gap-4">
              {WORKFLOW_EXAMPLES.map((wf) => (
                <Card key={wf.id} className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm">{wf.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{wf.summary}</p>
                    </div>
                    <div className="space-y-1.5">
                      {wf.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-mono font-bold text-primary">{i + 1}</span>
                          </div>
                          <div>
                            <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0 mr-1.5">{step.module}</Badge>
                            <span className="text-xs text-foreground/80">{step.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-0.5">OUTCOME</p>
                      <p className="text-xs text-risk-safe font-medium">{wf.outcome}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ ROLE PATHS TAB ═══ */}
          <TabsContent value="roles" className="space-y-4">
            <p className="text-xs text-muted-foreground font-mono">Choose your role to see recommended starting points and key workflows.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_PATHS.map((rp) => (
                <Card key={rp.id} className="border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <rp.icon size={16} className="text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">{rp.role}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{rp.description}</p>

                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-0.5">START AT</p>
                      <p className="text-xs font-medium text-primary">{rp.startAt}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">KEY TABS</p>
                      <div className="flex flex-wrap gap-1">
                        {rp.keyTabs.map(t => (
                          <Badge key={t} variant="secondary" className="text-[9px] font-mono px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wider mb-1">TYPICAL WORKFLOWS</p>
                      <ul className="space-y-0.5">
                        {rp.typicalWorkflows.map(w => (
                          <li key={w} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                            <ChevronRight size={10} className="text-primary shrink-0" /> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
