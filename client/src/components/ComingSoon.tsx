import { Layout } from "@/components/layout/Layout";
import { Rocket, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Layout>
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 mx-auto mb-8 bg-white flex items-center justify-center border-4 border-white shadow-[8px_8px_0_0_rgba(239,68,68,1)]">
            <Rocket className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h1>
          <div className="bg-red-600 text-white px-4 py-2 font-bold text-sm inline-block mb-6 transform -skew-x-3">
            COMING SOON
          </div>
          <p className="text-zinc-400 mb-8">
            {description || "This feature is being built and will be available after launch. Stay tuned!"}
          </p>
          <Link href="/">
            <Button className="bg-white text-black border-4 border-white font-bold hover:bg-zinc-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
