import { useState } from "react";
import { 
  Search, Settings, LogOut, Bell, Sparkles, UserPlus, 
  ShieldAlert, UserMinus, PlusCircle, Users, Wifi 
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Friend } from "@/pages/Dashboard";
import SettingsPanel from "./SettingsPanel";
import ConfirmDialog from "./ConfirmDialog";
import WifiSidebarItem from "./wifi/WifiSidebarItem";

import { SOCKET_URL } from "@/lib/config";

interface ChatSidebarProps {
  friends: Friend[];
  pendingRequests: any[];
  onRespondRequest: (requestId: string, status: 'accepted' | 'rejected') => void;
  onUnfriend: (friendId: string) => void;
  onBlock: (friendId: string) => void;
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
  onLogout: () => void;
  onAddFriend: (username: string) => void;
  onUpdateProfile: (data: { username: string; bio: string; avatar_url: string }) => void;
  onUpdateSettings: (settings: any) => void;
  onFriendAdded?: () => void;
  settings: any;
  username: string;
  userId: string;
  cvId: string;
  email: string;
  bio: string;
  avatarUrl: string;
  onOpenWiFiPanel: () => void;
  onToggleChatMode: (val: boolean) => void;
  chatMode: "internet" | "wifi";
  nearbyUsersCount: number;
  joinedRooms: any[];
  onSelectRoom: (room: any) => void;
  selectedRoom: any | null;
}

const ChatSidebar = ({
  friends,
  pendingRequests,
  onRespondRequest,
  onUnfriend,
  onBlock,
  selectedFriend,
  onSelectFriend,
  onLogout,
  onAddFriend,
  onUpdateProfile,
  onUpdateSettings,
  onFriendAdded,
  settings,
  username,
  userId,
  cvId,
  email,
  bio,
  avatarUrl,
  onOpenWiFiPanel,
  onToggleChatMode,
  chatMode,
  nearbyUsersCount,
  joinedRooms,
  onSelectRoom,
  selectedRoom,
}: ChatSidebarProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'requests'>('friends');
  const [showSettings, setShowSettings] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'unfriend' | 'block'; friendId: string; friendName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.cv_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFriendName.trim()) {
      onAddFriend(newFriendName.trim());
      setNewFriendName("");
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="w-80 h-full glass flex flex-col border-r border-white/[0.05] shrink-0">
      {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 select-none group">
              <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain relative z-10 scale-[2.4] translate-y-[6px]" 
                  style={{ mixBlendMode: 'screen' }} 
                />
              </div>
              <span className="font-black text-2xl tracking-tight gradient-text drop-shadow-sm leading-none">ezchat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-all duration-300 hover:scale-105 active:scale-95"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

          {/* WiFi Entry Item */}
          <div className="px-5 mb-5">
            <WifiSidebarItem 
              isActive={chatMode === 'wifi'}
              onToggle={(val) => onToggleChatMode(val)}
              onOpenPanel={onOpenWiFiPanel}
            />
          </div>

          {/* Search */}
          <div className="px-5 mb-4">
            <div className={`relative rounded-xl border transition-all duration-300 ${isSearchFocused ? 'border-primary/40 shadow-[0_0_0_3px_hsla(200,80%,45%,0.08)] bg-white/[0.05]' : 'border-border bg-secondary/30'}`}>
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${isSearchFocused ? 'text-primary' : 'text-muted-foreground'}`} />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="relative flex p-1.5 gap-1 bg-white/[0.03] mx-4 mb-3 rounded-xl border border-white/[0.04]">
            {/* Sliding Indicator */}
            <div 
              className="absolute top-1.5 h-[calc(100%-12px)] w-[calc(1/3*100%-6px)] rounded-lg bg-white/[0.08] shadow-sm transition-all duration-300 ease-out"
              style={{ left: activeTab === 'friends' ? '6px' : activeTab === 'groups' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 0px)' }}
            />
            <button
              onClick={() => setActiveTab('friends')}
              className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors duration-300 ${
                activeTab === 'friends' ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors duration-300 ${
                activeTab === 'groups' ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors duration-300 ${
                activeTab === 'requests' ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full gradient-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center animate-bounce-in">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-1 pb-1 space-y-0.5 scroll-smooth">
            {activeTab === 'friends' ? (
              <>
                <div className="flex items-center justify-between px-2 mb-2 mt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em]">Messages</span>
                </div>

                {friends.length === 0 ? (
                  <div className="text-center py-12 px-4 animate-fade-in">
                    <div className="relative w-28 h-28 mb-5 mx-auto flex items-center justify-center overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full animate-pulse" />
                      <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                      <img 
                        src="/logo.png" 
                        alt="" 
                        className="w-full h-full object-contain relative opacity-30 hover:opacity-100 transition-opacity duration-700 brand-logo logo-float scale-[2.2]" 
                        style={{ mixBlendMode: 'screen' }} 
                      />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/80 mb-1">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/50 mb-5">Add friends to start chatting</p>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs font-bold gradient-text hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" style={{ WebkitTextFillColor: 'unset', color: 'hsl(200 80% 45%)' }} />
                      Send your first friend request
                    </button>
                  </div>
                ) : (
                  filteredFriends.map((friend, index) => (
                    <div 
                      key={friend._id} 
                      className="group relative animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <button
                        onClick={() => onSelectFriend(friend)}
                        className={`active-bar w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                          selectedFriend?._id === friend._id
                            ? "active glass-strong shadow-lg shadow-black/10"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium text-sm overflow-hidden transition-all duration-300 ${
                            selectedFriend?._id === friend._id ? 'ring-2 ring-primary/30' : ''
                          }`}>
                            {friend.avatar_url ? (
                              <img 
                                src={friend.avatar_url.startsWith("http") ? friend.avatar_url : `${SOCKET_URL}${friend.avatar_url}`} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-primary font-bold text-sm">{friend.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background transition-colors duration-300 ${
                              friend.is_online ? "bg-online" : "bg-offline"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{friend.username}</p>
                              {friend.cv_id === "P2P" && (
                                <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20 leading-none shrink-0">P2P</span>
                              )}
                            </div>
                            {Boolean(friend.unread_count && friend.unread_count > 0) && (
                              <div className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold animate-pop-in shadow-lg shadow-primary/20">
                                {friend.unread_count! > 9 ? '9+' : friend.unread_count}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70 truncate pr-6 mt-0.5">{friend.last_message}</p>
                        </div>
                      </button>
                      
                      {/* Hover Actions */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 animate-in fade-in slide-in-from-right-2 duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'unfriend', friendId: friend._id, friendName: friend.username }); }}
                          className="w-7 h-7 rounded-lg bg-secondary/80 backdrop-blur-sm hover:bg-destructive/15 hover:text-destructive flex items-center justify-center text-muted-foreground/60 transition-all duration-200"
                          title="Unfriend"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : activeTab === 'groups' ? (
              <div className="space-y-4 animate-fade-in">
                {/* Joined Groups Section */}
                {joinedRooms.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 mb-2">
                       <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em]">MY GROUPS</span>
                    </div>
                    {joinedRooms.map((room, index) => {
                      const isSelected = selectedRoom?.room_id === room.room_id;
                      return (
                        <button
                          key={room.room_id}
                          onClick={() => onSelectRoom(room)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                            isSelected
                              ? "bg-white/[0.08] shadow-lg shadow-black/10 border border-white/5"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div className={`w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden transition-all duration-300 ${
                              isSelected ? 'ring-2 ring-primary/40' : ''
                            }`}>
                              {/* Stacked member avatars */}
                              {room.members && room.members.length > 0 ? (
                                <div className="relative w-full h-full">
                                  {room.members.slice(0, 2).map((member: any, mi: number) => {
                                    const memberUser = member.userId || member;
                                    const avatarUrl = memberUser?.avatar_url;
                                    const uname = memberUser?.username || member.username || '?';
                                    return (
                                      <div
                                        key={mi}
                                        className="absolute w-6 h-6 rounded-md overflow-hidden ring-1 ring-background"
                                        style={{ top: mi === 0 ? '0px' : '5px', left: mi === 0 ? '0px' : '5px', zIndex: mi === 0 ? 2 : 1 }}
                                      >
                                        {avatarUrl ? (
                                          <img src={avatarUrl.startsWith('http') ? avatarUrl : `${SOCKET_URL}${avatarUrl}`} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                                            {uname.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {room.members.length > 2 && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-secondary border border-background text-[7px] font-black text-muted-foreground flex items-center justify-center" style={{ zIndex: 3 }}>
                                      +{room.members.length - 2}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-primary font-black text-lg">{room.roomName?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-online border-2 border-background flex items-center justify-center">
                               <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{room.roomName}</p>
                                {(() => {
                                  const m = room.members?.find((m: any) => (m.userId?._id || m.userId) === userId);
                                  const userRole = m?.role;
                                  if (userRole === 'admin') return <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20 leading-none shrink-0">Admin</span>;
                                  if (userRole === 'manager') return <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[8px] font-black uppercase tracking-widest border border-accent/20 leading-none shrink-0">Manager</span>;
                                  return <span className="px-1.5 py-0.5 rounded-md bg-online/10 text-online text-[8px] font-black uppercase tracking-widest border border-online/10 leading-none shrink-0">Member</span>;
                                })()}
                              </div>
                              {Boolean(room.unread_count && room.unread_count > 0) && (
                                <div className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold animate-pop-in shadow-lg shadow-primary/20">
                                  {room.unread_count! > 9 ? '9+' : room.unread_count}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/70 truncate pr-6 mt-0.5">{room.last_message || `${room.isPrivate ? 'Private' : 'Public'} Group • ${room.members?.length || 1} member${(room.members?.length || 1) === 1 ? '' : 's'}`}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {joinedRooms.length === 0 && (
                  <div className="text-center py-12 px-4 animate-fade-in">
                     <p className="text-xs text-muted-foreground italic">No groups joined yet.</p>
                     <p className="mt-2 text-[10px] text-muted-foreground opacity-50 uppercase tracking-widest">Connect with users to create mesh groups</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 p-1 animate-fade-in">
                {/* Add Friend Section */}
                <div className="pb-4 border-b border-white/[0.05] mb-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em] mb-3 px-1">Send Request</h3>
                  <form onSubmit={handleAddSubmit} className="space-y-2">
                    <div className="relative rounded-xl border border-white/[0.08] bg-secondary/30 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsla(200,80%,45%,0.08)] transition-all duration-300">
                      <input
                        type="text"
                        value={newFriendName}
                        onChange={(e) => setNewFriendName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubmit(e as any);
                          }
                        }}
                        placeholder="Enter username or CV-ID..."
                        className="w-full px-3 py-2.5 rounded-xl bg-transparent text-sm focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 px-1 leading-tight">
                      For CV-IDs, you can just enter the 8-digit numbers (skip "CV-").
                    </p>
                    <button
                      type="submit"
                      disabled={!newFriendName.trim()}
                      className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/10"
                    >
                      Send Friend Request
                    </button>
                  </form>
                </div>

                {/* Incoming Requests Section */}
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.15em] mb-3 px-1">Incoming Requests</h3>
                  {pendingRequests.length === 0 ? (
                    <p className="text-center py-8 text-xs text-muted-foreground/50 italic">No pending requests</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingRequests.map((req, index) => (
                        <div 
                          key={req._id} 
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all duration-300 animate-slide-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden ring-1 ring-white/10">
                              {req.sender.avatar_url ? (
                                <img 
                                  src={req.sender.avatar_url.startsWith("http") ? req.sender.avatar_url : `${SOCKET_URL}${req.sender.avatar_url}`} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/10 text-primary-foreground font-bold text-xs">${req.sender.username.charAt(0).toUpperCase()}</span>`);
                                  }}
                                />
                              ) : (
                                req.sender.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{req.sender.username}</p>
                              <p className="text-[10px] text-muted-foreground/60 font-mono">{req.sender.cv_id}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onRespondRequest(req._id, 'accepted')}
                              className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-[11px] font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => onRespondRequest(req._id, 'rejected')}
                              className="flex-1 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-muted-foreground text-[11px] font-bold hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Profile & Settings Section */}
          <div className="mt-auto border-t border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              {/* User Card */}
              <div className="flex-1 flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all duration-300 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm overflow-hidden ring-2 ring-white/[0.08]">
                    {avatarUrl ? (
                      <img src={avatarUrl.startsWith("http") ? avatarUrl : `${SOCKET_URL}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      username[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-online border-[2px] border-background online-pulse" />
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-xs font-semibold text-foreground truncate">{username}</p>
                  <p className="text-[9px] text-muted-foreground font-mono bg-secondary/40 px-1.5 py-0.5 rounded border border-white/[0.1] mt-0.5 inline-block truncate max-w-full">
                    {cvId}
                  </p>
                </div>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="shrink-0 w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] hover:border-primary/20 transition-all duration-300 group active:scale-[0.95]"
                title="Settings"
              >
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
              </button>
            </div>
          </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            username={username}
            bio={bio}
            avatarUrl={avatarUrl}
            cvId={cvId}
            email={email}
            userId={userId}
            onSave={async (data) => { await onUpdateProfile(data); setShowSettings(false); }}
            onUpdateSettings={onUpdateSettings}
            onFriendAdded={onFriendAdded}
            settings={settings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.type === 'unfriend' ? 'Unfriend' : 'Block User'}
        description={
          confirmAction?.type === 'unfriend'
            ? `Are you sure you want to unfriend ${confirmAction.friendName}?`
            : `Are you sure you want to block ${confirmAction?.friendName}? They won't be able to message you.`
        }
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        onConfirm={() => {
          if (confirmAction?.type === 'unfriend') {
            onUnfriend(confirmAction.friendId);
          } else if (confirmAction) {
            onBlock(confirmAction.friendId);
          }
        }}
      />
    </>
  );
};

export default ChatSidebar;
