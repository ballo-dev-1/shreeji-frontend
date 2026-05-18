import Image from "next/image";
import bpo from "@/public/elements/bpo.jpg";
import liveChat from "@/public/elements/live-chat.png";
import laptop from "@/public/elements/laptop.png";
import factory from "@/public/elements/factory.png";
import "./style.scss";
import { Printer, Triangle } from "lucide-react";
import Link from "next/link";

const OurSolutions = () => {
  return (
    <section className="our-solutions-section flex-center pt-10 pb-52 px-5 md:px-16">
      <h2 className="text-4xl text-center md:text-start pb-10 md:pb-16 relative z-[2]">Solutions That We Deliver</h2>
      <div className="flex flex-col md:flex-row w-full gap-10">
        <div className="flex flex-col justify-between flex-1 gap-5 md:gap-16 relative z-[2]">
          <Link href="/services/it-solutions" className="flex flex-col gap-3 service-hover">
            <div className="flex gap-5 items-center">
              <div className="solution-card-img-container px-1 py-2 rounded-[10px]">
                <Image
                  src={laptop}
                  alt="Shreeji"
                  quality={100}
                  className="w-10 h-10 object-contain grayscale"
                />
              </div>

              <h3 className="font-bold text-2xl">Shreeji Computer IT</h3>
            </div>

            <div>
              <p>
                Our ICT division specialises in supplying,
                supporting, and customising IT equipment to meet your business's
                specific requirements.
              </p>
            </div>
          </Link>

          <Link href="/services/enterprise-printing-and-scanning" className="flex flex-col gap-3 service-hover">
            <div className="flex gap-5 items-center">
              <div className="solution-card-img-container px-1 py-2 rounded-[10px] text-black">
                <Printer strokeWidth={1.1} className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-2xl">Shreeji Print Advertising</h3>
            </div>

            <div>
              <p>
                Our Print Advertising division offers high-quality printing
                solutions, including large-format printing, lithographic paper,
                signage, and fine-art (gi- clée) printing.
              </p>
            </div>
          </Link>
        </div>

        <div className="middle-text-container flex-center md:w-[50%] relative flex-1">
          <h4 className="font-bold text-6xl text-center mb-10 relative z-[2]">
            Over <span className="text-[var(--primary)]">25 Years</span> of
            Expertise!
          </h4>
          <Image
            src={bpo}
            alt="SHreeji"
            quality={100}
            className="hidden z-[2] rounded-2xl w-[20rem] h-[27rem] object-cover object-[70%] grayscale"
          />

          <div className="middle-text-overlay absolute z-[1]" />
          <Triangle color="var(--shreeji-primary)" fill="var(--shreeji-primary)" strokeWidth={3} className="absolute z-[0] rounded-3xl w-[40%] h-[40%] rotate-[140deg] left-[-2%] top-[-5%]" />
          <Triangle color="var(--shreeji-primary)" fill="var(--shreeji-primary)" strokeWidth={3} className="absolute z-[0] rounded-3xl w-[40%] h-[40%] rotate-[230deg] right-[-2%] bottom-[-5%]" />
        </div>

        <div className="flex flex-col justify-between flex-1 md:text-right gap-5 md:gap-16 relative z-[2]">
          <Link href="/services/bpo" className="flex flex-col gap-3 service-hover service-hover-3">
            <div className="flex flex-row-reverse md:flex-row gap-5 items-center justify-end">
              <h3 className="font-bold text-2xl">
                Shreeji Business Process Outsourcing
              </h3>
              <div className="solution-card-img-container px-1 py-2 rounded-[10px]">
                <Image
                  src={liveChat}
                  alt="SHreeji"
                  quality={100}
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>

            <div>
              <p>
                We provide tailored BPO solutions, with a strong focus on the
                telecom sector, to optimise your operations and improve customer
                experiences.
              </p>
            </div>
          </Link>

          <Link href="/services/skylift" className="flex flex-col gap-3 service-hover service-hover-4">
            <div className="flex flex-row-reverse md:flex-row gap-5 items-center justify-end">
              <h3 className="font-bold text-2xl">Shreeji Skylift Services</h3>
              <div className="solution-card-img-container px-1 py-2 rounded-[10px]">
                <Image
                  src={factory}
                  alt="SHreeji"
                  quality={100}
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>

            <div>
              <p>
                Our cherry-picker skylift services provide safe and efficient
                solutions for elevated tasks such as maintenance, installations,
                and inspections.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OurSolutions;
