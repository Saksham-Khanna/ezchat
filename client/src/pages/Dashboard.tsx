import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { ChevronLeft } from "lucide-react";
import ChatArea from "@/components/chat/ChatArea";
import ProfilePanel from "@/components/chat/ProfilePanel";
import SharedMediaView from "@/components/chat/SharedMediaView";
import ForwardModal from "@/components/chat/ForwardModal";
import CallOverlay from "@/components/chat/CallOverlay";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { WebRTCManager, P2PMessage } from "@/lib/WebRTCManager";
import CreateRoomModal from "@/components/chat/wifi/CreateRoomModal";
import AddMembersModal from "@/components/chat/wifi/InviteMembersModal";
import RenameRoomModal from "@/components/chat/wifi/RenameRoomModal";
import WiFiDiscoveryPanel from "@/components/chat/WiFiDiscoveryPanel";
import RoomMembersPanel from "@/components/chat/wifi/RoomMembersPanel";
import { SOCKET_URL } from "@/lib/config";

export interface Friend {
  _id: string; // MongoDB uses _id
  username: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  cv_id: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
}

export interface Message {
  _id: string;
  sender_id: string;
  recipient_id: string;
  sender_name?: string;
  content: string;
  createdAt: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document' | 'none' | 'call' | 'call_video';
  call_duration?: number;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  is_deleted?: boolean;
  is_edited?: boolean;
  reply_to?: {
    _id: string;
    content: string;
    sender_id: string;
  };
  reactions?: {
    user_id: string;
    emoji: string;
  }[];
  is_forwarded?: boolean;
  sender_avatar?: string;
  type?: 'text' | 'system' | 'media' | 'call';
}

export interface User {
  id: string;
  username: string;
  email: string;
  cv_id?: string;
  bio?: string;
  avatar_url?: string;
  settings?: {
    theme: string;
    show_read_receipts: boolean;
    notifications_enabled: boolean;
    sounds_enabled: boolean;
  };
}

const Dashboard = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, {username: string; avatar_url?: string}>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  
  // WiFi Mode State
  const [chatMode, setChatMode] = useState<"internet" | "wifi">("internet");
  const [showWiFiPanel, setShowWiFiPanel] = useState(false);
  const [wifiName, setWifiName] = useState("");
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [discoveredUsers, setDiscoveredUsers] = useState<any[]>([]);
  const [p2pFriends, setP2PFriends] = useState<Friend[]>([]);
  const [dbFriends, setDbFriends] = useState<Friend[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [incomingP2PRequest, setIncomingP2PRequest] = useState<any | null>(null);
  const [outgoingP2PRequests, setOutgoingP2PRequests] = useState<Set<string>>(new Set());
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<any[]>([]);
  const [roomMembers, setRoomMembers] = useState<Map<string, any[]>>(new Map());
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showRenameRoomModal, setShowRenameRoomModal] = useState(false);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const roomMembersRef = useRef<Map<string, any[]>>(new Map());
  const nearbyUsersRef = useRef<any[]>([]);
  const [wifiConnectionStatus, setWifiConnectionStatus] = useState<Map<string, string>>(new Map());
  const [wifiTransferProgress, setWifiTransferProgress] = useState<Map<string, number>>(new Map());
  
  // Call state
  const [callStatus, setCallStatus] = useState<"none" | "calling" | "incoming" | "connected">("none");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [activeCallFriend, setActiveCallFriend] = useState<Friend | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callRecipientIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const [settings, setSettings] = useState({
    theme: 'dark',
    show_read_receipts: true,
    notifications_enabled: true,
    sounds_enabled: true,
  });
  const settingsRef = useRef(settings);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedFriendRef = useRef<Friend | null>(null);
  const selectedRoomRef = useRef<any | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFriendInState = (friendId: string, updater: (f: Friend) => Friend) => {
    setDbFriends(prev => prev.map(f => f._id === friendId ? updater(f) : f));
    setP2PFriends(prev => prev.map(f => f._id === friendId ? updater(f) : f));
  };

  const removeFriendFromState = (friendId: string) => {
    setDbFriends(prev => prev.filter(f => f._id !== friendId));
    setP2PFriends(prev => prev.filter(f => f._id !== friendId));
  };


  const handleReceiveP2PMessage = (p2pMsg: P2PMessage) => {
    if (!user) return;
    
    // Convert P2P message to existing Message format
    const newMsg: Message = {
      _id: p2pMsg.message_id || `p2p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_id: p2pMsg.sender_id,
      recipient_id: p2pMsg.recipient_id,
      content: p2pMsg.content || "",
      media_url: p2pMsg.media_url,
      media_type: p2pMsg.media_type as any,
      createdAt: p2pMsg.timestamp || new Date().toISOString(),
      status: 'delivered',
    };

    if (p2pMsg.type === "typing") {
      if (p2pMsg.is_typing) {
        setTypingUsers(prev => {
           const next = new Map(prev);
           // P2P messages might lack username/avatar_url, so gracefully fall back if unavailable
           next.set(p2pMsg.sender_id, { username: 'Someone' });
           return next;
        });
      } else {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(p2pMsg.sender_id);
          return next;
        });
      }
      return;
    }

    if (p2pMsg.type === "receipt" && p2pMsg.message_id) {
       setMessages(prev => prev.map(m => m._id === p2pMsg.message_id ? { ...m, status: 'read' } : m));
       return;
    }

    if (p2pMsg.type === "reaction" && p2pMsg.message_id && p2pMsg.emoji) {
      setMessages(prev => prev.map(m => {
        if (m._id === p2pMsg.message_id) {
          const existing = m.reactions || [];
          const filtered = existing.filter(r => r.user_id !== p2pMsg.sender_id);
          return { ...m, reactions: [...filtered, { user_id: p2pMsg.sender_id, emoji: p2pMsg.emoji! }] };
        }
        return m;
      }));
      return;
    }

    // Determine if message is for the current conversation (direct or room)
    const isCurrentChat = 
      newMsg.sender_id === selectedFriendRef.current?._id || 
      newMsg.recipient_id === selectedFriendRef.current?._id;

    if (isCurrentChat || newMsg.sender_id === user.id) {
      setMessages(prev => [...prev, newMsg]);
      
      // Auto-reply with read receipt if we are the recipient and it's not a room message
      if (newMsg.recipient_id === user.id && chatMode === "wifi" && !isCurrentChat && !newMsg.recipient_id.startsWith('room_')) {
        webrtcManagerRef.current?.sendMessage(newMsg.sender_id, {
          type: "receipt",
          sender_id: user.id,
          recipient_id: newMsg.sender_id,
          message_id: newMsg._id
        });
      }
    }

    // Update sidebar last message (if it's a direct message)
    if (!p2pMsg.recipient_id.startsWith('room_')) {
      updateFriendInState(p2pMsg.sender_id, (f) => ({
        ...f,
        last_message: p2pMsg.content || (p2pMsg.type === 'image' ? '📷 Image' : '📎 File'),
        last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread_count: (f._id === selectedFriendRef.current?._id) ? 0 : (f.unread_count || 0) + 1
      }));
    }
  };

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    nearbyUsersRef.current = nearbyUsers;
  }, [nearbyUsers]);

  useEffect(() => {
    roomMembersRef.current = roomMembers;
  }, [roomMembers]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.settings) setSettings(parsedUser.settings);
      
      // Apply theme
      document.documentElement.classList.toggle('light-mode', (parsedUser.settings?.theme || 'dark') === 'light');
      
      // Initialize Socket with reconnection options
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      setSocket(newSocket);
      
      // Initialize WebRTC Manager
      const webrtc = new WebRTCManager(newSocket, parsedUser.id);
      webrtcManagerRef.current = webrtc;

      webrtc.onMessage = (p2pMsg) => {
        handleReceiveP2PMessage(p2pMsg);
      };

      webrtc.onConnectionUpdate = (peerId, status) => {
        setWifiConnectionStatus(prev => new Map(prev).set(peerId, status));
      };

      webrtc.onFileProgress = (peerId, fileName, progress) => {
        // Use a composite key or just track per-peer for simplicity in UI
        setWifiTransferProgress(prev => new Map(prev).set(`${peerId}-${fileName}`, progress));
      };

      webrtc.onFileReceived = (peerId, fileName, blob) => {
        const fileUrl = URL.createObjectURL(blob);
        // Create a special message for received file
        const receivedMsg: Message = {
            _id: `p2p_file_${Date.now()}`,
            sender_id: peerId,
            recipient_id: parsedUser.id,
            content: `Received file: ${fileName}`,
            media_url: fileUrl,
            media_type: 'document', // Default to document or infer from filename
            createdAt: new Date().toISOString(),
            status: 'read'
        };
        setMessages(prev => [...prev, receivedMsg]);
        toast({ title: "File Received", description: `Saved ${fileName}` });
      };
      
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        newSocket.emit("join", parsedUser.id);
        
        // Auto-join WiFi discovery to populate available rooms for the sidebar
        newSocket.emit("join_wifi", {
          wifiName: wifiName || "local",
          userId: parsedUser.id,
          username: parsedUser.username,
          avatarUrl: parsedUser.avatar_url,
          cv_id: parsedUser.cv_id
        });
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      // WiFi Signaling Listeners
      newSocket.on("wifi_user_joined", (data) => {
        setNearbyUsers(prev => {
          if (prev.find(u => u.userId === data.userId)) return prev;
          const next = [...prev, data];
          setDiscoveredUsers(next); // Keep live if panel is open
          return next;
        });
      });

      newSocket.on("wifi_user_left", (data) => {
        setNearbyUsers(prev => prev.filter(u => u.userId !== data.userId));
        setDiscoveredUsers(prev => prev.filter(u => u.userId !== data.userId));
      });

      newSocket.on("wifi_discovery_update", (data) => {
        setNearbyUsers(data.users || []);
        // Also update discoveredUsers if currently displaying
        setDiscoveredUsers(data.users || []);
      });

      newSocket.on("p2p_connect_request", (data) => {
        // data: { from, fromUsername, fromAvatar, fromCvId }
        setIncomingP2PRequest(data);
      });
      newSocket.on("p2p_connect_accepted", (data) => {
        // data: { from, to, fromUsername, fromAvatar, networkId }
        toast({ title: "Connection Accepted", description: `You are now connected to ${data.fromUsername}` });
        webrtcManagerRef.current?.connectToPeer(data.from);
        
        // Clear pending outgoing
        setOutgoingP2PRequests(prev => {
          const next = new Set(prev);
          next.delete(data.from);
          return next;
        });

        const newFriend = {
            _id: data.from,
            username: data.fromUsername,
            avatar_url: data.fromAvatar,
            is_online: true,
            cv_id: data.networkId || "P2P"
        } as any;
        
        setP2PFriends(prev => {
          if (prev.find(f => f._id === newFriend._id)) return prev;
          return [newFriend, ...prev];
        });
        
        // Persist to database
        fetch(`${SOCKET_URL}/api/auth/add-friend-p2p`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: parsedUser.id, targetId: data.from })
        }).then(() => refreshFriends());
        
        setSelectedFriend(newFriend);
        setChatMode("wifi");
        setShowWiFiPanel(false);
      });

      newSocket.on("p2p_connect_rejected", (data) => {
        toast({ title: "Connection Rejected", description: `${data.fromUsername} declined the connection`, variant: "destructive" });
        setOutgoingP2PRequests(prev => {
          const next = new Set(prev);
          next.delete(data.from);
          return next;
        });
      });

      newSocket.on("wifi_room_participants", (data: { roomId: string, peerIds: string[] }) => {
        // Updated to not use participants since we use roomMembers now
        if (webrtcManagerRef.current) {
          data.peerIds.forEach(peerId => {
            if (peerId !== parsedUser.id) {
              webrtcManagerRef.current?.connectToPeer(peerId);
            }
          });
          toast({ title: "Mesh Ready", description: `Joined room mesh with ${data.peerIds.length} others` });
        }
      });

      newSocket.on("wifi_room_joined", (roomData) => {
        setJoinedRooms(prev => {
          if (prev.find(r => r.room_id === roomData.room_id)) return prev;
          return [...prev, roomData];
        });
        setRoomMembers(prev => new Map(prev).set(roomData.room_id, roomData.members));
        
        // Mocking a Friend object for the room to reuse ChatArea
        const roomAsFriend: any = {
           _id: roomData.room_id,
           username: roomData.roomName,
           is_online: true,
           is_room: true
        };
        setSelectedFriend(roomAsFriend);
        setSelectedRoom(roomData);
        setChatMode("wifi");
        toast({ title: "Room Joined", description: `You are now in ${roomData.roomName}` });
      });

      newSocket.on("wifi_room_user_joined", (data) => {
        setRoomMembers(prev => {
          const next = new Map(prev);
          next.set(data.roomId, data.members); // Use the full list from server
          return next;
        });

        const isMe = data.userId === parsedUser.id;
        if (webrtcManagerRef.current && !isMe) {
          webrtcManagerRef.current.connectToPeer(data.userId);
        }
      });

      newSocket.on("wifi_room_user_left", (data) => {
        setRoomMembers(prev => {
          const next = new Map(prev);
          next.set(data.roomId, data.members);
          return next;
        });
      });

      newSocket.on("wifi_room_user_removed", (data) => {
        if (data.targetId === parsedUser.id) {
          handleLeaveRoom(data.roomId);
          toast({ title: "Removed", description: "You were removed from the room", variant: "destructive" });
        } else {
          setRoomMembers(prev => {
            const next = new Map(prev);
            next.set(data.roomId, data.members);
            return next;
          });
        }
      });

      newSocket.on("wifi_room_role_updated", (data) => {
        setRoomMembers(prev => {
          const next = new Map(prev);
          next.set(data.roomId, data.members);
          return next;
        });
        if (data.targetId === parsedUser.id) {
          toast({ title: "Role Updated", description: `You are now a ${data.role}` });
        }
      });

      newSocket.on("wifi_room_renamed", (data) => {
        setJoinedRooms(prev => prev.map(r => r.room_id === data.roomId ? { ...r, roomName: data.newName } : r));
        if (selectedRoom?.room_id === data.roomId) {
            setSelectedRoom((prev: any) => ({ ...prev, roomName: data.newName }));
            setSelectedFriend((prev: any) => prev ? { ...prev, username: data.newName } : null);
        }
      });

      newSocket.on("wifi_room_closed", (data) => {
        if (selectedRoom?.room_id === data.roomId) {
            setSelectedFriend(null);
            setSelectedRoom(null);
        }
        setJoinedRooms(prev => prev.filter(r => r.room_id !== data.roomId));
        toast({ title: "Room Closed", description: "The admin has closed the room" });
      });

      newSocket.on("wifi_room_deleted", (data) => {
        setWifiRooms(prev => prev.filter(r => r.room_id !== data.roomId));
      });

      newSocket.on("room_error", (data) => {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      });
      
      newSocket.on("receive_message", (data) => {
        console.log("Received a new message via socket:", data);
        // Correct logic for handling new messages (direct or room)
        const isCurrentChat = data.sender_id === selectedFriendRef.current?._id || data.recipient_id === selectedFriendRef.current?._id;
        
        if (isCurrentChat) {
          setMessages((prev) => [...prev, data]);
          
          // Play sound if enabled - using ref to get current setting
          if (settingsRef.current.sounds_enabled) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
          }

          // Immediately mark as read since the chat is open
          fetch(`${SOCKET_URL}/api/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parsedUser.id, friendId: data.sender_id })
          });
          newSocket.emit('mark_read', { readerId: parsedUser.id, senderId: data.sender_id });
        }

        // Update unread count and latest message for the sender
        updateFriendInState(data.sender_id, (f) => {
          const isCurrentChat = selectedFriendRef.current?._id === data.sender_id;
          
          // Show toast if not in current chat
          if (!isCurrentChat) {
            toast({
              title: `New message from ${f.username}`,
              description: data.content.substring(0, 50) + (data.content.length > 50 ? "..." : ""),
            });
          }

          return {
            ...f,
            unread_count: isCurrentChat ? 0 : (f.unread_count || 0) + 1,
            last_message: data.content,
            last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });

        // Update unread count and latest message for GROUPS
        if (data.recipient_id.startsWith('room_')) {
          setJoinedRooms(prev => prev.map(r => {
            if (r.room_id === data.recipient_id) {
              const isCurrentChat = selectedRoomRef.current?.room_id === data.recipient_id;
              
              if (!isCurrentChat && data.sender_id !== user.id) {
                toast({
                  title: `New in ${r.roomName}`,
                  description: `${data.sender_name || 'Someone'}: ${data.content.substring(0, 30)}...`,
                });
              }

              return {
                ...r,
                unread_count: isCurrentChat ? 0 : (r.unread_count || 0) + 1,
                last_message: data.content,
                last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return r;
          }));
        }
      });

      newSocket.on("new_friend_request", (data) => {
        console.log("Received a new friend request:", data);
        setPendingRequests((prev) => [...prev, data]);
        toast({
          title: "New Friend Request",
          description: `${data.sender.username} wants to be your friend!`,
        });
      });

      newSocket.on("friend_update", (data) => {
        console.log("Friend update received:", data);
        if (data.action === 'added') {
          setDbFriends(prev => {
            if (prev.some(f => f._id === data.friend._id)) return prev;
            return [...prev, data.friend];
          });
          toast({ title: "New Friend", description: `You are now friends with ${data.friend.username}` });
        } else if (data.action === 'removed') {
          setDbFriends(prev => prev.filter(f => f._id !== data.friendId));
          if (selectedFriendRef.current?._id === data.friendId) {
            setSelectedFriend(null);
          }
        }
      });

      newSocket.on("profile_updated", (data: { userId: string; username: string; avatar_url: string; bio: string }) => {
        console.log("Profile updated by friend:", data);
        updateFriendInState(data.userId, (f) => ({ ...f, username: data.username, avatar_url: data.avatar_url }));
        // Update selected friend if it's the one who changed
        if (selectedFriendRef.current?._id === data.userId) {
          setSelectedFriend(prev => prev ? { ...prev, username: data.username, avatar_url: data.avatar_url } : null);
        }
      });

      newSocket.on("group_invited", (roomData) => {
        console.log("Joined a new group:", roomData);
        setJoinedRooms(prev => {
          if (prev.find(r => r.room_id === roomData.room_id)) return prev;
          return [...prev, roomData];
        });
        
        // Auto-join the socket room for real-time messages
        newSocket.emit("join_wifi_room", {
          roomId: roomData.room_id,
          userId: parsedUser.id,
          username: parsedUser.username,
          avatar_url: parsedUser.avatar_url,
          networkId: roomData.networkId || "local"
        });

        toast({
          title: "Added to Group",
          description: `You have been added to ${roomData.roomName}`,
        });
      });

      newSocket.on("friend_status", (data: { userId: string; is_online: boolean }) => {
        console.log("Friend status changed:", data);
        setFriends(prev => prev.map(f =>
          f._id === data.userId ? { ...f, is_online: data.is_online } : f
        ));
        if (selectedFriendRef.current?._id === data.userId) {
          setSelectedFriend(prev => prev ? { ...prev, is_online: data.is_online } : null);
        }
      });

      newSocket.on("user_typing", (data: { userId: string; is_typing: boolean; username?: string; avatar_url?: string }) => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          if (data.is_typing) {
            // Try to look up the real avatar from populated roomMembers
            let resolvedAvatar = data.avatar_url;
            let resolvedUsername = data.username || 'Someone';
            const currentRoomId = selectedRoomRef.current?.room_id;
            if (currentRoomId) {
              const members = roomMembersRef.current.get(currentRoomId) || [];
              const found = members.find((m: any) => {
                const uid = m.userId?._id || m.userId;
                return uid?.toString() === data.userId;
              });
              if (found) {
                const mu = found.userId;
                resolvedAvatar = mu?.avatar_url || resolvedAvatar;
                resolvedUsername = mu?.username || resolvedUsername;
              }
            }
            next.set(data.userId, { username: resolvedUsername, avatar_url: resolvedAvatar });
          } else {
            next.delete(data.userId);
          }
          return next;
        });
      });

      newSocket.on("messages_read", (data: { readerId: string }) => {
        // The friend read our messages — update all sent messages to them to 'read'
        setMessages(prev => prev.map(m =>
          m.sender_id === parsedUser.id && m.status !== 'pending'
            ? { ...m, status: 'read' as const }
            : m
        ));
      });

      newSocket.on("message_deleted", (data: { messageId: string; sender_id: string; recipient_id: string }) => {
        // Completely remove the message from the UI
        setMessages(prev => prev.filter(m => m._id !== data.messageId));

        // Update the sidebar preview
        setFriends(prev => prev.map(f => {
          if (f._id === data.sender_id || f._id === data.recipient_id) {
            return {
              ...f,
              last_message: 'Message deleted'
            };
          }
          return f;
        }));

        // Play sound for deletion if enabled
        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/256/256-preview.mp3').play().catch(() => {});
        }
      });

      newSocket.on("message_edited", (data: { messageId: string; content: string }) => {
        setMessages(prev => prev.map(m => 
          m._id === data.messageId ? { ...m, content: data.content, is_edited: true } : m
        ));
      });

      newSocket.on("message_reaction_update", (data: { messageId: string; reactions: any[] }) => {
        setMessages(prev => prev.map(m => 
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m
        ));
      });

      newSocket.on("incoming-call", (data: { from: string; offer: any; callerName: string; callerAvatar: string; type: "audio" | "video" }) => {
        console.log("Incoming call from:", data.from);
        const friend = { _id: data.from, username: data.callerName, avatar_url: data.callerAvatar } as any;
        setActiveCallFriend(friend);
        setCallType(data.type || "audio");
        setCallStatus("incoming");
        isCallerRef.current = false;
        
        // Save the offer for later use
        (window as any).incomingCallOffer = data.offer;
      });

      newSocket.on("call-answered", async (data: { answer: any }) => {
        console.log("Call answered by remote peer");
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallStatus("connected");
            callStartTimeRef.current = Date.now();
          } catch (err) {
            console.error("Error setting remote description on answer", err);
          }
        }
      });

      newSocket.on("ice-candidate", async (data: { candidate: any }) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
      });

      newSocket.on("call-rejected", () => {
        toast({ title: "Call Rejected", description: "The user is busy" });
        resetCall();
      });

      newSocket.on("call-ended", () => {
        console.log("Call ended by remote peer");
        resetCall();
      });

      newSocket.on("call-negotiation", async (data: { offer: any, from: string }) => {
        console.log("Call negotiation offer received");
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            newSocket.emit("call-negotiation-answer", { to: data.from, answer });
          } catch (err) {
            console.error("Negotiation failed", err);
          }
        }
      });

      newSocket.on("call-negotiation-answer", async (data: { answer: any }) => {
        console.log("Call negotiation answer received");
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (err) {
            console.error("Negotiation answer failed", err);
          }
        }
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  // Fetch friends list (only added friends)
  useEffect(() => {
    if (user) {
      fetch(`${SOCKET_URL}/api/auth/friends/${user.id}`)
        .then(res => res.json())
        .then(data => {
          const seen = new Set();
          const unique = data.filter((f: Friend) => {
            if (seen.has(f._id)) return false;
            seen.add(f._id);
            return true;
          });
          
          // Merge with P2P friends to keep them in the list
          const merged = [...unique];
          p2pFriends.forEach(p2p => {
            if (!seen.has(p2p._id)) {
              merged.push(p2p);
              seen.add(p2p._id);
            }
          });
          setFriends(merged);
        })
        .catch(err => console.error("Error fetching friends", err));

      fetch(`${SOCKET_URL}/api/auth/requests/${user.id}`)
        .then(res => res.json())
        .then(data => setPendingRequests(data))
        .catch(err => console.error("Error fetching requests", err));
    }
  }, [user]);

  const refreshGroups = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`${SOCKET_URL}/api/groups/user/${user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setJoinedRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshFriends = () => {
    if (!user) return;
    fetch(`${SOCKET_URL}/api/auth/friends/${user.id}`)
      .then(res => res.json())
      .then(data => {
        const seen = new Set();
        const unique = data.filter((f: Friend) => {
          if (!f || !f._id || seen.has(f._id)) return false;
          seen.add(f._id);
          return true;
        });
        setDbFriends(unique);
      })
      .catch(err => console.error("Error refreshing friends", err));
  };

  useEffect(() => {
    const seen = new Set<string>();
    const merged: Friend[] = [];

    // Prioritize DB friends
    dbFriends.forEach(f => {
      if (f && f._id && !seen.has(f._id)) {
        merged.push(f);
        seen.add(f._id);
      }
    });

    // Add P2P friends not already in DB list
    p2pFriends.forEach(p2p => {
      if (p2p && p2p._id && !seen.has(p2p._id)) {
        merged.push(p2p);
        seen.add(p2p._id);
      }
    });

    setFriends(merged);
  }, [dbFriends, p2pFriends]);

  // Clean up P2P friends once they are in DB
  useEffect(() => {
    if (dbFriends.length > 0 && p2pFriends.length > 0) {
      const dbIds = new Set(dbFriends.map(f => f._id));
      const stillP2P = p2pFriends.filter(p => !dbIds.has(p._id));
      if (stillP2P.length !== p2pFriends.length) {
        setP2PFriends(stillP2P);
      }
    }
  }, [dbFriends]);

  useEffect(() => {
    if (user) {
      refreshFriends();
      refreshGroups();
      const interval = setInterval(() => {
        refreshFriends();
        refreshGroups();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch history when context changes (both for friends and rooms)
  useEffect(() => {
    if (user && (selectedFriend || selectedRoom)) {
      const targetId = selectedFriend?._id || selectedRoom?.room_id;
      const isRoom = !!selectedRoom;
      
      const endpoint = isRoom 
        ? `${SOCKET_URL}/api/groups/history/${targetId}`
        : `${SOCKET_URL}/api/messages/history/${user.id}/${targetId}`;

      fetch(endpoint)
        .then(res => res.json())
        .then(data => {
          setMessages(data);
          
          if (!isRoom && selectedFriend) {
            // Mark as read in DB and notify sender for normal chats
            fetch(`${SOCKET_URL}/api/messages/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, friendId: targetId })
            });
            
            if (socket) {
              socket.emit('mark_read', { readerId: user.id, senderId: targetId });
            }

            updateFriendInState(targetId, (f) => ({ ...f, unread_count: 0 }));
          }
        })
        .catch(err => console.error("Error fetching history", err));
    }
  }, [user, selectedFriend, selectedRoom]);

  const handleCreateRoom = async (roomData: { 
    roomName: string, 
    description: string, 
    selectedMemberIds: string[]
  }) => {
    if (!socket || !user) return;
    const room_id = `room_${Date.now()}`;
    
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                room_id,
                roomName: roomData.roomName,
                description: roomData.description,
                adminId: user.id,
                isPrivate: false,
                password: "",
                memberIds: roomData.selectedMemberIds
            })
        });

        if (response.ok) {
            const newRoomFromDB = await response.json();
            socket.emit("create_wifi_room", {
              ...roomData,
              room_id,
              creatorId: user.id,
              username: user.username,
              avatar_url: user.avatar_url,
              wifiName: wifiName || "local"
            });
            setShowCreateRoomModal(false);
            setShowWiFiPanel(false);
            refreshGroups();
            
            // Auto-open group chat
            setSelectedRoom(newRoomFromDB);
            setSelectedFriend(null);
            setChatMode("wifi");
            setMessages([]);

            toast({ title: "Success", description: "Group created and opened!" });
        } else {
            const err = await response.json();
            toast({ title: "Error", description: err.message || "Failed to create group", variant: "destructive" });
        }
    } catch (e) {
        console.error("Create group error:", e);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!socket || !user) return;
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId, userId: user.id })
        });
        if (response.ok) {
            socket.emit("leave_wifi_room", { roomId, userId: user.id });
            if (selectedRoom?.room_id === roomId) {
                setSelectedFriend(null);
                setSelectedRoom(null);
            }
            refreshGroups();
            toast({ title: "Left Group", description: "You have left the group." });
        }
    } catch (e) {
        console.error("Leave room error:", e);
    }
  };

  const handleJoinRoom = async (room: any) => {
    if (!socket || !user) return;
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: room.room_id, userId: user.id })
        });
        if (response.ok) {
            const joinedRoom = await response.json();
            socket.emit("join_wifi_room", {
              roomId: joinedRoom.room_id,
              userId: user.id,
              username: user.username,
              avatar_url: user.avatar_url
            });
            setJoinedRooms(prev => [...prev.filter(r => r.room_id !== joinedRoom.room_id), joinedRoom]);
            setSelectedRoom(joinedRoom);
            setSelectedFriend(null);
            setChatMode("wifi");
            toast({ title: "Joined Room", description: `You are now a member of ${joinedRoom.roomName}` });
        } else {
          const err = await response.json();
          toast({ title: "Error", description: err.message || "Failed to join room", variant: "destructive" });
        }
    } catch (e) {
        console.error("Join room error:", e);
    }
  };

  const handleRemoveUser = async (targetId: string) => {
    if (!socket || !user || !selectedRoom) return;
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: selectedRoom.room_id, userId: user.id, targetId })
        });
        if (response.ok) {
            // Socket event is now emitted from the server, UI updates automatically upon reception
            toast({ title: "User Removed", description: "The user was removed from the group." });
        } else {
            const err = await response.json();
            toast({ title: "Error", description: err.message || "Failed to remove user", variant: "destructive" });
        }
    } catch (e) {
        console.error("Remove user error:", e);
    }
  };

  const handlePromoteUser = async (targetId: string, role: string) => {
    if (!socket || !user || !selectedRoom) return;
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/promote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: selectedRoom.room_id, userId: user.id, targetId, role })
        });
        if (response.ok) {
            toast({ title: "Role Updated", description: `User role changed to ${role}.` });
        } else {
            const err = await response.json();
            toast({ title: "Error", description: err.message || "Failed to promote user", variant: "destructive" });
        }
    } catch (e) {
        console.error("Promote user error:", e);
    }
  };

  const handleRenameRoom = async (newName: string) => {
    if (newName && newName.trim() && socket && user && selectedRoom) {
        try {
            const response = await fetch(`${SOCKET_URL}/api/groups/rename`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_id: selectedRoom.room_id,
                    userId: user.id,
                    newName: newName.trim()
                })
            });
            if (response.ok) {
                const updatedGroup = await response.json();
                setSelectedRoom(updatedGroup);
                setSelectedFriend(prev => prev ? { ...prev, username: updatedGroup.roomName } : null);
                setJoinedRooms(prev => prev.map(r => r.room_id === updatedGroup.room_id ? updatedGroup : r));
                
                socket.emit("rename_wifi_room", { 
                    roomId: selectedRoom.room_id, 
                    userId: user.id, 
                    newName: newName.trim() 
                });
                refreshGroups();
                toast({ title: "Group Renamed", description: `Group is now "${newName.trim()}"` });
            } else {
                const err = await response.json();
                toast({ title: "Error", description: err.message || "Could not rename group", variant: "destructive" });
            }
        } catch (e) {
            console.error("Rename error:", e);
        }
    }
  };

  const handleDeleteRoom = async () => {
      if (confirm("Are you sure you want to close and delete this room permanently? All members will be removed.") && socket && user && selectedRoom) {
          try {
              const response = await fetch(`${SOCKET_URL}/api/groups/delete`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ room_id: selectedRoom.room_id, userId: user.id })
              });
              if (response.ok) {
                  setSelectedRoom(null);
                  setSelectedFriend(null);
                  refreshGroups();
                  toast({ title: "Group Deleted", description: "The group has been permanently closed." });
              } else {
                  const err = await response.json();
                  toast({ title: "Error", description: err.message || "Failed to delete group", variant: "destructive" });
              }
          } catch (e) {
              console.error("Delete room error:", e);
          }
      }
  };

  const handleInviteMembers = async (memberIds: string[]) => {
    if (!socket || !user || !selectedRoom) return;
    try {
        const response = await fetch(`${SOCKET_URL}/api/groups/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: selectedRoom.room_id, memberIds })
        });
        if (response.ok) {
            const updatedGroup = await response.json();
            // Immediately update the sidebar + members panel
            setSelectedRoom(updatedGroup);
            setJoinedRooms(prev => prev.map(r => r.room_id === updatedGroup.room_id ? updatedGroup : r));
            setRoomMembers(prev => new Map(prev).set(updatedGroup.room_id, updatedGroup.members));
            
            toast({ title: "Success", description: `Added ${memberIds.length} member${memberIds.length === 1 ? '' : 's'}` });
            refreshGroups(); // also sync from DB to catch any race conditions
        }
    } catch (e) {
        console.error("Invite error:", e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!newMessage.trim() || !target || !user || !socket) return;

    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: target._id,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    // Optimistically add to UI
    setMessages((prev) => [...prev, pendingMsg]);
    const sentText = newMessage;
    setNewMessage("");
    const parentId = replyTo?._id;
    setReplyTo(null);

    const messageData = {
      sender_id: user.id,
      recipient_id: target._id,
      sender_name: user.username,
      sender_avatar: user.avatar_url,
      content: sentText,
      reply_to: parentId
    };

    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      let p2pSent = false;

      if (isRoom) {
        const members = roomMembers.get(target._id) || [];
        let successCount = 0;
        members.forEach((m: any) => {
          if (m.userId !== user.id) {
            const ok = webrtcManagerRef.current?.sendMessage(m.userId, {
              type: "text",
              sender_id: user.id,
              recipient_id: target._id,
              content: sentText,
              message_id: tempId,
              timestamp: pendingMsg.createdAt
            });
            if (ok) successCount++;
          }
        });
        p2pSent = successCount > 0 || members.length <= 1;
      } else {
        p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
          type: "text",
          sender_id: user.id,
          recipient_id: target._id,
          content: sentText,
          message_id: tempId,
          timestamp: pendingMsg.createdAt
        }) || false;
      }
       
       if (p2pSent) {
          setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
          return;
       } else {
         toast({ title: "WiFi Connection Lost", description: "Falling back to Internet mode...", variant: "destructive" });
         setChatMode("internet");
       }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        // Replace pending with confirmed
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));

        updateFriendInState(target._id, (f) => ({
          ...f,
          last_message: sentText,
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        // Play sent sound if enabled
        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Message Failed",
          description: errorData.message || "Could not send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSendImage = async (mediaUrl: string, caption?: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!target || !user || !socket) return;

    const content = caption || "📷 Image";
    const messageData = {
      sender_id: user.id,
      recipient_id: target._id,
      sender_name: user.username,
      content,
      media_url: mediaUrl,
      media_type: "image",
    };

    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: target._id,
      content,
      media_url: mediaUrl,
      media_type: "image",
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => [...prev, pendingMsg]);

    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      let p2pSent = false;

      if (isRoom) {
        const members = roomMembers.get(target._id) || [];
        let successCount = 0;
        members.forEach((m: any) => {
            if (m.userId !== user.id) {
                const ok = webrtcManagerRef.current?.sendMessage(m.userId, {
                    type: "image",
                    ...messageData,
                    message_id: tempId,
                    timestamp: pendingMsg.createdAt
                });
                if (ok) successCount++;
            }
        });
        p2pSent = successCount > 0 || members.length <= 1;
      } else {
        p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
          type: "image",
          ...messageData,
          message_id: tempId,
          timestamp: pendingMsg.createdAt
        }) || false;
      }
      
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
        return;
      } else {
        toast({ title: "P2P Fail", description: "Falling back to Socket.io", variant: "destructive" });
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));

        setFriends(prev => prev.map(f =>
          f._id === target._id ? {
            ...f,
            last_message: caption ? `📷 ${caption}` : "📷 Image",
            last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } : f
        ));

        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
        }
      } else {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
    } catch (error) {
       console.error("Error sending image message", error);
       setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleSendVideo = async (mediaUrl: string, caption?: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!target || !user || !socket) return;

    const content = caption || "🎥 Video";
    const messageData = {
      sender_id: user.id,
      recipient_id: target._id,
      sender_name: user.username,
      sender_avatar: user.avatar_url,
      content,
      media_url: mediaUrl,
      media_type: "video",
    };

    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: target._id,
      content,
      media_url: mediaUrl,
      media_type: "video",
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => [...prev, pendingMsg]);

    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      let p2pSent = false;

      if (isRoom) {
        const members = roomMembers.get(target._id) || [];
        let successCount = 0;
        members.forEach((m: any) => {
            if (m.userId !== user.id) {
                const ok = webrtcManagerRef.current?.sendMessage(m.userId, {
                    type: "video",
                    ...messageData,
                    message_id: tempId,
                    timestamp: pendingMsg.createdAt
                });
                if (ok) successCount++;
            }
        });
        p2pSent = successCount > 0 || members.length <= 1;
      } else {
        p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
          type: "video",
          ...messageData,
          message_id: tempId,
          timestamp: pendingMsg.createdAt
        }) || false;
      }
      
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
        return;
      } else {
        toast({ title: "P2P Fail", description: "Falling back to Socket.io", variant: "destructive" });
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));

        updateFriendInState(target._id, (f) => ({
          ...f,
          last_message: "🎥 Video",
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
        }
      } else {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
    } catch (error) {
       console.error("Error sending video message", error);
       setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleSendAudio = async (mediaUrl: string, caption?: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!target || !user || !socket) return;

    const content = caption || "🎤 Voice Note";
    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: target._id,
      content,
      media_url: mediaUrl,
      media_type: "audio",
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => [...prev, pendingMsg]);

    const messageData = {
      sender_id: user.id,
      recipient_id: target._id,
      sender_name: user.username,
      sender_avatar: user.avatar_url,
      content,
      media_url: mediaUrl,
      media_type: "audio",
    };

    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      let p2pSent = false;

      if (isRoom) {
        const members = roomMembers.get(target._id) || [];
        let successCount = 0;
        members.forEach((m: any) => {
            if (m.userId !== user.id) {
                const ok = webrtcManagerRef.current?.sendMessage(m.userId, {
                    type: "audio",
                    ...messageData,
                    message_id: tempId,
                    timestamp: pendingMsg.createdAt
                });
                if (ok) successCount++;
            }
        });
        p2pSent = successCount > 0 || members.length <= 1;
      } else {
        p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
          type: "audio",
          ...messageData,
          message_id: tempId,
          timestamp: pendingMsg.createdAt
        }) || false;
      }
      
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
        return;
      } else {
        toast({ title: "P2P Fail", description: "Falling back to Socket.io", variant: "destructive" });
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));

        updateFriendInState(target._id, (f) => ({
          ...f,
          last_message: "🎤 Voice Note",
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        // Play sent sound if enabled
        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
        }
      } else {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
    } catch (error) {
      console.error("Error sending audio message", error);
      setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleSendDocument = async (mediaUrl: string, fileName: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!target || !user || !socket) return;

    const content = `📄 ${fileName}`;
    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: target._id,
      content,
      media_url: mediaUrl,
      media_type: "document",
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => [...prev, pendingMsg]);

    const messageData = {
      sender_id: user.id,
      recipient_id: target._id,
      sender_name: user.username,
      sender_avatar: user.avatar_url,
      content,
      media_url: mediaUrl,
      media_type: "document",
    };

    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      let p2pSent = false;

      if (isRoom) {
        const members = roomMembers.get(target._id) || [];
        let successCount = 0;
        members.forEach((m: any) => {
            if (m.userId !== user.id) {
                const ok = webrtcManagerRef.current?.sendMessage(m.userId, {
                    type: "document",
                    ...messageData,
                    message_id: tempId,
                    timestamp: pendingMsg.createdAt
                });
                if (ok) successCount++;
            }
        });
        p2pSent = successCount > 0 || members.length <= 1;
      } else {
        p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
          type: "document",
          ...messageData,
          message_id: tempId,
          timestamp: pendingMsg.createdAt
        }) || false;
      }
      
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
        return;
      } else {
        toast({ title: "P2P Fail", description: "Falling back to Socket.io", variant: "destructive" });
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));

        updateFriendInState(target._id, (f) => ({
          ...f,
          last_message: `📄 ${fileName}`,
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
      } else {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
    } catch (error) {
      console.error("Error sending document", error);
      setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleForwardMessage = async (recipientId: string) => {
    if (!forwardingMsg || !user || !socket) return;
    
    const tempId = `pending_${Date.now()}`;
    const pendingMsg: Message = {
      _id: tempId,
      sender_id: user.id,
      recipient_id: recipientId,
      content: forwardingMsg.content,
      media_url: forwardingMsg.media_url,
      media_type: forwardingMsg.media_type,
      is_forwarded: true,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    // Only optimistically add if forwarding to the currently selected chat
    if (target?._id === recipientId) {
      setMessages((prev) => [...prev, pendingMsg]);
    }

    const messageData = {
      sender_id: user.id,
      recipient_id: recipientId,
      content: forwardingMsg.content,
      media_url: forwardingMsg.media_url,
      media_type: forwardingMsg.media_type,
      is_forwarded: true
    };

    if (chatMode === "wifi" && selectedFriend?._id === recipientId) {
      const p2pSent = webrtcManagerRef.current?.sendMessage(selectedFriend._id, {
        type: "forward",
        ...messageData,
        message_id: tempId,
        timestamp: pendingMsg.createdAt
      });
      
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'sent' } : m));
        toast({ title: "Success", description: "Message forwarded via P2P" });
        setForwardingMsg(null);
        return;
      } else {
        toast({ title: "P2P Fail", description: "Falling back to Socket.io", variant: "destructive" });
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        socket.emit("send_message", savedMsg);
        
        const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
        // If we forwarded to the currently open chat, update the UI
        if (target?._id === recipientId) {
          setMessages(prev => prev.map(m => m._id === tempId ? { ...savedMsg, status: 'sent' } : m));
        }

        toast({ title: "Success", description: "Message forwarded" });
        setForwardingMsg(null);
      } else {
        const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
        if (target?._id === recipientId) {
          setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
        }
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Failed to forward message", variant: "destructive" });
      }
    } catch (error) {
      console.error("Forward error:", error);
      const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
      if (target?._id === recipientId) {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
      toast({ title: "Error", description: "Failed to forward message", variant: "destructive" });
    }
  };

  const handleAddFriend = async (identifier: string) => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/send-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, friendIdentifier: identifier }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Request Sent", description: data.message });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Add friend network error:", error);
      toast({ 
        title: "Connection Error", 
        description: "Could not reach the server.", 
        variant: "destructive" 
      });
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/respond-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      const data = await response.json();
      if (response.ok) {
        if (status === 'accepted') {
          // Add to friends list (check for duplicates since socket event may also add)
          setDbFriends(prev => {
            if (prev.some(f => f._id === data.friend._id)) return prev;
            return [...prev, data.friend];
          });
          toast({ title: "Friend Added", description: `You are now friends with ${data.friend.username}` });
        } else {
          toast({ title: "Request Rejected", description: "Friend request has been removed." });
        }
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      }
    } catch (error) {
      console.error("Respond request error:", error);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/unfriend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, friendId }),
      });
      if (response.ok) {
        removeFriendFromState(friendId);
        if (selectedFriend?._id === friendId) {
          setSelectedFriend(null);
        }
        toast({ title: "Success", description: "Friend removed" });
      }
    } catch (error) {
      console.error("Unfriend error:", error);
    }
  };

  const handleBlock = async (targetId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, targetId }),
      });
      if (response.ok) {
        removeFriendFromState(targetId);
        if (selectedFriend?._id === targetId) {
          setSelectedFriend(null);
        }
        toast({ title: "Success", description: "User blocked" });
      }
    } catch (error) {
      console.error("Block error:", error);
    }
  };

  const handleClearChat = async (friendId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/clear-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, friendId }),
      });
      if (response.ok) {
        setMessages([]);
        toast({ title: "Chat Cleared", description: "Message history deleted successfully" });
      }
    } catch (error) {
      console.error("Clear chat error:", error);
    }
  };

  // --- Calling Helper Methods ---
  const resetCall = async () => {
    // Capture current state before resetting
    const wasConnected = callStatus === "connected";
    const wasIncoming = callStatus === "incoming";
    const wasCalling = callStatus === "calling";
    const durationSeconds = wasConnected && callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
    const currentActiveFriend = activeCallFriend;
    const currentCallType = callType;
    const currentIsCaller = isCallerRef.current;

    // Reset UI state immediately
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("none");
    setActiveCallFriend(null);
    callRecipientIdRef.current = null;
    (window as any).incomingCallOffer = null;

    // Background: Save call log 
    if (currentActiveFriend && user) {
      let logType: 'call' | 'call_video' | null = null;
      let logContent = "";
      
      if (wasConnected && currentIsCaller) {
        logType = currentCallType === "video" ? "call_video" : "call";
        logContent = currentCallType === "video" ? "Video call" : "Voice call";
      } else if (wasCalling && currentIsCaller) {
        logType = currentCallType === "video" ? "call_video" : "call";
        logContent = "Cancelled call";
      } else if (wasIncoming && !currentIsCaller) {
        logType = currentCallType === "video" ? "call_video" : "call";
        logContent = "Missed call";
      }

      if (logType) {
        const callMsgData = {
          sender_id: currentIsCaller ? user.id : currentActiveFriend._id,
          recipient_id: currentIsCaller ? currentActiveFriend._id : user.id,
          content: logContent,
          media_type: logType,
          call_duration: durationSeconds
        };

        try {
          const response = await fetch(`${SOCKET_URL}/api/messages/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(callMsgData),
          });

          if (response.ok) {
            const savedMsg = await response.json();
            socket?.emit("send_message", savedMsg);
            if (selectedFriendRef.current?._id === currentActiveFriend._id) {
              setMessages(prev => [...prev, savedMsg]);
            }
          }
        } catch (err) {
          console.error("Failed to save call log", err);
        }
      }
    }
  };

  const handleToggleVideo = async (enabled: boolean) => {
    if (!localStream || !socket || !activeCallFriend || !user) return;

    let videoTrack = localStream.getVideoTracks()[0];

    if (enabled && !videoTrack) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoTrack = stream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(videoTrack, localStream);
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit("call-negotiation", {
            to: activeCallFriend._id,
            from: user.id,
            offer
          });
        }
        // Force refresh localStream state to trigger re-render in CallOverlay
        setLocalStream(new MediaStream(localStream.getTracks()));
      } catch (err) {
        console.error("Failed to enable video track", err);
        toast({ title: "Camera Access Denied", variant: "destructive" });
      }
    } else if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  };

  const createPeerConnection = (recipientId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: recipientId });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind, event.streams[0]?.id);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleStartCall = async (type: "audio" | "video" = "audio") => {
    if (!selectedFriend || !user || !socket) return;
    
    console.log(`Starting ${type} call to:`, selectedFriend.username);
    setCallType(type);
    setActiveCallFriend(selectedFriend);
    setCallStatus("calling");
    callRecipientIdRef.current = selectedFriend._id;
    isCallerRef.current = true;

    try {
      const constraints = { audio: true, video: type === "video" };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      const pc = createPeerConnection(selectedFriend._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        to: selectedFriend._id,
        from: user.id,
        offer,
        type,
        callerName: user.username,
        callerAvatar: user.avatar_url ? (user.avatar_url.startsWith("http") ? user.avatar_url : `${SOCKET_URL}${user.avatar_url}`) : ""
      });
    } catch (err) {
      console.error("Call start failed", err);
      toast({ title: `${type === 'video' ? 'Camera/Mic' : 'Microphone'} Access Denied`, variant: "destructive" });
      resetCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCallFriend || !user || !socket || !(window as any).incomingCallOffer) return;

    try {
      const constraints = { audio: true, video: callType === "video" };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      const pc = createPeerConnection(activeCallFriend._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription((window as any).incomingCallOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("make-answer", {
        to: activeCallFriend._id,
        answer
      });

      setCallStatus("connected");
      callStartTimeRef.current = Date.now();
    } catch (err) {
      console.error("Accept call failed", err);
      resetCall();
    }
  };

  const handleRejectCall = () => {
    if (activeCallFriend && socket) {
      socket.emit("reject-call", { to: activeCallFriend._id });
    }
    resetCall();
  };

  const handleEndCall = () => {
    if (activeCallFriend && socket) {
      socket.emit("end-call", { to: activeCallFriend._id });
    }
    resetCall();
  };

  const handleUpdateProfile = async (data: { username: string; bio: string; avatar_url: string }) => {
    if (!user) return;
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...data }),
      });
      const result = await response.json();
      if (response.ok) {
        const updatedUser = result.user;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        toast({ title: "Success", description: "Profile updated!" });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Update profile error:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!user || !target) return;

    if (chatMode === "wifi") {
      const p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
        type: "delete",
        sender_id: user.id,
        recipient_id: target._id,
        message_id: messageId
      });
      if (p2pSent) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/256/256-preview.mp3').play().catch(() => {});
        }
        return;
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/${messageId}?sender_id=${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        // No need to setMessages here as the socket 'message_deleted' will handle it for consistency
        // But we can play a local sound for immediate feedback
        if (settingsRef.current.sounds_enabled) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/256/256-preview.mp3').play().catch(() => {});
        }
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Could not delete message", variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete message error:", error);
      toast({ title: "Error", description: "Could not delete message", variant: "destructive" });
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!user) return;
    setMessages(prev => prev.filter(m => m._id !== messageId));
    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/delete-for-me/${messageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });
      if (!response.ok) {
        console.error("Failed to delete for me on server");
      }
    } catch (err) {
      console.error("Delete for me error:", err);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user || !selectedFriend || !socket) return;
    
    if (chatMode === "wifi") {
      const p2pSent = webrtcManagerRef.current?.sendMessage(selectedFriend._id, {
        type: "edit",
        sender_id: user.id,
        recipient_id: selectedFriend._id,
        message_id: messageId,
        content: newContent
      });
      if (p2pSent) {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: newContent, is_edited: true } : m));
        setEditingMsg(null);
        return;
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, sender_id: user.id }),
      });
      const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
      if (response.ok) {
        socket.emit("edit_message", { messageId, content: newContent, sender_id: user.id, recipient_id: target?._id });
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: newContent, is_edited: true } : m));
        setEditingMsg(null);
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Could not edit message", variant: "destructive" });
      }
    } catch (err) { 
      console.error("Edit error:", err); 
      toast({ title: "Error", description: "Could not edit message", variant: "destructive" });
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!user || !target || !socket) return;

    if (chatMode === "wifi") {
      const p2pSent = webrtcManagerRef.current?.sendMessage(target._id, {
        type: "reaction",
        sender_id: user.id,
        recipient_id: target._id,
        message_id: messageId,
        emoji
      });
      if (p2pSent) {
        setMessages(prev => prev.map(m => {
          if (m._id === messageId) {
            const reactions = m.reactions || [];
            const existingReactionIndex = reactions.findIndex(r => r.user_id === user.id);
            let updatedReactions;
            if (existingReactionIndex !== -1) {
              // Update existing reaction
              updatedReactions = reactions.map((r, index) => 
                index === existingReactionIndex ? { ...r, emoji } : r
              );
            } else {
              // Add new reaction
              updatedReactions = [...reactions, { user_id: user.id, emoji }];
            }
            return { ...m, reactions: updatedReactions };
          }
          return m;
        }));
        return;
      }
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/messages/react/${messageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, emoji }),
      });
      if (response.ok) {
        const reactionsData = await response.json();
        const reactions = reactionsData.reactions || reactionsData;
        socket.emit("react_message", { messageId, sender_id: user.id, recipient_id: target._id, reactions });
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.message || "Could not react to message", variant: "destructive" });
      }
    } catch (e) {
      console.error("Reaction error:", e);
      toast({ title: "Error", description: "Could not react to message", variant: "destructive" });
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    if (!user) return;
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, settings: newSettings }),
      });
      if (resp.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
        const updatedUser = { ...user, settings: { ...user.settings, ...newSettings } };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (e) { console.error(e); }
  };

  const handleTyping = (isTyping: boolean) => {
    const target = selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName } : null);
    if (!socket || !user || !target) return;
    
    if (chatMode === "wifi") {
      const isRoom = target._id.startsWith('room_');
      if (isRoom) {
         // Broadcast to socket for rooms, simpler than P2P for every member
         socket.emit('typing', { sender_id: user.id, recipient_id: target._id, is_typing: isTyping });
      } else {
        webrtcManagerRef.current?.sendMessage(target._id, {
          type: "typing",
          sender_id: user.id,
          recipient_id: target._id,
          is_typing: isTyping
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            webrtcManagerRef.current?.sendMessage(target._id, {
              type: "typing",
              sender_id: user.id,
              recipient_id: target._id,
              is_typing: false
            });
          }, 2000);
        }
      }
    } else {
      socket.emit('typing', { sender_id: user.id, recipient_id: target._id, is_typing: isTyping, username: user.username, avatar_url: user.avatar_url });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', { sender_id: user.id, recipient_id: target._id, is_typing: false, username: user.username, avatar_url: user.avatar_url });
        }, 1500);
      }
    }
  };



  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  const handleScan = () => {
    setIsRefreshing(true);
    socket?.emit("scan_wifi_network", { wifiName });
    
    setTimeout(() => {
      const latest = nearbyUsersRef.current;
      setDiscoveredUsers([...latest]);
      setHasScanned(true);
      setIsRefreshing(false);
      toast({ 
        title: "Scan Complete", 
        description: `Found ${latest.length} users nearby` 
      });
    }, 2000);
  };

  const handleP2PRequest = (targetId: string) => {
    if (!socket || !user) return;
    if (outgoingP2PRequests.has(targetId)) {
        toast({ title: "Request Pending", description: "You have already sent a request to this user." });
        return;
    }

    const target = nearbyUsers.find(u => u.userId === targetId);
    if (!target) return;

    setOutgoingP2PRequests(prev => new Set(prev).add(targetId));

    socket.emit("p2p_connect_request", {
      to: targetId,
      from: user.id,
      fromUsername: user.username,
      fromAvatar: user.avatar_url,
      from_cv_id: user.cv_id
    });
    toast({ title: "Request Sent", description: `Waiting for ${target.username} to accept...` });
  };

  const handleP2PAccept = () => {
    if (!socket || !user || !incomingP2PRequest) return;
    
    socket.emit("p2p_connect_accepted", {
      to: incomingP2PRequest.from,
      from: user.id,
      fromUsername: user.username,
      fromAvatar: user.avatar_url,
      networkId: user.cv_id
    });
    
    webrtcManagerRef.current?.connectToPeer(incomingP2PRequest.from);
    
    const newFriend = {
        _id: incomingP2PRequest.from,
        username: incomingP2PRequest.fromUsername,
        avatar_url: incomingP2PRequest.fromAvatar,
        is_online: true,
        cv_id: incomingP2PRequest.from_cv_id || "P2P"
    } as any;

    setP2PFriends(prev => {
      if (prev.find(f => f._id === newFriend._id)) return prev;
      return [newFriend, ...prev];
    });

    // Persist to database
    fetch(`${SOCKET_URL}/api/auth/add-friend-p2p`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, targetId: incomingP2PRequest.from })
    }).then(() => refreshFriends());

    setSelectedFriend(newFriend);
    setChatMode("wifi");
    setShowWiFiPanel(false);
    
    setIncomingP2PRequest(null);
  };

  const handleP2PReject = () => {
     if (!socket || !user || !incomingP2PRequest) return;
     socket.emit("p2p_connect_rejected", {
       to: incomingP2PRequest.from,
       from: user.id,
       fromUsername: user.username
     });
     setIncomingP2PRequest(null);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden relative font-sans">
      <AnimatePresence mode="wait">
        {!showWiFiPanel && (
          <motion.div 
            key="chat-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 overflow-hidden transition-all duration-500"
          >
            <ChatSidebar
              friends={friends}
              pendingRequests={pendingRequests}
              onRespondRequest={handleRespondRequest}
              onUnfriend={handleUnfriend}
              onBlock={handleBlock}
              selectedFriend={selectedFriend}
              onSelectFriend={(f) => { setSelectedFriend(f); setSelectedRoom(null); setShowMembersPanel(false); }}
              onLogout={handleLogout}
              onAddFriend={handleAddFriend}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSettings={handleUpdateSettings}
              onFriendAdded={refreshFriends}
              settings={settings}
              username={user.username}
              userId={user.id}
              cvId={user.cv_id || ""}
              email={user.email}
              bio={user.bio || ""}
              avatarUrl={user.avatar_url || ""}
              onOpenWiFiPanel={() => setShowWiFiPanel(true)}
              onToggleChatMode={(val) => setChatMode(val ? "wifi" : "internet")}
              chatMode={chatMode}
              nearbyUsersCount={hasScanned ? discoveredUsers.length : 0}
              joinedRooms={joinedRooms}
              onSelectRoom={(room) => {
                  // If already joined, just switch to it
                  const alreadyJoined = joinedRooms.some(jr => jr.room_id === room.room_id);
                  if (alreadyJoined) {
                    const fullRoom = joinedRooms.find(jr => jr.room_id === room.room_id) || room;
                    setSelectedRoom(fullRoom);
                    setSelectedFriend(null);
                    setShowMembersPanel(true);
                    setChatMode("wifi");
                    // Seed roomMembers from populated joinedRooms data
                    if (fullRoom.members) {
                      setRoomMembers(prev => new Map(prev).set(fullRoom.room_id, fullRoom.members));
                    }
                  } else {
                    handleJoinRoom(room);
                  }
              }}
              selectedRoom={selectedRoom}
            />
            
            <main className="flex-1 flex min-w-0 relative">
              <ChatArea
                selectedFriend={selectedFriend || (selectedRoom ? { _id: selectedRoom.room_id, username: selectedRoom.roomName, is_online: true, avatar_url: '', cv_id: 'Group' } as any : null)}
                messages={messages}
                currentUserRole={selectedRoom ? (selectedRoom.members?.find((m: any) => (m.userId?._id || m.userId) === user.id)?.role || 'member') : undefined}
                newMessage={newMessage}
                onNewMessageChange={(msg) => {
                  setNewMessage(msg);
                  handleTyping(!!msg.trim());
                }}
                onSendMessage={() => {
                  handleSendMessage();
                  handleTyping(false);
                }}
                onSendImage={handleSendImage}
                onSendVideo={handleSendVideo}
                onSendAudio={handleSendAudio}
                onSendDocument={handleSendDocument}
                onDeleteMessage={handleDeleteMessage}
                onDeleteForMe={handleDeleteForMe}
                onEditMessage={handleEditMessage}
                onReactToMessage={handleReactToMessage}
                onForwardMessage={(msg) => setForwardingMsg(msg)}
                onStartCall={handleStartCall}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                editingMsg={editingMsg}
                setEditingMsg={setEditingMsg}
                onToggleProfile={() => selectedRoom ? setShowMembersPanel(p => !p) : setShowProfile(!showProfile)}
                onBlock={handleBlock}
                onUnfriend={handleUnfriend}
                onClearChat={handleClearChat}
                messagesEndRef={messagesEndRef}
                isTyping={selectedFriend && selectedFriend.cv_id !== 'Group' ? typingUsers.has(selectedFriend._id) : false}
                groupTypingUsers={selectedRoom ? Array.from(typingUsers.values()) : []}
                isSelfTyping={newMessage.length > 0}
                currentUserId={user.id}
                chatMode={chatMode}
                onSetChatMode={setChatMode}
                wifiStatus={selectedFriend?._id ? (wifiConnectionStatus.get(selectedFriend._id) || 'offline') : 'offline'}
                wifiTransferProgress={wifiTransferProgress}
                onSendP2PFile={async (file) => {
                    if (selectedFriend && webrtcManagerRef.current) {
                        await webrtcManagerRef.current.sendFile(selectedFriend._id, file);
                    }
                }}
              />

              <AnimatePresence>
                {selectedRoom && showMembersPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="shrink-0 flex flex-col h-full"
                  >
                    <RoomMembersPanel
                      room={selectedRoom}
                      members={roomMembers.get(selectedRoom.room_id) || []}
                      currentUserId={user.id}
                      onRemoveMember={handleRemoveUser}
                      onPromoteMember={handlePromoteUser}
                      onRenameRoom={() => setShowRenameRoomModal(true)}
                      onDeleteRoom={handleDeleteRoom}
                      onLeaveRoom={() => handleLeaveRoom(selectedRoom.room_id)}
                      onClose={() => setShowMembersPanel(false)}
                      onInviteClick={() => setShowAddMembersModal(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showRenameRoomModal && selectedRoom && (
                  <RenameRoomModal 
                    currentName={selectedRoom.roomName}
                    onClose={() => setShowRenameRoomModal(false)}
                    onRename={handleRenameRoom}
                  />
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWiFiPanel && (
          <WiFiDiscoveryPanel
            onClose={() => setShowWiFiPanel(false)}
            wifiName={wifiName}
            onSetWifiName={setWifiName}
            nearbyUsers={discoveredUsers}
            isScanning={isRefreshing}
            onScan={handleScan}
            userId={user.id}
            username={user.username}
            avatarUrl={user.avatar_url}
            onConnectToUser={handleP2PRequest}
            outgoingP2PRequests={outgoingP2PRequests}
            friends={friends}
            onAddFriend={handleAddFriend}
            onAddFriend={handleAddFriend}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingP2PRequest && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-card border border-white/10 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-primary/20 mx-auto mb-6 flex items-center justify-center overflow-hidden border-2 border-primary/30">
                 {incomingP2PRequest.fromAvatar ? (
                   <img src={incomingP2PRequest.fromAvatar.startsWith('http') ? incomingP2PRequest.fromAvatar : `${SOCKET_URL}${incomingP2PRequest.fromAvatar}`} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-2xl font-black text-primary">{incomingP2PRequest.fromUsername?.charAt(0)}</span>
                 )}
              </div>
              <h3 className="text-xl font-black mb-2">Connection Request</h3>
              <p className="text-muted-foreground text-sm mb-8">
                <span className="text-primary font-bold">{incomingP2PRequest.fromUsername}</span> wants to connect with you via P2P.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleP2PReject} className="py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest text-foreground">Decline</button>
                <button onClick={handleP2PAccept} className="py-4 rounded-2xl gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all uppercase text-[10px] tracking-widest">Accept</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateRoomModal && (
          <CreateRoomModal
            onClose={() => setShowCreateRoomModal(false)}
            onCreateRoom={handleCreateRoom}
            friends={friends}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMembersModal && selectedRoom && (
          <AddMembersModal
            onClose={() => setShowAddMembersModal(false)}
            onInvite={handleInviteMembers}
            friends={friends}
            existingMemberIds={roomMembers.get(selectedRoom.room_id)?.map((m: any) => (m.userId?._id || m.userId)) || []}
            roomName={selectedRoom.roomName}
            currentUserId={user.id}
          />
        )}
      </AnimatePresence>

      {/* Shared Media / Profile logic */}
      <AnimatePresence>
        {showProfile && selectedFriend && !showSharedMedia && (
          <ProfilePanel
            friend={selectedFriend as any}
            messages={messages}
            onClose={() => setShowProfile(false)}
            onUnfriend={handleUnfriend}
            onBlock={handleBlock}
            onViewAllMedia={() => setShowSharedMedia(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSharedMedia && selectedFriend && (
          <SharedMediaView
            messages={messages}
            onBack={() => setShowSharedMedia(false)}
          />
        )}
      </AnimatePresence>

      {/* Call UI */}
      <AnimatePresence>
        {callStatus !== "none" && (
          <CallOverlay
            status={callStatus as any}
            callType={callType as any}
            callerName={activeCallFriend?.username || "Unknown"}
            callerAvatar={activeCallFriend?.avatar_url}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onEnd={handleEndCall}
            localStream={localStream}
            remoteStream={remoteStream}
            onToggleVideo={() => {}}
          />
        )}
      </AnimatePresence>

      <ForwardModal
        message={forwardingMsg}
        friends={friends}
        onForward={handleForwardMessage}
        onClose={() => setForwardingMsg(null)}
      />
    </div>
  );
};

export default Dashboard;
