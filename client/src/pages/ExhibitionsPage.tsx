import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Calendar, MapPin, Clock, ExternalLink, ChevronRight, 
  Filter, Users, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";

interface Exhibition {
  id: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  startDate: Date;
  endDate: Date | null;
  eventType: "exhibition" | "workshop" | "talk" | "opening";
  status: "upcoming" | "ongoing" | "past";
  images: string[];
  externalLink?: string;
  rsvpEnabled: boolean;
}

const SAMPLE_EXHIBITIONS: Exhibition[] = [
  {
    id: "1",
    title: "Digital Shadows",
    description: "A solo exhibition exploring the intersection of traditional comic art and digital manipulation. Features 25 new works created over the past two years.",
    venue: "Metro Gallery",
    address: "123 Art Street",
    city: "New York",
    country: "USA",
    startDate: new Date("2025-01-15"),
    endDate: new Date("2025-03-15"),
    eventType: "exhibition",
    status: "upcoming",
    images: [
      "https://image.pollinations.ai/prompt/modern%20art%20gallery%20exhibition%20noir%20lighting?width=800&height=600&nologo=true&seed=7001"
    ],
    externalLink: "https://example.com",
    rsvpEnabled: true
  },
  {
    id: "2",
    title: "Comic Creation Workshop",
    description: "An intensive 3-day workshop covering the fundamentals of comic creation, from concept to final art.",
    venue: "Creative Arts Center",
    address: "456 Workshop Lane",
    city: "Los Angeles",
    country: "USA",
    startDate: new Date("2024-12-20"),
    endDate: new Date("2024-12-22"),
    eventType: "workshop",
    status: "ongoing",
    images: [
      "https://image.pollinations.ai/prompt/art%20workshop%20studio%20people%20drawing?width=800&height=600&nologo=true&seed=7002"
    ],
    rsvpEnabled: true
  },
  {
    id: "3",
    title: "The Art of Visual Storytelling",
    description: "A talk exploring narrative techniques in sequential art, with live demonstrations and Q&A.",
    venue: "University Auditorium",
    address: "789 Campus Drive",
    city: "Chicago",
    country: "USA",
    startDate: new Date("2024-11-10"),
    endDate: null,
    eventType: "talk",
    status: "past",
    images: [
      "https://image.pollinations.ai/prompt/lecture%20hall%20presentation%20art?width=800&height=600&nologo=true&seed=7003"
    ],
    rsvpEnabled: false
  },
  {
    id: "4",
    title: "Noir Visions Opening",
    description: "Opening night reception for the Noir Visions group exhibition featuring 12 artists.",
    venue: "Contemporary Art Museum",
    address: "100 Museum Way",
    city: "San Francisco",
    country: "USA",
    startDate: new Date("2024-10-05"),
    endDate: null,
    eventType: "opening",
    status: "past",
    images: [
      "https://image.pollinations.ai/prompt/art%20gallery%20opening%20night%20reception?width=800&height=600&nologo=true&seed=7004"
    ],
    rsvpEnabled: false
  }
];

const EVENT_TYPE_STYLES = {
  exhibition: { bg: "bg-blue-900", text: "text-blue-400", label: "Exhibition" },
  workshop: { bg: "bg-green-900", text: "text-green-400", label: "Workshop" },
  talk: { bg: "bg-purple-900", text: "text-purple-400", label: "Talk" },
  opening: { bg: "bg-yellow-900", text: "text-yellow-400", label: "Opening" }
};

const STATUS_STYLES = {
  upcoming: { bg: "bg-foreground", text: "text-background", label: "Upcoming" },
  ongoing: { bg: "bg-green-600", text: "text-white", label: "Now Open" },
  past: { bg: "bg-muted", text: "text-muted-foreground", label: "Past" }
};

export default function ExhibitionsPage() {
  const [exhibitions] = useState<Exhibition[]>(SAMPLE_EXHIBITIONS);
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "ongoing" | "past">("all");
  const [filterType, setFilterType] = useState<"all" | "exhibition" | "workshop" | "talk" | "opening">("all");

  const filteredExhibitions = exhibitions.filter(ex => {
    const matchesStatus = filterStatus === "all" || ex.status === filterStatus;
    const matchesType = filterType === "all" || ex.eventType === filterType;
    return matchesStatus && matchesType;
  });

  const upcomingCount = exhibitions.filter(e => e.status === "upcoming").length;
  const ongoingCount = exhibitions.filter(e => e.status === "ongoing").length;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border p-6">
          <h1 className="text-4xl font-black font-display tracking-tight mb-2">EXHIBITIONS & EVENTS</h1>
          <p className="text-muted-foreground">Upcoming shows, workshops, talks, and openings</p>
          <div className="flex gap-4 mt-4">
            <div className="px-4 py-2 border-2 border-border">
              <span className="text-2xl font-black">{upcomingCount}</span>
              <span className="text-sm text-muted-foreground ml-2">Upcoming</span>
            </div>
            <div className="px-4 py-2 border-2 border-border">
              <span className="text-2xl font-black">{ongoingCount}</span>
              <span className="text-sm text-muted-foreground ml-2">Now Open</span>
            </div>
          </div>
        </header>

        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-bold">Filter:</span>
            </div>
            
            <div className="flex border-2 border-border">
              {(["all", "upcoming", "ongoing", "past"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    filterStatus === status ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}
                  data-testid={`filter-status-${status}`}
                >
                  {status === "all" ? "All" : status}
                </button>
              ))}
            </div>

            <div className="flex border-2 border-border">
              {(["all", "exhibition", "workshop", "talk", "opening"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    filterType === type ? "bg-foreground text-background" : "hover:bg-muted"
                  }`}
                  data-testid={`filter-type-${type}`}
                >
                  {type === "all" ? "All Types" : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {filteredExhibitions.map((exhibition) => (
              <div
                key={exhibition.id}
                className="border-4 border-border bg-card hover:border-foreground transition-colors"
                data-testid={`exhibition-card-${exhibition.id}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-80 h-48 md:h-auto shrink-0 overflow-hidden bg-black">
                    <img
                      src={exhibition.images[0]}
                      alt={exhibition.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs font-bold ${STATUS_STYLES[exhibition.status].bg} ${STATUS_STYLES[exhibition.status].text}`}>
                        {STATUS_STYLES[exhibition.status].label}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold ${EVENT_TYPE_STYLES[exhibition.eventType].bg} ${EVENT_TYPE_STYLES[exhibition.eventType].text}`}>
                        {EVENT_TYPE_STYLES[exhibition.eventType].label}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black mb-2">{exhibition.title}</h2>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{exhibition.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">{exhibition.venue}</p>
                          <p className="text-sm text-muted-foreground">{exhibition.address}</p>
                          <p className="text-sm text-muted-foreground">{exhibition.city}, {exhibition.country}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">
                            {format(exhibition.startDate, "MMMM d, yyyy")}
                          </p>
                          {exhibition.endDate && (
                            <p className="text-sm text-muted-foreground">
                              through {format(exhibition.endDate, "MMMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {exhibition.rsvpEnabled && exhibition.status !== "past" && (
                        <button className="px-4 py-2 bg-foreground text-background font-bold text-sm flex items-center gap-2 hover:opacity-90">
                          <Users className="w-4 h-4" /> RSVP
                        </button>
                      )}
                      {exhibition.externalLink && (
                        <a
                          href={exhibition.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-border font-bold text-sm flex items-center gap-2 hover:bg-muted"
                        >
                          <ExternalLink className="w-4 h-4" /> More Info
                        </a>
                      )}
                      <button className="px-4 py-2 border-2 border-border font-bold text-sm flex items-center gap-2 hover:bg-muted">
                        <ImageIcon className="w-4 h-4" /> Gallery
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredExhibitions.length === 0 && (
              <div className="text-center py-12 border-4 border-dashed border-border">
                <p className="text-muted-foreground">No events match your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
