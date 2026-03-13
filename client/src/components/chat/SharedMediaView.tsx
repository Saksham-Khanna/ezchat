import { useState } from "react";
import { ArrowLeft, Image, FileText, Link2, ExternalLink, Download, Mic } from "lucide-react";
import type { Message } from "@/pages/Dashboard";

import { SOCKET_URL } from "@/lib/config";

interface SharedMediaViewProps {
  messages: Message[];
  onBack: () => void;
}

type Tab = "photos" | "documents" | "links";

// Extract URLs from message text
const extractLinks = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
};

// Try to get a nice display name from a URL
const getLinkDomain = (url: string): string => {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

const SharedMediaView = ({ messages, onBack }: SharedMediaViewProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("photos");

  const getMediaSrc = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url}`;
  };

  // Photos: image media messages (exclude audio and documents)
  const photos = messages.filter(
    (m) =>
      m.media_url &&
      m.media_url.length > 0 &&
      m.media_type !== "audio" &&
      m.media_type !== "document" &&
      !m.media_url.includes("audio_") &&
      !m.media_url.includes("doc_")
  );

  // Documents: document files AND voice notes
  const documents = messages.filter(
    (m) =>
      m.media_url &&
      m.media_url.length > 0 &&
      (m.media_type === "audio" || m.media_url.includes("audio_") ||
       m.media_type === "document" || m.media_url.includes("doc_"))
  );

  // Links: extract URLs from text messages
  const links: { msgId: string; url: string; time: string }[] = [];
  messages.forEach((m) => {
    const found = extractLinks(m.content || "");
    found.forEach((url) => {
      links.push({
        msgId: m._id,
        url,
        time: new Date(m.createdAt).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        }),
      });
    });
  });

  const tabs: { id: Tab; label: string; icon: typeof Image; count: number }[] = [
    { id: "photos", label: "Photos", icon: Image, count: photos.length },
    { id: "documents", label: "Docs", icon: FileText, count: documents.length },
    { id: "links", label: "Links", icon: Link2, count: links.length },
  ];

  return (
    <div className="w-80 h-full glass border-l border-white/[0.05] flex flex-col animate-slide-right shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.05] flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground text-sm">Shared Media</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.05]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all relative ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {/* Photos Tab */}
        {activeTab === "photos" && (
          <>
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Image className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">No photos shared yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((msg) => (
                  <a
                    key={msg._id}
                    href={getMediaSrc(msg.media_url!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-secondary/30 hover:opacity-80 transition-opacity group"
                  >
                    <img
                      src={getMediaSrc(msg.media_url!)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <>
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">No documents or voice notes yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((msg) => {
                  const isAudio = msg.media_type === 'audio' || msg.media_url?.includes('audio_');
                  const isDoc = msg.media_type === 'document' || msg.media_url?.includes('doc_');
                  const getDocIcon = (url: string) => {
                    const ext = url.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') return '📕';
                    if (ext === 'doc' || ext === 'docx') return '📘';
                    if (ext === 'xls' || ext === 'xlsx') return '📗';
                    return '📄';
                  };
                  const getDocName = (url: string) => {
                    const parts = url.split('/');
                    const filename = parts[parts.length - 1];
                    const match = filename.match(/^doc_\d+_(.+)$/);
                    return match ? match[1] : filename;
                  };

                  return (
                    <a
                      key={msg._id}
                      href={getMediaSrc(msg.media_url!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-white/[0.05] hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                        {isAudio ? (
                          <Mic className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <span className="text-lg">{getDocIcon(msg.media_url!)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {isAudio ? 'Voice Note' : getDocName(msg.media_url!)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-md bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {isDoc ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Links Tab */}
        {activeTab === "links" && (
          <>
            {links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">No links shared yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {links.map((link, i) => (
                  <a
                    key={`${link.msgId}-${i}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-white/[0.05] hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {getLinkDomain(link.url)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {link.time}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SharedMediaView;
