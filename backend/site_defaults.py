"""Default theme + content for newly created tenant sites."""
from __future__ import annotations


def default_theme() -> dict:
    return {
        "colors": {
            "primary": "#0A0A0A",
            "accent": "#0055FF",
            "background": "#FFFFFF",
            "surface": "#F4F4F5",
            "text": "#0A0A0A",
            "muted": "#525252",
        },
        "typography": {
            "heading_font": "Cabinet Grotesk",
            "body_font": "Satoshi",
            "scale": "lg",
        },
        "layout": {
            "hero_variant": "split",  # split | centered | minimal
            "button_style": "sharp",  # sharp | pill | rounded
            "section_order": ["hero", "features", "testimonials", "faq", "cta"],
        },
    }


def default_pages(company: str) -> list[dict]:
    return [
        {
            "slug": "home",
            "title": "Home",
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "content": {
                        "eyebrow": "AI Native",
                        "headline": f"{company} — built for what's next.",
                        "subheadline": "We help ambitious teams ship faster with a smarter platform.",
                        "primary_cta": "Get started",
                        "secondary_cta": "Talk to us",
                    },
                },
                {
                    "id": "features",
                    "type": "features",
                    "content": {
                        "title": "What we do",
                        "items": [
                            {"title": "Strategy", "body": "We start with the why, then design the how."},
                            {"title": "Build", "body": "Ship in weeks, not quarters."},
                            {"title": "Scale", "body": "Grow with confidence."},
                        ],
                    },
                },
                {
                    "id": "testimonials",
                    "type": "testimonials",
                    "content": {
                        "title": "Trusted by founders",
                        "items": [
                            {"quote": "It just works.", "author": "Sam K.", "role": "CEO"},
                            {"quote": "Our launch was effortless.", "author": "Priya R.", "role": "Founder"},
                        ],
                    },
                },
                {
                    "id": "faq",
                    "type": "faq",
                    "content": {
                        "title": "Frequently asked",
                        "items": [
                            {"q": "How fast can I launch?", "a": "Most teams ship in under a week."},
                            {"q": "Can I edit content myself?", "a": "Yes — through your AI-native CMS."},
                        ],
                    },
                },
                {
                    "id": "cta",
                    "type": "cta",
                    "content": {
                        "headline": "Ready to start?",
                        "subheadline": "Talk to us in 15 minutes.",
                        "primary_cta": "Book a call",
                    },
                },
            ],
        }
    ]


def default_seo(company: str) -> dict:
    return {
        "meta_title": f"{company} — Built for what's next",
        "meta_description": "We help ambitious teams ship faster.",
        "keywords": ["startup", "founder", "saas"],
        "schema_status": {"organization": True, "faq": True, "article": False},
        "aeo_coverage": 65,
        "geo_readiness": 70,
        "suggestions": [
            "Add long-form content targeting your top 3 keywords.",
            "Strengthen FAQ section to improve AEO coverage above 80%.",
        ],
    }
