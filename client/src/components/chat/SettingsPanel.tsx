import { useState, useRef, useEffect } from "react";
import { 
  X, Save, Upload, Camera, Lock, Trash2, Key, Moon, Sun, 
  Volume2, Eye, EyeOff, ChevronDown, Settings, Loader2, Sparkles, 
  User, ShieldCheck, Ban, Info, MessageSquare, Mail
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
  isPinEnabled: boolean;
  onTogglePin: (enabled: boolean) => void;
  onSetPin: (pin: string) => Promise<boolean>;
  onLockNow?: () => void;
  onClose: () => void;
}

const SettingsPanel = ({
  username: initialUsername = "",
  bio: initialBio = "",
  avatarUrl: initialAvatar = "",
  cvId = "",
  email = "",
  userId = "",
  onSave,
  onUpdateSettings,
  onFriendAdded,
  settings,
  isPinEnabled,
  onTogglePin,
  onSetPin,
  onLockNow,
  onClose,
}: SettingsPanelProps) => {
  const [username, setUsername] = useState(initialUsername || "");
  const [bio, setBio] = useState(initialBio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showSection, setShowSection] = useState<string | null>("profile");
  const [passSaving, setPassSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [pinMode, setPinMode] = useState<"none" | "setting" | "changing">("none");
  const [newPin, setNewPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSection === "blocked") {
      fetchBlockedUsers();
    }
  }, [showSection]);

  const fetchBlockedUsers = async () => {
    if (!userId) return;
    setLoadingBlocked(true);
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/blocked/${userId}`);
      if (resp.ok) {
        const data = await resp.json();
        setBlockedUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch blocked users:", e);
    }
    setLoadingBlocked(false);
  };

  const handleUnblock = async (targetId: string) => {
    if (!userId || !targetId) return;
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
    try {
      await onSave({ username, bio, avatar_url: avatarUrl });
    } catch (e) {
      console.error("Save failure", e);
    }
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
        console.warn(error.message || "Failed to update password");
      }
    } catch (e) {
      console.error(e);
    }
    setPassSaving(false);
  };

  const handleSetPin = async () => {
    if ((newPin || "").length !== 4) return;
    setPassSaving(true);
    const success = await onSetPin(newPin);
    if (success) {
      setPinMode("none");
      setNewPin("");
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
    username !== (initialUsername || "") ||
    bio !== (initialBio || "") ||
    avatarUrl !== (initialAvatar || "");

  const sections = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "preferences", label: "App Settings", icon: Settings },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "blocked", label: "Blocked", icon: Ban },
  ];

  const Toggle = ({ enabled, onClick }: { enabled: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition-all relative ${enabled ? "bg-primary shadow-lg shadow-primary/30" : "bg-white/[0.1] hover:bg-white/[0.15]"}`}
    >
      <motion.div 
        animate={{ x: enabled ? 26 : 4 }}
        transition={{ type: "spring", stiffness: 700, damping: 35 }}
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
        className="relative w-[90%] max-w-5xl glass-card rounded-[2rem] overflow-hidden flex flex-col h-[80vh] max-h-[750px] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10"
      >
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-72 flex-shrink-0 bg-white/[0.01] border-r border-white/5 flex flex-col pt-10 pb-6">
            <div className="px-8 mb-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                 <Sparkles className="w-6 h-6 text-white" />
               </div>
               <div className="flex flex-col justify-center">
                 <h2 className="text-base font-black tracking-tight text-foreground -mb-1">Settings</h2>
                 <p className="text-[11px] text-primary font-bold uppercase tracking-widest opacity-80 underline underline-offset-4 decoration-2">EzChat v1.1</p>
               </div>
            </div>

            <nav className="flex-1 space-y-1 px-4">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShowSection(s.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 relative group ${
                    showSection === s.id 
                    ? "bg-white/[0.05] text-white font-bold" 
                    : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground active-bar"
                  }`}
                >
                  {showSection === s.id && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white/[0.04] border border-white/10 rounded-2xl -z-10 shadow-xl" />}
                  <s.icon className={`w-4 h-4 ${showSection === s.id ? "text-primary" : "group-hover:scale-110 transition-transform"}`} />
                  <span className="text-xs font-semibold tracking-wide">{s.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-primary/[0.02]">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 md:p-10 pb-32">
              <AnimatePresence mode="wait">
                {showSection === "profile" && (
                  <motion.div 
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10 w-full"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-10">
                      <div className="relative">
                        <div className="w-40 h-40 rounded-[2rem] avatar-ring p-1.5 flex items-center justify-center bg-background group cursor-pointer overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-500 hover:scale-105">
                           <div 
                             className="w-full h-full rounded-[1.8rem] bg-secondary/30 overflow-hidden flex items-center justify-center relative"
                             onClick={() => fileInputRef.current?.click()}
                           >
                              {avatarUrl ? (
                                <img src={getAvatarSrc()} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <span className="text-5xl font-black text-primary/40 leading-none">{(username?.trim() || "?").charAt(0).toUpperCase()}</span>
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
                            <h3 className="text-2xl font-black tracking-tight">{username || "Anonymous User"}</h3>
                            <div className="flex items-center gap-2">
                               <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/5 flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 online-pulse" />
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Online</span>
                               </div>
                               <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                 <span className="text-[10px] font-mono font-bold text-primary transition-all duration-300 cursor-default">{cvId || "No ID"}</span>
                               </div>
                            </div>
                         </div>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-sm font-medium">
                           Tell the community a bit about yourself. Your profile changes are updated instantly across the network.
                         </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Username</label>
                         <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                              placeholder="Enter username"
                            />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                         <div className="relative opacity-60">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              value={email || ""}
                              disabled
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs font-medium cursor-not-allowed"
                            />
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        About You
                      </label>
                      <div className="relative group">
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          maxLength={150}
                          rows={4}
                          placeholder="Tell us a bit about yourself..."
                          className="w-full px-8 py-6 rounded-3xl bg-white/[0.03] border border-white/5 text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] resize-none font-medium placeholder:text-muted-foreground/30 min-h-[120px]"
                        />
                        <div className="absolute bottom-6 right-8 flex items-center gap-4">
                          <span className={`text-[10px] font-black tracking-widest tabular-nums ${(bio || "").length >= 140 ? "text-destructive" : "text-primary/40 group-focus-within:text-primary transition-colors"}`}>
                            {(bio || "").length} <span className="opacity-20">/</span> 150
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-6 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.03] w-fit">
                         <Info className="w-3 h-3 text-primary/40" />
                         <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">End-to-End Encrypted Sync</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {showSection === "preferences" && (
                  <motion.div 
                    key="preferences"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 w-full"
                  >
                     <div className="space-y-2 mb-8">
                       <h3 className="text-xl font-black text-foreground">Interface <span className="text-primary italic">Styles</span></h3>
                       <p className="text-sm text-muted-foreground font-medium">Personalize how you interact with the mesh network.</p>
                     </div>

                     <div className="space-y-4">
                      {[
                        { id: "theme", icon: settings?.theme === "dark" ? Moon : Sun, label: "Dark Theme", desc: "A high-contrast darkness optimized for low-light terminal usage.", val: settings?.theme === "dark", action: () => onUpdateSettings({ theme: settings?.theme === "dark" ? "light" : "dark" }) },
                        { id: "sounds", icon: Volume2, label: "Sound Effects", desc: "Tactile audible feedback for incoming messages and alerts.", val: settings?.sounds_enabled, action: () => onUpdateSettings({ sounds_enabled: !settings?.sounds_enabled }) },
                        { id: "receipts", icon: Eye, label: "Read Receipts", desc: "Share your message read status with your trusted peers.", val: settings?.show_read_receipts, action: () => onUpdateSettings({ show_read_receipts: !settings?.show_read_receipts }) },
                      ].map((pref) => (
                        <div key={pref.id} className="group flex items-center justify-between p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all group-hover:gradient-primary group-hover:text-white group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
                              <pref.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm font-black tracking-tight">{pref.label}</p>
                              <p className="text-xs text-muted-foreground/60 max-w-xs font-medium">{pref.desc}</p>
                            </div>
                          </div>
                          <Toggle enabled={pref.val} onClick={pref.action} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {showSection === "security" && (
                  <motion.div 
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10 w-full"
                  >
                     <div className="space-y-2">
                       <h3 className="text-xl font-black text-foreground">Security <span className="text-primary italic">Passcode</span></h3>
                       <p className="text-sm text-muted-foreground font-medium">Update your security passcode to keep your profile protected.</p>
                     </div>

                     <div className="space-y-6 max-w-md">
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Current Password</label>
                           <div className="relative group">
                              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                                placeholder="••••••••"
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Passcode</label>
                           <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05] gradient-border-focus"
                                placeholder="Secure your account..."
                              />
                           </div>
                        </div>
                        <button
                          onClick={handleChangePassword}
                          disabled={!oldPassword || !newPassword || passSaving}
                          className="w-full py-4 rounded-2xl gradient-primary text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3 border border-white/10"
                        >
                          {passSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4" />}
                           {passSaving ? "Updating passcode..." : "Update Passcode"}
                         </button>
                      </div>

                      <div className="pt-10 border-t border-white/5 space-y-6">
                         <div className="space-y-2">
                            <h3 className="text-xl font-black text-foreground">Vault <span className="text-primary italic">Security</span></h3>
                            <p className="text-sm text-muted-foreground font-medium">Add an extra layer of protection with a 4-digit security PIN.</p>
                         </div>

                         <div className="group flex items-center justify-between p-7 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all duration-300">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg group-hover:shadow-primary/30">
                                  <ShieldCheck className="w-6 h-6" />
                               </div>
                               <div>
                                  <p className="text-sm font-black tracking-tight">Access Lock</p>
                                  <p className="text-xs text-muted-foreground/60 max-w-xs font-medium">{isPinEnabled ? "Your vault is currently locked." : "Require a PIN to access the EzChat terminal."}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               {isPinEnabled && (
                                 <button 
                                   onClick={onLockNow}
                                   className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black tracking-widest uppercase text-muted-foreground hover:text-foreground transition-all"
                                 >
                                   Lock Now
                                 </button>
                               )}
                               <Toggle enabled={isPinEnabled} onClick={() => onTogglePin(!isPinEnabled)} />
                            </div>
                         </div>

                         {isPinEnabled && (
                           <div className="space-y-4">
                              {pinMode === "none" ? (
                                <button 
                                  onClick={() => setPinMode("setting")}
                                  className="text-[11px] font-bold text-primary hover:underline ml-2"
                                >
                                  Reset Access PIN
                                </button>
                              ) : (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 shadow-2xl"
                                >
                                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-center block">Enter New PIN</label>
                                   <div className="flex items-center gap-4">
                                      <input 
                                        type="password"
                                        maxLength={4}
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                        className="flex-1 px-8 py-5 rounded-2xl bg-black/40 border border-white/10 text-center text-2xl tracking-[0.8em] font-black focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-mono"
                                        placeholder="0000"
                                      />
                                      <button 
                                        onClick={handleSetPin}
                                        disabled={(newPin || "").length !== 4 || passSaving}
                                        className="h-[64px] px-10 rounded-2xl gradient-primary text-[11px] font-black tracking-widest uppercase disabled:opacity-20 border border-white/10 shadow-xl shadow-primary/20"
                                      >
                                        {passSaving ? "Saving..." : "Save PIN"}
                                      </button>
                                   </div>
                                </motion.div>
                              )}
                           </div>
                         )}
                      </div>

                      <div className="pt-10 border-t border-white/5">
                        <div className="p-10 rounded-3xl bg-destructive/5 border border-destructive/10">
                           <h4 className="text-sm font-black text-destructive uppercase tracking-widest mb-2">Delete Presence</h4>
                           <p className="text-xs text-muted-foreground/60 mb-8 font-medium leading-relaxed">This will permanently wipe your profile, bio, and all peer connections from the mesh network. This cannot be undone.</p>
                           <button
                             onClick={handleDeleteAccount}
                             className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all duration-300 text-[11px] font-black tracking-widest border border-destructive/20 shadow-lg hover:shadow-destructive/30"
                           >
                             <Trash2 className="w-4 h-4" />
                             PURGE ACCOUNT
                           </button>
                        </div>
                     </div>
                  </motion.div>
                )}

                {showSection === "blocked" && (
                  <motion.div 
                    key="blocked"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 w-full"
                  >
                     <div className="space-y-2">
                       <h3 className="text-xl font-black text-foreground">Privacy <span className="text-primary italic">Filters</span></h3>
                       <p className="text-sm text-muted-foreground font-medium">Manage the nodes that are restricted from reaching your terminal.</p>
                     </div>

                     <div className="space-y-4 min-h-[300px]">
                       {loadingBlocked ? (
                          <div className="flex flex-col items-center justify-center h-full gap-5 text-muted-foreground py-20">
                             <Loader2 className="w-12 h-12 animate-spin text-primary" opacity={0.6} />
                             <p className="text-[11px] font-bold tracking-widest uppercase">Reading Privacy Settings...</p>
                          </div>
                       ) : blockedUsers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full gap-6 text-muted-foreground/20 py-24 border-2 border-dashed border-white/5 rounded-[3rem]">
                             <User className="w-16 h-16" strokeWidth={1} />
                             <p className="text-[11px] font-black tracking-widest uppercase">No restrictions active</p>
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {blockedUsers.map((u) => (
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 key={u._id} 
                                 className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.04] border border-white/5 hover:border-white/20 transition-all group shadow-sm"
                               >
                                  <div className="flex items-center gap-5">
                                     <div className="w-12 h-12 rounded-2xl overflow-hidden bg-secondary ring-2 ring-white/5 group-hover:ring-primary/40 transition-all shadow-lg">
                                        {u.avatar_url ? (
                                          <img src={`${SOCKET_URL}${u.avatar_url}`} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-primary/20 font-black text-sm">{(u?.username || " ").charAt(0).toUpperCase() || "?"}</div>
                                        )}
                                     </div>
                                     <div>
                                        <p className="text-sm font-black tracking-tight">{u.username}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Restricted</p>
                                     </div>
                                  </div>
                                  <button
                                    onClick={() => handleUnblock(u._id)}
                                    className="px-5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-[10px] font-black tracking-widest uppercase shadow-sm"
                                  >
                                    Unblock
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
          </div>
        </div>

        {/* Action Hub - Full Width across bottom */}
        <div className="px-6 md:px-10 py-6 md:py-8 bg-black/60 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl relative z-20">
          <div className="flex items-center gap-8 w-full md:w-auto">
            <button
               onClick={onClose}
               className="px-8 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.1] transition-all flex items-center justify-center gap-3 text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest border border-white/10"
             >
               <X className="w-4 h-4" />
               Return to Chat
             </button>

             <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-8">
               <div className="relative">
                 <div className="w-2 h-2 rounded-full bg-green-500 online-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]" />
               </div>
               <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Session Encrypted</span>
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
               className="flex-1 md:flex-none px-10 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] font-bold tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.08] transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase"
             >
               Reset Defaults
             </button>
             <button
               onClick={handleSave}
               disabled={!hasChanges || saving}
               className="flex-1 md:flex-none px-12 py-4 rounded-2xl gradient-primary shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-[11px] font-black tracking-widest text-white hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-30 uppercase flex items-center justify-center gap-3 border border-white/20"
             >
               {saving ? <Loader2 className="w-4 h-4 animate-spin text-white/80" /> : <Save className="w-4 h-4 text-white/80" />}
               {saving ? "Saving Changes..." : "Save Profile"}
             </button>
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
