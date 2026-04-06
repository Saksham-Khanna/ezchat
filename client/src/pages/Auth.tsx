import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Eye, EyeOff, User, Mail, Lock, ArrowLeft, Loader2, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SOCKET_URL } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{similar: string | null, random: string} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { username, email, password };

      const response = await fetch(`${SOCKET_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("session", "true");

      if (!isLogin) {
        toast({
          title: "Account Created",
          description: "Your account has been created successfully!",
        });
      }

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestUsername = async () => {
    setSuggesting(true);
    try {
      const response = await fetch(`${SOCKET_URL}/api/auth/suggest-username?current=${encodeURIComponent(username)}`);
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/[0.08] blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/[0.06] blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px]" />

      <div className="w-full max-w-md z-10 mt-[-8vh]">
        {/* Logo Section */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="relative inline-block mb-4">
            <div className="relative flex items-center justify-center overflow-hidden h-52">
              <img 
                src="/full-logo.png" 
                alt="ezchat Logo" 
                className="h-full object-contain drop-shadow-2xl" 
                style={{ mixBlendMode: 'screen' }} 
              />
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="glass-card border-beam rounded-3xl p-8 shadow-2xl animate-scale-in" style={{ animationDelay: '0.15s' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-3 animate-fade-in">
                <label className="text-sm font-medium text-muted-foreground ml-1">
                  Username
                </label>
                <div className="relative group flex items-center gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="QuickUser"
                      required={!isLogin}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.05] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:bg-white/[0.07] focus:border-primary/40 focus:shadow-[0_0_0_3px_hsla(200,80%,45%,0.08)] transition-all duration-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSuggestUsername}
                    disabled={suggesting}
                    className="shrink-0 p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all active:scale-90"
                    title="Suggest available username"
                  >
                    {suggesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Suggestions Popover */}
                <AnimatePresence>
                  {suggestions && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 mt-2 rounded-2xl bg-secondary/50 border border-white/10 backdrop-blur-xl shadow-xl space-y-2"
                    >
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pick a username</span>
                        <button type="button" onClick={() => setSuggestions(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestions.similar && (
                          <button
                            type="button"
                            onClick={() => { setUsername(suggestions.similar!); setSuggestions(null); }}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                          >
                            <div className="flex flex-col">
                              <span className="text-[10px] text-primary font-black uppercase tracking-tighter mb-0.5">Similar to yours</span>
                              <span className="text-sm font-bold text-foreground">{suggestions.similar}</span>
                            </div>
                            <Sparkles className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setUsername(suggestions.random); setSuggestions(null); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] text-accent font-black uppercase tracking-tighter mb-0.5">Random Cosmic</span>
                            <span className="text-sm font-bold text-foreground">{suggestions.random}</span>
                          </div>
                          <Sparkles className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.05] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:bg-white/[0.07] focus:border-primary/40 focus:shadow-[0_0_0_3px_hsla(200,80%,45%,0.08)] transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.05] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:bg-white/[0.07] focus:border-primary/40 focus:shadow-[0_0_0_3px_hsla(200,80%,45%,0.08)] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold hover:opacity-90 transition-all disabled:opacity-50 relative overflow-hidden group shadow-xl shadow-primary/20"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span 
                    key="authenticating"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isLogin ? "Authenticating..." : "Creating Profile..."}
                  </motion.span>
                ) : (
                  <motion.span 
                    key="secure-login"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="inline-flex items-center gap-2"
                  >
                    {isLogin ? "Login" : "Complete Registration"}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Progress Bar Animation */}
              {loading && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="absolute bottom-0 left-0 h-[3px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)]"
                  transition={{ duration: 4, ease: "linear" }}
                />
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="group text-sm text-muted-foreground/60 hover:text-foreground transition-all duration-300"
            >
              {isLogin ? (
                <span className="flex items-center gap-1.5 justify-center">
                  New to ezchat? <span className="text-primary font-bold group-hover:underline underline-offset-4 decoration-2">Create an account</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5 justify-center">
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  Already have an account? <span className="text-primary font-bold group-hover:underline underline-offset-4 decoration-2">Sign in here</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
