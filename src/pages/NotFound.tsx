import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center gradient-subtle">
        <div className="text-center">
          <Heart className="h-24 w-24 text-primary mx-auto mb-6 animate-bounce-soft" />
          <h1 className="mb-4 text-6xl font-display text-primary font-bold">404</h1>
          <p className="mb-8 text-xl text-muted-foreground">Oops! Page not found 💔</p>
          <Link to="/">
            <Button variant="kawaii" size="lg">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
