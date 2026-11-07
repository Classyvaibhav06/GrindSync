"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/social-grind/AppShell";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconClock,
  IconCode,
  IconCopy,
  IconDeviceDesktop,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

interface IdeDevice {
  deviceId: string;
  deviceName: string;
  ide: string;
  createdAt: string;
  lastSeenAt?: string;
  state?: string;
  currentLanguage?: string;
}

interface IdeStats {
  todaySeconds: number;
  weeklySeconds: number;
  totalSeconds: number;
  streak: number;
  languages: Record<string, number>;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function relativeTime(value?: string) {
  if (!value) return "Never connected";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ConnectedIdesPage() {
  const [devices, setDevices] = useState<IdeDevice[]>([]);
  const [stats, setStats] = useState<IdeStats | null>(null);
  const [pairCode, setPairCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState("https://grindsync.vercel.app");

  useEffect(() => setSiteUrl(window.location.origin), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [deviceRes, statsRes] = await Promise.all([
        fetch("/api/ide/devices", { cache: "no-store" }),
        fetch("/api/ide/stats", { cache: "no-store" }),
      ]);
      if (deviceRes.ok) {
        const data = await deviceRes.json();
        setDevices(data.devices || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      toast.error("Could not load connected IDE details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setPairCode("");
        setExpiresAt(null);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const generateCode = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const res = await fetch("/api/ide/pair-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate a code");
      setPairCode(data.code);
      setExpiresAt(new Date(data.expiresAt).getTime());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a pairing code");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      toast.success("Pairing code copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the code. Select it and copy manually.");
    }
  };

  const revokeDevice = async (device: IdeDevice) => {
    if (!window.confirm(`Disconnect ${device.deviceName}? It will stop syncing immediately.`)) return;
    setRevokingId(device.deviceId);
    try {
      const res = await fetch(`/api/ide/devices/${encodeURIComponent(device.deviceId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not disconnect device");
      toast.success(`${device.deviceName} disconnected`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect device");
    } finally {
      setRevokingId(null);
    }
  };

  const topLanguage = Object.entries(stats?.languages || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <AppShell title="Connected IDEs">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="grid gap-6 border-b border-white/[0.08] pb-7 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7e8aa3]">GrindSync / Integrations</p>
            <h1 className="text-3xl font-medium tracking-tight text-[#e4e1e9] sm:text-4xl">Your coding, counted.</h1>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#7e8aa3] md:justify-self-end">
            Connect VS Code to automatically track active coding time and language stats. The extension never reads or sends your source code.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today", value: formatDuration(stats?.todaySeconds || 0), icon: <IconClock size={16} /> },
            { label: "Last 7 days", value: formatDuration(stats?.weeklySeconds || 0), icon: <IconRefresh size={16} /> },
            { label: "Coding streak", value: `${stats?.streak || 0} days`, icon: <IconCheck size={16} /> },
            { label: "Top language", value: topLanguage?.[0] || "—", icon: <IconCode size={16} /> },
          ].map((item) => (
            <div key={item.label} className="border border-white/[0.08] bg-[#1b1b20]/80 p-4 shadow-[inset_0_0_2px_2px_rgba(255,255,255,0.025),inset_0_0_0_1px_rgba(255,255,255,0.025)]">
              <div className="flex items-center justify-between text-[#7e8aa3]">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em]">{item.label}</span>{item.icon}
              </div>
              <p className="mt-5 text-2xl font-medium tracking-tight text-[#e4e1e9]">{loading ? "…" : item.value}</p>
              {item.label === "Top language" && topLanguage && <p className="mt-1 font-mono text-[10px] text-[#7e8aa3]">{formatDuration(topLanguage[1])} total</p>}
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="border border-white/[0.1] bg-[#1b1b20]/80 p-6 shadow-[inset_0_0_2px_2px_rgba(255,255,255,0.025),inset_0_0_0_1px_rgba(255,255,255,0.025)] sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">01 / Pair your editor</p>
            <h2 className="mt-3 text-xl font-medium text-[#e4e1e9]">Connect in under a minute</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#7e8aa3]">Generate a one-time code here, then enter it once in VS Code. It expires after five minutes.</p>

            {pairCode ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <code className="border border-white/[0.12] bg-[#111116] px-5 py-3 font-mono text-2xl tracking-[0.3em] text-[#e4e1e9]">{pairCode}</code>
                <button onClick={copyCode} className="inline-flex h-11 items-center gap-2 border border-white/[0.12] px-4 text-sm text-[#e4e1e9] transition-colors hover:bg-white/[0.05]">
                  {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}{copied ? "Copied" : "Copy code"}
                </button>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-amber-300"><IconClock size={12} /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
              </div>
            ) : (
              <button onClick={generateCode} disabled={generating} className="mt-6 inline-flex h-11 items-center gap-2 bg-emerald-400 px-5 text-sm font-semibold text-[#07110d] transition-colors hover:bg-emerald-300 disabled:opacity-50">
                {generating ? <IconLoader2 size={15} className="animate-spin" /> : <IconDeviceDesktop size={15} />}
                Generate pairing code
              </button>
            )}

            <ol className="mt-7 space-y-3 border-t border-white/[0.08] pt-5 text-sm text-[#a6b0c3]">
              <li className="flex gap-3"><span className="font-mono text-[10px] text-[#7e8aa3]">1.</span><span>Install <a className="underline decoration-dotted underline-offset-4 hover:text-white" href="https://github.com/Classyvaibhav06/grindsync-vscode-extension" target="_blank" rel="noreferrer">GrindSync Activity Tracker</a> in VS Code.</span></li>
              <li className="flex gap-3"><span className="font-mono text-[10px] text-[#7e8aa3]">2.</span><span>Open the Command Palette and run <code className="font-mono text-xs text-[#e4e1e9]">GrindSync: Connect Account</code>.</span></li>
              <li className="flex gap-3"><span className="font-mono text-[10px] text-[#7e8aa3]">3.</span><span>Enter the code above. Pairing happens once; the extension stores its credential securely in VS Code SecretStorage.</span></li>
            </ol>

            <details className="mt-5 border-t border-white/[0.08] pt-4">
              <summary className="cursor-pointer text-xs font-medium text-[#a6b0c3]">Using a self-hosted GrindSync website?</summary>
              <p className="mt-3 text-xs leading-relaxed text-[#7e8aa3]">Set <code className="font-mono text-[#e4e1e9]">grindsync.apiUrl</code> in VS Code Settings to this site’s base URL:</p>
              <code className="mt-2 block break-all border border-white/[0.08] bg-[#111116] p-3 font-mono text-xs text-emerald-300">{siteUrl}</code>
            </details>
          </div>

          <div className="border border-white/[0.08] bg-[#1b1b20]/60 p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7e8aa3]">02 / Privacy by design</p>
            <h2 className="mt-3 text-xl font-medium text-[#e4e1e9]">Only activity metadata</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-[#a6b0c3]">
              <li className="flex gap-3"><IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" /><span>No source code, filenames, or project paths are sent.</span></li>
              <li className="flex gap-3"><IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" /><span>Activity is counted from editor changes and pauses after inactivity.</span></li>
              <li className="flex gap-3"><IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" /><span>Disconnect any device below to revoke its access immediately.</span></li>
              <li className="flex gap-3"><IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" /><span>Pause or resume tracking at any time from the VS Code status bar.</span></li>
            </ul>
            <a className="mt-6 inline-flex items-center gap-2 text-xs text-[#7e8aa3] transition-colors hover:text-[#e4e1e9]" href="https://github.com/Classyvaibhav06/grindsync-vscode-extension" target="_blank" rel="noreferrer">
              Extension source and documentation <IconExternalLink size={13} />
            </a>
          </div>
        </section>

        <section className="border border-white/[0.08] bg-[#1b1b20]/70">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7e8aa3]">03 / Devices</p>
              <h2 className="mt-1 text-lg font-medium text-[#e4e1e9]">Connected editors</h2>
            </div>
            <button onClick={() => void refresh()} disabled={loading} aria-label="Refresh connected devices" className="border border-white/[0.1] p-2 text-[#7e8aa3] transition-colors hover:text-white disabled:opacity-50"><IconRefresh size={15} className={cn(loading && "animate-spin")} /></button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-[#7e8aa3]"><IconLoader2 size={16} className="animate-spin" /> Loading devices…</div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <IconDeviceDesktop size={28} className="text-[#7e8aa3]/50" />
              <p className="mt-3 text-sm text-[#e4e1e9]">No IDEs connected yet</p>
              <p className="mt-1 text-xs text-[#7e8aa3]">Generate a pairing code to connect your first editor.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {devices.map((device) => {
                const isOnline = !!device.lastSeenAt && Date.now() - new Date(device.lastSeenAt).getTime() < 90_000;
                return (
                  <div key={device.deviceId} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center border border-white/[0.08] bg-white/[0.025] text-[#a6b0c3]"><IconDeviceDesktop size={17} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#e4e1e9]">{device.deviceName}</p>
                        <p className="mt-1 font-mono text-[10px] text-[#7e8aa3]">{device.ide} · {device.currentLanguage || "Language unknown"} · seen {relativeTime(device.lastSeenAt)}</p>
                      </div>
                      <span className={cn("size-2 shrink-0 rounded-full", isOnline ? "bg-emerald-400" : "bg-white/20")} title={isOnline ? "Online" : "Offline"} />
                    </div>
                    <button onClick={() => void revokeDevice(device)} disabled={revokingId === device.deviceId} className="inline-flex items-center justify-center gap-2 self-start border border-red-400/20 px-3 py-2 text-xs text-red-300 transition-colors hover:border-red-400/40 hover:bg-red-400/5 disabled:opacity-50 sm:self-auto">
                      {revokingId === device.deviceId ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                      Disconnect
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
