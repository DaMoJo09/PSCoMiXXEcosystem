import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Calendar, Tag, ChevronRight, Search, Clock, User, 
  ArrowRight, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  images: string[];
  tags: string[];
  status: "published";
  publishedAt: Date;
  readTime: number;
  author: string;
}

const SAMPLE_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "The Evolution of Digital Comic Art",
    slug: "evolution-digital-comic-art",
    excerpt: "Exploring how digital tools have transformed the way we create and consume comics in the modern era.",
    content: "Full article content here...",
    featuredImage: "https://image.pollinations.ai/prompt/digital%20art%20tablet%20comic%20creation%20noir?width=1200&height=600&nologo=true&seed=8001",
    images: [],
    tags: ["digital-art", "comics", "technology", "process"],
    status: "published",
    publishedAt: new Date("2024-12-01"),
    readTime: 8,
    author: "Press Start Studio"
  },
  {
    id: "2",
    title: "Behind the Scenes: Creating Noir Visions",
    slug: "behind-scenes-noir-visions",
    excerpt: "A deep dive into the creative process behind my latest exhibition, from concept to final installation.",
    content: "Full article content here...",
    featuredImage: "https://image.pollinations.ai/prompt/artist%20studio%20noir%20artwork%20process?width=1200&height=600&nologo=true&seed=8002",
    images: [],
    tags: ["exhibition", "process", "noir", "behind-the-scenes"],
    status: "published",
    publishedAt: new Date("2024-11-15"),
    readTime: 12,
    author: "Press Start Studio"
  },
  {
    id: "3",
    title: "Tools of the Trade: My Digital Arsenal",
    slug: "tools-digital-arsenal",
    excerpt: "A comprehensive look at the hardware and software that power my creative workflow.",
    content: "Full article content here...",
    featuredImage: "https://image.pollinations.ai/prompt/creative%20workspace%20computer%20tablet%20minimal?width=1200&height=600&nologo=true&seed=8003",
    images: [],
    tags: ["tools", "workflow", "software", "hardware"],
    status: "published",
    publishedAt: new Date("2024-10-20"),
    readTime: 6,
    author: "Press Start Studio"
  },
  {
    id: "4",
    title: "The Power of Limitations in Art",
    slug: "power-limitations-art",
    excerpt: "Why working within constraints can actually boost creativity and lead to more impactful work.",
    content: "Full article content here...",
    featuredImage: "https://image.pollinations.ai/prompt/minimalist%20black%20white%20art%20concept?width=1200&height=600&nologo=true&seed=8004",
    images: [],
    tags: ["creativity", "philosophy", "process", "inspiration"],
    status: "published",
    publishedAt: new Date("2024-09-25"),
    readTime: 10,
    author: "Press Start Studio"
  },
  {
    id: "5",
    title: "From Sketch to Print: The Comic Production Pipeline",
    slug: "sketch-print-comic-pipeline",
    excerpt: "A step-by-step guide through my complete production process for creating print-ready comics.",
    content: "Full article content here...",
    featuredImage: "https://image.pollinations.ai/prompt/comic%20production%20sketches%20printing%20process?width=1200&height=600&nologo=true&seed=8005",
    images: [],
    tags: ["tutorial", "comics", "printing", "production"],
    status: "published",
    publishedAt: new Date("2024-08-30"),
    readTime: 15,
    author: "Press Start Studio"
  }
];

const ALL_TAGS = Array.from(new Set(SAMPLE_POSTS.flatMap(p => p.tags)));

export default function BlogPage() {
  const [posts] = useState<BlogPost[]>(SAMPLE_POSTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredPost = posts[0];
  const remainingPosts = filteredPosts.filter(p => p.id !== featuredPost.id);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border p-6">
          <h1 className="text-4xl font-black font-display tracking-tight mb-2">BLOG & NEWS</h1>
          <p className="text-muted-foreground">Insights, tutorials, and behind-the-scenes content</p>
        </header>

        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border-2 border-border text-sm focus:ring-0 focus:border-foreground outline-none"
                data-testid="blog-search"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 text-xs font-bold uppercase border-2 border-border ${
                  !selectedTag ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                All
              </button>
              {ALL_TAGS.slice(0, 6).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border-2 border-border ${
                    selectedTag === tag ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {!selectedTag && !searchQuery && (
            <div className="mb-8 border-4 border-border bg-card hover:border-foreground transition-colors cursor-pointer group" data-testid="featured-post">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-2/3 h-64 lg:h-auto overflow-hidden bg-black">
                  <img
                    src={featuredPost.featuredImage}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="lg:w-1/3 p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-foreground text-background text-xs font-bold">FEATURED</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black mb-3">{featuredPost.title}</h2>
                  <p className="text-muted-foreground mb-4">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(featuredPost.publishedAt, "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {featuredPost.readTime} min read
                    </span>
                  </div>
                  <button className="flex items-center gap-2 font-bold text-sm group-hover:gap-3 transition-all">
                    READ MORE <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedTag || searchQuery ? filteredPosts : remainingPosts).map((post) => (
              <article
                key={post.id}
                className="border-4 border-border bg-card hover:border-foreground transition-colors cursor-pointer group"
                data-testid={`post-card-${post.id}`}
              >
                <div className="aspect-video overflow-hidden bg-black">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-muted text-xs font-bold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-black text-lg mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(post.publishedAt, "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime} min
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12 border-4 border-dashed border-border">
              <p className="text-muted-foreground">No articles match your search</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-card">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-xl font-black mb-2">Subscribe to the Newsletter</h3>
            <p className="text-muted-foreground mb-4">Get the latest articles, tutorials, and updates delivered to your inbox.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 bg-background border-2 border-border text-sm focus:ring-0 focus:border-foreground outline-none"
                data-testid="newsletter-email"
              />
              <button className="px-6 py-2 bg-foreground text-background font-bold text-sm hover:opacity-90" data-testid="newsletter-subscribe">
                SUBSCRIBE
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
