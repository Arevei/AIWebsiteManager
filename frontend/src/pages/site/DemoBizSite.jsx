import React from "react";
import { Link } from "react-router-dom";

const services = [
  ["Website Strategy", "Conversion-focused page structure, messaging, and SEO foundations."],
  ["Growth Content", "Useful blogs, landing pages, and lead magnets built around search intent."],
  ["Lead Systems", "Clear calls to action, forms, analytics, and follow-up journeys."],
];

const posts = [
  "How better website messaging turns visits into leads",
  "What small businesses should measure before buying ads",
  "A simple SEO content plan for service companies",
];

const fixedBlog = {
  title: "How DemoBiz Turns Website Visits Into Qualified Leads",
  eyebrow: "Featured Demo Blog",
  excerpt: "A practical walkthrough of how clearer positioning, stronger page structure, useful content, and simple conversion tracking turn a small business website into a growth system.",
  body: [
    "Most small business websites do not fail because they look bad. They fail because visitors cannot quickly understand what the business does, why it matters, and what to do next.",
    "DemoBiz fixes that by treating the website as a lead system. The homepage introduces the offer in plain language. Service pages explain outcomes instead of listing generic capabilities. Blog content answers the questions buyers already search for before they are ready to book a call.",
    "The result is a site that guides attention. Each page has one primary action, supporting proof, and internal links that help visitors move from interest to trust. Search engines get clearer topical signals, and business owners get a simpler way to measure what is working.",
    "A good growth website is not a one-time brochure. It is a living system: publish useful content, watch which pages attract qualified visitors, improve the call to action, and repeat. That is the operating rhythm DemoBiz uses to turn traffic into pipeline.",
  ],
};

export default function DemoBizSite() {
  return (
    <main className="min-h-screen bg-[#071016] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071016]/92 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link to="/admin" className="flex items-center gap-3 text-2xl font-black tracking-[-.04em]">
            <span className="h-4 w-4 rounded-full bg-[#c7ff4a]" />
            DemoBiz
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/66 md:flex">
            <a href="#services">Services</a>
            <a href="#work">Results</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
          </nav>
          <a href="#contact" className="rounded-xl bg-[#c7ff4a] px-5 py-3 text-sm font-black text-black">Get In Touch</a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(199,255,74,.18),transparent_34%),linear-gradient(135deg,#071016,#0d2627_58%,#101813)]" />
        <div className="relative mx-auto grid min-h-[660px] max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.04fr_.96fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#c7ff4a66] px-4 py-2 text-sm font-bold text-[#c7ff4a]">We help brands grow</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] sm:text-7xl">
              We build digital experiences that <span className="text-[#c7ff4a]">drive growth</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/66">
              DemoBiz helps growing businesses turn their websites into measurable lead systems with clear messaging, useful content, and practical conversion strategy.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#services" className="rounded-xl bg-[#c7ff4a] px-6 py-4 font-black text-black">Our Services</a>
              <a href="#work" className="rounded-xl border border-white/20 px-6 py-4 font-bold text-white">See Results</a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/12 bg-white/[.06] p-4 shadow-2xl">
            <div className="rounded-2xl bg-[#f7faf8] p-5 text-[#101513]">
              <div className="mb-5 flex items-center justify-between">
                <div className="font-black">Growth dashboard</div>
                <span className="rounded-full bg-[#c7ff4a] px-3 py-1 text-xs font-black">Live</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Website Health", "88", "radial-gradient(circle,#fff 45%,#74c476 47% 65%,#dce8df 67%)"],
                  ["Content Growth", "+42%", "linear-gradient(135deg,#eef4f6,#fff)"],
                  ["Qualified Leads", "126", "linear-gradient(135deg,#eef4f6,#fff)"],
                  ["SEO Visibility", "+31%", "linear-gradient(135deg,#eef4f6,#fff)"],
                ].map(([label, value, bg]) => (
                  <div key={label} className="rounded-2xl border border-black/8 bg-white p-5">
                    <div className="text-xs font-bold text-black/50">{label}</div>
                    <div className="mt-4 grid h-28 place-items-center rounded-xl" style={{ background: bg }}>
                      <span className="text-3xl font-black">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-black uppercase tracking-[.2em] text-[#49e8ca]">Services</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-.04em]">A complete website growth system</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {services.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-6">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-4 leading-7 text-white/58">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="work" className="border-y border-white/10 bg-white/[.035]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-4">
          {[["4.8x", "more qualified inquiries"], ["31%", "higher search visibility"], ["18", "new content assets"], ["2.6s", "average page load"]].map(([value, label]) => (
            <div key={label}>
              <div className="text-5xl font-black text-[#c7ff4a]">{value}</div>
              <div className="mt-2 text-sm text-white/58">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="blog" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-9 flex items-end justify-between gap-5">
          <div>
            <div className="text-sm font-black uppercase tracking-[.2em] text-[#49e8ca]">Blog</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em]">Latest growth thinking</h2>
          </div>
        </div>
        <article className="mb-5 overflow-hidden rounded-3xl border border-white/10 bg-[#fbfbf4] text-[#101513]">
          <div className="grid lg:grid-cols-[.9fr_1.1fr]">
            <div className="min-h-[360px] bg-[radial-gradient(circle_at_34%_30%,rgba(199,255,74,.72),transparent_22%),linear-gradient(135deg,#102226,#dff4f1)] p-8">
              <div className="rounded-2xl bg-white/88 p-5 shadow-2xl">
                <div className="text-xs font-black uppercase tracking-[.16em] text-[#007f70]">DemoBiz content engine</div>
                <div className="mt-8 grid gap-3">
                  {["Message clarity", "Useful blog topic", "SEO intent", "Lead call to action"].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-black/8 bg-white px-4 py-3 text-sm font-black">
                      <span>{item}</span>
                      <span className="rounded-full bg-[#c7ff4a] px-2 py-1 text-xs">{index === 0 ? "Live" : "Ready"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 lg:p-10">
              <div className="text-xs font-black uppercase tracking-[.2em] text-[#007f70]">{fixedBlog.eyebrow}</div>
              <h3 className="mt-4 text-4xl font-black leading-tight tracking-[-.04em]">{fixedBlog.title}</h3>
              <p className="mt-5 text-lg leading-8 text-black/62">{fixedBlog.excerpt}</p>
              <div className="mt-8 space-y-5 text-[16px] leading-8 text-black/72">
                {fixedBlog.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <a href="#contact" className="mt-8 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-black text-white">Book a Strategy Call</a>
            </div>
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((title) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-[#0b151a] p-5">
              <div className="mb-5 aspect-video rounded-xl bg-[linear-gradient(135deg,#dff4f1,#ffffff)]" />
              <h3 className="text-xl font-black leading-7">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">A practical guide for turning website improvements into measurable business growth.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="bg-[#c7ff4a] px-6 py-20 text-center text-black">
        <h2 className="mx-auto max-w-3xl text-5xl font-black tracking-[-.05em]">Ready to grow from your website?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-black/65">Let DemoBiz turn your message, pages, content, and analytics into a cleaner growth engine.</p>
        <button className="mt-8 rounded-xl bg-black px-7 py-4 font-black text-white">Book a Strategy Call</button>
      </section>
    </main>
  );
}
