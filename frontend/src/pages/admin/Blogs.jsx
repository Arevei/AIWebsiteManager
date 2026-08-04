import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Brain,
  Calendar,
  CheckCircle,
  ClockCounterClockwise,
  Eye,
  FileText,
  FloppyDisk,
  GearSix,
  Headset,
  House,
  ImageSquare,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  RocketLaunch,
  Robot,
  Sparkle,
  Trash,
  TrendUp,
  X,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const LOGO = "/arevei-logo-mark.png";
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: House },
  { to: "/admin/dev", label: "AI Workspace", icon: Sparkle },
  { to: "/admin/agent", label: "Manager", icon: Robot },
  { to: "/admin/blogs", label: "Blogs", icon: FileText },
  { to: "/admin?view=meetings", label: "Meetings", icon: Calendar },
  { to: "/admin?view=brain", label: "Brain", icon: Brain },
  { to: "/admin?view=growth", label: "Growth", icon: TrendUp },
  { to: "/admin?view=settings", label: "Settings", icon: GearSix },
];

const EMPTY_FORM = {
  topic: "",
  audience: "",
  word_count: 2000,
  keywords: "",
  cta: "Book a Demo",
  brand_voice: "Professional, simple, educational",
  category: "Blog",
  tags: "",
  auto_generate_image: true,
  force_new: false,
};

const TABS = ["content", "preview", "seo", "image", "agent mind"];

function asCsv(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function fromCsv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function fromLines(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

function isInlineImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.15em] text-white/42">{label}</span>
      {children}
    </label>
  );
}

function IconButton({ title, onClick, children, tone = "default", disabled = false }) {
  const styles = tone === "danger"
    ? "border-red-400/25 text-red-200 hover:border-red-300/60 hover:bg-red-500/10"
    : tone === "primary"
      ? "border-[#49e8ca66] text-[#49e8ca] hover:bg-[#49e8ca10]"
      : "border-white/10 text-white/62 hover:border-white/28 hover:text-white";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-10 w-10 place-items-center rounded-lg border ${styles} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, icon: Icon, onClick, tone = "default", disabled = false }) {
  const styles = tone === "primary"
    ? "bg-[#49e8ca] text-[#032c25] hover:bg-[#5df2d7]"
    : tone === "danger"
      ? "border border-red-400/25 text-red-200 hover:bg-red-500/10"
      : "border border-white/10 text-white/70 hover:border-white/25 hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold ${styles} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}

function MarkdownPreview({ markdown }) {
  const blocks = String(markdown || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return <h3 key={index} className="pt-2 text-2xl font-black leading-tight text-[#101010]">{block.replace(/^###\s+/, "")}</h3>;
        }
        if (block.startsWith("## ")) {
          return <h2 key={index} className="pt-4 text-3xl font-black leading-tight tracking-[-.02em] text-[#101010]">{block.replace(/^##\s+/, "")}</h2>;
        }
        if (block.startsWith("# ")) {
          return <h1 key={index} className="text-4xl font-black leading-tight tracking-[-.03em] text-[#101010]">{block.replace(/^#\s+/, "")}</h1>;
        }
        if (/^[-*]\s/m.test(block)) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-[17px] leading-8 text-black/76">
              {block.split("\n").map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean).map((line, itemIndex) => <li key={itemIndex}>{line}</li>)}
            </ul>
          );
        }
        return <p key={index} className="text-[17px] leading-8 text-black/76">{block.replace(/\*\*/g, "")}</p>;
      })}
    </div>
  );
}

function BlogPreview({ blog }) {
  const image = blog?.featured_image_url || blog?.thumbnail_url;
  return (
    <article className="min-h-[720px] bg-[#fbfbf7] text-[#101010]">
      {image ? (
        <img src={image} alt={blog.title || "Blog featured"} className="h-[330px] w-full object-cover" />
      ) : (
        <div className="grid h-[300px] place-items-center bg-[#eef5f3] text-[#1b5f54]"><ImageSquare size={48} /></div>
      )}
      <div className="mx-auto max-w-3xl px-7 py-11 sm:px-10">
        <div className="mb-4 text-xs font-black uppercase tracking-[.24em] text-[#007f70]">{blog?.category || "Blog"}</div>
        <h1 className="text-4xl font-black leading-tight tracking-[-.035em] sm:text-5xl">{blog?.title || "Untitled blog"}</h1>
        {blog?.meta_description && <p className="mt-5 max-w-2xl text-lg leading-8 text-black/58">{blog.meta_description}</p>}
        <div className="mt-10 border-t border-black/10 pt-9">
          <MarkdownPreview markdown={blog?.body || blog?.markdown} />
        </div>
      </div>
    </article>
  );
}

function NewBlogModal({ form, setForm, onClose, onSubmit, loading }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#07100f] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.18em] text-[#49e8ca]">Content Agent</div>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-white">Create Blog Draft</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60 hover:text-white"><X /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Topic">
            <input autoFocus value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. How AI Website Monitoring Helps Local Businesses Grow" className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <Field label="Audience">
            <input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="e.g. Small business owners" className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <Field label="Word Count">
            <input value={form.word_count} onChange={(e) => setForm({ ...form, word_count: e.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Keywords">
              <textarea rows={2} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="Comma-separated keywords" className="w-full resize-none rounded-lg border border-white/10 bg-white/[.04] p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
            </Field>
          </div>
          <Field label="CTA">
            <input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <Field label="Category">
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <Field label="Brand Voice">
            <input value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })} className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
          <Field label="Tags">
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Comma-separated tags" className="h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.auto_generate_image} onChange={(e) => setForm({ ...form, auto_generate_image: e.target.checked })} /> Auto-generate image</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.force_new} onChange={(e) => setForm({ ...form, force_new: e.target.checked })} /> Force new draft</label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/62 hover:text-white">Cancel</button>
          <button onClick={onSubmit} disabled={loading || !form.topic.trim()} className="rounded-lg bg-[#49e8ca] px-5 py-2 text-sm font-bold text-[#032c25] disabled:opacity-50">
            {loading ? "Generating..." : "Generate Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Blogs() {
  const { user } = useAuth();
  const { blogId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(params.get("new") === "1");
  const [activeTab, setActiveTab] = useState("content");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const previewMode = params.get("preview") === "1";

  const loadBlogs = useCallback(async () => {
    const res = await api.get("/agent/blogs");
    setBlogs(res.data);
  }, []);

  const loadBlog = useCallback(async (id) => {
    const res = await api.get(`/agent/blogs/${id}`);
    setDraft({
      ...res.data,
      keywordsText: asCsv(res.data.keywords),
      tagsText: asCsv(res.data.tags),
      outlineText: (res.data.outline || []).join("\n"),
      internalLinksText: (res.data.internal_links || []).join("\n"),
      reviewNotesText: (res.data.review_notes || []).join("\n"),
    });
    setImageDataUrl("");
  }, []);

  useEffect(() => { loadBlogs(); }, [loadBlogs]);
  useEffect(() => { if (blogId) loadBlog(blogId); else setDraft(null); }, [blogId, loadBlog]);
  useEffect(() => { if (params.get("new") === "1") setShowCreate(true); }, [params]);

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const haystack = `${blog.title || ""} ${blog.slug || ""} ${(blog.keywords || []).join(" ")}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || blog.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [blogs, query, statusFilter]);

  const seoScore = useMemo(() => {
    if (!draft) return 0;
    let score = 0;
    if (draft.title?.length >= 20) score += 20;
    if (draft.slug) score += 15;
    if (draft.meta_title?.length >= 20 && draft.meta_title?.length <= 70) score += 20;
    if (draft.meta_description?.length >= 80 && draft.meta_description?.length <= 170) score += 20;
    if (fromCsv(draft.keywordsText).length >= 3) score += 15;
    if (draft.thumbnail_url || draft.featured_image_url) score += 10;
    return score;
  }, [draft]);

  const generate = async () => {
    if (!form.topic.trim()) {
      toast.error("Add a topic first");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/agent/blogs/generate", {
        ...form,
        word_count: Number(form.word_count) || 2000,
        keywords: fromCsv(form.keywords),
        tags: fromCsv(form.tags),
      });
      toast.success(res.data.existing ? "Existing draft opened" : "Blog draft ready");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadBlogs();
      const nextId = res.data.blog?.id || res.data.id;
      navigate(`/admin/blogs/${nextId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate blog");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return null;
    setSaving(true);
    try {
      const payload = {
        title: draft.title,
        slug: draft.slug,
        markdown: draft.markdown,
        body: draft.body || draft.markdown,
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        keywords: fromCsv(draft.keywordsText),
        tags: fromCsv(draft.tagsText),
        category: draft.category,
        cta: draft.cta,
        thumbnail_url: draft.thumbnail_url,
        featured_image_url: draft.featured_image_url,
        image_prompt: draft.image_prompt,
        outline: fromLines(draft.outlineText),
        internal_links: fromLines(draft.internalLinksText),
        review_notes: fromLines(draft.reviewNotesText),
      };
      const res = await api.patch(`/agent/blogs/${draft.id}`, payload);
      setDraft({ ...draft, ...res.data, keywordsText: asCsv(res.data.keywords), tagsText: asCsv(res.data.tags) });
      setImageDataUrl("");
      await loadBlogs();
      toast.success("Blog saved");
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save blog");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const generateImage = async (blog = draft) => {
    if (!blog) return;
    setLoading(true);
    try {
      const res = await api.post(`/agent/blogs/${blog.id}/image/generate`, { image_prompt: blog.image_prompt });
      if (draft?.id === blog.id) setDraft({ ...draft, ...res.data, keywordsText: asCsv(res.data.keywords), tagsText: asCsv(res.data.tags) });
      await loadBlogs();
      toast.success("Image stored in Cloudinary");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Image generation failed");
    } finally {
      setLoading(false);
    }
  };

  const stageImage = (file) => {
    if (!file || !draft) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setImageDataUrl(dataUrl);
      setDraft({ ...draft, thumbnail_url: dataUrl, featured_image_url: dataUrl });
      toast.info("Preview staged. Save or publish uploads it to Cloudinary.");
    };
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    if (!draft) return;
    setLoading(true);
    try {
      await save();
      const res = await api.post(`/agent/blogs/${draft.id}/publish`, {
        image_data_url: imageDataUrl || undefined,
        image_url: !imageDataUrl && !isInlineImage(draft.featured_image_url || draft.thumbnail_url) ? (draft.featured_image_url || draft.thumbnail_url) : undefined,
      });
      setDraft({ ...draft, ...res.data, keywordsText: asCsv(res.data.keywords), tagsText: asCsv(res.data.tags) });
      setImageDataUrl("");
      await loadBlogs();
      toast.success("Blog published");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to publish blog");
    } finally {
      setLoading(false);
    }
  };

  const unpublish = async () => {
    if (!draft) return;
    const res = await api.post(`/agent/blogs/${draft.id}/unpublish`, {});
    setDraft({ ...draft, ...res.data, keywordsText: asCsv(res.data.keywords), tagsText: asCsv(res.data.tags) });
    await loadBlogs();
    toast.success("Blog moved back to draft");
  };

  const deleteBlog = async (blog) => {
    if (!window.confirm(`Delete "${blog.title}" from the workspace?`)) return;
    await api.delete(`/agent/blogs/${blog.id}`);
    toast.success("Blog deleted");
    setDraft(null);
    await loadBlogs();
    navigate("/admin/blogs");
  };

  const shell = (children) => (
    <div className="aw-shell min-h-screen bg-[#030607] text-white">
      <div className="aw-bg-grid" />
      <div className="aw-glow aw-glow-a" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden h-screen w-[220px] flex-col overflow-hidden border-r border-white/[.07] bg-[#030908] px-4 py-5 lg:flex">
          <Link to="/admin" className="inline-flex shrink-0"><img src={LOGO} alt="Arevei" className="h-7 w-auto max-w-full object-contain object-left" /></Link>
          <nav className="mt-8 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={`aw-side-link ${to === "/admin/blogs" ? "aw-side-link-active" : ""}`}><Icon size={19} /> {label}</Link>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[.08] p-3.5">
            <Headset size={19} className="text-[#49e8ca]" />
            <div className="mt-2 text-sm font-medium text-[#49e8ca]">Content System</div>
            <div className="mt-2 text-xs leading-5 text-white/45">Generate, edit, preview, publish, and improve blogs.</div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-3.5 sm:px-7 lg:ml-[220px]">
          <header className="mb-6 flex min-h-10 items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-[#49e8ca]">Content Agent + CMS</div>
              <h1 className="text-2xl font-black tracking-[-.03em]">Blog Control Center</h1>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden text-sm font-semibold sm:block">{user?.name || user?.email || "Demo"}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#49e8ca] text-[11px] font-bold text-[#032c25]">{(user?.name || user?.email || "A").slice(0, 2).toUpperCase()}</span>
            </div>
          </header>
          {children}
        </main>
      </div>
      {showCreate && <NewBlogModal form={form} setForm={setForm} onClose={() => setShowCreate(false)} onSubmit={generate} loading={loading} />}
    </div>
  );

  const listPage = (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.18em] text-white/42">Blog Library</div>
            <h2 className="mt-1 text-3xl font-black tracking-[-.035em]">Drafts, published posts, and previews</h2>
          </div>
          <ActionButton icon={Plus} tone="primary" onClick={() => setShowCreate(true)}>New Blog</ActionButton>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3">
            <MagnifyingGlass className="text-white/38" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, slug, or keyword..." className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["all", "draft", "published"].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`h-12 rounded-xl border text-sm font-bold capitalize ${statusFilter === status ? "border-[#49e8ca66] bg-[#49e8ca10] text-[#49e8ca]" : "border-white/10 text-white/48"}`}>{status}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredBlogs.map((blog) => {
          const image = blog.thumbnail_url || blog.featured_image_url;
          return (
            <article key={blog.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
              {image ? <img src={image} alt="" className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center bg-white/[.04] text-white/40"><FileText size={34} /></div>}
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[.12em] ${blog.status === "published" ? "bg-[#49e8ca] text-[#032c25]" : "bg-white/8 text-white/58"}`}>{blog.status}</span>
                  <span className="text-xs text-white/35">{blog.category || "Blog"}</span>
                </div>
                <h3 className="line-clamp-2 min-h-[48px] text-lg font-black leading-6 tracking-[-.02em]">{blog.title}</h3>
                <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-white/45">{blog.meta_description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <ActionButton icon={PencilSimple} onClick={() => navigate(`/admin/blogs/${blog.id}`)}>Edit</ActionButton>
                  <IconButton title="Preview" onClick={() => navigate(`/admin/blogs/${blog.id}?preview=1`)}><Eye size={16} /></IconButton>
                  <IconButton title="Delete" tone="danger" onClick={() => deleteBlog(blog)}><Trash size={16} /></IconButton>
                </div>
              </div>
            </article>
          );
        })}
        {filteredBlogs.length === 0 && (
          <div className="col-span-full grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.025] text-center">
            <div><Sparkle size={42} className="mx-auto text-[#49e8ca]" /><div className="mt-3 text-xl font-bold">No blogs found</div><p className="mt-2 text-sm text-white/45">Create a draft from a topic or adjust your search.</p></div>
          </div>
        )}
      </section>
    </div>
  );

  if (!blogId) {
    return shell(listPage);
  }

  if (previewMode && draft) {
    return shell(
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap justify-between gap-3">
          <ActionButton icon={ArrowLeft} onClick={() => navigate(`/admin/blogs/${draft.id}`)}>Back to editor</ActionButton>
          <ActionButton icon={RocketLaunch} tone="primary" onClick={publish} disabled={loading}>Publish</ActionButton>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"><BlogPreview blog={draft} /></div>
      </div>
    );
  }

  return shell(
    <div className="mx-auto max-w-7xl">
      {!draft ? (
        <div className="grid min-h-[560px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.025] text-center">
          <div><Sparkle size={42} className="mx-auto text-[#49e8ca]" /><div className="mt-3 text-xl font-bold">Loading blog</div></div>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <button onClick={() => navigate("/admin/blogs")} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-white/48 hover:text-white"><ArrowLeft size={16} /> All blogs</button>
                <div className="text-xs uppercase tracking-[.16em] text-[#49e8ca]">{draft.status}</div>
                <h2 className="mt-1 break-words text-3xl font-black tracking-[-.035em]">{draft.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton icon={Eye} onClick={() => navigate(`/admin/blogs/${draft.id}?preview=1`)}>Preview</ActionButton>
                <ActionButton icon={FloppyDisk} onClick={save} disabled={saving}>Save</ActionButton>
                <ActionButton icon={ImageSquare} onClick={() => generateImage(draft)} disabled={loading}>Regenerate Image</ActionButton>
                {draft.status === "published"
                  ? <ActionButton icon={ArrowCounterClockwise} onClick={unpublish}>Unpublish</ActionButton>
                  : <ActionButton icon={RocketLaunch} tone="primary" onClick={publish} disabled={loading}>Publish</ActionButton>}
                <ActionButton icon={Trash} tone="danger" onClick={() => deleteBlog(draft)}>Delete</ActionButton>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Field label="Title">
                <input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
              </Field>
              <Field label="Slug">
                <input value={draft.slug || ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
              </Field>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`h-9 rounded-lg border px-3 text-xs font-black uppercase tracking-[.11em] ${activeTab === tab ? "border-[#49e8ca66] bg-[#49e8ca10] text-[#49e8ca]" : "border-white/10 text-white/42 hover:text-white"}`}>{tab}</button>
                ))}
              </div>

              {activeTab === "content" && (
                <div>
                  <div className="mb-2 text-sm font-bold text-white/80">Markdown / Content Editor</div>
                  <textarea value={draft.markdown || ""} onChange={(e) => setDraft({ ...draft, markdown: e.target.value, body: e.target.value })} rows={30} className="min-h-[680px] w-full resize-y rounded-xl border border-white/10 bg-[#050807] p-5 font-mono text-[15px] leading-7 text-white outline-none focus:border-[#49e8ca88]" />
                </div>
              )}

              {activeTab === "preview" && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                  <BlogPreview blog={draft} />
                </div>
              )}

              {activeTab === "seo" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Meta Title"><input value={draft.meta_title || ""} onChange={(e) => setDraft({ ...draft, meta_title: e.target.value })} className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                  <Field label="Category"><input value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                  <div className="lg:col-span-2"><Field label="Meta Description"><textarea rows={4} value={draft.meta_description || ""} onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field></div>
                  <Field label="Keywords"><textarea rows={4} value={draft.keywordsText || ""} onChange={(e) => setDraft({ ...draft, keywordsText: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                  <Field label="Tags"><textarea rows={4} value={draft.tagsText || ""} onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                  <Field label="Internal Links"><textarea rows={5} value={draft.internalLinksText || ""} onChange={(e) => setDraft({ ...draft, internalLinksText: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                  <Field label="Review Notes"><textarea rows={5} value={draft.reviewNotesText || ""} onChange={(e) => setDraft({ ...draft, reviewNotesText: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" /></Field>
                </div>
              )}

              {activeTab === "image" && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/18">
                    {draft.featured_image_url || draft.thumbnail_url ? <img src={draft.featured_image_url || draft.thumbnail_url} alt="" className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center text-white/38"><ImageSquare size={48} /></div>}
                  </div>
                  <div className="space-y-3">
                    <Field label="Image Agent Prompt">
                      <textarea rows={7} value={draft.image_prompt || ""} onChange={(e) => setDraft({ ...draft, image_prompt: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
                    </Field>
                    <ActionButton icon={ImageSquare} onClick={() => generateImage(draft)} disabled={loading}>Generate and Store</ActionButton>
                    <Field label="Upload Replacement">
                      <input type="file" accept="image/*" onChange={(e) => stageImage(e.target.files?.[0])} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55" />
                    </Field>
                    <Field label="Or Image URL">
                      <input placeholder="https://..." value={!imageDataUrl ? (draft.thumbnail_url || "") : ""} onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value, featured_image_url: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#49e8ca88]" />
                    </Field>
                    <p className="text-xs leading-5 text-white/40">Raw uploads are used only for local preview. Save, publish, or regenerate stores the image in Cloudinary and keeps the Cloudinary URL on the blog.</p>
                  </div>
                </div>
              )}

              {activeTab === "agent mind" && (
                <div className="grid gap-3">
                  {(draft.agent_mind || []).map((item, index) => (
                    <details key={`${item.agent}-${index}`} className="rounded-xl border border-white/10 bg-black/18 p-4 text-sm" open={index < 2}>
                      <summary className="cursor-pointer text-base font-black">{item.agent} - {item.role}</summary>
                      <div className="mt-3 text-xs leading-5 text-white/38">{item.input_summary}</div>
                      <div className="mt-3 text-sm leading-6 text-white/78">{item.decision}</div>
                      {item.output && Object.keys(item.output).length > 0 && <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] leading-5 text-white/60">{JSON.stringify(item.output, null, 2)}</pre>}
                    </details>
                  ))}
                </div>
              )}
            </main>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                <div className="mb-3 flex items-center justify-between"><span className="font-bold">SEO Score</span><span className="rounded-full bg-[#49e8ca] px-2.5 py-1 text-xs font-black text-[#032c25]">{seoScore}/100</span></div>
                <div className="space-y-2 text-sm text-white/52">
                  <div className="flex justify-between"><span>Title</span><span>{draft.title?.length || 0} chars</span></div>
                  <div className="flex justify-between"><span>Meta</span><span>{draft.meta_description?.length || 0} chars</span></div>
                  <div className="flex justify-between"><span>Keywords</span><span>{fromCsv(draft.keywordsText).length}</span></div>
                  <div className="flex justify-between"><span>Image</span><span>{draft.thumbnail_url ? "Ready" : "Missing"}</span></div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                <div className="mb-3 flex items-center gap-2 font-bold"><ClockCounterClockwise /> Timeline</div>
                {(draft.agent_timeline || []).map((item, index) => (
                  <div key={index} className="mb-3 flex gap-3 text-sm">
                    <CheckCircle className={item.status === "failed" ? "text-red-300" : item.status === "waiting" ? "text-yellow-400" : "text-[#49e8ca]"} />
                    <div><div className="font-semibold">{item.agent}</div><div className="text-white/38">{item.event}</div></div>
                  </div>
                ))}
              </section>

              {draft.status === "published" && <a href={`/s/${draft.site_slug || "northwind-studio"}?page=${draft.slug}`} className="block rounded-xl border border-[#49e8ca66] p-3 text-sm font-bold text-[#49e8ca]">Open published blog</a>}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
