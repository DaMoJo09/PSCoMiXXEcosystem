import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Calendar, Star } from "lucide-react";
import { useActiveAnnouncements } from "@/hooks/useAnnouncements";
import type { Announcement } from "@/lib/api";

interface EventCarouselProps {
  featuredOnly?: boolean;
  variant?: "light" | "dark";
  className?: string;
}

export function EventCarousel({ featuredOnly = false, variant = "dark", className = "" }: EventCarouselProps) {
  const { data: announcements, isLoading } = useActiveAnnouncements(featuredOnly);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!announcements || announcements.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements, isPaused]);

  if (isLoading || !announcements || announcements.length === 0) {
    return null;
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const current = announcements[currentIndex];
  const isDark = variant === "dark";

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      announcement: "ANNOUNCEMENT",
      event: "EVENT",
      contest: "CONTEST",
      release: "NEW RELEASE",
      featured: "FEATURED",
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="event-carousel"
    >
      <div 
        className={`relative border-2 ${isDark ? "border-white/20 bg-black/50" : "border-black/20 bg-white/90"} backdrop-blur-sm`}
      >
        <div className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {announcements.map((announcement, idx) => (
            <div 
              key={announcement.id} 
              className="w-full flex-shrink-0"
              data-testid={`carousel-slide-${announcement.id}`}
            >
              <div className="flex flex-col md:flex-row items-stretch">
                {announcement.imageUrl && (
                  <div className="w-full md:w-1/3 aspect-video md:aspect-auto overflow-hidden">
                    <img 
                      src={announcement.imageUrl} 
                      alt={announcement.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`flex-1 p-6 flex flex-col justify-center ${announcement.imageUrl ? "" : "text-center"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {announcement.isFeatured && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                        <Star className="w-3 h-3" />
                        PRESS START
                      </span>
                    )}
                    <span className={`inline-block px-2 py-0.5 text-xs font-mono uppercase tracking-wider border ${isDark ? "border-white/40 text-white/80" : "border-black/40 text-black/80"}`}>
                      {getEventTypeLabel(announcement.eventType)}
                    </span>
                    {announcement.startDate && (
                      <span className={`inline-flex items-center gap-1 text-xs font-mono ${isDark ? "text-white/60" : "text-black/60"}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(announcement.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-2xl md:text-3xl font-display font-bold uppercase tracking-tight mb-2 ${isDark ? "text-white" : "text-black"}`}>
                    {announcement.title}
                  </h3>
                  {announcement.description && (
                    <p className={`text-sm font-mono mb-4 line-clamp-2 ${isDark ? "text-white/70" : "text-black/70"}`}>
                      {announcement.description}
                    </p>
                  )}
                  {announcement.linkUrl && (
                    <a 
                      href={announcement.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:underline underline-offset-4 ${isDark ? "text-white" : "text-black"}`}
                      data-testid={`link-announcement-${announcement.id}`}
                    >
                      {announcement.linkText || "Learn More"}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {announcements.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/10 hover:bg-black/20 text-black"} transition-colors`}
              data-testid="carousel-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/10 hover:bg-black/20 text-black"} transition-colors`}
              data-testid="carousel-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {announcements.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {announcements.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 transition-all ${idx === currentIndex 
                  ? (isDark ? "bg-white w-6" : "bg-black w-6") 
                  : (isDark ? "bg-white/40" : "bg-black/40")
                }`}
                data-testid={`carousel-dot-${idx}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
