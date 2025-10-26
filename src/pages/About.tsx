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
            Câu Chuyện Của Chúng Tôi 💕
          </h1>
          <div className="bg-card rounded-3xl shadow-cute p-8 space-y-6">
            <p className="text-lg leading-relaxed">
              Chào mừng đến với Ribon Matchalatte, nơi mỗi ly matcha được pha chế bằng tình yêu! 🍵✨
            </p>
            <p className="leading-relaxed">
              Chúng tôi tin rằng thưởng thức Matcha phải là một trải nghiệm tuyệt vời. Vì vậy, chúng tôi chỉ chọn loại bột Matcha chất lượng cao nhất từ Nhật Bản và pha chế từng ly một cách cẩn thận và vui vẻ.
            </p>
            <div className="flex items-center justify-center py-8">
              <Heart className="h-24 w-24 text-primary animate-bounce-soft" />
            </div>
            <p className="leading-relaxed">
              Sứ mệnh của chúng tôi thật đơn giản: lan tỏa tình yêu và niềm vui qua từng ngụm! Dù bạn là người yêu thích Matcha hay chỉ mới thử lần đầu, chúng tôi luôn ở đây để mang đến cho bạn trải nghiệm tuyệt vời nhất! 💖
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
