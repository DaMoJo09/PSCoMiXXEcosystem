import { useEffect, useState } from "react";
import { Apple, Monitor, Download, Check, Cpu, Cloud, Zap, Shield } from "lucide-react";
import { Link } from "wouter";

const GITHUB_OWNER = "DaMoJo09";
const GITHUB_REPO = "PSCoMiXXEcosystem";
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

type OS = "mac" | "windows" | "linux" | "unknown";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

type ReleaseAsset = { name: string; browser_download_url: string; size: number };
type Release = { tag_name: string; name: string; published_at: string; assets: ReleaseAsset[] };

export default function DownloadPage() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const os = detectOS();

  useEffect(() => {
    document.title = "Download PSCoMiXX for Mac, Windows & Linux";
    let cancelled = false;
    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Release) => {
        if (!cancelled) {
          setRelease(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Failed to load release info");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function findAsset(matchers: RegExp[]): ReleaseAsset | undefined {
    if (!release) return undefined;
    for (const re of matchers) {
      const hit = release.assets.find((a) => re.test(a.name));
      if (hit) return hit;
    }
    return undefined;
  }

  const macAsset = findAsset([/_universal\.dmg$/i, /\.dmg$/i]);
  const winAsset = findAsset([/_x64-setup\.exe$/i, /_x64\.msi$/i, /-setup\.exe$/i, /\.msi$/i]);
  const linuxAppImage = findAsset([/_amd64\.AppImage$/i, /\.AppImage$/i]);
  const linuxDeb = findAsset([/_amd64\.deb$/i, /\.deb$/i]);

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const primary =
    os === "mac" ? { label: "Download for macOS", asset: macAsset, icon: Apple } :
    os === "windows" ? { label: "Download for Windows", asset: winAsset, icon: Monitor } :
    os === "linux" ? { label: "Download AppImage for Linux", asset: linuxAppImage, icon: Cpu } :
    { label: "View All Downloads", asset: undefined, icon: Download };

  const PrimaryIcon = primary.icon;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="page-download">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <p className="text-purple-400 text-sm tracking-widest uppercase font-mono mb-4">Press Start CoMiXX</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6" data-testid="text-download-headline">
            Get the Desktop App
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            The full PSCoMiXX studio in a native window on your Mac, PC, or Linux machine. Same projects, same account, no browser tabs.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-900 rounded-3xl p-1 mb-12 shadow-2xl shadow-purple-900/40">
          <div className="bg-black rounded-3xl p-8 md:p-12 text-center">
            {loading ? (
              <div className="py-12">
                <div className="text-zinc-500 text-sm tracking-widest uppercase animate-pulse">Loading latest release…</div>
              </div>
            ) : error || !release ? (
              <div className="py-8">
                <p className="text-zinc-400 mb-4">Releases aren't published yet.</p>
                <p className="text-zinc-500 text-sm">
                  We're putting the finishing touches on the desktop build. In the meantime, you can install the web app:
                </p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl font-semibold transition"
                    data-testid="link-launch-web"
                  >
                    Launch the web app
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-xs font-mono tracking-wider mb-6">
                  <Check className="w-3 h-3" />
                  LATEST: {release.tag_name}
                </div>
                {primary.asset ? (
                  <a
                    href={primary.asset.browser_download_url}
                    className="inline-flex items-center gap-3 px-8 py-5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-2xl font-bold text-lg shadow-xl shadow-purple-900/50 transition transform hover:-translate-y-0.5"
                    data-testid="button-download-primary"
                  >
                    <PrimaryIcon className="w-6 h-6" />
                    {primary.label}
                    <span className="text-purple-200 text-sm font-normal">({formatSize(primary.asset.size)})</span>
                  </a>
                ) : (
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-5 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg shadow-xl shadow-purple-900/50 transition"
                    data-testid="button-view-releases"
                  >
                    <Download className="w-6 h-6" />
                    View All Downloads
                  </a>
                )}
                <div className="mt-6 text-zinc-500 text-sm">
                  Released {new Date(release.published_at).toLocaleDateString()} · <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline" data-testid="link-release-notes">Release notes</a>
                </div>
              </>
            )}
          </div>
        </div>

        {release && (
          <div className="mb-16">
            <h2 className="text-sm font-mono tracking-widest uppercase text-zinc-500 mb-6 text-center">All Platforms</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <PlatformCard icon={Apple} label="macOS" sub="Universal · Intel + Apple Silicon" asset={macAsset} testId="download-mac" />
              <PlatformCard icon={Monitor} label="Windows" sub="64-bit · Windows 10/11" asset={winAsset} testId="download-windows" />
              <PlatformCard icon={Cpu} label="Linux" sub="AppImage or .deb" asset={linuxAppImage} secondary={linuxDeb} testId="download-linux" />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Feature icon={Zap} title="Native Performance" body="Runs in its own window with full GPU acceleration. No browser bloat." />
          <Feature icon={Cloud} title="Always In Sync" body="Same account, same projects, same assets as pscomixx.com. Switch devices anytime." />
          <Feature icon={Shield} title="Auto-Updates" body="New versions install silently in the background. Always on the latest release." />
        </div>

        <div className="text-center text-zinc-600 text-sm">
          <p>
            Prefer the web? <Link href="/" className="text-purple-400 hover:text-purple-300 underline" data-testid="link-use-web">Use PSCoMiXX in your browser</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  icon: Icon,
  label,
  sub,
  asset,
  secondary,
  testId,
}: {
  icon: typeof Apple;
  label: string;
  sub: string;
  asset?: ReleaseAsset;
  secondary?: ReleaseAsset;
  testId: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-purple-500/50 transition" data-testid={`card-${testId}`}>
      <Icon className="w-8 h-8 text-purple-400 mb-4" />
      <h3 className="font-bold text-lg mb-1">{label}</h3>
      <p className="text-zinc-500 text-xs mb-4">{sub}</p>
      {asset ? (
        <a
          href={asset.browser_download_url}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-semibold"
          data-testid={`link-${testId}-primary`}
        >
          <Download className="w-4 h-4" />
          Download ({(asset.size / (1024 * 1024)).toFixed(1)} MB)
        </a>
      ) : (
        <span className="text-zinc-600 text-sm">Not available yet</span>
      )}
      {secondary && (
        <div className="mt-2">
          <a
            href={secondary.browser_download_url}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-xs"
            data-testid={`link-${testId}-secondary`}
          >
            also: {secondary.name}
          </a>
        </div>
      )}
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Apple; title: string; body: string }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-6">
      <Icon className="w-6 h-6 text-purple-400 mb-3" />
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
