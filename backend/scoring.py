"""Real, deterministic SEO/AEO/GEO scoring from site content — no random numbers."""
from __future__ import annotations


def score_site(site: dict) -> dict:
    seo = site.get("seo", {}) or {}
    pages = site.get("pages", []) or []
    theme = site.get("theme_config", {}) or {}

    # ---- SEO score (out of 100) — checks meta tags, page count, theme completeness ----
    seo_checks = {
        "meta_title_present": bool(seo.get("meta_title")),
        "meta_title_length_ok": 30 <= len(seo.get("meta_title", "")) <= 65,
        "meta_description_present": bool(seo.get("meta_description")),
        "meta_description_length_ok": 50 <= len(seo.get("meta_description", "")) <= 160,
        "keywords_set": len(seo.get("keywords", [])) >= 3,
        "has_at_least_one_page": len(pages) > 0,
        "theme_complete": bool(theme.get("typography") and theme.get("colors")),
        "organization_schema": bool((seo.get("schema_status") or {}).get("organization")),
    }
    seo_score = round(100 * sum(seo_checks.values()) / max(1, len(seo_checks)))

    # ---- AEO (Answer Engine Optimization) — FAQ sections + Q/A coverage ----
    faq_sections, faq_items = 0, 0
    for p in pages:
        for s in p.get("sections", []) or []:
            if s.get("type") == "faq":
                faq_sections += 1
                faq_items += len((s.get("content", {}) or {}).get("items", []) or [])
    aeo_checks = {
        "has_faq_section": faq_sections > 0,
        "faq_has_5_plus_items": faq_items >= 5,
        "faq_schema_marked": bool((seo.get("schema_status") or {}).get("faq")),
        "meta_description_present": bool(seo.get("meta_description")),
    }
    aeo_score = round(100 * sum(aeo_checks.values()) / max(1, len(aeo_checks)))

    # ---- GEO (Generative Engine Optimization) — citable, structured, long-form content ----
    total_words, article_count = 0, 0
    for p in pages:
        for s in p.get("sections", []) or []:
            c = s.get("content", {}) or {}
            for v in c.values():
                if isinstance(v, str):
                    total_words += len(v.split())
            if s.get("type") == "article":
                article_count += 1
    geo_checks = {
        "long_form_content": total_words >= 300,
        "has_article_or_blog": article_count > 0,
        "faq_coverage": faq_items >= 3,
        "structured_schema": sum(bool(v) for v in (seo.get("schema_status") or {}).values()) >= 2,
        "brand_terms_in_meta": bool(seo.get("meta_description")) and len(seo.get("keywords", [])) >= 3,
    }
    geo_score = round(100 * sum(geo_checks.values()) / max(1, len(geo_checks)))

    return {
        "seo": {"score": seo_score, "checks": seo_checks},
        "aeo": {"score": aeo_score, "checks": aeo_checks, "faq_items": faq_items},
        "geo": {"score": geo_score, "checks": geo_checks, "total_words": total_words,
                "articles": article_count},
        "summary": {"seo_score": seo_score, "aeo_score": aeo_score, "geo_score": geo_score,
                    "word_count": total_words, "faq_items": faq_items, "pages": len(pages)},
    }
