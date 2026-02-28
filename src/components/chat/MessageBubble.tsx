import type { Message } from "@/pages/Dashboard";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-slide-up`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "gradient-primary text-primary-foreground rounded-br-md"
            : "glass text-foreground rounded-bl-md"
        }`}
      >
        <p>{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {message.created_at}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
