import { Layout } from "@/components/layout/Layout";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ReportContentButton } from "@/components/ReportContentButton";
import {
  Star,
  Users,
  UserPlus,
  Award,
  Calendar,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface CreatorProfile {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  coverImage: string | null;
  bio: string | null;
  tagline: string | null;
  creatorClass: string;
  xp: number;
  level: number;
  socialLinks: Record<string, string> | null;
  followerCount: number;
  followingCount: number;
  publishedWorks: Array<{
    id: string;
    title: string;
    type: string;
    thumbnail: string | null;
    createdAt: string;
  }>;
  joinedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  comic: "COMIC",
  card: "CARD",
  vn: "VISUAL NOVEL",
  cyoa: "CYOA",
  cover: "COVER",
  motion: "MOTION",
};

const TYPE_COLORS: Record<string, string> = {
  comic: "bg-red-600",
  card: "bg-yellow-600",
  vn: "bg-purple-600",
  cyoa: "bg-green-600",
  cover: "bg-blue-600",
  motion: "bg-orange-600",
};

export default function CreatorProfilePage() {
  const [, params] = useRoute("/creator/:username");
  const username = params?.username;

  const { data: creator, isLoading, error } = useQuery<CreatorProfile>({
    queryKey: ["creator", username],
    queryFn: async () => {
      const res = await fetch(`/api/creator/${username}`);
      if (!res.ok) throw new Error("Creator not found");
      return res.json();
    },
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-zinc-400" data-testid="text-loading">Loading creator profile...</div>
        </div>
      </Layout>
    );
  }

  if (error || !creator) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-not-found">Creator Not Found</h2>
            <p className="text-zinc-400">This creator profile doesn't exist.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const xpProgress = creator.xp % 1000;
  const xpToNext = 1000;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="relative border-2 border-zinc-700 bg-zinc-900 overflow-hidden">
          {creator.coverImage && (
            <div className="h-48 w-full overflow-hidden">
              <img src={creator.coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
            </div>
          )}
          {!creator.coverImage && <div className="h-48 w-full bg-gradient-to-r from-zinc-800 to-zinc-900" />}

          <div className="p-6 -mt-16 relative">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-24 h-24 border-4 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden">
                {creator.avatar ? (
                  <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-zinc-500">{creator.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="pb-1 flex-1">
                <h1 className="text-2xl font-bold text-white" data-testid="text-creator-name">{creator.name}</h1>
                {creator.username && (
                  <p className="text-sm text-zinc-400" data-testid="text-creator-username">@{creator.username}</p>
                )}
              </div>
              <div className="pb-1">
                <ReportContentButton contentType="user" contentId={creator.id} variant="subtle" />
              </div>
            </div>

            {creator.tagline && <p className="text-zinc-300 font-medium mb-2" data-testid="text-tagline">{creator.tagline}</p>}
            {creator.bio && <p className="text-zinc-400 text-sm mb-4" data-testid="text-bio">{creator.bio}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-yellow-400">
                <Award className="w-4 h-4" />
                <span className="font-bold" data-testid="text-creator-class">{creator.creatorClass}</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <Star className="w-4 h-4" />
                <span data-testid="text-level">Level {creator.level}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Users className="w-4 h-4" />
                <span data-testid="text-followers">{creator.followerCount} followers</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <UserPlus className="w-4 h-4" />
                <span data-testid="text-following">{creator.followingCount} following</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(creator.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>{creator.xp.toLocaleString()} XP</span>
                <span>{xpProgress}/{xpToNext} to next level</span>
              </div>
              <div className="h-2 bg-zinc-800 border border-zinc-700">
                <div
                  className="h-full bg-cyan-500"
                  style={{ width: `${(xpProgress / xpToNext) * 100}%` }}
                />
              </div>
            </div>

            {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
              <div className="flex gap-3 mt-4">
                {Object.entries(creator.socialLinks).map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 border border-zinc-700 px-2 py-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {key}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Published Works ({creator.publishedWorks.length})
          </h2>

          {creator.publishedWorks.length === 0 ? (
            <div className="border-2 border-zinc-700 bg-zinc-900 p-8 text-center">
              <p className="text-zinc-400" data-testid="text-no-works">No published works yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {creator.publishedWorks.map((work) => (
                <div
                  key={work.id}
                  className="border-2 border-zinc-700 bg-zinc-900 overflow-hidden hover:border-zinc-500 transition-colors cursor-pointer"
                  data-testid={`card-work-${work.id}`}
                >
                  <div className="aspect-[3/4] bg-zinc-800 relative">
                    {work.thumbnail ? (
                      <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <span className={`absolute top-1 left-1 text-[10px] font-bold text-white px-1 ${TYPE_COLORS[work.type] || "bg-zinc-600"}`}>
                      {TYPE_LABELS[work.type] || work.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-bold text-white truncate">{work.title}</h3>
                    <p className="text-[10px] text-zinc-500">{new Date(work.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
