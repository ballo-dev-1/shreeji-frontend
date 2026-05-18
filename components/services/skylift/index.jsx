'use client'

import { motion } from "framer-motion";
import { Truck, Loader, Server, ArrowUpRight, Building, HardHat, Factory, Eclipse, Construction, Building2 } from "lucide-react";
import ContactModal from "./contact us";
import '@/components/services/style.scss';
import MovingTextEffect from "@/components/moving text";
import skylift1 from "@/public/elements/SEPL-TZ-50-range.jpg";
import skylift2 from "@/public/elements/skylift-2.jpg";
import Image from "next/image";

export default function SkyliftServicesPage() {
  return (
    <div className="skylift-services-page bg-gradient-to-br from-[#fffdf5] to-[#f9f6e6] text-[#2a2a2a]">
      {/* Hero Section */}
      <MovingTextEffect
        title="Skylift Services"
        subtitle="We provide safe, flexible access to elevated work areas for maintenance, construction, installations, and more. Ideal for reaching heights up to 55 ft with precise horizontal outreach."
        image=""
      />

      {/* Skylift Services Overview */}
      <div className="max-w-6xl mx-auto py-20 px-3 md:px-8">
        <h2 className="text-4xl font-bold text-[var(--shreeji-primary)] mb-14 text-center">Why Choose Skylift Services?</h2>        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[
            {
              icon: <Building2 size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Aerial Access Services",
              description: "We provide elevated access using our Genie TZ-50 boom lift, allowing safe and stable work at heights for tasks such as repairs, painting, lighting installation, and more."
            },
            {
              icon: <Loader size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Compact & Versatile Reach",
              description: "Our skylift features a working height of 55 ft and horizontal outreach of nearly 30 ft, making it suitable for tight access areas and elevated jobs that require precise positioning."
            },
            {
              icon: <Server size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Site Setup & Safety Planning",
              description: "We assess each site to ensure proper placement and operation of the boom lift. Our team prioritizes safety and efficiency, coordinating with your staff as needed."
            }
          ].map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.2 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:scale-105 transform transition-all hover:shadow-2xl"
            >
              <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-center justify-center space-x-6 mb-4">
                {service.icon}
                <h3 className="text-2xl font-semibold text-[var(--shreeji-primary)]">{service.title}</h3>
              </div>
              <p className="text-gray-600">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="bg-white py-16 px-4 md:px-20" id="specifications">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-semibold text-[var(--shreeji-primary)] mb-10 text-center">Genie TZ™-50 Specifications</h2>
          <Image
                src={skylift1}
                alt="Shreeji"
                quality={100}
                className="w-full h-auto mb-10 lg:mb-5"
              />
          <div className="flex flex-col lg:flex-row lg:gap-10 items-stretch">
            {/* Model: TZ-50 */}
            <div className="flex-1 bg-[#f9f6e6] shadow-md">
              <ul className="text-gray-700">
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Working Height Max:</strong> 55 ft 6 in (16.92 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Platform Height:</strong> 49 ft 6 in (15.09 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Horizontal Reach:</strong> 29 ft 2 in (8.89 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Clear Out Reach:</strong> 23 ft 1 in (7.04 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Up-and-Over Clearance:</strong> 22 ft (6.71 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Platform Size (L × W):</strong> 2'2.8" × 3'8" (0.68 m × 1.12 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Stowed Height:</strong> 6 ft 10 in (2.08 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Stowed Dimensions (L × W):</strong> 23 ft 6 in × 5 ft 6 in (7.16 m × 1.68 m)</li>
                <li className="p-3 even:bg-[#a49261] even:text-white"><strong>Outrigger Footprint:</strong> 14 ft 4 in × 14 ft 4 in (4.37 m × 4.37 m)</li>                
              </ul>
            </div>

            
            <div className="flex-1 bg-[#f9f6e6] shadow-md">
              <ul className="text-gray-700">                
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Lift Capacity (Standard):</strong> 500 lb (227 kg)</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Rotating Platform Capacity:</strong> 500 lb (227 kg)</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Platform Rotation:</strong> 160° Hydraulic</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Turntable Rotation:</strong> 359°</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Towing Speed:</strong> 60 mph (97 km/h)</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Power Source:</strong> 24V (4 × 6V 225Ah)</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Weight:</strong> 4,400 lb (1,996 kg)</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Sound Level:</strong> &lt; 70 dBA</li>
                <li className="p-3 even:bg-[#f9f6e6] odd:bg-[#a49261] lg:odd:bg-[#f9f6e6] lg:even:bg-[#a49261] odd:text-white lg:odd:text-gray-700 lg:even:text-white"><strong>Vibration:</strong> &lt; 2.5 m/s²</li>
              </ul>
            </div>
          </div>
          <div className="mt-24">
            <h2 className="text-4xl font-semibold text-[var(--shreeji-primary)] text-center">Safety Standards</h2>
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-lg text-gray-600 mb-6">
                Our operators are trained in using the Genie TZ-50 for safe access, and we follow site-specific safety protocols for setup and operation. Regular inspections and pre-operation checks ensure reliable performance. We also work closely with your team to identify any access challenges and mitigate risk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Industries Served Section */}
      <div className="py-20 px-3 md:px-8 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-[var(--shreeji-primary)] mb-12 text-center">Industries We Serve</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-16">
          {[
            {
              icon: <Construction size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Construction",
              description: "We offer precise and efficient lifting solutions for large construction projects, from high-rise buildings to residential developments."
            },
            {
              icon: <HardHat size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Oil & Gas",
              description: "Our lifting equipment is built to handle the toughest demands in the oil and gas industry, ensuring safety and efficiency in challenging environments."
            },
            {
              icon: <Truck size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Logistics & Transportation",
              description: "We support logistics companies with reliable and efficient material handling and lifting solutions to streamline operations."
            },
            {
              icon: <Factory size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Manufacturing",
              description: "Our equipment assists manufacturing companies in handling heavy materials and machinery with precision and safety."
            },
            {
              icon: <Eclipse size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Renewable Energy",
              description: "We provide lifting and installation services for renewable energy projects, including solar farms and wind turbine construction."
            },
            {
              icon: <Building size={50} className="text-[var(--shreeji-primary)]" />,            
              title: "Infrastructure Projects",
              description: "Our skylift services support large-scale infrastructure projects, from bridges to road construction, ensuring smooth and safe operations."
            }
          ].map((industry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.2 }}
              className="bg-white px-3 md:px-8 py-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all hover:shadow-2xl"
            >
              <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-center justify-center md:space-x-6 mb-4">
                {industry.icon}
                <h3 className="text-2xl font-semibold text-[var(--shreeji-primary)]">{industry.title}</h3>
              </div>
              <p className="mt-4 text-gray-600">{industry.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-[var(--shreeji-primary)] text-white py-16 px-8 text-center flex-center shadow-lg">
        <h2 className="text-3xl font-semibold">Get Started with Skylift Services</h2>
        <p className="mt-2 text-lg max-w-5xl mb-5">Maximize the efficiency and safety of your lifting operations with our expert solutions. Let us handle the heavy lifting so you can focus on your core business.</p>
        <ContactModal />
      </div>
    </div>
  );
}
