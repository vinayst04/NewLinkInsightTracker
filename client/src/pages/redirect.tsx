import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RedirectPage({ params }: { params: { shortCode: string } }) {
  const [error, setError] = useState<string | null>(null);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        // Make request to redirect endpoint
        const res = await fetch(`/r/${params.shortCode}`);
        
        // If not a redirect response or error
        if (!res.redirected && !res.ok) {
          if (res.status === 404) {
            setError("Link not found. This short URL may not exist.");
          } else if (res.status === 410) {
            setError("This link has expired and is no longer available.");
          } else {
            const data = await res.json();
            setError(data.message || "An error occurred during redirection.");
          }
        }
        
        // Otherwise redirect will happen automatically
      } catch (err) {
        setError("Something went wrong. Please try again later.");
        console.error("Redirect error:", err);
      }
    };

    redirectUser();
  }, [params.shortCode]);

  const goHome = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <svg className="mx-auto w-16 h-16 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 6L10 18.5M6.5 8.5L3 12L6.5 15.5M17.5 8.5L21 12L17.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {error ? (
            <>
              <h1 className="text-2xl font-bold mb-2">Redirect Failed</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={goHome}>
                Return to Dashboard
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Redirecting you...</h1>
              <p className="text-muted-foreground mb-6">You are being redirected to your destination. Please wait.</p>
              <div className="flex justify-center mb-6">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">
                If you are not redirected automatically, <Button variant="link" className="p-0" onClick={() => window.location.reload()}>click here</Button>.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
