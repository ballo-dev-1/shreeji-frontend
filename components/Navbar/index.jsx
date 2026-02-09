"use client";

import { useState, useEffect, useRef } from "react";
import { getAllProductsList } from "@/app/lib/client/products";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/public/logos/Shreeji Logos 3.png";
import logo2 from "@/public/logos/Shreeji Logos w2.png";
import "./style.scss";
import ThemeBtn from "./ThemeBtn";
import { ChevronDown } from "lucide-react";
import CartButton from "./CartButton";
import WishlistButton from "./WishlistButton";
import ProfileButton from "./ProfileButton";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import { useClientAuth } from "@/app/contexts/ClientAuthContext";

function NotificationBellWrapper() {
  const { isAuthenticated } = useClientAuth();
  if (!isAuthenticated) return null;
  return <NotificationBell />;
}

const Navbar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false);
  const [productCategories, setProductCategories] = useState([]);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const [isMobileServicesOpen, setIsMobileServicesOpen] = useState(false);
  
  const productMenuRef = useRef(null);
  const serviceMenuRef = useRef(null);
  const [productMenuStyle, setProductMenuStyle] = useState({});
  const [serviceMenuStyle, setServiceMenuStyle] = useState({});

  const links = {
    services: [
      { 
        'name': 'ICT Solutions',
        'link': '/services/it-solutions',
        'sub-links': [
          {
            'title': 'Hardware & Infrastructure',
            'link': '/services/it-solutions/hardware-and-infrastructure'
          },
          {
            'title': 'System & Platform Development',
            'link': '/services/it-solutions/system-and-platform-development'
          },
          {
            'title': 'IT Consulting & Managed Services',
            'link': '/services/it-solutions/it-consulting-and-managed-services'
          },
        ]
      },
      {
        'name': 'Enterprise-Level Printing & Scanning',
        'link': '/services/enterprise-printing-and-scanning',
        'sub-links': [
          {
            'title': 'Printing',
            'link': '/services/enterprise-printing-and-scanning/printing'
          },
          {
            'title': 'Document Scanning',
            'link': '/services/enterprise-printing-and-scanning/scanning'
          },
        ]
      },
      {
        'name': 'Business Process Outsourcing (BPO)',
        'link': '/services/bpo',
        'sub-links': [
          {
            'title': 'Back Office Support',
            'link': '/services/bpo/back-office-support'
          },
          {
            'title': 'Customer Support Services',
            'link': '/services/bpo/customer-support-services'
          },
          {
            'title': 'Tele-Marketing',
            'link': '/services/bpo/tele-marketing-services'
          },
          {
            'title': 'SIM Registration & Management',
            'link': '/services/bpo/sim-registration-and-management'
          },
          // {
          //   'title': 'Mobile Money Services',
          //   'link': '/services/bpo/mobile-money-services'
          // },
          {
            'title': 'Quality Assurance',
            'link': '/services/bpo/quality-assurance'
          },
          {
            'title': 'Risk & Compliance Management',
            'link': '/services/bpo/risk-and-compliance-management'
          },
        ]
      },
      {
        'name': 'Skylift Services',
        'link': '/services/skylift',
        'sub-links': [
          {
            'title': 'Skylift Services',
            'link': '/services/skylift'
          },
        ]
      },
    ]
  }
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Always set scrolled to true on checkout page
    if (pathname === "/checkout") {
      setIsScrolled(true);
      return;
    }
    
    if (window.innerWidth < 1024) {
      setIsScrolled(true);
    }
    const handleScroll = () => {
      if (window.innerWidth >= 1024) {
        setIsScrolled(window.scrollY > 10)
      } else {
        setIsScrolled(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);
  

  useEffect(() => {
    // Fetch categories from database instead of static data
    const fetchCategories = async () => {
      try {
        const allProducts = await getAllProductsList();
        
        // Group categories with their subcategories
        const categoryMap = allProducts.reduce((acc, product) => {
          // Only process products with valid categories
          if (!product.category || typeof product.category !== 'string' || !product.category.trim()) {
            return acc;
          }
          
          const category = product.category.trim();
          if (!acc[category]) {
            acc[category] = new Set();
          }
          
          // Only add valid subcategories
          if (product.subcategory && typeof product.subcategory === 'string' && product.subcategory.trim()) {
            acc[category].add(product.subcategory.trim());
          }
          
          return acc;
        }, {});

        // Convert sets to arrays and filter out any empty categories
        const structuredCategories = Object.entries(categoryMap)
          .filter(([category]) => category && category.trim()) // Ensure category is valid
          .map(([category, subcategories]) => ({
            category,
            subcategories: [...subcategories].sort(), // Sort subcategories alphabetically
          }))
          .sort((a, b) => a.category.localeCompare(b.category)); // Sort categories alphabetically

        setProductCategories(structuredCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setProductCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileProductsOpen(false);
      setIsMobileServicesOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Dynamic positioning for dropdowns to prevent overflow
  useEffect(() => {
    const calculatePosition = (ref, setStyle) => {
      if (!ref.current) return;
      
      const dropdown = ref.current;
      const parentLi = dropdown.closest('li');
      if (!parentLi) return;
      
      const parentRect = parentLi.getBoundingClientRect();
      const dropdownWidth = dropdown.scrollWidth;
      const viewportWidth = window.innerWidth;
      const minPadding = 16;
      
      // Start with left: 0 (aligned to parent's left edge)
      let leftValue = 0;
      let rightValue = 'auto';
      
      // Check if dropdown would overflow on the right
      if (parentRect.left + dropdownWidth > viewportWidth - minPadding) {
        // Calculate how much we need to shift left
        const overflow = (parentRect.left + dropdownWidth) - (viewportWidth - minPadding);
        leftValue = -overflow;
        
        // Ensure we don't go negative beyond parent's left edge
        if (leftValue < -parentRect.left + minPadding) {
          // If we can't fit, align to right edge of parent instead
          rightValue = 0;
          leftValue = 'auto';
        }
      }
      
      setStyle({ 
        left: leftValue === 'auto' ? 'auto' : `${leftValue}px`,
        right: rightValue
      });
    };

    const updatePositions = () => {
      if (isProductMenuOpen && productMenuRef.current) {
        calculatePosition(productMenuRef, setProductMenuStyle);
      }
      if (isServiceMenuOpen && serviceMenuRef.current) {
        calculatePosition(serviceMenuRef, setServiceMenuStyle);
      }
    };

    // Initial calculation
    if (isProductMenuOpen || isServiceMenuOpen) {
      setTimeout(updatePositions, 10);
    }

    // Recalculate on window resize
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('resize', updatePositions);
    };
  }, [isProductMenuOpen, isServiceMenuOpen, productCategories]);

  return (
    <header id="website-navigation">
      <nav className={`fixed z-50 w-full transition-all duration-300 ${isScrolled || pathname.includes('/services/enterprise-printing-and-scanning/printing/') ? "scrolled-nav bg-opacity-100 text-[var(--primary)]" : "bg-white/0"} ${pathname.includes("/products") ? 'scrolled-nav bg-opacity-100 text-[var(--primary)]' : ''}`}>
        <div className="container mx-auto flex items-center p-2">
          <Link href="/" className="text-lg font-bold">
            <Image src={logo} alt="Logo" quality={100} className="logo-light h-10 md:h-16 w-auto nav-logo" />
            <Image src={logo2} alt="Logo" quality={100} className="logo-dark absolute top-[0.5rem] h-10 md:h-16 w-auto nav-logo" />
          </Link>

          {/* Navbar Links */}
          <ul id="navbar-links" className={`flex space-x-6 pl-1 py-5 rounded-lg ${isMobileMenuOpen ? 'mobile-menu-open': 'mobile-menu-closed'}`}>
            <li><Link href="/" className={`${pathname === "/" ? "active-link" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>            

            {/* Mege Menus Start */}

            {/* Desktop Mega Menu Trigger */}   
            <li className="group flex gap-1 relative">
              <Link href="/products" className={`${pathname === "/products" ? "active-link" : ""}`} onMouseEnter={() => setIsProductMenuOpen(true)} onMouseLeave={() => setIsProductMenuOpen(false)}>
                Products
              </Link>
              <button onMouseEnter={() => setIsProductMenuOpen(true)} onMouseLeave={() => setIsProductMenuOpen(false)} className="focus:outline-none -ml-5 pl-5">
                <ChevronDown size={24} />
              </button>

              {/* Mega Menu */}
              {isProductMenuOpen && (
                <div 
                  ref={productMenuRef}
                  className="pt-5 absolute top-full"
                  style={{
                    left: productMenuStyle.left !== undefined ? productMenuStyle.left : 0,
                    right: productMenuStyle.right !== undefined ? productMenuStyle.right : 'auto',
                    maxWidth: 'calc(100vw - 2rem)'
                  }}
                  onMouseEnter={() => setIsProductMenuOpen(true)} 
                  onMouseLeave={() => setIsProductMenuOpen(false)}
                >
                  <div className="mega-menu max-w-full">
                    {productCategories && productCategories.map(({ category, subcategories }, index) => (
                      <div key={`category-${index}-${category}`}>                        
                        <Link href={`/products/${encodeURIComponent(category)}`} className="font-medium cursor-pointer relative">
                          <h4 className="font-bold text-lg">{category}</h4>
                          <span className="absolute mt-1 h-[2px] w-full bg-[#dbd4c0] rounded-full" />
                        </Link>                       

                        {subcategories[0] ? (
                          <ul className="mt-5 space-y-2">
                            {subcategories.map((sub, subIndex) => (
                              <li key={subIndex}>
                                <Link
                                  href={`/products/${encodeURIComponent(category)}/${encodeURIComponent(sub)}`}
                                  className={`font-medium cursor-pointer ${pathname === `/products/${encodeURIComponent(category)}/${encodeURIComponent(sub)}` ? "mega-menu-active-link  " : ""}`}
                                >
                                    {sub}
                                </Link>
                              </li>                            
                            ))}                          
                          </ul>
                          ) : (
                            <ul className="mt-5 space-y-2">
                              <li>
                                <Link className={`font-medium cursor-pointer ${pathname === `/products/${encodeURIComponent(category)}` ? "mega-menu-active-link  " : ""}`} href={`/products/${encodeURIComponent(category)}`}>{category}</Link>
                              </li>                      
                          </ul>
                          )
                        }                        
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>

            <li className="group flex items-center relative">
              <Link
                href="/services"
                className={` ${
                  pathname == "/services"
                    ? "active-link"
                    : ""
                }`}
                onMouseEnter={() => setIsServiceMenuOpen(true)} onMouseLeave={() => setIsServiceMenuOpen(false)}
              >
                Services
              </Link>
              <button
                onMouseEnter={() => setIsServiceMenuOpen(true)} onMouseLeave={() => setIsServiceMenuOpen(false)}
                className="mt-[1px] focus:outline-none -ml-5 pl-5"
              >
                <ChevronDown size={24} />
              </button>

              {/* Mega Menu */}
              {isServiceMenuOpen && (
                <div
                  ref={serviceMenuRef}
                  className="mega-menu-container pt-5 absolute top-full"
                  style={{
                    left: serviceMenuStyle.left !== undefined ? serviceMenuStyle.left : 0,
                    right: serviceMenuStyle.right !== undefined ? serviceMenuStyle.right : 'auto',
                    maxWidth: 'calc(100vw - 2rem)'
                  }}
                  onMouseEnter={() => setIsServiceMenuOpen(true)} onMouseLeave={() => setIsServiceMenuOpen(false)}
                >                  
                  <div className="mega-menu">
                    {links.services.map((service, index) => (
                      <div key={service}>
                        <Link href={service['link']} className="relative">
                          <h4 className="font-bold text-lg">{service['name']}</h4>
                          <span className="absolute mt-1 h-[2px] w-full bg-[#dbd4c0] rounded-full" />
                        </Link>

                        <ul className="mt-5 space-y-2">
                          {service['sub-links'].map((link, index) => (
                            <li key={index}>
                              <Link
                                href={link['link']}
                                className={`${pathname === link['link'] ? "mega-menu-active-link  " : ""}`}
                              >
                                {link['title']}
                              </Link>
                            </li>
                          ))}                        
                        </ul>
                      </div>
                    ))}                                 
                  </div>
                </div>
              )}
            </li>

            {/* Mobile Mega Menu Products */}
            <li className="lg:hidden mobile-link">
              <div className="flex items-center justify-between pr-4">
                <Link href="/products" className={`${ pathname == "/products" ? "active-link" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                  Products
                </Link>
                <button
                  aria-expanded={isMobileProductsOpen}
                  aria-controls="mobile-products-submenu"
                  className="focus:outline-none"
                  onClick={() => setIsMobileProductsOpen(prev => !prev)}
                >
                  <ChevronDown size={24} className={`${isMobileProductsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}`} />
                </button>
              </div>
              {isMobileProductsOpen && (
                <div id="mobile-products-submenu" className="collapse-content mt-2">
                  {productCategories && productCategories.map(({ category, subcategories }, index) => (
                    <div key={`${category}-${index}`}>
                      <Link href={`/products/${encodeURIComponent(category)}`} className="font-medium cursor-pointer relative" onClick={() => setIsMobileMenuOpen(false)}>
                        <h4 className="font-bold text-lg">{category}</h4>
                        <span className="absolute mt-1 h-[2px] w-full bg-[#dbd4c0] rounded-full" />
                      </Link>
                      {subcategories[0] ? (
                        <ul className="mt-5 space-y-2">
                          {subcategories.map((sub, subIndex) => (
                            <li key={`${category}-${sub}-${subIndex}`}>
                              <Link
                                href={`/products/${encodeURIComponent(category)}/${encodeURIComponent(sub)}`}
                                className={`font-medium cursor-pointer ${pathname === `/products/${encodeURIComponent(category)}/${encodeURIComponent(sub)}` ? "mega-menu-active-link  " : ""}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {sub}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="mt-5 space-y-2">
                          <li>
                            <Link className={`font-medium cursor-pointer ${pathname === `/products/${encodeURIComponent(category)}` ? "mega-menu-active-link  " : ""}`} href={`/products/${encodeURIComponent(category)}`} onClick={() => setIsMobileMenuOpen(false)}>
                              {category}
                            </Link>
                          </li>
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>

            {/* Mobile Mega Menu Services */}
            <li className="lg:hidden mobile-link">
              <div className="flex items-center justify-between pr-4">
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/services" className={`${ pathname == "/services" ? "active-link" : ""}`}>
                  Services
                </Link>
                <button
                  aria-expanded={isMobileServicesOpen}
                  aria-controls="mobile-services-submenu"
                  className="focus:outline-none"
                  onClick={() => setIsMobileServicesOpen(prev => !prev)}
                >
                  <ChevronDown size={24} className={`${isMobileServicesOpen ? 'rotate-180 transition-transform' : 'transition-transform'}`} />
                </button>
              </div>
              {isMobileServicesOpen && (
                <div id="mobile-services-submenu" className="collapse-content mt-2">
                  {links.services.map((service, index) => (
                    <div key={`${service['name']}-${index}`}>
                      <Link href={service['link']} className="relative" onClick={() => setIsMobileMenuOpen(false)}>
                        <h4 className="font-bold text-lg">{service['name']}</h4>
                        <span className="absolute mt-1 h-[2px] w-full bg-[#dbd4c0] rounded-full" />
                      </Link>
                      <ul className="mt-5 space-y-2">
                        {service['sub-links'].map((link, subIndex) => (
                          <li key={`${service['name']}-${link['title']}-${subIndex}`}>
                            <Link
                              href={link['link']}
                              className={`${pathname === link['link'] ? "mega-menu-active-link  " : ""}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {link['title']}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>
            
            {/* Mege Menus End */}

            <li><Link href="/about-us" className={`${pathname === "/about-us" ? "active-link" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>About Us</Link></li>

            <li>
              <Link href="/collaborations" className={`${pathname === "/collaborations" ? "active-link" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>Collaborations</Link>
            </li>
            <li>
              <Link href="/contact-us" className={`${pathname === "/contact-us" ? "active-link" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
            </li>
            
            {/* Mobile Action Buttons */}
            <li className="lg:hidden mobile-link">
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/20">
                <div onClick={() => setIsMobileMenuOpen(false)}>
                  <CartButton />
                </div>
                <div onClick={() => setIsMobileMenuOpen(false)}>
                  <WishlistButton />
                </div>
                <NotificationBellWrapper />
                <div onClick={() => setIsMobileMenuOpen(false)}>
                  <ProfileButton />
                </div>
                <ThemeBtn isScrolled={isScrolled} />
              </div>
            </li>
          </ul>

          <div className="ml-2 hidden lg:flex items-center gap-3">
            <CartButton />
            <WishlistButton />
            <NotificationBellWrapper />
            <ProfileButton />
            <ThemeBtn isScrolled={isScrolled} />
          </div>
          
          {/* Mobile Menu Button */}
          <button className="fixed right-5 lg:hidden focus:outline-none" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg className="w-9 h-9" fill="none" stroke={isMobileMenuOpen ? "white" : isScrolled ? "#807045" : "white"} strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
