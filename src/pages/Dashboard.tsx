import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatArea from "@/components/chat/ChatArea";
import ProfilePanel from "@/components/chat/ProfilePanel";
import { MessageCircle, LogOut } from "lucide-react";

export interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_message?: string;
  last_message_time?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_url?: string;
}

const MOCK_FRIENDS: Friend[] = [
  { id: "1", username: "Alex Rivera", is_online: true, last_message: "Hey, how's it going?", last_message_time: "2m ago" },
  { id: "2", username: "Sam Chen", is_online: true, last_message: "Check out this design!", last_message_time: "15m ago" },
  { id: "3", username: "Jordan Lee", is_online: false, last_message: "See you tomorrow 👋", last_message_time: "1h ago" },
  { id: "4", username: "Taylor Kim", is_online: false, last_message: "That sounds great!", last_message_time: "3h ago" },
  { id: "5", username: "Morgan Blake", is_online: true, last_message: "Let's collaborate on this", last_message_time: "5h ago" },
];

const MOCK_MESSAGES: Message[] = [
  { id: "1", sender_id: "1", content: "Hey! How's the project coming along?", created_at: "10:30 AM" },
  { id: "2", sender_id: "me", content: "Going great! Just finished the glassmorphism UI. Looks stunning 🔥", created_at: "10:32 AM" },
  { id: "3", sender_id: "1", content: "That sounds amazing! Can't wait to see it.", created_at: "10:33 AM" },
  { id: "4", sender_id: "me", content: "I'll send you a preview in a bit", created_at: "10:35 AM" },
  { id: "5", sender_id: "1", content: "Perfect! Also, did you see the new animation library?", created_at: "10:36 AM" },
  { id: "6", sender_id: "me", content: "Not yet! Send me the link?", created_at: "10:38 AM" },
  { id: "7", sender_id: "1", content: "Here you go! It's perfect for what we're building 🚀", created_at: "10:39 AM" },
];

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(MOCK_FRIENDS[0]);
  const [showProfile, setShowProfile] = useState(false);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender_id: "me",
      content: newMessage,
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        friends={MOCK_FRIENDS}
        selectedFriend={selectedFriend}
        onSelectFriend={(f) => { setSelectedFriend(f); setShowProfile(false); }}
        onLogout={handleLogout}
        username={user.user_metadata?.username || user.email?.split("@")[0] || "User"}
      />

      {/* Chat Area */}
      <ChatArea
        selectedFriend={selectedFriend}
        messages={messages}
        newMessage={newMessage}
        onNewMessageChange={setNewMessage}
        onSendMessage={handleSendMessage}
        onToggleProfile={() => setShowProfile(!showProfile)}
        messagesEndRef={messagesEndRef}
      />

      {/* Profile Panel */}
      {showProfile && selectedFriend && (
        <ProfilePanel friend={selectedFriend} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default Dashboard;
