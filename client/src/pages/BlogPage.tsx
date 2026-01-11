import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { 
  Calendar, Tag, ChevronRight, Search, Clock, User, 
  ArrowRight, Image as ImageIcon, Plus, X, Edit2, Trash2, ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";

interface BlogPost {
  id: string;
  userId?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  images?: string[];
  tags?: string[];
  status: string;
  publishedAt?: string | Date;
  createdAt: string | Date;
}

export default function BlogPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [viewingPost, setViewingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    tags: "",
    status: "published" as const
  });

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blogs"],
    queryFn: async () => {
      const res = await fetch("/api/blogs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Blog post created");
    },
    onError: () => toast.error("Failed to create post"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      setEditingPost(null);
      resetForm();
      toast.success("Blog post updated");
    },
    onError: () => toast.error("Failed to update post"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast.success("Blog post deleted");
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      featuredImage: "",
      tags: "",
      status: "published"
    });
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content || "",
      featuredImage: post.featuredImage || "",
      tags: post.tags?.join(", ") || "",
      status: post.status as "published"
    });
  };

  const handleSubmit = () => {
    const data = {
      title: formData.title,
      excerpt: formData.excerpt || null,
      content: formData.content,
      featuredImage: formData.featuredImage || null,
      tags: formData.tags.split(",").map(t => t.trim()).filter(t => t),
      status: formData.status,
      publishedAt: formData.status === "published" ? new Date().toISOString() : null
    };

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (post.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || (post.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  if (viewingPost) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <header className="h-14 border-b-4 border-white flex items-center px-6 bg-black sticky top-0 z-20">
            <button
              onClick={() => setViewingPost(null)}
              className="p-2 hover:bg-white hover:text-black border-2 border-white transition-colors mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-black text-lg uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BLOG</h1>
          </header>

          <article className="max-w-4xl mx-auto p-8">
            {viewingPost.featuredImage && (
              <div className="aspect-video mb-8 border-4 border-white overflow-hidden">
                <img 
                  src={viewingPost.featuredImage} 
                  alt={viewingPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex gap-2 mb-4">
              {viewingPost.tags?.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs font-bold bg-zinc-800 border border-zinc-700">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-black mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{viewingPost.title}</h1>
            
            <div className="flex items-center gap-4 text-zinc-400 mb-8">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(viewingPost.publishedAt || viewingPost.createdAt), "MMMM d, yyyy")}
              </span>
            </div>

            {viewingPost.excerpt && (
              <p className="text-xl text-zinc-300 mb-8 font-medium border-l-4 border-white pl-4">{viewingPost.excerpt}</p>
            )}

            <div className="prose prose-invert max-w-none">
              {viewingPost.content.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-zinc-300 leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b-4 border-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BLOG & NEWS</h1>
              <p className="text-zinc-400">Insights, tutorials, and behind-the-scenes content</p>
            </div>
            {user && (
              <Dialog open={isAddDialogOpen || !!editingPost} onOpenChange={(open) => {
                if (!open) {
                  setIsAddDialogOpen(false);
                  setEditingPost(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-white text-black hover:bg-zinc-200 font-bold border-2 border-white"
                    data-testid="btn-add-blog"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ADD POST
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-4 border-white text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">{editingPost ? "EDIT POST" : "ADD POST"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-white">Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        data-testid="input-blog-title"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Excerpt</Label>
                      <Textarea
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="Brief description..."
                        data-testid="input-blog-excerpt"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Content *</Label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="bg-zinc-900 border-white text-white min-h-[150px]"
                        placeholder="Write your article..."
                        data-testid="input-blog-content"
                      />
                    </div>
                    <ImageUpload
                      label="Featured Image"
                      value={formData.featuredImage}
                      onChange={(value) => setFormData({ ...formData, featuredImage: value })}
                    />
                    <div>
                      <Label className="text-white">Tags (comma-separated)</Label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="tutorial, comics, art"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Status</Label>
                      <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger className="bg-zinc-900 border-white text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white">
                          <SelectItem value="published" className="text-white">Published</SelectItem>
                          <SelectItem value="draft" className="text-white">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.title || !formData.content || createMutation.isPending || updateMutation.isPending}
                      className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                      data-testid="btn-save-blog"
                    >
                      {editingPost ? "UPDATE POST" : "PUBLISH POST"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        <div className="p-6 border-b border-zinc-800">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="pl-10 bg-zinc-900 border-white text-white"
                data-testid="search-blogs"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-xs font-bold border-2 ${!selectedTag ? "bg-white text-black border-white" : "border-zinc-600 hover:border-white"}`}
              >
                All
              </button>
              {allTags.slice(0, 6).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1 text-xs font-bold border-2 ${selectedTag === tag ? "bg-white text-black border-white" : "border-zinc-600 hover:border-white"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin mx-auto" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 border-4 border-dashed border-zinc-700">
              <p className="text-zinc-500 mb-4">No blog posts yet</p>
              {user && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-white text-black">
                  <Plus className="w-4 h-4 mr-2" /> Write Your First Post
                </Button>
              )}
            </div>
          ) : (
            <>
              {featuredPost && (
                <div 
                  className="mb-8 border-4 border-white overflow-hidden cursor-pointer hover:bg-zinc-900 transition-colors group"
                  onClick={() => setViewingPost(featuredPost)}
                  data-testid={`blog-card-${featuredPost.id}`}
                >
                  <div className="md:flex">
                    <div className="md:w-2/3 h-64 md:h-auto overflow-hidden bg-zinc-900">
                      {featuredPost.featuredImage ? (
                        <img 
                          src={featuredPost.featuredImage} 
                          alt={featuredPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="md:w-1/3 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex gap-2 mb-3">
                          <span className="px-2 py-1 text-xs font-bold bg-white text-black">FEATURED</span>
                          {featuredPost.status === "draft" && (
                            <span className="px-2 py-1 text-xs font-bold bg-zinc-800 border border-zinc-600">DRAFT</span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black mb-3">{featuredPost.title}</h2>
                        <p className="text-zinc-400 line-clamp-3">{featuredPost.excerpt}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(featuredPost.publishedAt || featuredPost.createdAt), "MMM d, yyyy")}
                        </div>
                        {user && featuredPost.userId === user.id && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEditDialog(featuredPost)}
                              className="p-2 border border-zinc-600 hover:border-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(featuredPost.id)}
                              className="p-2 border border-zinc-600 hover:border-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingPosts.map(post => (
                  <div
                    key={post.id}
                    className="border-4 border-white overflow-hidden cursor-pointer hover:bg-zinc-900 transition-colors group"
                    onClick={() => setViewingPost(post)}
                    data-testid={`blog-card-${post.id}`}
                  >
                    <div className="h-40 overflow-hidden bg-zinc-900">
                      {post.featuredImage ? (
                        <img 
                          src={post.featuredImage} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex gap-2 mb-2">
                        {(post.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] font-bold bg-zinc-800 border border-zinc-700">
                            {tag}
                          </span>
                        ))}
                        {post.status === "draft" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-zinc-700">DRAFT</span>
                        )}
                      </div>
                      <h3 className="font-bold mb-2 line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(post.publishedAt || post.createdAt), "MMM d")}
                        </span>
                        {user && post.userId === user.id && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEditDialog(post)}
                              className="p-1 border border-zinc-600 hover:border-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(post.id)}
                              className="p-1 border border-zinc-600 hover:border-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
