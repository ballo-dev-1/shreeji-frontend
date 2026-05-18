'use client'

import { motion } from "framer-motion";
import { Briefcase, Users, Phone, Clipboard, ShieldCheck, Settings, CheckCircle } from "lucide-react";
import '@/components/services/style.scss'
import Link from "next/link";
import MovingTextEffect from "@/components/moving text";
import ContactModal from "./contact us";

export default function BPOPage() {
  return (
    <div className="bpo-page min-h-screen bg-white text-[#403d2a]">

      {/* Hero Section */}
      <MovingTextEffect
        title="Business Process Outsourcing"
        subtitle="Streamline your business operations with expert outsourcing services for seamless processes, enhanced productivity, and cost-efficiency."
        image=""
      />

      {/* What is BPO Section */}
      <div className="py-20 px-8 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-[var(--shreeji-primary)]">What is BPO?</h2>
        <p className="mt-6 text-lg max-w-4xl mx-auto text-gray-700">
          Business Process Outsourcing (BPO) refers to delegating critical business functions to external partners to improve efficiency, reduce costs, and enhance service quality.  
          We help you focus on your core competencies while we manage essential but non-core functions for you. Whether it’s customer service, IT management, or administrative work, outsourcing ensures faster turnaround and effective scalability.
        </p>
        <p className="mt-6 text-lg max-w-4xl mx-auto text-gray-700">
          BPO isn’t just about reducing costs. It’s about leveraging <strong>specialized expertise</strong>, improving <strong>service quality</strong>, and enabling <strong>strategic growth</strong> With the right outsourcing partner, businesses can scale operations without increasing overhead, while also benefiting from the latest technological advancements and industry expertise.
        </p>
      </div>

      {/* Our BPO Services */}
      <div className="relative py-20 px-3 md:px-8 bg-[#f9f6e6] mx-auto">
        <h2 className="text-3xl font-semibold text-[var(--shreeji-primary)] text-center mb-12">Our BPO Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[
            {
              icon: <Briefcase size={50} className="text-[var(--shreeji-primary)]" />,
              title: "SIM Registration & Management",
              description: "We partner with telecom providers to handle SIM registration and verification, reducing wait times and improving customer satisfaction. We offer quick, compliant, and secure registration solutions for businesses across sectors.",
              link: '/services/bpo/sim-registration-and-management'
            },
            // {
            //   icon: <Phone size={50} className="text-[var(--shreeji-primary)]" />,
            //   title: "Mobile Money Services",
            //   description: "Our mobile money operations ensure secure transactions, account management, and customer support with seamless mobile banking services. Whether you’re a financial institution or mobile network provider, we handle everything from onboarding to transactions.",            
            //   link: '/services/bpo/mobile-money-services'
            // },
            {
              icon: <Clipboard size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Quality Assurance",
              description: "We conduct rigorous quality control and assurance checks, ensuring the highest standards across all outsourced services. Our team is dedicated to meeting and exceeding your quality expectations.",
              link: '/services/bpo/quality-assurance'
            },
            {
              icon: <Users size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Customer Support Services",
              description: "Enhance customer experience with 24/7 support services including call center operations, chat support, and helpdesk solutions. Our multi-channel approach guarantees rapid, efficient resolution of customer issues.",
              link: '/services/bpo/customer-support-services'
            },
            {
              icon: <CheckCircle size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Back Office Support",
              description: "We handle back-office functions such as data entry, document processing, and administrative tasks, allowing your team to focus on strategic goals. Our back-office services are designed to ensure your operations run smoothly and efficiently.",
              link: '/services/bpo/back-office-support'
            },
            {
              icon: <ShieldCheck size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Risk & Compliance Management",
              description: "Outsource risk assessment, regulatory compliance, and security protocols to reduce potential threats and ensure your business operates within legal frameworks. We provide proactive measures to minimize risks and ensure regulatory compliance.",
              link: '/services/bpo/risk-and-compliance-management'}
          ].map((service, index) => (
            <Link href={service.link} key={index}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.2 }}
                className="flex flex-col justify-between h-full bg-white py-8 px-3 md:px-8 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all md:min-h-[23rem]"
              >
                <div className="flex flex-col">
                  <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-center space-x-4">
                    {service.icon}
                    <h3 className="text-2xl font-semibold text-[var(--shreeji-primary)]">{service.title}</h3>
                  </div>
                  <p className="mt-4 text-gray-700">{service.description}</p>
                </div>
                
                <div className="text-[var(--shreeji-primary)] inline-block">Explore {service.title} →</div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Client Benefits Section */}
      <div className="py-20 px-3 md:px-8 bg-[#f9f8f6] text-center">
        <h2 className="text-3xl font-semibold text-[var(--shreeji-primary)]">Benefits of Our BPO Services</h2>
        <p className="mt-6 text-lg max-w-4xl mx-auto text-gray-700">
          Outsourcing business processes to us offers your organization a range of <strong>benefits</strong> that will lead to <strong>increased productivity</strong>, <strong>cost savings</strong> and a <strong>stronger focus</strong> on your core services. Here’s why our clients love working with us:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {[
            {
              icon: <CheckCircle size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Cost Efficiency",
              description: "Save on labor costs, office space, and employee benefits by outsourcing non-core tasks to our professional team. Outsourcing allows businesses to leverage economies of scale and reduce overhead.",
            },
            {
              icon: <Users size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Expert Talent",
              description: "Leverage our skilled professionals who specialize in areas such as customer support, risk management, and technical services. We provide highly trained professionals who seamlessly integrate into your operations.",
            },
            {
              icon: <Phone size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Improved Customer Experience",
              description: "Our customer service specialists provide consistent, high-quality support that elevates customer satisfaction and loyalty. We help build lasting relationships between you and your customers.",
            },
            {
              icon: <Clipboard size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Focus on Core Business",
              description: "Free up your resources to focus on strategic initiatives, while we manage your routine processes efficiently. You can grow your business without worrying about operational tasks.",
            },
            {
              icon: <ShieldCheck size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Enhanced Risk Management",
              description: "Outsource risk management functions to ensure your organization remains compliant with legal and industry standards. Our services help mitigate business risks and safeguard your operations.",
            },
            {
              icon: <Settings size={50} className="text-[var(--shreeji-primary)]" />,
              title: "Scalable Solutions",
              description: "Our services scale with your business needs, enabling you to ramp up or down without worrying about resource management. Whether expanding or optimizing, we offer flexibility at every stage of your business growth.",
            }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.2 }}
              className="bg-white py-8 px-3 md:px-8 rounded-xl shadow-lg hover:scale-105 transform transition-all"
            >
              <div className="flex flex-col md:flex-row gap-2 md:gap-0 items-center justify-center md:text-start space-x-4">
                {benefit.icon}
                <h3 className="text-xl font-semibold text-[var(--shreeji-primary)]">{benefit.title}</h3>
              </div>
              <p className="mt-4 text-gray-700 md:text-start">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Client Testimonials Section */}
      <div className="py-20 px-8 bg-[#f5f5f5] text-center hidden">
        <h2 className="text-3xl font-semibold text-[var(--shreeji-primary)]">What Our Clients Say</h2>
        <div className="mt-10">
          <blockquote className="text-lg font-semibold text-gray-700 max-w-2xl mx-auto">
            “Working with this BPO team has transformed our operations. Their professionalism, efficiency, and commitment to quality are unparalleled.”
            <footer className="mt-4 text-[var(--shreeji-primary)]">– Lombe Lusale, Ballo Innovations</footer>
          </blockquote>
          <blockquote className="mt-8 text-lg font-semibold text-gray-700 max-w-2xl mx-auto">
            “We rely on their outsourcing services for multiple processes, and the results speak for themselves. Cost-effective and always on time.”
            <footer className="mt-4 text-[var(--shreeji-primary)]">– Lombe Lusale, Ballo Innovations</footer>
          </blockquote>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center py-16 bg-[var(--shreeji-primary)] text-white shadow-inner">
        <h2 className="text-3xl font-semibold">Let’s Optimize Your Business Processes</h2>
        <p className="mt-2 text-lg mb-5">Start improving efficiency, reducing costs, and enhancing service delivery today.</p>
        <ContactModal />
      </div>

    </div>
  );
}
