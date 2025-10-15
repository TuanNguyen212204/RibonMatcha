import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-5xl font-display text-primary font-bold mb-8 text-center">
            Our Story 💕
          </h1>
          <div className="bg-card rounded-3xl shadow-cute p-8 space-y-6">
            <p className="text-lg leading-relaxed">
              Welcome to Ribon Matchalatte, where every cup is made with love! 🍵✨
            </p>
            <p className="leading-relaxed">
              We believe that drinking Matcha should be a delightful experience. That's why we source only the finest Matcha powder from Japan and craft each drink with care and happiness.
            </p>
            <div className="flex items-center justify-center py-8">
              <Heart className="h-24 w-24 text-primary animate-bounce-soft" />
            </div>
            <p className="leading-relaxed">
              Our mission is simple: spreading love and joy with every sip! Whether you're a Matcha enthusiast or trying it for the first time, we're here to make your experience absolutely adorable! 💖
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
