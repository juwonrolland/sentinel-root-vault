import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2 bg-primary/10 rounded-lg">
            <img src={logo} alt="Glorious Global Logo" className="h-8 w-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Page Not Found
          </h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-6">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-foreground">404</h1>
              <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button className="w-full sm:w-auto">
                  <Home className="mr-2 h-4 w-4" />
                  Return Home
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="w-full sm:w-auto">
                  Contact Support
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NotFound;
