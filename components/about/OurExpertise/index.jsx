"use client";

import "./style.scss";
import Image from "next/image";
import { MotionConfig, motion } from "framer-motion";
import expertiseImg from "@/public/backgrounds/about-bg-3.jpg";
import { services } from "@/components/services/Services";
import Link from "next/link";

const OurExpertise = () => {

  return (
    <section className="our-expertise z-[3] bg-white our-expertise relative w-screen scroll-smooth pb-16 gap-10">      
      <div className="flex mt-24 px-5 gap-10 items-center">
        <div className="flex-[3] bg-[#f1eeee] p-2 rounded-sm m-10 mr-20 mt-5 rotate-6 expertise-img-container h-[85vh]">
          <Image src={expertiseImg} className="scale-x-[-1] h-full object-cover rounded-sm -rotate-6 shadow-xl shadow-black/40" />
        </div>

        <div className="flex flex-[4] expertise-card-container">
          <h2 className="w-full font-bold text-6xl mb-16 text-[var(--primary)] flex flex-center relative px-5">
            <p className="w-fit relative md:bg-gradient-to-br from-[#87703f] to-[#816b3b] z-[1] text-white text-center md:text-start px-2">Our <span className="text-[#171717]">Expertise</span></p>
            <span className="hidden md:flex w-full h-[2px] bg-white absolute z-0 top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2"/>
          </h2>

          {services.map((service, index) => (
            <Link href={service.link} key={index} className="flex m-3 items-center justify-center expertise-card">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}                
                transition={{ duration: 0.3 }}
                className="p-6 bg-white text-[var(--shreeji-primary)] rounded-2xl shadow-xl cursor-pointer transform hover:shadow-2xl hover:translate-y-[-5px]"
              >
                <div className="flex items-center space-x-4">
                  <div>{service.icon}</div>
                  <h2 className="text-2xl font-bold">{service.title}</h2>
                </div>
                <p className="expertise-card-description">{service.description}</p> 
                <div className="text-[#6c5f3a] mt-6 inline-block">Explore {service.title} →</div>             
              </motion.div>
            </Link>
          ))}
        </div>             
      </div>   
    </section>
  );
};

export default OurExpertise;
