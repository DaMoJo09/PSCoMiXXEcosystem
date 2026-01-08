import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Send, Mail, Calendar, MessageSquare, Briefcase, Eye, 
  MapPin, Clock, CheckCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

type MessageType = "general" | "inquiry" | "commission" | "studio-visit";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  messageType: MessageType;
  preferredDate: string;
  newsletter: boolean;
}

const MESSAGE_TYPES = [
  { id: "general" as const, label: "General Inquiry", icon: MessageSquare, description: "Questions, feedback, or just saying hello" },
  { id: "inquiry" as const, label: "Artwork Inquiry", icon: Eye, description: "Questions about specific artworks or availability" },
  { id: "commission" as const, label: "Commission Request", icon: Briefcase, description: "Custom artwork or project collaboration" },
  { id: "studio-visit" as const, label: "Studio Visit", icon: Calendar, description: "Schedule a visit to see works in person" },
];

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
    messageType: "general",
    preferredDate: "",
    newsletter: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (form.newsletter && form.email) {
        await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, name: form.name }),
        });
      }
      
      setIsSubmitted(true);
      toast.success("Message sent successfully!");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = (updates: Partial<ContactForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md text-center border-4 border-white p-8 bg-black text-white">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-white" />
            <h2 className="text-2xl font-black mb-4">MESSAGE SENT</h2>
            <p className="text-zinc-400 mb-6">
              Thank you for reaching out. I'll get back to you within 24-48 hours.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setForm({
                  name: "",
                  email: "",
                  subject: "",
                  message: "",
                  messageType: "general",
                  preferredDate: "",
                  newsletter: false,
                });
              }}
              className="px-6 py-3 bg-white text-black font-bold hover:bg-zinc-200"
            >
              SEND ANOTHER MESSAGE
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b-4 border-white p-6">
          <h1 className="text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CONTACT</h1>
          <p className="text-zinc-400">Get in touch for inquiries, commissions, or studio visits</p>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase mb-4">What's this about?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MESSAGE_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => updateForm({ messageType: type.id })}
                        className={`p-4 border-2 text-left transition-colors ${
                          form.messageType === type.id 
                            ? "border-foreground bg-muted" 
                            : "border-border hover:border-muted-foreground"
                        }`}
                        data-testid={`contact-type-${type.id}`}
                      >
                        <type.icon className="w-5 h-5 mb-2" />
                        <div className="font-bold text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase mb-2 block">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none"
                      placeholder="John Doe"
                      data-testid="contact-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase mb-2 block">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateForm({ email: e.target.value })}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none"
                      placeholder="john@example.com"
                      data-testid="contact-email"
                    />
                  </div>
                </div>

                {form.messageType === "studio-visit" && (
                  <div>
                    <label className="text-xs font-bold uppercase mb-2 block">Preferred Visit Date</label>
                    <input
                      type="date"
                      value={form.preferredDate}
                      onChange={(e) => updateForm({ preferredDate: e.target.value })}
                      className="w-full px-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none"
                      data-testid="contact-date"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => updateForm({ subject: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none"
                    placeholder="What's on your mind?"
                    data-testid="contact-subject"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Message *</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => updateForm({ message: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border focus:border-foreground outline-none resize-none"
                    placeholder="Tell me more about your inquiry..."
                    data-testid="contact-message"
                  />
                </div>

                <div className="border-2 border-border p-4 bg-card">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.newsletter}
                      onChange={(e) => updateForm({ newsletter: e.target.checked })}
                      className="w-5 h-5 mt-0.5"
                      data-testid="contact-newsletter"
                    />
                    <div>
                      <div className="font-bold text-sm">Subscribe to Newsletter</div>
                      <div className="text-xs text-muted-foreground">
                        Get updates on new artworks, exhibitions, and behind-the-scenes content.
                      </div>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-foreground text-background font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                  data-testid="contact-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      SENDING...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      SEND MESSAGE
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="border-4 border-border p-6 bg-card">
                <h3 className="font-black text-lg mb-4">CONTACT INFO</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Email</div>
                      <a href="mailto:hello@pressstart.space" className="text-sm text-muted-foreground hover:text-foreground">
                        hello@pressstart.space
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Studio</div>
                      <div className="text-sm text-muted-foreground">
                        Available by appointment only
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Response Time</div>
                      <div className="text-sm text-muted-foreground">
                        Usually within 24-48 hours
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-4 border-border p-6 bg-card">
                <h3 className="font-black text-lg mb-4">QUICK LINKS</h3>
                <div className="space-y-2">
                  <a href="/portfolio" className="block p-3 border border-border hover:border-foreground hover:bg-muted transition-colors">
                    <div className="font-bold text-sm">View Portfolio</div>
                    <div className="text-xs text-muted-foreground">Browse the complete collection</div>
                  </a>
                  <a href="/exhibitions" className="block p-3 border border-border hover:border-foreground hover:bg-muted transition-colors">
                    <div className="font-bold text-sm">Upcoming Events</div>
                    <div className="text-xs text-muted-foreground">Exhibitions and workshops</div>
                  </a>
                  <a href="/blog" className="block p-3 border border-border hover:border-foreground hover:bg-muted transition-colors">
                    <div className="font-bold text-sm">Read Blog</div>
                    <div className="text-xs text-muted-foreground">Latest articles and updates</div>
                  </a>
                </div>
              </div>

              <div className="border-4 border-foreground p-6 bg-foreground text-background">
                <h3 className="font-black text-lg mb-2">COMMISSIONS</h3>
                <p className="text-sm opacity-80 mb-4">
                  Currently accepting commission requests for custom artwork and collaborative projects.
                </p>
                <button
                  onClick={() => updateForm({ messageType: "commission" })}
                  className="px-4 py-2 bg-background text-foreground font-bold text-sm hover:opacity-90"
                >
                  START A PROJECT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
