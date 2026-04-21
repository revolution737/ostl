import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileArchive, CheckCircle, ArrowLeft, Loader2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function DeveloperUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [showDocs, setShowDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile);
    } else {
      setError("Please drop a valid .zip file containing your game assets.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    setError(null);

    const devId = localStorage.getItem('developerId');
    if (!devId) {
      setError("Active developer session not found. Please log back in.");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("gameZip", file);
    formData.append("title", title);
    formData.append("developer_id", devId);
    if (description) formData.append("description", description);
    if (thumbnailUrl) formData.append("thumbnail_url", thumbnailUrl);

    try {
      const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
      const response = await fetch(`${baseUrl}/api/games`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload game");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/developers/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center">
          <button
            onClick={() => navigate("/developers/dashboard")}
            className="mr-6 p-2 rounded-full hover:bg-gray-100 flex items-center text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-2xl flex-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent font-bold">
            OSTL Publish
          </h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 flex-1 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-100 p-8"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload New Game</h2>
            <p className="text-gray-500">Package your WebRTC game as a .zip file and instantly publish it to the global catalog.</p>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-700">Game Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Galactic Pong Arena"
                required
                className="bg-gray-50 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700">Description (Optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the gameplay and controls..."
                className="flex w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail" className="text-gray-700">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnail"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="bg-gray-50 border-gray-200"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-gray-700">Game Assets (.zip)</Label>
              
              <div
                className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
                  ${file ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                  ${error && !file ? 'border-red-500' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setError(null);
                    }
                  }}
                />
                
                {file ? (
                  <div className="flex flex-col items-center text-blue-600">
                    <FileArchive className="w-12 h-12 mb-3" />
                    <span className="font-semibold text-lg">{file.name}</span>
                    <span className="text-sm opacity-70 text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    <Upload className="w-12 h-12 mb-3 text-gray-400" />
                    <span className="font-medium text-gray-700 mb-1">Click to browse or drag & drop</span>
                    <span className="text-sm">Must be a .zip file (containing index.html)</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200/50 rounded-lg text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!file || !title || isUploading || success}
              className={`w-full py-6 text-lg rounded-xl shadow-lg transition-all ${
                success 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/20'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading to Supabase...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Published Successfully!
                </>
              ) : (
                "Publish Game"
              )}
            </Button>
          </form>
        </motion.div>

        {/* Developer Documentation Toggle */}
        <div className="mt-8 max-w-4xl mx-auto flex justify-center">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-full text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all hover:border-blue-500/50"
          >
            <BookOpen size={18} className="text-blue-500" />
            {showDocs ? "Hide WebRTC Guidelines" : "Show WebRTC Guidelines"}
            {showDocs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Developer Documentation Content */}
        {showDocs && (
          <motion.div
             initial={{ opacity: 0, height: 0, y: -10 }}
             animate={{ opacity: 1, height: "auto", y: 0 }}
             exit={{ opacity: 0, height: 0, y: -10 }}
             transition={{ duration: 0.3 }}
             className="mt-6 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-xl max-w-4xl mx-auto overflow-hidden"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">OSTL WebRTC Sandbox Guidelines</h2>
            <div className="space-y-6 text-gray-600 dark:text-slate-300 text-sm">
              
              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">1. Handshake (Initialization)</h3>
                <p className="mb-4">When your game loads, the OSTL Platform will rapidly ping it with a <code className="bg-gray-200 dark:bg-slate-800 text-pink-500 dark:text-pink-400 px-1 py-0.5 rounded">START</code> signal indicating the player's role (Host or Guest).</p>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl overflow-x-auto text-emerald-600 dark:text-emerald-400 font-mono text-xs border border-gray-200 dark:border-slate-800">
{`window.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "START") {
    const isHost = data.isHost; // true = Player 1, false = Player 2
    // Acknowledge connection
    window.parent.postMessage(JSON.stringify({ type: "READY" }), "*");
  }
});`}
                </pre>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">2. Sending & Receiving Moves</h3>
                <p className="mb-2">Send all game states out to the platform using generic postMessages. OSTL will blindly route your payload to the opponent via WebRTC.</p>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl overflow-x-auto text-emerald-600 dark:text-emerald-400 font-mono text-xs border border-gray-200 dark:border-slate-800">
{`// To send an action:
window.parent.postMessage(JSON.stringify({ action: "FIRE", x: 100 }), "*");

// To receive an action:
window.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.action === "FIRE") { ... }
});`}
                </pre>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">3. Terminating the Game</h3>
                <p className="mb-2">When the game ends, emit the <code className="bg-gray-200 dark:bg-slate-800 text-pink-500 dark:text-pink-400 px-1 py-0.5 rounded">GAME_OVER</code> signal. OSTL will intercept this and surface the end-game menu (Rematch / Return Home) to the players natively.</p>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl overflow-x-auto text-emerald-600 dark:text-emerald-400 font-mono text-xs border border-gray-200 dark:border-slate-800">
{`window.parent.postMessage(JSON.stringify({ 
  type: "GAME_OVER", 
  winner: "Host" // Must be "Host", "Guest", or "Draw"
}), "*");`}
                </pre>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">4. Dealing with Dropped Connections</h3>
                <p className="mb-2">If an opponent physically disconnects, OSTL provides them a 90-second global reconnection window. To prevent unfair advantages during this period, OSTL will emit a <code className="bg-gray-200 dark:bg-slate-800 text-pink-500 dark:text-pink-400 px-1 py-0.5 rounded">PAUSE_GAME</code> signal down to your engine, and a <code className="bg-gray-200 dark:bg-slate-800 text-pink-500 dark:text-pink-400 px-1 py-0.5 rounded">RESUME_GAME</code> signal upon successful recovery. Listen for these to gracefully halt your internal clocks or timers!</p>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl overflow-x-auto text-emerald-600 dark:text-emerald-400 font-mono text-xs border border-gray-200 dark:border-slate-800">
{`window.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "PAUSE_GAME") {
    // E.g., clearInterval(myClockTimer);
  }
  if (data.type === "RESUME_GAME") {
    // Resume physics
  }
});`}
                </pre>
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
