export const navItems = [
    { label: 'Home', href: '/landing#top' },
    { label: 'Products', href: '/landing#services' },
    { label: 'Plans', href: '/landing#pricing' },
    { label: 'Clientele', href: '/landing#clientele' },
    { label: 'Blogs', href: '/landing#blog' },
    // { label: 'About', href: '/about' },
];

export const companyLogos = [
    // { name: 'EkamTGS', src: null, initials: 'E' },
    { name: 'Ayurooms', src: '/assets/icons/Ayurooms.png' },
    { name: 'LLF', src: '/assets/icons/llf-logo.png' },
    { name: 'Maharishi', src: '/assets/icons/Maharishi.png' },
    { name: 'Joincloud', src: "/assets/icons/joincloud.png"},
    // { name: 'DS Polypack', src: null, initials: 'DS' },
    { name: 'SGT Make', src: '/assets/icons/sgtmake.webp' },
    { name: 'Jenii', src: "/assets/icons/jenii.png" },
    { name: 'Chandak', src: '/assets/icons/chandak-logo.png' },
    { name: 'Nisvarth Jan Seva', src: '/assets/icons/nisvrth-logo.png' },
];

export const pillars = [
    {
        title: 'Build',
        desc: 'Ship a production-ready website in days, not months. AI-drafted layouts, human-crafted judgment, on-brand from the first paint.',
        color: 'bg-[#DCE7F6]',
    },
    {
        title: 'Manage',
        desc: 'Continuous updates, content refreshes, technical fixes, and copy tweaks — handled while you focus on the business.',
        color: 'bg-[#E7F5D9]',
    },
    {
        title: 'Analyze',
        desc: 'We watch every visitor, every page, every drop-off. You get a clear read on what is working — and what to change next.',
        color: 'bg-[#F8DAEE]',
    },
    {
        title: 'Grow',
        desc: 'SEO, AEO, GEO, ads, outreach — we execute the growth playbook end-to-end and prove the ROI in your CRM.',
        color: 'bg-[#F5F142]',
    },
];

export const dashboardCards = [
    {
        tag: 'Seen',
        tagColor: 'bg-black text-white',
        heading: '3.4x',
        subheading: 'organic visibility',
        note: 'Auto-optimized meta, structured schema, AI overview coverage across 60+ pages in the last 30 days.',
        stats: [
            { label: 'Impressions', value: '+218%' },
            { label: 'AI cites', value: '41' },
            { label: 'Rankings', value: '82' },
        ],
        footer: 'Indexing new AEO answers',
        dotColor: 'bg-[#00E6C4]',
        chartColor: 'stroke-[#00E6C4] fill-[#00E6C4]/20',
    },
    {
        tag: 'Sales',
        tagColor: 'bg-[#C7F27A] text-black',
        heading: '₹42L',
        subheading: 'pipeline generated',
        note: 'Landing pages, lead magnets, and outreach sequences aligned to your ICP. Every touchpoint logged.',
        stats: [
            { label: 'Leads', value: '312' },
            { label: 'Qualified', value: '87' },
            { label: 'Booked', value: '24' },
        ],
        footer: 'Syncing to your CRM',
        dotColor: 'bg-[#C7F27A]',
        chartColor: 'stroke-[#C7F27A] fill-[#C7F27A]/20',
    },
    {
        tag: 'Ahead',
        tagColor: 'bg-[#0F1413] text-white',
        heading: '12',
        subheading: 'competitor moves flagged',
        note: 'Pricing shifts, new comparison pages, positioning updates — we spot them and counter them within 48 hours.',
        stats: [
            { label: 'Signals', value: '46' },
            { label: 'Counter-plays', value: '9' },
            { label: 'Wins', value: '5' },
        ],
        footer: 'Watching 8 rivals',
        dotColor: 'bg-white',
        chartColor: 'stroke-white/60 fill-white/10',
    },
];

// One Platform — Three Engines
export const engines = [
    {
        name: 'Arevei Web',
        headline: 'Build. Ship. Support.',
        tagline: 'A production-grade site — without a full-time dev team.',
        badgeRight: null,
        features: [
            'Design + development sprints (7–21 days)',
            '99.9% uptime + managed hosting + backups',
            'Unlimited content and design updates',
            'Core Web Vitals engineered — LCP under 2.5s',
        ],
        cta: 'Learn more',
        ctaAccent: false,
        highlight: false,
    },
    {
        name: 'Arevei Grow',
        headline: 'SEO. AEO. GEO. CRO.',
        tagline: 'Rankings, AI citations, and pipeline — compounding monthly.',
        badgeRight: null,
        features: [
            'Keyword + topic clustering (APTK framework)',
            'Answer Engine Optimization for ChatGPT / Perplexity / Gemini',
            'Lead tracking + conversion rate optimization',
            'Monthly growth reports with attribution',
        ],
        cta: 'Learn more',
        ctaAccent: false,
        highlight: true,
    },
    {
        name: 'Arevei Ads',
        headline: 'Create. Attribute. Scale.',
        tagline: 'AI-managed acquisition — coming soon.',
        badgeRight: 'Q1 2026',
        features: [
            'Meta + Google campaign management',
            'AI-generated creative variations',
            'Full-funnel attribution (impression → close)',
            'Join the waitlist for early access',
        ],
        cta: 'Join waitlist',
        ctaAccent: true,
        highlight: false,
    },
];

export const processSteps = [
    { timestamp: '48 hrs', tag: 'Audit', title: 'Free Website Audit', body: 'Full teardown of your current site — SEO, UX, conversion, tech debt, and competitor gaps. Delivered in 48 hours.' },
    { timestamp: 'Week 1', tag: 'Build', title: 'Build or Improve', body: 'On-brand pages built or improved to convert. AI-powered speed, professional human judgment.' },
    { timestamp: 'Day 1', tag: 'Instrument', title: 'Connect Tracking', body: 'Analytics, heatmaps, session replays, form intent, and attribution wired up on day one.' },
    { timestamp: 'Weekly', tag: 'Insight', title: 'Recommend', body: 'Weekly brief on what is working, what is leaking, and recommended improvements.' },
    { timestamp: 'Ongoing', tag: 'Action', title: 'Execute', body: 'Copy changes, technical updates, SEO/AEO optimizations, and landing pages shipped for you.' },
    { timestamp: 'Monthly', tag: 'Reporting', title: 'Report & Grow', body: 'Monthly growth reviews tying every action to real sales pipeline and opportunities.' },
];

export const blogPosts = [
    {
        title: 'How to Increase Sales Through Your Website',
        author: 'Arevei Team',
        desc: 'Turn your static landing pages into active pipelines by fixing layout, copywriting, and clear conversion goals.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
        tag: 'Conversion',
    },
    {
        title: 'How AI Managed Websites Work',
        author: 'Arevei Team',
        desc: 'The workflow mechanism that keeps a site continuously optimized using advanced models and professional strategy.',
        image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
        tag: 'AI',
    },
    {
        title: 'Why Founders Need an AI Native Website Manager',
        author: 'Arevei Team',
        desc: 'Stop spending hours in your CMS or chasing developers. Here is how a managed model saves founder bandwidth.',
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80',
        tag: 'Founders',
    },
    {
        title: 'SEO vs AEO vs GEO: What Businesses Need to Know',
        author: 'Arevei Team',
        desc: 'Understanding Search Engine, Answer Engine, and Generative Engine Optimization for modern buyer visibility.',
        image: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
        tag: 'SEO / AEO',
    },
    {
        title: 'How Website Lead Tracking Improves Growth',
        author: 'Arevei Team',
        desc: 'Connecting analytics, heatmaps, and session data directly to your pipeline opportunities and CRM.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
        tag: 'Analytics',
    },
    {
        title: 'Why Your Website Stopped Growing After Launch',
        author: 'Arevei Team',
        desc: 'The post-launch void is where 90% of sites die. How to keep updating, analyzing, and growing your platform.',
        image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80',
        tag: 'Growth',
    },
];

export const audiences = [
    {
        title: 'Growing Brands',
        tagline: 'Move fast without breaking the funnel.',
        features: [
            'Weekly page updates & new launches',
            'Continuous SEO & AEO optimization',
            'Landing pages that keep converting',
            'Analytics that tell you the truth',
        ],
        cta: 'Book a demo',
        accent: 'bg-[#C7F27A]',
    },
    {
        title: 'Founders & Ops',
        tagline: 'Stop living in your CMS.',
        features: [
            'One team for build, manage, grow',
            'No more agency ping-pong',
            'Fixed monthly retainer, no surprises',
            'A single dashboard — or none at all',
        ],
        cta: 'Talk to founder',
        cta2: 'See pricing',
        accent: 'bg-[#00E6C4]',
    },
    {
        title: 'Mission-Led Orgs',
        tagline: 'A website that respects the mission.',
        features: [
            'Story-driven design language',
            'Content that ranks and resonates',
            'Impact reporting built into the site',
            'Non-profit friendly pricing',
        ],
        cta: 'Explore for mission orgs',
        cta2: null,
        accent: 'bg-[#C7F27A]',
    },
];

export const whyArevei = [
    { title: 'AI Speed', desc: 'We use AI-powered systems to analyze, recommend, and accelerate execution.' },
    { title: 'Professional Judgment', desc: 'Strategy, quality, development, implementation, and final decisions managed by professionals.' },
    { title: 'Freedom from Bandwidth', desc: 'Website growth and management that runs continuously without depending on your internal team.' },
];

// Comparison: Traditional Agency vs Arevei
export const comparison = [
    { label: 'Monthly cost', agency: 'Variable + project fees', arevei: 'Fixed retainer' },
    { label: 'Response time', agency: 'Days to weeks', arevei: 'Under 4 hours' },
    { label: 'Website updates', agency: 'Pay-per-change', arevei: 'Unlimited included' },
    { label: 'Growth strategy', agency: 'Extra retainer required', arevei: 'Built into every plan' },
    { label: 'AI & automation', agency: 'None or bolted-on', arevei: 'Core to the workflow' },
    { label: 'SEO / AEO / GEO', agency: 'Separate agency needed', arevei: 'Included in Grow plan' },
    { label: 'Analytics & tracking', agency: 'Another vendor', arevei: 'Fully integrated' },
    { label: 'Accountability', agency: 'Project manager overhead', arevei: 'Direct team ownership' },
];

export const testimonials = [
    {
        name: 'Ayurooms',
        role: 'Wellness Retreats',
        quote: 'How Ayurooms improved its digital growth system with Arevei.',
        badge: 'bg-neutral-100',
    },
    {
        name: 'LLF',
        role: 'Educational Foundation',
        quote: 'How LLF strengthened its website management with Arevei.',
        badge: 'bg-neutral-100',
    },
    {
        name: 'Maharishi',
        role: 'Mission-Led Institution',
        quote: 'How Maharishi built a more strategic website experience with Arevei.',
        badge: 'bg-neutral-100',
    },
];

export const pricingPlans = {
    development: [
        {
            name: 'Template-Based Website',
            price: '₹20,000',
            originalPrice: null,
            frequency: 'one-time',
            desc: 'For businesses that need a clean, professional website launched quickly.',
            features: ['Startups & portfolios', 'Service business websites', 'Launch in 7 days', 'On-brand template design', 'Standard setup & contact forms'],
            cta: 'Start with Template Website',
            highlight: false,
        },
        {
            name: 'Advanced UI & Functional Website',
            price: '₹65,000',
            originalPrice: null,
            frequency: 'one-time',
            desc: 'For businesses that need a stronger, more customized website experience.',
            features: ['Growing businesses & brands', 'Lead-generation setup', 'Bespoke UI design', 'SEO/AEO infrastructure', 'Analytics integrations'],
            cta: 'Build Advanced Website',
            highlight: true,
        },
        {
            name: 'Custom / Enterprise Requirement',
            price: 'Custom',
            originalPrice: null,
            frequency: 'quote',
            desc: 'For custom workflows, advanced functionality, or larger systems.',
            features: ['Custom platforms', 'Advanced integrations', 'Enterprise requirements', 'Complex infrastructure', 'SLA support'],
            cta: 'Talk to Sales',
            highlight: false,
        },
    ],
    management: [
        {
            name: 'Arevei Web',
            price: '₹12,000',
            originalPrice: '₹15,000',
            frequency: '/mo',
            desc: 'Build and manage your website with professionals.',
            features: ['Website updates & edits', 'Performance management', 'Technical maintenance', 'Infrastructure support', 'Priority support', 'Monthly updates'],
            cta: 'Start with Arevei Web',
            highlight: false,
        },
        {
            name: 'Arevei Grow',
            price: '₹24,000',
            originalPrice: '₹30,000',
            frequency: '/mo',
            desc: 'Build, analyze, and grow your website every month.',
            features: ['Everything in Arevei Web', 'Analytics & lead tracking', 'SEO, AEO & GEO content strategy', 'Conversion & UX improvements', 'Dedicated strategy support'],
            cta: 'Start Growing',
            highlight: true,
        },
        {
            name: 'Arevei Ads',
            price: 'Waitlist',
            originalPrice: null,
            frequency: '',
            desc: 'AI-powered ad and acquisition management.',
            features: ['Campaign landing pages', 'Ad creative production', 'Attribution & paid strategy', 'Performance feedback loop', 'Paid channels optimization'],
            cta: 'Join Waitlist',
            highlight: false,
        },
    ],
};

export const faqs = [
    { q: 'What is an AI Native Website Manager?', a: 'An AI Native Website Manager combines AI-powered systems (for speed, copy, analysis, and recommendations) with professional strategy, development, and design to continuously build, manage, analyze, and grow your website.' },
    { q: 'Is Arevei a website development company or an AI company?', a: 'We are both. We use AI systems to accelerate the speed of content generation, audits, and performance checks, while our team of developers, copywriters, and designers review and execute every single change.' },
    { q: 'Do you only build websites?', a: 'No. While we build modern custom websites, we also manage existing websites, perform updates, manage organic visibility (SEO/AEO/GEO), and run growth campaigns monthly.' },
    { q: 'What is the difference between Arevei Web and Arevei Grow?', a: 'Arevei Web focuses on core website updates, infrastructure support, and maintenance. Arevei Grow adds analytics, pipeline/lead tracking, SEO/AEO/GEO strategy, and active conversions work to drive pipeline.' },
    { q: 'Will AI directly manage my website?', a: 'No. AI tools assist our workflow to ensure maximum speed and analysis, but every modification, line of code, and layout change is explicitly verified and deployed by our professional team.' },
    { q: 'Can Arevei improve my existing website?', a: 'Yes. We can take over, audit, optimize, and manage your existing website to improve its current performance, UX, and search engine/answer engine visibility.' },
    { q: 'Do you provide reports?', a: 'Yes. You receive monthly updates and clear reports tracking website performance, search visibility, lead signals, and conversion rates.' },
    { q: 'Is Arevei Ads available?', a: 'Arevei Ads is currently in closed waitlist and will be launched soon. You can join the waitlist in the pricing section.' },
];

export const footerCols = [
    { title: 'Products', links: ['Arevei Web', 'Arevei Grow', 'Arevei Ads', 'Pricing'] },
    { title: 'Services', links: ['Website Design & Development', 'Website Management', 'Website Growth', 'SEO/AEO/GEO', 'Website Analytics', 'Website Lead Tracking'] },
    { title: 'Company', links: ['About', 'Clientele', 'Case Studies', 'Contact', 'Book a Demo'] },
    { title: 'Resources', links: ['Blog', 'Founder Guides', 'AI Managed Websites', 'Website Growth', 'Landing Pages'] },
];
