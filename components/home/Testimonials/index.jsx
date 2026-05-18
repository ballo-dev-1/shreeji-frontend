import Image from "next/image";
import bpo from "@/public/elements/bpo.jpg";
import liveChat from "@/public/elements/live-chat.png";
import laptop from "@/public/elements/laptop.png";
import factory from "@/public/elements/factory.png";
import "./style.scss";
import { Quote, Star, UserRound } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Miriam Banda",
      testimonial: "Shreeji Investments transformed our IT infrastructure seamlessly. Their expertise and dedication made a real difference to our operations. Highly recommend them for any enterprise solutions.",
      title: "CEO of Zenith Holdings",
    },
    {
      name: "Dr. Andrew Mwila",
      testimonial: "We partnered with Shreeji for our school's digital upgrade, and the results were outstanding. Reliable service, excellent support, a truly professional team!",
      title: "Head of Academic Technology",
    },
    {
      name: "Joseph Zulu",
      testimonial: "From procurement to deployment, Shreeji Investments delivered exactly what we needed, on time and within budget. A trusted technology partner for public sector projects.",
      title: "ICT Officer, Ministry of Education",
    } 
  ]
  return (
    <section className="testimonials-section flex-center text-white py-20 md:px-10">
      <p>Testimonials</p>
      <h2 className="font-bold text-4xl text-center px-10 md:px-32 mt-5 mb-10">
        What Our Clients Say
      </h2>
      <div className="flex w-full gap-5 md:gap-10 md:justify-center overflow-auto">        
        { testimonials.map((i) => (
          <figure className="snip1533">
            <figcaption className="flex flex-col justify-between h-full">
              <blockquote>
                {/* <Quote
                  strokeWidth={3}
                  fill="black"
                  className=" absolute text-black -top-3 left-0 right-0 m-auto rounded-full"
                /> */}
                <p>
                  {i.testimonial}
                </p>
              </blockquote>
              <div>
                <h3>{i.name}</h3>
                <h4>{i.title}</h4>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
