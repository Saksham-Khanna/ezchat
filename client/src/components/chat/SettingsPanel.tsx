import { useState, useRef, useEffect } from "react";
import { 
  X, Save, Upload, Camera, Lock, Trash2, Key, Moon, Sun, 
  Volume2, Eye, EyeOff, ChevronDown, Settings, Loader2, Sparkles, 
  User, ShieldCheck, Ban, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/config";

interface SettingsPanelProps {
  username: string;
  bio: string;
  avatarUrl: string;
  cvId: string;
  email: string;
  userId: string;
  onSave: (data: { username: string; bio: string; avatar_url: string }) => void;
  onUpdateSettings: (settings: any) => void;
  onFriendAdded?: () => void;
  settings: {
    theme: string;
    show_read_receipts: boolean;
    notifications_enabled: boolean;
    sounds_enabled: boolean;
  };
  onClose: () => void;
}

const SettingsPanel = ({
  username: initialUsername,
  bio: initialBio,
  avatarUrl: initialAvatar,
  cvId,
  email,
  userId,
  onSave,
  onUpdateSettings,
  onFriendAdded,
  settings,
  onClose,
}: SettingsPanelProps) => {
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showSection, setShowSection] = useState<string | null>("profile");
  const [passSaving, setPassSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSection === "blocked") {
      fetchBlockedUsers();
    }
  }, [showSection]);

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/blocked/${userId}`);
      if (resp.ok) {
        const data = await resp.json();
        setBlockedUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch blocked users:", e);
    }
    setLoadingBlocked(false);
  };

  const handleUnblock = async (targetId: string) => {
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetId }),
      });
      if (resp.ok) {
        setBlockedUsers(prev => prev.filter(u => u._id !== targetId));
        onFriendAdded?.();
      }
    } catch (e) {
      console.error("Unblock error:", e);
    }
  };

  const getAvatarSrc = () => {
    if (!avatarUrl) return "";
    if (avatarUrl.startsWith("http")) return avatarUrl;
    return `${SOCKET_URL}${avatarUrl}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", userId);

    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/upload-avatar`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        setAvatarUrl(result.avatar_url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ username, bio, avatar_url: avatarUrl });
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    setPassSaving(true);
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, oldPassword, newPassword }),
      });
      if (resp.ok) {
        setShowSection("profile");
        setOldPassword("");
        setNewPassword("");
      } else {
        const error = await resp.json();
        alert(error.message || "Failed to update password");
      }
    } catch (e) {
      console.error(e);
    }
    setPassSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will delete all your data permanently.")) {
      try {
        const resp = await fetch(`${SOCKET_URL}/api/auth/account/${userId}`, {
          method: "DELETE",
        });
        if (resp.ok) {
          localStorage.clear();
          window.location.href = "/auth";
        }
      } catch (e) { console.error(e); }
    }
  };

  const hasChanges =
    username !== initialUsername ||
    bio !== initialBio ||
    avatarUrl !== initialAvatar;

  const sections = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'preferences', label: 'App Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'blocked', label: 'Blocked', icon: Ban },
  ];

  const Toggle = ({ enabled, onClick }: { enabled: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition-all relative ${enabled ? "bg-primary shadow-lg shadow-primary/30" : "bg-white/[0.1] hover:bg-white/[0.15]"}`}
    >
      <motion.div 
        animate={{ x: enabled ? 26 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md cursor-pointer" 
      />
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-[90%] max-w-4xl glass-card rounded-[2rem] overflow-hidden flex flex-col md:flex-row h-[80vh] max-h-[700px] shadow-2xl border border-white/10"
      >
        {/* Sidebar Navigation */}
        <div className="w-full md:w-72 flex-shrink-0 bg-white/[0.02] border-r border-white/5 flex flex-col pt-10 pb-6">
          <div className="px-8 mb-10 flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
               <Sparkles className="w-5 h-5 text-white" />
             </div>
             <div>
               <h2 className="text-sm font-black tracking-tighter uppercase gradient-text">ez-control</h2>
               <p className="text-[10px] text-muted-foreground font-medium">v1.0.4.stable</p>
             </div>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setShowSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                  showSection === s.id 
                  ? "bg-primary/10 text-primary font-bold active-bar active" 
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground active-bar"
                }`}
              >
                <s.icon className={`w-4 h-4 ${showSection === s.id ? "" : "group-hover:scale-110 transition-transform"}`} />
                <span className="text-xs tracking-wide">{s.label}</span>
              </button>
            ))}
          </nav>

          <div className="px-6 pt-6 mt-6 border-t border-white/5">
             <button
               onClick={onClose}
               className="w-full py-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
             >
               <X className="w-4 h-4" />
               CLOSE PANEL
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-primary/[0.02]">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 md:p-10">
            <AnimatePresence mode="wait">
              {showSection === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10 w-full"
                >
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                      <div className="w-40 h-40 rounded-[3rem] avatar-ring p-1 flex items-center justify-center bg-background group cursor-pointer overflow-hidden shadow-2xl">
                         <div 
                           className="w-full h-full rounded-[2.8rem] bg-secondary/30 overflow-hidden flex items-center justify-center relative"
                           onClick={() => fileInputRef.current?.click()}
                         >
                            {avatarUrl ? (
                              <img src={getAvatarSrc()} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <span className="text-5xl font-black text-primary/40 leading-none">{username[0]?.toUpperCase()}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                               <Upload className="w-8 h-8 text-white" />
                               <span className="text-[10px] font-bold text-white uppercase tracking-widest">Update</span>
                            </div>
                            {uploading && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              </div>
                            )}
                         </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                       <div className="space-y-1">
                          <h3 className="text-2xl font-black tracking-tight">{username}</h3>
                          <div className="flex items-center gap-2">
                             <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/5 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500 online-pulse" />
                               <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Online Profile</span>
                             </div>
                             <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                               <span className="text-[10px] font-mono font-bold text-primary">{cvId}</span>
                             </div>
                          </div>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed max-w-md italic">
                         Your public identity on ezchat. Changes made here will be visible to all your friends immediately.
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Username Alias</label>
                       <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                            placeholder="Enter username"
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Member Email</label>
                       <div className="relative opacity-60">
                          <EyeOff className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={email}
                            disabled
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/[0.02] border border-white/5 text-xs font-medium cursor-not-allowed"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">My Bio Narrative</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={150}
                      rows={4}
                      placeholder="Share a thought..."
                      className="w-full px-6 py-5 rounded-[2rem] bg-white/[0.03] border border-white/5 text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] resize-none font-medium"
                    />
                    <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-2 opacity-40">
                         <Info className="w-3 h-3" />
                         <span className="text-[10px] font-medium italic">Supports plain text narrative.</span>
                      </div>
                      <span className={`text-[10px] font-black tracking-widest ${bio.length >= 140 ? "text-destructive" : "text-primary opacity-60"}`}>
                        {bio.length} <span className="opacity-40">/</span> 150
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {showSection === 'preferences' && (
                <motion.div 
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 w-full"
                >
                   <div className="space-y-2 mb-8">
                     <h3 className="text-xl font-black tracking-tight flex items-center gap-3 italic">
                       Visual & Sensory <span className="text-primary not-italic">Preferences</span>
                     </h3>
                     <p className="text-xs text-muted-foreground">Customize how you interact with the interface.</p>
                   </div>

                   <div className="space-y-4">
                    {[
                      { id: 'theme', icon: settings.theme === 'dark' ? Moon : Sun, label: 'Night Protocol (Dark Mode)', desc: 'Toggles high-contrast dark theme optimized for low light.', val: settings.theme === 'dark', action: () => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }) },
                      { id: 'sounds', icon: Volume2, label: 'Tactile Sound Feedback', desc: 'Audible confirmations for messages and system triggers.', val: settings.sounds_enabled, action: () => onUpdateSettings({ sounds_enabled: !settings.sounds_enabled }) },
                      { id: 'receipts', icon: Eye, label: 'Telemetry (Read Receipts)', desc: 'Transmit transmission status to conversation peers.', val: settings.show_read_receipts, action: () => onUpdateSettings({ show_read_receipts: !settings.show_read_receipts }) },
                    ].map((pref) => (
                      <div key={pref.id} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all group-hover:gradient-primary group-hover:text-white group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
                            <pref.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black tracking-tight">{pref.label}</p>
                            <p className="text-xs text-muted-foreground/60 max-w-xs">{pref.desc}</p>
                          </div>
                        </div>
                        <Toggle enabled={pref.val} onClick={pref.action} />
                      </div>
                    ))}
                  </div>

                  <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center gap-6">
                     <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Info className="w-6 h-6 text-primary" />
                     </div>
                     <div className="flex-1">
                        <p className="font-bold text-sm">Advanced Interaction</p>
                        <p className="text-xs text-muted-foreground">More settings like "Voice Noise Suppression" and "Auto-Join Rooms" coming in v1.1.0.</p>
                     </div>
                  </div>
                </motion.div>
              )}

              {showSection === 'security' && (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10 w-full"
                >
                   <div className="space-y-2">
                     <h3 className="text-xl font-black tracking-tight uppercase italic">Access <span className="text-primary not-italic">Keys</span></h3>
                     <p className="text-xs text-muted-foreground tracking-wide font-medium">Rotate your authentication keys regularly to maintain account integrity.</p>
                   </div>

                   <div className="space-y-6 max-w-lg">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Current Secret</label>
                         <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                              type="password"
                              value={oldPassword}
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                              placeholder="••••••••"
                            />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">New Identity Key</label>
                         <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                              placeholder="Encrypt with new key..."
                            />
                         </div>
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={!oldPassword || !newPassword || passSaving}
                        className="w-full py-4 rounded-3xl gradient-primary text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                      >
                        {passSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {passSaving ? "AUTHENTICATING..." : "COMMIT IDENTITY UPDATE"}
                      </button>
                   </div>

                   <div className="pt-10 border-t border-white/5">
                      <div className="p-8 rounded-[2rem] bg-destructive/5 border border-destructive/10">
                         <h4 className="text-sm font-black tracking-tight text-destructive uppercase mb-2">Self-Destruct (Danger Zone)</h4>
                         <p className="text-xs text-muted-foreground mb-6">Wipe your entire holographic presence and history. This action is irreversible.</p>
                         <button
                           onClick={handleDeleteAccount}
                           className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all duration-300 text-[10px] font-black tracking-widest border border-destructive/20"
                         >
                           <Trash2 className="w-4 h-4" />
                           PURGE ACCOUNT
                         </button>
                      </div>
                   </div>
                </motion.div>
              )}

              {showSection === 'blocked' && (
                <motion.div 
                  key="blocked"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 w-full"
                >
                   <div className="space-y-2">
                     <h3 className="text-xl font-black tracking-tight uppercase italic">Blocked <span className="text-primary not-italic">Nodes</span></h3>
                     <p className="text-xs text-muted-foreground">Excluded users cannot transmit packets to your terminal.</p>
                   </div>

                   <div className="space-y-3 min-h-[300px]">
                     {loadingBlocked ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-20">
                           <Loader2 className="w-10 h-10 animate-spin text-primary" />
                           <p className="text-xs font-bold tracking-widest uppercase">Fetching Exclusion List...</p>
                        </div>
                     ) : blockedUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground/30 py-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                           <User className="w-12 h-12" />
                           <p className="text-xs font-bold tracking-widest uppercase">No Quarantined Nodes Found</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {blockedUsers.map((u) => (
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               key={u._id} 
                               className="flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl overflow-hidden bg-secondary ring-2 ring-white/5 group-hover:ring-primary/40 transition-all">
                                      {u.avatar_url ? (
                                        <img src={`${SOCKET_URL}${u.avatar_url}`} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/20 font-black text-xs">{u.username[0]}</div>
                                      )}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black tracking-tight">{u.username}</p>
                                      <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Restriction Active</p>
                                   </div>
                                </div>
                                <button
                                  onClick={() => handleUnblock(u._id)}
                                  className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-[9px] font-black tracking-widest uppercase"
                                >
                                  Reinstate
                                </button>
                             </motion.div>
                          ))}
                        </div>
                     )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Hub */}
          <div className="p-10 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
             <div className="hidden md:block">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Cloud Sync Active</span>
               </div>
             </div>
             
             <div className="flex gap-4 w-full md:w-auto">
               <button
                 onClick={() => {
                   setUsername(initialUsername);
                   setBio(initialBio);
                   setAvatarUrl(initialAvatar);
                 }}
                 disabled={!hasChanges}
                 className="flex-1 md:flex-none px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-30 uppercase"
               >
                 Revert Changes
               </button>
               <button
                 onClick={handleSave}
                 disabled={!hasChanges || saving}
                 className="flex-1 md:flex-none px-10 py-4 rounded-2xl gradient-primary shadow-xl shadow-primary/20 text-[10px] font-black tracking-[0.2em] text-white hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-30 uppercase flex items-center gap-2"
               >
                 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {saving ? "SYNCING..." : "COMMIT CHANGES"}
               </button>
             </div>
          </div>
        </div>
      </motion.div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </motion.div>
  );
};

export default SettingsPanel;

