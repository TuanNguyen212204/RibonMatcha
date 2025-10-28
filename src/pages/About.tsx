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
            私たちのストーリー 💕
          </h1>
          <div className="bg-card rounded-3xl shadow-cute p-8 space-y-6">
            <p className="text-lg leading-relaxed">
              Ribon Matchalatte へようこそ。ここでは、すべての抹茶ラテを愛情を込めてお作りしています！🍵✨
            </p>
            <p className="leading-relaxed">
              私たちは、抹茶を味わうことは素晴らしい体験であるべきだと信じています。そのため、日本から厳選した最高品質の抹茶のみを使用し、一杯一杯ていねいに、そして楽しくお作りしています。
            </p>
            <div className="flex items-center justify-center py-8">
              <Heart className="h-24 w-24 text-primary animate-bounce-soft" />
            </div>
            <p className="leading-relaxed">
              私たちの使命はシンプルです: 一口ごとに愛と喜びを届けること！抹茶が大好きな方も、はじめての方も、最高の体験をお届けします！💖
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
