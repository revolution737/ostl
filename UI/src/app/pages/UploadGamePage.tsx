import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Upload, ArrowLeft, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

export function UploadGamePage() {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate upload
    setTimeout(() => {
      navigate("/developers/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            OSTL
          </h1>
          <Button
            onClick={() => navigate("/developers/dashboard")}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      {/* Upload Form */}
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl mb-8 text-gray-800">Upload New Game</h2>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="space-y-6">
              {/* Game Name */}
              <div className="space-y-2">
                <Label htmlFor="gameName">Game Name</Label>
                <Input
                  id="gameName"
                  type="text"
                  placeholder="Enter game name"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  required
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Brief description for game card"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <Label htmlFor="detailedDescription">Detailed Description</Label>
                <Textarea
                  id="detailedDescription"
                  placeholder="Detailed description of your game"
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Game Image */}
              <div className="space-y-2">
                <Label htmlFor="gameImage">Game Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        variant="outline"
                        className="mt-4"
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="gameImage" className="cursor-pointer block">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-2">Click to upload game image</p>
                      <p className="text-gray-400 text-sm">PNG, JPG up to 10MB</p>
                      <input
                        id="gameImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Game Files */}
              <div className="space-y-2">
                <Label htmlFor="gameFiles">Game Files</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                  <label htmlFor="gameFiles" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-2">Upload game files (ZIP)</p>
                    <p className="text-gray-400 text-sm">Include HTML, CSS, JS files</p>
                    <input
                      id="gameFiles"
                      type="file"
                      accept=".zip"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg"
                >
                  Upload Game
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
