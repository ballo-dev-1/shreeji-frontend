import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import hex from "@/public/backgrounds/hex-pattern.jpeg";
import './style.scss'

const MovingTextEffect = ({title, subtitle, image}) => {
  const [backgroundPosition, setBackgroundPosition] = useState("40% 50%");

  useEffect(() => {
    const handleMouseMove = (e) => {
      const mouseX = e.pageX;
      const mouseY = e.pageY;
      const traX = ((4 * mouseX) / 570) + 40;
      const traY = ((4 * mouseY) / 570) + 50;
      setBackgroundPosition(`${traX}% ${traY}%`);
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="text-effect-hero w-full h-screen flex items-center justify-center bg-[var(--shreeji-primary)] font-raleway text-white z-[1] relative">
      <div className="absolute text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="font-extrabold text-transparent text-6xl md:text-[120px] leading-tight md:leading-[100px] uppercase bg-clip-text md:px-[20vw] text-wrap pb-1"
          style={{
            backgroundImage: `url('${hex.src}')`,
            backgroundPosition: '20% 30%',
            backgroundSize: '40%',
            // backgroundAttachment: 'fixed'
          }}
        >
          {title}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-14 px-10 md:px-0 max-w-2xl mx-auto opacity-90 relative z-[1] text-2xl"
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
};

export default MovingTextEffect;
