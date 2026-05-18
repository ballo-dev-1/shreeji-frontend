'use client'

import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Server, Printer, Briefcase, Globe } from "lucide-react";
import './style.scss'
import Link from "next/link";
import MovingTextEffect from "../moving text";

export const services = [
  {
    title: "Enterprise Printing & Scanning",
    link: "/services/enterprise-printing-and-scanning",
    icon: <Printer size={40} />, 
    description:
      "Our high-speed smart scanners and enterprise printers ensure cost-effective, large-scale document management and printing solutions with OCR conversions.",
  },
  {
    title: "Business Process Outsourcing (BPO)",
    link: "/services/bpo",
    icon: <Briefcase size={40} />, 
    description:
      "We partner with major telecom providers for services like SIM registration, mobile money operations, and quality assurance, ensuring seamless business processes.",
  },
  {
    title: "Skylift Services",
    link: "/services/skylift",
    icon: <Globe size={40} />, 
    description:
      "Our Skylift solutions offer efficient lifting and material handling services, tailored for construction and logistics needs with high precision and reliability.",
  },
  {
    title: "ICT Solutions",
    link: "/services/it-solutions",
    icon: <Server size={40} />, 
    description:
      "We provide comprehensive ICT solutions, including hardware supply, networking, enterprise software, and custom-built solutions like biometric scanners and internet kiosks.",
  },
];

export default function ServicesPage() {  
  return (
    <MotionConfig transition={{ duration: 0.5, ease: "easeInOut" }}>
      <div className="services-page min-h-screen text-white bg-gradient-to-br from-[whitesmoke] via-[rgb(255 255 255 / 50%)] via-[rgb(0 0 0 / 10%)] to-[#f0eded]">
        {/* Hero Section */}
        <MovingTextEffect
          title="Our Services"
          subtitle="Discover cutting-edge solutions designed to propel your business forward."
          image=""
        />
        {/* <div className="text-center py-32 relative services-hero-section">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-6xl font-extrabold drop-shadow-lg"
          >
            Our Services
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg max-w-2xl mx-auto opacity-90"
          >
            Discover cutting-edge solutions designed to propel your business forward.
          </motion.p>
        </div> */}

        {/* Services List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto py-10 md:py-20 px-3 md:px-0">
          {services.map((service, index) => (
            <Link href={service.link} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}                
                transition={{ duration: 0.3 }}
                className="min-h-[23rem] p-6 bg-white text-[#584d2a] rounded-2xl shadow-xl cursor-pointer transform hover:shadow-2xl hover:translate-y-[-5px]"
              >
                <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-center md:space-x-4">
                  <div>{service.icon}</div>
                  <h2 className="text-2xl font-bold">{service.title}</h2>
                </div>
                <p className="mt-4 text-gray-600">{service.description}</p> 
                <div className="text-[var(--shreeji-primary)] mt-6 inline-block">Explore {service.title} →</div>             
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}
