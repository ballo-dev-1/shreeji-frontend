import "./style.scss";
import footerLogo from "@/public/logos/Shreeji Logos w1.png";
import footerBg from "@/public/backgrounds/footer-bg.jpeg";
import Image from "next/image";
import { Facebook, Linkedin } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <section className="footer-section relative">
      <div className="footer-overlay" />
      <div className="footer-content z-[2] flex flex-col md:flex-row text-white gap-5 relative flex-wrap">
        <div className="footer-logo w-full sm:w-[30%] flex flex-col gap-10 mb-10 sm:mb-0 md:mr-10">
          <Image
            src={footerLogo}
            alt="Shreeji"
            quality={100}
            className="w-full h-auto md:h-16"
          />
          <p className="text-center md:text-left">
            At Shreeji Investments, we deliver proven excellence across IT, BPO,
            print advertising, and skylift services, driven by innovation and
            client satisfaction.
          </p>
        </div>

        <div className="footer-contact w-full sm:w-[22%] flex-1 flex md:hidden flex-col gap-5 mb-10 sm:mb-0 text-center">
          <h2>Opening Time</h2>
          <p>Mon - Fri: 08:00am - 05:00pm</p>
          <p>Shreeji House, Plot No. 1209, Addis Ababa Drive</p>
          <p>+260 97 774 0588</p>
          <p>sales@shreeji.co.zm</p>
        </div>

        <div className="footer-info w-full sm:w-[22%] flex-1 flex flex-col gap-5 mb-10 sm:mb-0 text-center md:text-left">
          <h2>Information</h2>
          <p>
            <Link href="/about-us" className="hover:underline">
              About Us
            </Link>
          </p>
          <p>
            <Link href="/terms-and-conditions" className="hover:underline">
              Terms & Conditions
            </Link>
          </p>
          <p>Privacy & Policy</p>
        </div>

        <div className="footer-social w-full sm:w-[22%] flex-1 flex flex-col gap-5 mb-10 sm:mb-0 items-center md:items-start">
          <h2>Our Socials</h2>
          <p className="flex items-center gap-2">
            <a
              href="https://zm.linkedin.com/company/shreeji-investments-ltd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:underline"
              aria-label="SHREEJI on LinkedIn"
            >
              <Linkedin strokeWidth={1} color="#807045" />
              <span className="pt-1">LinkedIn</span>
            </a>
          </p>
          <p className="flex items-center gap-2">
            <a
              href="https://www.facebook.com/Shreeji.Zambia/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:underline"
              aria-label="SHREEJI on Facebook"
            >
              <Facebook color="#807045" strokeWidth={1} />
              <span className="py-1">Facebook</span>
            </a>
          </p>
        </div>

        <div className="footer-contact w-full sm:w-[22%] flex-1 hidden md:flex flex-col gap-5 mb-10 sm:mb-0 text-center md:text-left">
          <h2>Opening Time</h2>
          <p>Mon - Fri: 08:00am - 05:00pm</p>
          <p>Shreeji House, Plot No. 1209, Addis Ababa Drive</p>
          <p>+260 97 774 0588</p>
          <p>sales@shreeji.co.zm</p>
        </div>
      </div>

      <div className="flex flex-col justify-center items-center z-[2] relative text-white mt-5 md:mt-14 gap-2 text-center md:text-left">
        <p className="text-[1rem] text-[#ece5de] font-extralight">
          Designed & created by <Link href="https://www.balloinnovations.com/" className="font-semibold hover:underline">Ballo Innovations</Link>
        </p>
        <p>
          ©2026 Shreeji Investments Limited. All Rights Reserved
        </p>
      </div>
    </section>
  );
};

export default Footer;
