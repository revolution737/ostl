import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function DeveloperAuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : { name, email, password };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Store developer securely
      localStorage.setItem('developerId', data.developer.id.toString());
      localStorage.setItem('developerContext', JSON.stringify(data.developer));
      
      navigate("/developers/dashboard");
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-6 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block p-4 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl mb-6 shadow-blue-500/30 shadow-lg"
          >
            <Code2 className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent font-bold">
            OSTL Developers
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isLogin ? "Sign in to manage your games" : "Create an account to publish your WebRTC engines"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Developer Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Studio OSTL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800"
                  required={!isLogin}
                />
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/30 font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-70"
            >
              {loading ? "Authenticating..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center flex flex-col space-y-3">
            <button
              onClick={() => {
                 setIsLogin(!isLogin);
                 setEmail(""); setPassword(""); setName("");
              }}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-gray-500 text-sm transition-colors"
            >
              Return to Catalog
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
