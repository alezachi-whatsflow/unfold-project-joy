import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, BookOpen } from "lucide-react";

const ManualPage = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/manual-whatsflow-finance.md")
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manual-whatsflow-finance.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Manual do Sistema</h1>
          </div>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Baixar MD
          </Button>
        </div>

        <div className="bg-card border border-border p-6 md:p-8">
          {loading ? (
            <p className="text-muted-foreground">Carregando manual...</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                prose-headings:text-foreground prose-p:text-muted-foreground
                prose-strong:text-foreground prose-a:text-primary
                prose-table:text-muted-foreground prose-th:text-foreground
                prose-td:border-border prose-th:border-border
                prose-hr:border-border prose-li:text-muted-foreground
                prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                <ReactMarkdown>{content}</ReactMarkdown>
              </article>
            </ScrollArea>
          )}
        </div>
      </div>
    </>
  );
};

export default ManualPage;
