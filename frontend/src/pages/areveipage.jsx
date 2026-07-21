import React, { useEffect, useState, useRef } from "react";
import {
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Check,
    Plus,
    Minus,
    X,
    Sparkles,
    Sun,
    Moon,
    Menu,
    Hammer,
    Settings2,
    BarChart3,
    TrendingUp,
    PauseCircle,
    EyeOff,
    Activity,
    Send,
} from "lucide-react";
import {
    navItems,
    companyLogos,
    pillars,
    dashboardCards,
    processSteps,
    engines,
    audiences,
    comparison,
    testimonials,
    pricingPlans,
    faqs,
} from "@/lib/mock";
import { Link } from "react-router-dom";
import MarketingNav from "@/components/MarketingNav";
// import SocialIcons from "@/components/Footer/SocialIcons";
export const areveiEntity = {
  brandName: "Arevei Technologies",
  alternateName: "Arevei",
  legalName: "Shakyawar Mediatech LLP",
  foundingDate: "2023",
 
  description:
    "Arevei Technologies is an AI-powered marketing agency in India helping businesses grow through websites, SEO, branding, performance marketing, automation, and social media management.",
  phone: "+91 962 5440 855",
  supportPhone: "+91 120 4534 296",
  salesEmail: "marketing@arevei.com",
  supportEmail: "admin@arevei.com",
  peopleEmail: "people@arevei.com",
  registeredAddress: {
    streetAddress: "Shop No 2, 72/A New Patel Nagar, Konch Jalaun Bypass",
    addressLocality: "Orai",
    addressRegion: "Uttar Pradesh",
    addressCountry: "IN",
  },
  operationalAddress: {
    streetAddress: "7th Avenue, Gaur City 1, Greater Noida West",
    addressLocality: "Noida",
    addressRegion: "Delhi NCR",
    postalCode: "201318",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.linkedin.com/company/areveiofficial/",
    "https://twitter.com/areveiofficial",
    "https://www.facebook.com/TheAreVei/",
  ],
}

/* ================= Theme Hook ================= */
function useTheme() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("arevei-theme");
        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        const isDark = saved === "dark" || (!saved && prefersDark);
        setDark(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);

    useEffect(() => {
        const handler = () =>
            setDark(document.documentElement.classList.contains("dark"));
        window.addEventListener("arevei-theme-change", handler);
        return () => window.removeEventListener("arevei-theme-change", handler);
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("arevei-theme", next ? "dark" : "light");
        window.dispatchEvent(new Event("arevei-theme-change"));
    };

    return { dark, toggle };
}

/* ================= Utility ================= */
function useInView(ref, threshold = 0.2) {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const io = new IntersectionObserver(
            ([e]) => e.isIntersecting && setInView(true),
            { threshold },
        );
        io.observe(ref.current);
        return () => io.disconnect();
    }, [ref, threshold]);
    return inView;
}


/* ================= Decorative SVG Blobs ================= */
function BlobDecor({
    className,
    color = "currentColor",
    variant = 0,
}) {
    const paths = [
        // variant 0 — wide organic
        "M47.1,-67.9C59.3,-61.2,66.7,-46.5,72.3,-31.3C77.8,-16,81.4,-0.2,79.1,14.9C76.9,30,68.9,44.3,57.5,54.3C46.1,64.3,31.4,69.9,15.7,73.4C0,76.9,-16.7,78.3,-31.2,73.6C-45.7,68.9,-57.9,58.2,-65.1,44.9C-72.4,31.7,-74.7,15.8,-74.3,0.2C-74,-15.4,-71.1,-30.8,-63,-43C-54.9,-55.2,-41.6,-64.2,-27.8,-69.7C-14,-75.2,0.2,-77.1,14.7,-75.4C29.2,-73.7,34.9,-74.6,47.1,-67.9Z",
        // variant 1 — tall spiky
        "M38.4,-64.1C48.8,-56.9,55.5,-44.6,62.3,-31.8C69.2,-19,76.2,-5.6,76.1,8.1C76,21.8,68.8,35.7,58.8,46.3C48.8,56.9,36,64.1,22.1,69.1C8.2,74.1,-6.7,76.9,-20.5,73.8C-34.4,70.7,-47.3,61.7,-56,49.6C-64.8,37.5,-69.5,22.3,-71.5,6.5C-73.6,-9.4,-73,-25.9,-66,-39.2C-59,-52.6,-45.6,-62.9,-31.8,-68.9C-17.9,-74.9,-3.4,-76.7,9.9,-73.4C23.2,-70.2,28,-71.3,38.4,-64.1Z",
        // variant 2 — round chunky
        "M53.7,-79.1C66.7,-70.9,72.6,-53.2,75.9,-36.1C79.2,-19.1,80,-2.7,76.4,12.3C72.8,27.3,64.9,40.9,53.6,51.3C42.3,61.7,27.5,68.9,11.7,72.3C-4.1,75.7,-20.9,75.3,-35.8,69.5C-50.7,63.7,-63.7,52.5,-70.3,38.4C-77,24.3,-77.4,7.3,-74.2,-8.4C-71,-24.1,-64.1,-38.4,-53.5,-48.8C-42.9,-59.3,-28.5,-66,-13.4,-68.9C1.7,-71.8,17.5,-70.9,30.8,-69.5C44.1,-68.1,40.7,-87.3,53.7,-79.1Z",
    ];
    return (
        <svg
            viewBox="-100 -100 200 200"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path d={paths[variant % paths.length]} fill={color} />
        </svg>
    );
}

/* ================= Logo ================= */
const Logo = () => (
    <a href="/" className="flex items-center gap-2">
        <img
            src="/assets/images/NewAreveiFavicon.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 object-contain"
        />
        <span className="font-display text-[22px] tracking-tight text-black dark:text-white">
            Arevei
        </span>
    </a>
);

const actionHref = "#demo-form";

const landingFooterCols = [
    {
        title: "Explore",
        links: [
            { name: "Hero", link: "/#top" },
            { name: "Trusted Brands", link: "/#trusted" },
            { name: "The Reality", link: "/#reality" },
            { name: "What Arevei Does", link: "/#what-arevei-does" },
        ],
    },
    {
        title: "Platform",
        links: [
            { name: "Video", link:"/landing#video" },
            { name: "Results Engine", link:"/landing#results" },
            { name: "Services", link:"/landing#services" },
            { name: "Process", link:"/landing#process" },
        ],
    },
    {
        title: "Why Arevei",
        links: [
            { name: "Comparison", link:"/landing#why-arevei" },
            { name: "Use Cases", link:"/landing#use-cases" },
            { name: "Clientele", link:"/landing#clientele" },
            { name: "Pricing", link:"/landing#pricing" },
        ],
    },
    {
        title: "Action",
        links: [
            { name: "Book a Demo", link:"/landing#demo-form" },
            { name: "Blog", link:"/landing#blog" },
            { name: "FAQ", link:"/landing#faq" },
            { name: "Final CTA", link:"/landing#final-cta" },
        ],
    },
];

/* ================= Navbar ================= */
export function NewAreveiNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { dark, toggle } = useTheme();

    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", on);
        return () => window.removeEventListener("scroll", on);
    }, []);

    return (
        <div
            className={`fixed top-0 inset-x-0 z-50 flex justify-center transition-all duration-500 ${scrolled ? "pt-3" : "pt-5"}`}
        >
            <nav
                className={`w-[calc(100%-2rem)] max-w-[1400px] flex items-center justify-between px-4 md:px-6 py-3 rounded-2xl border transition-all duration-500 ${scrolled
                    ? "bg-white/90 dark:bg-[#0F1117]/90 backdrop-blur-xl border-black/8 dark:border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]"
                    : "bg-white/70 dark:bg-[#0F1117]/70 backdrop-blur-md border-black/5 dark:border-white/8"
                    }`}
            >
                <Logo />
                <ul className="hidden md:flex items-center gap-1">
                    {navItems.map((it) => (
                        <li key={it.label}>
                            <a href={it.href || "#"} className="flex items-center gap-1 px-3 py-2 text-[14px] text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors">
                                <span className="link-hover">{it.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        onClick={toggle}
                        aria-label="Toggle theme"
                        className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/15 bg-white/60 dark:bg-black hover:bg-white dark:hover:bg-white/15 transition-colors"
                    >
                        {dark ? (
                            <Sun className="h-4 w-4 text-[#00E6C4]" />
                        ) : (
                            <Moon className="h-4 w-4 text-black" />
                        )}
                    </button>
                    <a href={actionHref} className="hidden sm:inline-flex px-4 md:px-5 py-2 rounded-full bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 text-[14px] font-medium transition-colors border border-black/10 dark:border-white/15 text-black dark:text-white">
                        Get Website Audit
                    </a>
                    <a href={actionHref} className="hidden sm:inline-flex px-4 md:px-5 py-2 rounded-full bg-black dark:bg-[#00E6C4] text-white dark:text-black text-[14px] font-medium hover:bg-neutral-800 dark:hover:bg-[#12f3d2] transition-colors">
                        Book a Demo
                    </a>
                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label="Open menu"
                        className="md:hidden h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/8 text-black dark:text-white"
                    >
                        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </nav>
            {mobileOpen && (
                <div className="absolute top-[82px] w-[calc(100%-2rem)] max-w-[1400px] rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#0F1413]/95 backdrop-blur-xl p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] md:hidden">
                    <div className="grid gap-1">
                        {navItems.map((it) => (
                            <div key={it.label}>
                                <a
                                    href={it.href || "#"}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center justify-between rounded-xl px-3 py-3 text-[14px] font-medium text-black dark:text-[#EDEFEE] hover:bg-black/5 dark:hover:bg-white/8"
                                >
                                    {it.label}
                                </a>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <a href={actionHref} onClick={() => setMobileOpen(false)} className="rounded-full border border-black/10 dark:border-white/15 px-4 py-2.5 text-center text-[13px] font-medium text-black dark:text-white">
                            Get Audit
                        </a>
                        <a href={actionHref} onClick={() => setMobileOpen(false)} className="rounded-full bg-black dark:bg-[#00E6C4] px-4 py-2.5 text-center text-[13px] font-medium text-white dark:text-black">
                            Book Demo
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================= Hero ================= */
function Hero() {
    return (
        <section id="top" className="relative pt-5 px-4">
            <div className="relative mx-auto max-w-[1400px] rounded-[28px] overflow-hidden min-h-[calc(100svh-7rem)] md:min-h-[88vh] flex items-center justify-center">
                {/* Day image — light mode */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105 transition-opacity duration-500 dark:opacity-0"
                    style={{ backgroundImage: "url(/hero-day.png)" }}
                />
                {/* Night image — dark mode */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105 transition-opacity duration-500 opacity-0 dark:opacity-100"
                    style={{ backgroundImage: "url(/hero-night.png)" }}
                />
                {/* Gradient overlay for headline legibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/85" />
                {/* Teal radial bloom behind headline */}
                <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#00E6C4]/8 blur-3xl" />
                {/* Lime accent glow bottom */}
                <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#C7F27A]/6 blur-3xl" />

                <div className="relative z-10 text-center max-w-[1100px] px-4 sm:px-6 py-16 sm:py-24">
                    {/* Badge pill */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 mb-8">
                        <Sparkles className="h-3.5 w-3.5 text-[#C7F27A] dark:text-[#00E6C4]" />
                        <span className="text-[12px] uppercase tracking-[0.18em] text-white/90">
                            AI Native Website Manager
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="display-hero text-white text-[clamp(2.8rem,11vw,4.4rem)] md:text-[6vw] lg:text-[82px] leading-[1.04] md:leading-[0.98]">
                        <span className="block">Turn your website into a</span>
                        {/* Lime highlight block — mt-4 creates deliberate gap above the block */}
                        <span className="block mt-2 sm:mt-4">
                            <span
                                className="inline bg-[#00E6C4] text-[#0A0D0C] px-3 py-1 leading-[1.6] sm:leading-[1.12]"
                                style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
                            >
                                <span className="">money-making</span>
                                {" "}machine.
                            </span>
                        </span>
                    </h1>

                    {/* Subline */}
                    <p className="mt-8 text-white/80 text-[15px] md:text-[18px] max-w-[600px] mx-auto leading-relaxed">
                        Arevei blends AI speed with senior human judgment to build, manage, and grow your website — end-to-end, under one retainer.
                    </p>

                    {/* CTAs */}
                    <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a href={actionHref} className="group px-7 py-3.5 rounded-full bg-[#00E6C4] text-black text-[14px] font-semibold dark:hover:bg-[#12f3d2] hover:scale-[1.02] transition-all shadow-[0_0_24px_#C7F27A40] dark:shadow-[0_0_24px_#00E6C440]">
                            <span className="inline-flex items-center gap-2">
                                Get Website Audit
                                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                        </a>
                        <a href={actionHref} className="px-7 py-3.5 rounded-full bg-transparent border border-white/30 text-white text-[14px] font-medium hover:bg-white/10 hover:border-white/55 transition-colors">
                            Book a Demo
                        </a>
                    </div>

                    {/* Social proof row */}
                    <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
                        <div className="flex -space-x-2">
                            {['#00E6C4', '#C7F27A', '#0F6E56', '#8A928F'].map((c, i) => (
                                <div key={i} className="h-7 w-7 rounded-full border-2 border-black/40 flex items-center justify-center text-[10px] font-bold text-[#0A0D0C]" style={{ backgroundColor: c }}>
                                    {['A', 'V', 'J', 'M'][i]}
                                </div>
                            ))}
                        </div>
                        <span className="text-[13px] text-white/55">
                            <span className="text-white font-semibold">40+</span> founders growing with Arevei
                        </span>
                        <span className="hidden sm:block text-white/25">·</span>
                        <span className="text-[13px] text-white/55">
                            <span className="text-[#C7F27A] dark:text-[#00E6C4] font-semibold">3.4×</span> avg. organic growth in 90 days
                        </span>
                    </div>
                </div>

                {/* Watch video card */}
                {/* <a
                    href="#video"
                    className="group absolute bottom-6 left-6 z-10 hidden md:flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl px-3 py-2.5 pr-4 max-w-[340px] shadow-lg hover:bg-white transition"
                >
                    <div className="h-10 w-14 rounded-lg bg-[#C7F27A] flex items-center justify-center">
                        <Play className="h-4 w-4 text-black fill-black" />
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] uppercase tracking-widest text-black/50 font-semibold">Watch</div>
                        <div className="text-[13px] text-black leading-tight">How Arevei manages your website — 90 seconds.</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-black/60 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a> */}

                {/* Scrolling indicator */}
                <div className="absolute bottom-8 right-8 z-10 hidden md:flex flex-col items-center gap-2">
                    <div className="w-px h-10 bg-gradient-to-b from-white/0 to-white/30" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 rotate-90 origin-center mt-2">Scroll</span>
                </div>
            </div>
        </section>
    );
}

/* ================= Logos Marquee ================= */
function LogosMarquee() {
    const list = [...companyLogos, ...companyLogos];
    return (
        <section id="trusted" className="py-14 overflow-hidden scroll-mt-28">
            <p className="text-center text-[13px] uppercase tracking-[0.18em] text-black/50 dark:text-white/40 mb-8">
                Trusted by growing brands, founders, and mission-led
                organizations
            </p>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white dark:from-[#0A0D0C] to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white dark:from-[#0A0D0C] to-transparent z-10" />
                <div className="flex items-center gap-5 md:gap-6 marquee-track w-max">
                    {list.map((l, i) => (
                        <div
                            key={i}
                            className="group flex min-w-[180px] items-center gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3 opacity-80 transition-all duration-500 hover:opacity-100"
                        >
                            <img
                                src={l.src || undefined}
                                alt={l.name}
                                className={`h-10 w-auto object-contain rounded-md grayscale saturate-0 opacity-65 transition-all duration-500 group-hover:grayscale-0 group-hover:saturate-100 group-hover:opacity-100 ${l.src ? "" : "hidden"}`}
                            />
                            {!l.src && (
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#071312] text-[13px] font-bold text-[#00E6C4] dark:bg-[#00E6C4] dark:text-[#041411]">
                                    {l.initials || l.name[0]}
                                </span>
                            )}
                            <span className="text-[17px] text-black/45 dark:text-white/45 font-semibold tracking-tight whitespace-nowrap transition-colors duration-500 group-hover:text-black dark:group-hover:text-white">
                                {l.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ================= Problem Section ================= */
function ProblemSection() {
    const problemCards = [
        {
            k: "Stagnant",
            d: "The blog stopped updating six months ago. The pricing page has typos. Nobody has time to fix it.",
            Icon: PauseCircle,
        },
        {
            k: "Invisible",
            d: "You rank for nothing. ChatGPT does not know you exist. AI Overviews cite your competitors.",
            Icon: EyeOff,
        },
        {
            k: "Untracked",
            d: "You have no idea where visitors drop off, which pages convert, or what your bounce rate is doing.",
            Icon: Activity,
        },
    ];

    return (
        <section id="reality" className="relative px-4 pb-20 pt-6 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#F7F7F4] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/5 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />
                {/* Blob accent left */}
                <BlobDecor variant={0} className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 w-[340px] h-[340px] opacity-[0.04] dark:opacity-[0.06]" color="#00E6C4" />
                {/* Blob accent right */}
                <BlobDecor variant={2} className="pointer-events-none absolute -right-20 top-8 w-[260px] h-[260px] opacity-[0.05] dark:opacity-[0.07]" color="#00E6C4" />

                <div className="relative text-center">
                    <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                        The reality
                    </div>
                    <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[64px] leading-[0.98] max-w-[900px] mx-auto">
                        Your website was built.
                        <br />
                        <span className="text-[#0F6E56] dark:text-[#00E6C4]">
                            Then everyone got busy.
                        </span>
                    </h2>
                    <p className="mt-8 text-[16px] md:text-[18px] text-black/60 dark:text-[#8A928F] max-w-[720px] mx-auto leading-relaxed">
                        The launch was exciting. Then came real work — product,
                        customers, hiring. The site slowly became out-of-date,
                        un-optimized, and quietly leaking pipeline. Sound familiar?
                    </p>
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        {problemCards.map(({ Icon, ...it }) => (
                            <div
                                key={it.k}
                                className="rounded-[20px] p-6 card-lift border
                                    bg-[#FAFAF9] border-black/5
                                    dark:bg-[#0F1413] dark:border-[#1E2523]"
                            >
                                <div className="mb-4 h-11 w-11 rounded-xl bg-[#D6F5EF] dark:bg-[#1E2523] flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-[#0F6E56] dark:text-[#00E6C4]" />
                                </div>
                                <div className="text-[13px] font-semibold uppercase tracking-widest mb-2 text-black/45 dark:text-[#8A928F]">
                                    {it.k}
                                </div>
                                <div className="text-[15px] leading-relaxed text-black/75 dark:text-[#EDEFEE]/75">
                                    {it.d}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= What Arevei Does ================= */
function WhatArevei() {
    const ref = useRef(null);
    const inView = useInView(ref);
    const pillarIcons = [Hammer, Settings2, BarChart3, TrendingUp];

    return (
        <section id="what-arevei-does" ref={ref} className="relative px-4 pb-20 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#FAFAF8] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/5 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />
                {/* Blob top-right */}
                <BlobDecor variant={1} className="pointer-events-none absolute -right-16 -top-16 w-[300px] h-[300px] opacity-[0.05] dark:opacity-[0.07]" color="#00E6C4" />
                {/* Blob bottom-left */}
                <BlobDecor variant={2} className="pointer-events-none absolute -left-16 -bottom-16 w-[280px] h-[280px] opacity-[0.04] dark:opacity-[0.06]" color="#00E6C4" />

                <div className="relative">
                    <div className="relative text-center">
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                            What Arevei does
                        </div>
                        <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[64px] leading-[0.98]">
                            <span>We build, manage,</span>
                            <br />
                            <span
                                className={`inline-block text-[#0F6E56] dark:text-[#00E6C4] transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                            >
                                analyze, and grow.
                            </span>
                        </h2>
                        <img
                            alt=""
                            src="https://images.unsplash.com/photo-1675437434916-fd6d0b03749d?w=600&q=80"
                            className="hidden md:block pointer-events-none select-none absolute right-[6%] top-[-10%] w-[180px] h-[180px] object-cover rounded-full mix-blend-multiply dark:mix-blend-luminosity opacity-90 animate-float"
                        />
                        <p className="mt-8 text-[16px] md:text-[17px] text-black/60 dark:text-[#8A928F] max-w-[560px] mx-auto">
                            Four pillars, one retainer, one team. No more agency
                            ping-pong.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-16">
                        {pillars.map((p, i) => {
                            const Icon = pillarIcons[i] || Sparkles;
                            return (
                            <div
                                key={p.title}
                                className="rounded-[22px] p-7 md:p-8 min-h-[280px] card-lift bg-white/82 border border-black/6 dark:bg-[#0F1413] dark:border-[#1E2523]"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-[#0F6E56]/10 dark:bg-[#00E6C4]/10 border border-[#0F6E56]/15 dark:border-[#00E6C4]/20">
                                    <Icon className="h-5 w-5 text-[#0F6E56] dark:text-[#00E6C4]" />
                                </div>
                                <h3 className="font-display text-[26px] tracking-tight text-black dark:text-[#EDEFEE] mb-3">
                                    {p.title}
                                </h3>
                                <p className="text-[15px] leading-relaxed text-black/70 dark:text-[#8A928F]">
                                    {p.desc}
                                </p>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Video Section ================= */
function VideoSection() {
    const [open, setOpen] = useState(false);
    return (
        <section id="video" className="relative px-4 pb-20">
            <div className="max-w-[1400px] mx-auto rounded-[28px] overflow-hidden relative min-h-[420px] flex items-center justify-center bg-[#111]">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=80)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
                <div className="relative z-10 text-center px-6 py-20 max-w-[820px]">
                    {/* <div className="text-[12px] uppercase tracking-[0.22em] text-white/60 mb-4">
                        Watch
                    </div> */}
                    <h2 className="display-hero text-white text-[9vw] md:text-[56px] leading-[0.98]">
                        What we do &<br />
                        how we do it.
                    </h2>
                    {/* <p className="mt-6 text-white/75 text-[15px] md:text-[16px] max-w-[520px] mx-auto">
                        A 90-second look at the Arevei workflow — from audit to
                        launch to compounding growth.
                    </p> */}
                    {/* <button
                        onClick={() => setOpen(true)}
                        className="group mt-8 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:scale-[1.03] transition-transform"
                    >
                        <Play className="h-4 w-4 fill-black" />
                        Play the video
                        <ArrowUpRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button> */}
                </div>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="relative w-full max-w-[960px] aspect-video rounded-2xl overflow-hidden bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <iframe
                            className="w-full h-full"
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                            title="Arevei — What we do"
                            frameBorder="0"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

/* ================= Sparkchart ================= */
const SparkChart = ({ colorClass = "stroke-violet-400 fill-violet-100" }) => (
    <svg
        viewBox="0 0 200 60"
        className="w-full h-[46px]"
        preserveAspectRatio="none"
    >
        <path
            d="M0 50 L20 45 L40 40 L60 42 L80 30 L100 32 L120 22 L140 18 L160 12 L180 8 L200 4 L200 60 L0 60 Z"
            className={colorClass}
            strokeWidth="2"
            opacity="0.5"
        />
        <path
            d="M0 50 L20 45 L40 40 L60 42 L80 30 L100 32 L120 22 L140 18 L160 12 L180 8 L200 4"
            className={colorClass.replace("fill-", "")}
            fill="none"
            strokeWidth="2"
        />
    </svg>
);

/* ================= Get Seen. Get Sales. Get Ahead. ================= */
function SeenSalesAhead() {
    return (
        <section id="results" className="relative px-4 pt-14 pb-20 scroll-mt-28">
            {/* Light: soft mint-tinted white  ·  Dark: brand-dark Clientele style */}
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                 bg-[#FAFAF8] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]">

                {/* ── Dark-mode dot grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.32] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* ── Light-mode soft grid lines ── */}


                {/* Glows */}
                {/* <div className="pointer-events-none absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full blur-3xl
                    bg-[#00E6C4]/8 dark:bg-[#00E6C4]/10" /> */}
                {/* <div className="pointer-events-none absolute -bottom-20 -right-20 w-[360px] h-[360px] rounded-full blur-3xl
                    bg-[#C7F27A]/10 dark:bg-[#00E6C4]/6" /> */}

                <div className="relative p-6 md:p-14">
                    {/* Header */}
                    <div className="grid md:grid-cols-2 gap-8 items-start mb-14">
                        <div>
                            <div className="text-[12px] uppercase tracking-[0.22em] text-[#0F6E56] dark:text-[#00E6C4] mb-5">
                                Results engine
                            </div>
                            <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[64px] leading-[0.98]">
                                Get Seen.<br />Get Sales.<br />
                                <span className="inline-flex items-center gap-3">
                                    <span className="inline-block w-16 h-12 md:w-20 md:h-14 rounded-full
                                        bg-gradient-to-br from-[#00E6C4] to-[#C7F27A]
                                        dark:from-[#00E6C4]/60 dark:to-[#00E6C4]
                                        shadow-inner animate-float" />
                                    <span className="text-[#0F6E56] dark:text-[#00E6C4]">Get Ahead.</span>
                                </span>
                            </h2>
                        </div>
                        <div className="md:pt-24">
                            <p className="text-[15px] md:text-[17px] text-black/60 dark:text-[#8A928F] max-w-[440px] leading-relaxed">
                                Arevei Web builds and optimizes. Arevei Grow attracts and ranks. Arevei Ads scales and attributes. Every action informs the next.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <a href="#services" className="px-5 py-2.5 rounded-full bg-[#0F6E56] dark:bg-[#00E6C4] text-white dark:text-black text-[13px] font-semibold hover:bg-[#0a5a46] dark:hover:bg-[#12f3d2] transition-colors">
                                    See it in action
                                </a>
                                <a href={actionHref} className="px-5 py-2.5 rounded-full border border-black/18 dark:border-white/25 text-black dark:text-white text-[13px] hover:border-black/35 dark:hover:border-white/50 transition-colors">
                                    Book a demo
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                        {dashboardCards.map((c, idx) => (
                            <div
                                key={c.tag}
                                className={`rounded-[20px] p-5 card-lift border transition-colors
                                    ${idx === 2
                                        ? "bg-[#0F6E56]/8 border-[#0F6E56]/20 dark:bg-[#0F1413] dark:border-[#1E2523]"
                                        : "bg-white border-black/8 dark:bg-[#0F1413] dark:border-[#1E2523]"
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="font-display text-[16px] tracking-tight text-black dark:text-[#EDEFEE]">
                                        Arevei
                                    </span>
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.tagColor}`}>
                                        {c.tag}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <div className="font-display text-[44px] leading-none text-black dark:text-[#EDEFEE]">
                                            {c.heading}
                                        </div>
                                        <div className="text-[12px] mt-1 text-black/55 dark:text-[#8A928F]">
                                            {c.subheading}
                                        </div>
                                    </div>
                                    <div className="w-1/2">
                                        <SparkChart colorClass={c.chartColor} />
                                    </div>
                                </div>
                                <div className="mt-4 text-[12px] rounded-lg p-3 leading-snug text-black/55 dark:text-[#8A928F] bg-black/[0.03] dark:bg-white/5">
                                    {c.note}
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-black/6 dark:border-[#1E2523]">
                                    {c.stats.map((s) => (
                                        <div key={s.label}>
                                            <div className="text-[10px] uppercase tracking-wide text-black/40 dark:text-[#8A928F]">
                                                {s.label}
                                            </div>
                                            <div className="font-display text-[18px] mt-0.5 text-black dark:text-[#EDEFEE]">
                                                {s.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${c.dotColor} soft-pulse`} />
                                    <span className="text-[12px] text-black/60 dark:text-[#8A928F]">
                                        {c.footer}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= One Platform, Three Engines ================= */
function OnePlatform() {
    return (
        <section id="services" className="relative px-4 pb-20 overflow-hidden scroll-mt-28">
            {/* Light: warm cream · Dark: brand surface */}
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden border  bg-[#FAFAF8] border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]">

                {/* Blob decorations — visible in light, subtle in dark */}
                <img alt="" src="https://images.unsplash.com/photo-1660136308586-432226190a26?w=800&q=70" className="pointer-events-none select-none absolute -right-16 -top-16 w-[360px] h-[360px] object-cover rounded-full mix-blend-multiply opacity-70 animate-float" />
                <img alt="" src="https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=800&q=70" className="pointer-events-none select-none absolute -left-24 top-40 w-[300px] h-[300px] object-cover rounded-full mix-blend-multiply opacity-60 animate-float-alt" />

                {/* Dark mode teal glow */}
                <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-[#00E6C4]/5 blur-3xl opacity-0 dark:opacity-100" />

                <div className="px-6 md:px-14 pt-16 md:pt-20 pb-12 text-center relative z-10">
                    <div className="text-[12px] uppercase tracking-[0.22em] text-black/45 dark:text-[#00E6C4] mb-6">
                        Services
                    </div>
                    <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[72px] leading-[0.98]">
                        One Platform<br /><span className="text-[#0F6E56] dark:text-[#00E6C4]">Three Engines.</span>
                    </h2>
                    <p className="mt-5 text-black/55 dark:text-[#8A928F] text-[15px] max-w-[480px] mx-auto">
                        Build, grow, and scale — all under one retainer. No agency ping-pong.
                    </p>
                </div>

                <div className="px-4 md:px-6 pb-8 md:pb-10 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-stretch">
                        {engines.map((e) => (
                            <div
                                key={e.name}
                                className="group relative rounded-[20px] p-6 md:p-8 flex flex-col card-lift transition-all duration-500 border bg-white dark:bg-[#0A0D0C] border-black/8 dark:border-[#1E2523] hover:dark:border-[#00E6C4]/30"
                            >
                                {/* header row */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full soft-pulse bg-[#00E6C4]" />
                                        <span className="text-[12px] font-medium tracking-wide text-black/60 dark:text-[#8A928F]">
                                            {e.name}
                                        </span>
                                    </div>
                                    {e.badgeRight && (
                                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/8 dark:bg-[#1E2523] text-black/50 dark:text-[#8A928F]">
                                            {e.badgeRight}
                                        </span>
                                    )}
                                </div>

                                {/* headline */}
                                <h3 className="font-display text-[26px] md:text-[30px] leading-[1.05] tracking-tight mb-3 text-black dark:text-[#EDEFEE]">
                                    {e.headline}
                                </h3>
                                <p className="text-[13px] leading-relaxed mb-7 text-black/55 dark:text-[#8A928F]">
                                    {e.tagline}
                                </p>

                                {/* features */}
                                <ul className="space-y-3 flex-1">
                                    {e.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-black/75 dark:text-[#EDEFEE]/70">
                                            <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#00E6C4]" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <a href={actionHref} className="mt-8 group/btn inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors text-[#00E6C4] hover:text-[#0F6E56] dark:hover:text-[#00E6C4]">
                                    {e.cta}
                                    <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Our Process ================= */
function OurProcess() {
    const [activeSteps, setActiveSteps] = useState(new Set());
    const stepRefs = useRef([]);

    useEffect(() => {
        const observers = stepRefs.current.map((el, i) => {
            if (!el) return null;
            const io = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting)
                        setActiveSteps((prev) => new Set([...prev, i]));
                },
                { threshold: 0.4 },
            );
            io.observe(el);
            return io;
        });
        return () => observers.forEach((io) => io?.disconnect());
    }, []);

    const maxActive = activeSteps.size > 0 ? Math.max(...activeSteps) : -1;
    const fillPct = maxActive >= 0 ? ((maxActive + 1) / processSteps.length) * 100 : 0;

    return (
        <section id="process" className="relative px-4 pb-20 scroll-mt-28">
            {/* Light: clean stone-white  ·  Dark: brand-dark Clientele style */}
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#F7F7F4] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]">

                {/* ── Dark dot grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.32] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* ── Light subtle grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />

                {/* Glows */}
                <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] rounded-full blur-3xl
                    bg-[#00E6C4]/5 dark:bg-[#00E6C4]/7" />
                <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full blur-3xl
                    bg-[#C7F27A]/8 dark:bg-[#00E6C4]/5" />

                <div className="relative px-6 md:px-14 pt-16 md:pt-20 pb-12 text-center">
                    <div className="text-[12px] uppercase tracking-[0.22em] mb-6
                        text-[#0F6E56] dark:text-[#00E6C4]">
                        Our process
                    </div>
                    <h2 className="display-hero text-[10vw] md:text-[64px] leading-[0.98]
                        text-black dark:text-[#EDEFEE]">
                        Audit. Build. Track.<br />
                        <span className="text-[#0F6E56] dark:text-[#00E6C4]">Recommend.</span> Execute. Report.
                    </h2>
                </div>

                {/* Timeline */}
                <div className="relative px-4 md:px-10 pb-16 md:pb-20">
                    {/* Track */}
                    <div className="absolute left-1/2 top-0 bottom-16 w-px -translate-x-1/2 hidden md:block
                        bg-black/10 dark:bg-[#1E2523]" />
                    {/* Fill */}
                    <div
                        className="absolute left-1/2 top-0 w-px -translate-x-1/2 transition-all duration-700 ease-out hidden md:block
                            bg-[#0F6E56] dark:bg-[#00E6C4]"
                        style={{ height: `${fillPct}%`, boxShadow: "0 0 8px #00E6C460" }}
                    />

                    <div className="max-w-[900px] mx-auto flex flex-col gap-10 md:gap-14">
                        {processSteps.map((step, i) => {
                            const isLeft = i % 2 === 0;
                            const isActive = activeSteps.has(i);
                            return (
                                <div
                                    key={i}
                                    ref={(el) => { stepRefs.current[i] = el; }}
                                    className={`relative transition-all duration-700 ${isActive ? "opacity-100" : "opacity-25"}`}
                                >
                                    {/* Mobile */}
                                    <div className="md:hidden flex gap-4">
                                        <div className="flex flex-col items-center pt-1">
                                            <div className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-500 shrink-0 ${isActive
                                                ? "bg-[#0F6E56] border-[#0F6E56] dark:bg-[#00E6C4] dark:border-[#00E6C4] shadow-[0_0_8px_#00E6C460]"
                                                : "bg-transparent border-black/15 dark:border-[#1E2523]"
                                                }`} />
                                            {i < processSteps.length - 1 && (
                                                <div className="flex-1 w-px mt-2 bg-black/10 dark:bg-[#1E2523]" />
                                            )}
                                        </div>
                                        <div className="pb-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#0F6E56] dark:text-[#00E6C4]">
                                                    {step.tag}
                                                </span>
                                                <span className="text-[10px] text-black/35 dark:text-[#8A928F]">
                                                    {step.timestamp}
                                                </span>
                                            </div>
                                            <h3 className="font-display text-[20px] tracking-tight leading-tight text-black dark:text-[#EDEFEE]">
                                                {step.title}
                                            </h3>
                                            <p className="text-[13px] mt-1.5 leading-relaxed text-black/55 dark:text-[#8A928F]">
                                                {step.body}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Desktop zigzag */}
                                    <div className="hidden md:grid grid-cols-[1fr_40px_1fr] gap-4 items-center">
                                        {isLeft ? (
                                            <div className="text-right pr-8">
                                                <div className="text-[10px] font-mono uppercase tracking-widest mb-1 text-[#0F6E56] dark:text-[#00E6C4]">
                                                    {step.tag}
                                                </div>
                                                <h3 className="font-display text-[24px] md:text-[28px] tracking-tight leading-tight text-black dark:text-[#EDEFEE]">
                                                    {step.title}
                                                </h3>
                                                <p className="text-[13px] mt-2 leading-relaxed max-w-[300px] ml-auto text-black/55 dark:text-[#8A928F]">
                                                    {step.body}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-right pr-8 flex flex-col items-end justify-center">
                                                <span className="text-[11px] font-mono text-black/35 dark:text-[#8A928F]">
                                                    {step.timestamp}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-center">
                                            <div className={`h-4 w-4 rounded-full border-2 transition-all duration-500 ${isActive
                                                ? "bg-[#0F6E56] border-[#0F6E56] dark:bg-[#00E6C4] dark:border-[#00E6C4] shadow-[0_0_14px_#00E6C460]"
                                                : "bg-transparent border-black/15 dark:border-[#1E2523]"
                                                }`} />
                                        </div>
                                        {!isLeft ? (
                                            <div className="pl-8">
                                                <div className="text-[10px] font-mono uppercase tracking-widest mb-1 text-[#0F6E56] dark:text-[#00E6C4]">
                                                    {step.tag}
                                                </div>
                                                <h3 className="font-display text-[24px] md:text-[28px] tracking-tight leading-tight text-black dark:text-[#EDEFEE]">
                                                    {step.title}
                                                </h3>
                                                <p className="text-[13px] mt-2 leading-relaxed max-w-[300px] text-black/55 dark:text-[#8A928F]">
                                                    {step.body}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="pl-8 flex flex-col justify-center">
                                                <span className="text-[11px] font-mono text-black/35 dark:text-[#8A928F]">
                                                    {step.timestamp}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Why Arevei ================= */
function WhyArevei() {
    return (
        <section id="why-arevei" className="relative px-4 pb-20 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#F2FCF9] border border-[#C5EDE6]
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/6 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />

                <div className="relative">
                    <div className="max-w-3xl mb-12">
                        <div className="text-[12px] font-mono uppercase tracking-[0.2em] mb-4 text-[#0F6E56] dark:text-[#00E6C4]">
                            Why Arevei
                        </div>
                        <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[9vw] md:text-[56px] leading-[1.02]">
                            Not an agency.
                            <br />
                            <span className="text-black/30 dark:text-[#EDEFEE]/30">
                                Not a SaaS. Both.
                            </span>
                        </h2>
                        <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed max-w-[540px] text-black/60 dark:text-[#8A928F]">
                            The best of a software subscription (predictable
                            pricing, always-on) with the best of a service (real
                            humans, real strategy).
                        </p>
                    </div>

                    {/* Comparison table */}
                    <div className="rounded-[22px] overflow-hidden border border-black/8 dark:border-[#1E2523] bg-white dark:bg-[#0F1413]">
                        <div className="grid grid-cols-3 border-b border-black/8 dark:border-[#1E2523] bg-black/[0.02] dark:bg-white/[0.02]">
                            <div className="p-4 md:p-5" />
                            <div className="p-4 md:p-5 text-center border-l border-black/8 dark:border-[#1E2523]">
                                <span className="text-[12px] md:text-[13px] font-semibold tracking-wide text-black/45 dark:text-[#8A928F]">
                                    Traditional Agency
                                </span>
                            </div>
                            <div className="p-4 md:p-5 text-center border-l border-black/8 dark:border-[#1E2523] bg-black dark:bg-[#00E6C4]">
                                <span className="text-[12px] md:text-[13px] font-semibold tracking-wide text-white dark:text-[#0A0D0C]">
                                    Arevei
                                </span>
                            </div>
                        </div>
                        {comparison.map((row, i) => (
                            <div
                                key={row.label}
                                className={`grid grid-cols-3 items-center ${i < comparison.length - 1 ? "border-b border-black/6 dark:border-[#1E2523]" : ""}`}
                            >
                                <div className="p-4 md:p-5 text-[13px] md:text-[14px] font-medium text-black/80 dark:text-[#EDEFEE]/80">
                                    {row.label}
                                </div>
                                <div className="p-4 md:p-5 border-l border-black/6 dark:border-[#1E2523] text-[12px] md:text-[13px] text-center flex items-center justify-center gap-1.5 text-black/50 dark:text-[#8A928F]">
                                    <X className="h-3.5 w-3.5 text-red-400/70 shrink-0" />
                                    {row.agency}
                                </div>
                                <div className="p-4 md:p-5 border-l border-black/6 dark:border-[#1E2523] text-center bg-black/[0.025] dark:bg-[#00E6C4]/[0.06] flex items-center justify-center gap-1.5">
                                    <Check className="h-3.5 w-3.5 text-[#0F6E56] dark:text-[#00E6C4] shrink-0" />
                                    <span className="text-[12px] md:text-[13px] font-semibold text-black dark:text-[#EDEFEE]">
                                        {row.arevei}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Unified Website Management ================= */
function UnifiedManagement() {
    return (
        <section id="use-cases" className="relative px-4 pb-20 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-white border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/5 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />

                <div className="relative">
                    <div className="text-center mb-10">
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                            Unified website management
                        </div>
                        <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[64px] leading-[0.98]">
                            One team.
                            <br />
                            <span className="text-[#0F6E56] dark:text-[#00E6C4]">Every kind of business.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {audiences.map((a) => (
                            <div
                                key={a.title}
                                className="group rounded-[22px] p-7 md:p-8 min-h-[380px] flex flex-col card-lift relative overflow-hidden border
                                    bg-[#F7F7F4] border-black/6
                                    dark:bg-[#0F1413] dark:border-[#1E2523]"
                            >
                                <div
                                    className={`absolute -right-10 -top-10 w-40 h-40 rounded-full ${a.accent} opacity-30 dark:opacity-15 group-hover:scale-125 transition-transform duration-700`}
                                />
                                <div className="relative">
                                    <h3 className="font-display text-[32px] leading-none tracking-tight text-black dark:text-[#EDEFEE]">
                                        {a.title}
                                    </h3>
                                    <p className="text-[15px] mt-2 text-black/55 dark:text-[#8A928F]">
                                        {a.tagline}
                                    </p>
                                    <ul className="mt-6 space-y-2.5">
                                        {a.features.map((f) => (
                                            <li
                                                key={f}
                                                className="text-[14px] flex gap-2 text-black/70 dark:text-[#EDEFEE]/70"
                                            >
                                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-[#0F6E56] dark:bg-[#00E6C4]" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-auto pt-6 flex flex-wrap items-center gap-2 relative">
                                    <a href={actionHref} className="group/btn px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-1 transition-colors
                                        bg-black text-white hover:bg-neutral-800
                                        dark:bg-[#00E6C4] dark:text-[#0A0D0C] dark:hover:bg-[#12f3d2]">
                                        {a.cta}
                                        <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </a>
                                    {a.cta2 && (
                                        <a href={a.cta2.toLowerCase().includes("pricing") ? "#pricing" : actionHref} className="px-4 py-2 rounded-full text-[13px] font-medium transition-colors
                                             border border-black/10 text-black hover:bg-black/5
                                            dark:bg-white/6 dark:border-[#1E2523] dark:text-[#EDEFEE] dark:hover:bg-white/12">
                                            {a.cta2}
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Testimonials / Clientele ================= */
function Testimonials() {
    return (
        <section id="clientele" className="relative px-4 pb-20 scroll-mt-28">
            {/* Light: fresh white with teal tint  ·  Dark: brand-dark Clientele style */}
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden px-6 md:px-14 py-16 md:py-20
                bg-white border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]">

                {/* ── Dark dot grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* ── Light dot grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />

                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl
                    bg-[#00E6C4]/6 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl
                    bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />

                <div className="relative">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <div className="text-[12px] uppercase tracking-[0.22em] mb-5
                                text-[#0F6E56] dark:text-[#00E6C4]">
                                Clientele
                            </div>
                            <h2 className="display-hero text-[10vw] md:text-[64px] leading-[0.98]
                                text-black dark:text-[#EDEFEE]">
                                Loved by growing<br />
                                <span className="text-[#0F6E56] dark:text-[#00E6C4]">brands</span> & founders.
                            </h2>
                        </div>
                        <div className="md:pb-2 md:max-w-[280px]">
                            <p className="text-[14px] leading-relaxed text-black/55 dark:text-[#8A928F]">
                                Real results from founders who put their website to work — not just launched it.
                            </p>
                            <div className="mt-5 flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {['#00E6C4', '#C7F27A', '#0F6E56'].map((c, i) => (
                                        <div key={i}
                                            className="h-8 w-8 rounded-full border-2 border-white dark:border-[#0A0D0C] flex items-center justify-center text-[11px] font-bold text-[#0A0D0C]"
                                            style={{ backgroundColor: c }}>
                                            {['J', 'M', 'P'][i]}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[13px] text-black/45 dark:text-[#8A928F]">+24 founders this quarter</span>
                            </div>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {testimonials.map((t, i) => (
                            <div
                                key={t.name}
                                className="rounded-[20px] p-7 flex flex-col card-lift relative overflow-hidden group transition-colors
                                    bg-[#F4FBF9] border border-[#C5EDE6] hover:border-[#0F6E56]/40
                                    dark:bg-[#0F1413] dark:border-[#1E2523] dark:hover:border-[#00E6C4]/30"
                            >
                                {/* Decorative quote */}
                                <div className="absolute -top-3 -left-1 text-[110px] font-serif leading-none select-none pointer-events-none
                                    text-[#0F6E56]/5 dark:text-[#00E6C4]/6">
                                    "
                                </div>

                                {/* Avatar + name */}
                                <div className="flex items-center gap-3 mb-5 relative">
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center font-display text-[15px]
                                        bg-[#D6F5EF] text-[#0F6E56]
                                        dark:bg-[#1E2523] dark:text-[#00E6C4]">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[15px] leading-tight
                                            text-black dark:text-[#EDEFEE]">
                                            {t.name}
                                        </div>
                                        <div className="text-[12px] text-black/45 dark:text-[#8A928F]">
                                            {t.role}
                                        </div>
                                    </div>
                                    <div className={`ml-auto w-2 h-2 rounded-full soft-pulse ${i === 0 ? 'bg-[#00E6C4]' : i === 1 ? 'bg-[#00E6C4]' : 'bg-[#0F6E56]'
                                        }`} />
                                </div>

                                <p className="text-[14px] md:text-[15px] leading-relaxed relative flex-1
                                    text-black/70 dark:text-[#EDEFEE]/80">
                                    "{t.quote}"
                                </p>

                                {/* <a href={actionHref} className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors group/btn
                                    text-[#0F6E56] hover:text-[#00E6C4]
                                    dark:text-[#00E6C4] dark:hover:text-[#12f3d2]">
                                    Watch story
                                    <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </a> */}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Pricing ================= */
function Pricing() {
    const [tab, setTab] = useState("management");
    const plans =
        tab === "development"
            ? pricingPlans.development
            : pricingPlans.management;

    return (
        <section id="pricing" className="relative px-4 pb-20 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#F7F7F4] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/5 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />
                {/* Blob mid-left */}
                <BlobDecor variant={0} className="pointer-events-none absolute left-0 top-1/3 w-[320px] h-[320px] opacity-[0.05] dark:opacity-[0.07]" color="#00E6C4" />
                {/* Blob mid-right */}
                <BlobDecor variant={1} className="pointer-events-none absolute right-0 bottom-1/4 w-[280px] h-[280px] opacity-[0.04] dark:opacity-[0.06]" color="#00E6C4" />

                <div className="relative">
                    <div className="text-center mb-10">
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                            Our Plans
                        </div>
                        <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[64px] leading-[0.98]">
                            Simple. Transparent.
                            <br />
                            <span className="text-[#0F6E56] dark:text-[#00E6C4]">Welcome-offer live.</span>
                        </h2>
                        <div className="mt-8 inline-flex items-center gap-1 rounded-full p-1 border
                            bg-white border-black/10
                            dark:bg-[#0F1413] dark:border-[#1E2523]">
                            <button
                                onClick={() => setTab("development")}
                                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${tab === "development"
                                    ? "bg-black text-white dark:bg-[#00E6C4] dark:text-[#0A0D0C]"
                                    : "text-black/70 hover:text-black dark:text-[#8A928F] dark:hover:text-[#EDEFEE]"
                                    }`}
                            >
                                Development
                            </button>
                            <button
                                onClick={() => setTab("management")}
                                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${tab === "management"
                                    ? "bg-black text-white dark:bg-[#00E6C4] dark:text-[#0A0D0C]"
                                    : "text-black/70 hover:text-black dark:text-[#8A928F] dark:hover:text-[#EDEFEE]"
                                    }`}
                            >
                                Management
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                        {plans.map((p) => (
                            <div
                                key={p.name}
                                className={`rounded-[22px] p-7 md:p-8 flex flex-col card-lift border transition-colors ${p.highlight
                                    ? "bg-[#0A0D17] text-white border-[#1E2538] dark:bg-[#0F1528] dark:border-[#1A2040]"
                                    : "bg-white text-black border-black/5 dark:bg-[#0F1413] dark:text-[#EDEFEE] dark:border-[#1E2523]"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-display text-[22px] tracking-tight">
                                        {p.name}
                                    </h3>
                                    {p.highlight && (
                                        <span className="text-[10px] uppercase tracking-widest  bg-[#00E6C4] text-black px-2 py-1 rounded-full font-semibold">
                                            Welcome offer
                                        </span>
                                    )}
                                </div>
                                <p className={`text-[14px] ${p.highlight ? "text-white/65" : "text-black/60 dark:text-[#8A928F]"}`}>
                                    {p.desc}
                                </p>
                                {/* <div className="mt-6 flex items-baseline gap-2">
                                    {p.originalPrice && (
                                        <span className={`text-[15px] line-through ${p.highlight ? "text-white/40" : "text-black/40 dark:text-[#8A928F]/60"}`}>
                                            {p.originalPrice}
                                        </span>
                                    )}
                                    <span className="font-display text-[38px] leading-none">
                                        {p.price}
                                    </span>
                                    {p.frequency && (
                                        <span className={`text-[13px] ${p.highlight ? "text-white/55" : "text-black/50 dark:text-[#8A928F]"}`}>
                                            {p.frequency}
                                        </span>
                                    )}
                                </div> */}
                                <ul className="mt-6 space-y-2.5 flex-1">
                                    {p.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2 text-[14px]">
                                            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.highlight ? "text-[#C7F27A]" : "text-[#0F6E56] dark:text-[#00E6C4]"}`} />
                                            <span className={p.highlight ? "text-white/82" : "text-black/80 dark:text-[#EDEFEE]/75"}>
                                                {f}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <a href={actionHref} className={`mt-8 group px-5 py-2.5 rounded-full text-[14px] font-medium flex items-center justify-center gap-1 transition-colors ${p.highlight
                                    ? " dark:bg-[#00E6C4] text-black  bg-[#12f3d2]"
                                    : "bg-black text-white hover:bg-neutral-800 dark:bg-[#00E6C4] dark:text-[#0A0D0C] dark:hover:bg-[#12f3d2]"
                                    }`}>
                                    {p.cta}
                                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Demo Booking Form ================= */
function DemoBookingForm() {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        contactNumber: "",
    });
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    useEffect(() => {
        const onClick = (event) => {
            const target = event.target ;
            const link = target?.closest('a[href="#demo-form"]');
            if (!link) return;
            event.preventDefault();
            setOpen(true);
        };

        const onOpen = () => setOpen(true);

        document.addEventListener("click", onClick);
        window.addEventListener("arevei-open-demo-modal", onOpen);
        return () => {
            document.removeEventListener("click", onClick);
            window.removeEventListener("arevei-open-demo-modal", onOpen);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const submitForm = async (event) => {
        event.preventDefault();
        setStatus("submitting");
        setMessage("");

        try {
            const response = await fetch("/api/demo-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    source: "Landing pricing section",
                    page: window.location.pathname,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.message || "Unable to submit demo request.");
            }

            setStatus("success");
            setMessage("Thanks. We have received your demo request and sent a confirmation email.");
            setForm({ name: "", email: "", contactNumber: "" });
        } catch (error) {
            setStatus("error");
            setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
        }
    };

    if (!open) return null;

    return (
        <div
            id="demo-form"
            className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#071312]/82 p-3 sm:p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-form-title"
            onClick={() => setOpen(false)}
        >
            <div
                className="my-8 w-full max-w-[980px] rounded-[22px] md:rounded-[28px] relative overflow-hidden border bg-[#FAFAF8] border-black/8 dark:bg-[#0A0D0C] dark:border-[#1E2523] px-4 sm:px-6 md:px-10 py-8 md:py-10 shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close demo form"
                    className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full border border-black/10 bg-white/80 text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 flex items-center justify-center"
                >
                    <X className="h-4 w-4" />
                </button>
                {/* <div
                    className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.30]"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }}
                /> */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#00E6C4]/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#00E6C4]/6 blur-3xl" />

                <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                            Book a demo
                        </div>
                        <h2 id="demo-form-title" className="display-hero text-black dark:text-[#EDEFEE] text-[40px] md:text-[58px] leading-[0.98]">
                            Tell us where to reach you.
                        </h2>
                        <p className="mt-6 text-[15px] md:text-[17px] leading-relaxed text-black/60 dark:text-[#8A928F] max-w-[520px]">
                            Share your details and our team will follow up with the right next step. Admin receives your form details, and you receive a confirmation email.
                        </p>
                    </div>

                    <form onSubmit={submitForm} className="rounded-[22px] border border-black/8 dark:border-white/10 bg-white/85 dark:bg-[#0F1413]/90 p-5 md:p-7 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
                        <div className="grid gap-4">
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-black/70 dark:text-[#EDEFEE]/75">Name</span>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(event) => updateField("name", event.target.value)}
                                    placeholder="Your name"
                                    className="h-12 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0D0C] px-4 text-[14px] text-black dark:text-white outline-none focus:border-[#00E6C4]"
                                />
                            </label>
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-black/70 dark:text-[#EDEFEE]/75">Email</span>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => updateField("email", event.target.value)}
                                    placeholder="you@company.com"
                                    className="h-12 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0D0C] px-4 text-[14px] text-black dark:text-white outline-none focus:border-[#00E6C4]"
                                />
                            </label>
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-black/70 dark:text-[#EDEFEE]/75">Contact Number</span>
                                <input
                                    required
                                    type="tel"
                                    value={form.contactNumber}
                                    onChange={(event) => updateField("contactNumber", event.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="h-12 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0D0C] px-4 text-[14px] text-black dark:text-white outline-none focus:border-[#00E6C4]"
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={status === "submitting"}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00E6C4] px-6 py-3 text-[14px] font-semibold text-[#041411] transition-colors hover:bg-[#12f3d2] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {status === "submitting" ? "Sending request..." : "Submit Demo Request"}
                            <Send className="h-4 w-4" />
                        </button>

                        {message && (
                            <p className={`mt-4 rounded-xl px-4 py-3 text-[13px] leading-relaxed ${status === "success"
                                ? "bg-[#00E6C4]/12 text-[#0F6E56] dark:text-[#00E6C4]"
                                : "bg-red-500/10 text-red-600 dark:text-red-300"
                                }`}>
                                {message}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}



function useBlogPosts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        // Use local proxy to avoid CORS — API server forwards server-side
        fetch("https://areveiadmin-blog.vercel.app/api/public/posts")
            .then((r) => {
                if (!r.ok) throw new Error("non-2xx");
                return r.json();
            })
            .then((data) => {
                if (!cancelled) {
                    // API wraps in { posts: [...] }
                    const list = Array.isArray(data)
                        ? data
                        : Array.isArray(data.posts)
                            ? data.posts
                            : [];
                    setPosts(list);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, []);

    return { posts, loading, error };
}

function BlogPreview() {
    const trackRef = useRef(null);
    const { posts, loading, error } = useBlogPosts();

    const scroll = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * 360, behavior: "smooth" });
    };

    // Skeleton placeholder count while loading
    const skeletons = [0, 1, 2, 3];

    return (
        <section id="blog" className="relative px-4 pb-20 scroll-mt-28">
            {/* Light: clean off-white  ·  Dark: brand-dark Clientele style */}
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-[#F7F7F4] border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]">

                {/* ── Dark dot grid ── */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* ── Light subtle dots ── */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "32px 32px" }} />

                {/* Glows */}
                <div className="pointer-events-none absolute -top-20 -right-20 w-[380px] h-[380px] rounded-full blur-3xl
                    bg-[#C7F27A]/10 dark:bg-[#00E6C4]/6" />
                <div className="pointer-events-none absolute bottom-0 left-0 w-[320px] h-[280px] rounded-full blur-3xl
                    bg-[#00E6C4]/8 dark:bg-[#00E6C4]/7" />

                {/* Header */}
                <div className="relative px-6 md:px-14 pt-16 pb-8 grid md:grid-cols-2 gap-6 items-end">
                    <div>
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6
                            text-[#0F6E56] dark:text-[#00E6C4]">
                            Resources
                        </div>
                        <h2 className="display-hero text-[10vw] md:text-[56px] leading-[0.98]
                            text-black dark:text-[#EDEFEE]">
                            Founder guides
                            <span className="inline-block w-10 md:w-14 h-10 md:h-14 mx-3 rounded-full align-middle animate-float bg-[#C7F27A]" />
                            &amp; AI website playbooks.
                        </h2>
                    </div>
                    <div className="md:pb-2">
                        <p className="text-[14px] md:text-[15px] max-w-[360px] leading-relaxed
                            text-black/55 dark:text-[#8A928F]">
                            Everything we have learned running websites for growing brands, distilled into short reads.
                        </p>
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => scroll(-1)}
                                className="h-10 w-10 rounded-full flex items-center justify-center transition
                                    bg-black/8 hover:bg-black/14 border border-black/10 text-black
                                    dark:bg-white/10 dark:hover:bg-white/18 dark:border-white/12 dark:text-white"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => scroll(1)}
                                className="h-10 w-10 rounded-full flex items-center justify-center transition
                                    bg-[#0F6E56] hover:bg-[#0a5a46] text-white
                                    dark:bg-[#00E6C4] dark:hover:bg-[#12f3d2] dark:text-black"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            {/* Live post count badge */}
                            {!loading && !error && posts.length > 0 && (
                                <span className="ml-1 text-[12px] text-black/40 dark:text-[#8A928F]">
                                    {posts.length} articles
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable track */}
                <div
                    ref={trackRef}
                    className="no-scrollbar overflow-x-auto pb-12 px-6 md:px-14 flex gap-4 snap-x snap-mandatory scroll-smooth"
                >
                    {/* Loading skeletons */}
                    {loading && skeletons.map((i) => (
                        <div key={i} className="snap-start shrink-0 w-[280px] md:w-[320px] rounded-[18px] overflow-hidden
                            bg-white border border-black/8 dark:bg-[#0F1413] dark:border-[#1E2523] animate-pulse">
                            <div className="h-[160px] bg-black/6 dark:bg-white/5" />
                            <div className="p-5 space-y-3">
                                <div className="h-3 w-1/3 rounded bg-black/8 dark:bg-white/8" />
                                <div className="h-4 w-full rounded bg-black/8 dark:bg-white/8" />
                                <div className="h-4 w-4/5 rounded bg-black/6 dark:bg-white/5" />
                                <div className="h-3 w-2/3 rounded bg-black/5 dark:bg-white/4 mt-4" />
                            </div>
                        </div>
                    ))}

                    {/* Error state */}
                    {error && (
                        <div className="snap-start shrink-0 w-[320px] rounded-[18px] p-8 flex flex-col items-center justify-center gap-3
                            bg-white border border-black/8 dark:bg-[#0F1413] dark:border-[#1E2523]">
                            <span className="text-[32px]">📡</span>
                            <p className="text-[13px] text-center text-black/50 dark:text-[#8A928F]">
                                Couldn't load articles. Check your connection.
                            </p>
                        </div>
                    )}

                    {/* Live posts from API */}
                    {!loading && !error && posts.map((b) => (
                        <Link
                            key={b.id}
                            to={`/blog/${b.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group snap-start shrink-0 w-[280px] md:w-[320px] rounded-[18px] overflow-hidden flex flex-col card-lift transition-colors
                                bg-white border border-black/8 hover:border-[#0F6E56]/35
                                dark:bg-[#0F1413] dark:border-[#1E2523] dark:hover:border-[#00E6C4]/35"
                        >
                            {/* Cover image */}
                            <div className="relative h-[168px] overflow-hidden bg-black/5 dark:bg-white/5">
                                {b.thumbnail ? (
                                    <img
                                        src={b.thumbnail}
                                        alt={b.thumbnailAlt || b.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        loading="lazy"
                                    />
                                ) : (
                                    /* Fallback gradient when no thumbnail */
                                    <div className="w-full h-full bg-gradient-to-br from-[#0F6E56]/20 to-[#C7F27A]/20" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                {/* Category pill */}
                                <span className="absolute bottom-3 left-3 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full
                                    text-[#0A0D0C] bg-[#00E6C4]/90 border border-[#C7F27A]/60
                                    dark:text-[#00E6C4] dark:bg-black/60 dark:border-[#00E6C4]/30
                                    line-clamp-1 max-w-[80%]">
                                    {b.category}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-display text-[15px] leading-[1.25] transition-colors line-clamp-2
                                        text-black group-hover:text-[#0F6E56]
                                        dark:text-[#EDEFEE] dark:group-hover:text-[#00E6C4]">
                                        {b.title}
                                    </h3>
                                    <ArrowUpRight className="h-4 w-4 shrink-0 mt-0.5 transition-colors
                                        text-black/25 group-hover:text-[#0F6E56]
                                        dark:text-white/30 dark:group-hover:text-[#00E6C4]" />
                                </div>
                                <p className="text-[12px] leading-snug flex-1 line-clamp-2
                                    text-black/50 dark:text-[#8A928F]">
                                    {b.excerpt}
                                </p>
                                {/* Footer row */}
                                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t
                                    border-black/6 dark:border-[#1E2523]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="h-5 w-5 rounded-full inline-flex items-center justify-center text-[8px] font-bold shrink-0
                                            bg-[#D6F5EF] text-[#0F6E56]
                                            dark:bg-[#00E6C4]/20 dark:text-[#00E6C4]">
                                            {b.author?.[0] ?? "A"}
                                        </span>
                                        <span className="text-[11px] truncate text-black/45 dark:text-[#8A928F]">
                                            {b.author}
                                        </span>
                                    </div>
                                    <span className="text-[11px] shrink-0 text-black/35 dark:text-[#8A928F]/70">
                                        {b.readTime}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ================= FAQ ================= */
function FAQ() {
    const [open, setOpen] = useState(0);
    return (
        <section id="faq" className="relative px-4 pb-20 scroll-mt-28">
            <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden
                bg-white border border-black/8
                dark:bg-[#0A0D0C] dark:border-[#1E2523]
                px-6 md:px-14 py-16 md:py-20">

                {/* Dark dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.30] transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#1E2523 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Light dot grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-0 transition-opacity"
                    style={{ backgroundImage: "radial-gradient(circle,#C5EDE6 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
                {/* Teal glow top-left */}
                <div className="pointer-events-none absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#00E6C4]/5 dark:bg-[#00E6C4]/8" />
                {/* Lime glow bottom-right */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full blur-3xl bg-[#C7F27A]/8 dark:bg-[#00E6C4]/6" />

                <div className="relative max-w-[900px] mx-auto">
                    <div className="text-center mb-10">
                        <div className="text-[12px] uppercase tracking-[0.22em] mb-6 text-[#0F6E56] dark:text-[#00E6C4]">
                            FAQ
                        </div>
                        <h2 className="display-hero text-black dark:text-[#EDEFEE] text-[10vw] md:text-[56px] leading-[0.98]">
                            Questions we hear often.
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {faqs.map((f, i) => {
                            const isOpen = open === i;
                            return (
                                <div
                                    key={i}
                                    className="rounded-2xl overflow-hidden card-lift border
                                        bg-[#F7F7F4] border-black/5
                                        dark:bg-[#0F1413] dark:border-[#1E2523]"
                                >
                                    <button
                                        onClick={() => setOpen(isOpen ? -1 : i)}
                                        className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
                                    >
                                        <span className="text-[15px] md:text-[16px] font-semibold text-black dark:text-[#EDEFEE]">
                                            {f.q}
                                        </span>
                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0
                                            bg-black/5 dark:bg-[#1E2523]
                                            ${isOpen ? "rotate-180" : ""}`}>
                                            {isOpen ? (
                                                <Minus className="h-4 w-4 text-black dark:text-[#00E6C4]" />
                                            ) : (
                                                <Plus className="h-4 w-4 text-black dark:text-[#00E6C4]" />
                                            )}
                                        </span>
                                    </button>
                                    <div className={`grid transition-all duration-400 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <p className="px-5 md:px-6 pb-5 text-[14px] md:text-[15px] leading-relaxed text-black/65 dark:text-[#8A928F]">
                                                {f.a}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ================= Final CTA ================= */
function CTA() {
    return (
        <section id="final-cta" className="px-4 pb-20 scroll-mt-28">
            <div
                className="max-w-[1400px] mx-auto rounded-[28px] px-6 md:px-14 py-20 md:py-28 relative overflow-hidden"
            // style={{
            //     background:
            //         "linear-gradient(135deg, #B5F09D 0%, #C7F27A 45%, #E7F5D9 100%)",
            // }}
            >
                {/* dark mode overlay */}
                {/* <div
                    className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-300 rounded-[28px]"
                    style={{
                        background:
                            "linear-gradient(135deg, #1A3A0A 0%, #2A5C10 45%, #1E3D0A 100%)",
                    }}
                /> */}

                <div className="relative z-10 text-center max-w-[900px] mx-auto">
                    <h2 className="display-hero text-black dark:text-white text-[10vw] md:text-[64px] leading-[0.98]">
                        Let your website grow
                        <br />
                        without living in your head.
                    </h2>
                    <p className="mt-6 text-[15px] md:text-[17px] text-black/70 dark:text-white/70">
                        Drop your URL. We will send you a free audit within 48
                        hours — no card, no calls.
                    </p>

                    {/* <form
                        onSubmit={(e) => e.preventDefault()}
                        className="mt-8 max-w-[520px] mx-auto flex items-center gap-2 bg-white dark:bg-[#1A1F2E] rounded-full p-1.5 shadow-lg"
                    >
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="yoursite.com"
                            className="flex-1 bg-transparent px-4 py-2.5 text-[15px] outline-none text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/30"
                        />
                        <button className="px-5 py-2.5 rounded-full bg-black dark:bg-[#00E6C4] text-white dark:text-black text-[14px] font-medium flex items-center gap-1 hover:bg-neutral-800 dark:hover:bg-[#12f3d2] transition-colors">
                            Get Audit
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                    </form> */}
                    <p className="mt-4 text-[12px] text-black/50 dark:text-white/45">
                        Free · 48 hour turnaround · No commitment
                    </p>
                </div>

                <div className="pointer-events-none absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-white/30 dark:bg-white/5 blur-2xl" />
                <div className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/40 dark:bg-white/5 blur-3xl" />
            </div>
        </section>
    );
}

/* ================= Footer ================= */
export function Footer() {
    return (
        <footer className="px-3 sm:px-4 pb-8">
            <div className="max-w-[1400px] mx-auto rounded-[24px] md:rounded-[28px] bg-[#071312] dark:bg-[#071312] text-white px-4 sm:px-6 lg:px-14 py-10 sm:py-12 lg:py-20 border border-white/10 overflow-hidden">
                <div className="grid lg:grid-cols-[1.1fr_2.2fr] gap-9 lg:gap-12">
                    <div className="max-w-[360px]">
                        <div className="flex items-center gap-3">
                            <img
                                src="/assets/images/NewAreveiFavicon.png"
                                alt=""
                                aria-hidden="true"
                                className="h-9 w-9 object-contain"
                            />
                            <div className="font-display text-[36px] leading-none tracking-tight text-white">
                                Arevei
                            </div>
                        </div>
                        <p className="text-white/62 text-[14px] mt-4 leading-relaxed">
                            The AI-Native Website Manager. Build, manage, and grow under one expert team.
                        </p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                            <div className="text-[13px] uppercase tracking-widest text-white/45 mb-3">
                                Contact
                            </div>
                            <div className="text-[14px] text-white/80">
                                {areveiEntity.salesEmail}
                            </div>
                            <div className="mt-1 text-[14px] text-white/62">
                                {areveiEntity.phone}
                            </div>
                            <a href={actionHref} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#00E6C4] px-4 py-2 text-[13px] font-semibold text-[#041411] hover:bg-[#12f3d2] transition-colors">
                                Book a Demo
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                        </div>
                        <div className="mt-5 grid gap-3 text-[12px] leading-relaxed text-white/55">
                            <div>
                                <span className="block text-white/82">Registered Address</span>
                                {areveiEntity.registeredAddress.streetAddress}, {areveiEntity.registeredAddress.addressLocality}, {areveiEntity.registeredAddress.addressRegion}, India
                            </div>
                            <div>
                                <span className="block text-white/82">Operational Address</span>
                                {areveiEntity.operationalAddress.streetAddress}, {areveiEntity.operationalAddress.addressLocality}, {areveiEntity.operationalAddress.addressRegion} {areveiEntity.operationalAddress.postalCode}
                            </div>
                        </div>
                        {/* <div className="mt-6 flex items-center gap-3">
                            <SocialIcons />
                        </div> */}
                    </div>
                    <div className="grid gap-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 sm:gap-x-7 gap-y-8">
                            {landingFooterCols.map((c) => (
                                <div key={c.title}>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#00E6C4] mb-3">
                                        {c.title}
                                    </div>
                                    <ul className="space-y-2">
                                        {c.links.map((l) => (
                                            <li key={`${c.title}-${l.name}`}>
                                                <a
                                                    href={l.link}
                                                    className="text-[13px] sm:text-[14px] text-white/72 hover:text-white link-hover"
                                                >
                                                    {l.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:p-4 md:grid-cols-[auto_1fr] md:items-center w-fit">
                            <div className="flex flex-wrap flex-col items-center gap-3">
                                <img
                                    src="/assets/icons/Dpiit logo@2x.png"
                                    alt="DPIIT recognition badge"
                                    className="h-28 w-28 rounded-full bg-white object-contain"
                                />
                                <img
                                    src="https://www.startupindia.gov.in/content/dam/invest-india/newhomepage/Logo1.png"
                                    alt="Startup India"
                                    className="h-9 w-28 object-contain"
                                />
                            </div>
                            <p className="text-[12px] text-center leading-relaxed text-white/58 md:max-w-[200px]">
                                Recognized startup building modern brands with strategy, technology, and performance-led execution.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 md:mt-14 border-t border-white/10 pt-6 md:pt-8">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-4 text-[12px] text-white/45">
                        <div>
                            Copyright {new Date().getFullYear()} Shakyawar Mediatech LLP. All rights reserved.
                        </div>
                        {/* <div className="flex flex-wrap gap-x-5 gap-y-2">
                            <a href="/terms" className="hover:text-white">
                                Terms
                            </a>
                            <a href="/privacypolicy" className="hover:text-white">
                                Privacy
                            </a>
                            <a href="/refundpolicy" className="hover:text-white">
                                Refund
                            </a>
                            <a href="/contact" className="hover:text-white">
                                Contact
                            </a>
                        </div> */}
                    </div>
                    <div className="relative mt-8 h-[96px] overflow-hidden sm:h-[130px] md:h-[190px]">
                        <div
                            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 select-none font-display text-[20vw] leading-none tracking-tighter sm:text-[24vw] md:text-[190px]"
                            style={{
                                background: "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.04))",
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                color: "transparent",
                            }}
                        >
                            Arevei
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 " />
                    </div>
                </div>
            </div>
        </footer>
    );
}
/* ================= Home ================= */
export default function Home() {
    return (
        <div className="flex flex-col gap-0 w-full bg-white dark:bg-[#0A0D0C] min-h-screen transition-colors duration-300">
            <MarketingNav/>
            <Hero />
            <LogosMarquee />
            <ProblemSection />
            <WhatArevei />
            <VideoSection />
            <SeenSalesAhead />
            <OnePlatform />
            <OurProcess />
            <WhyArevei />
            <UnifiedManagement />
            <Testimonials />
            <Pricing />
            <DemoBookingForm />
            {/* <BlogPreview /> */}
            <FAQ />
            <CTA />
        </div>
    );
}


