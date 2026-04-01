import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Globe, ArrowRight } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12 lg:py-24">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-3xl mx-auto mt-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          v2.0 Beta Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Frictionless <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Multiplayer Gaming.
          </span>
        </h1>
        
        <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
          No sign-ups. No downloads. pure native WebRTC delivering zero-latency peer-to-peer data channels straight to your browser.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/games"
            className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-base font-bold text-white transition-all duration-300 bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-900 shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)]"
          >
            Browse Library
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-300 transition-all duration-200 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white"
          >
            How it works
          </a>
        </div>
      </motion.div>

      {/* Feature Grid */}
      <div id="features" className="grid md:grid-cols-3 gap-8 w-full mt-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-3xl glass-panel bg-slate-900/40 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Sub-10ms Latency</h3>
          <p className="text-slate-400 leading-relaxed">By utilizing WebRTC Data Channels, your game state bypasses central servers completely, achieving true peer-to-peer lockstep.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl glass-panel bg-slate-900/40 relative overflow-hidden group"
        >
           <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
            <Globe className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Ephemeral Identify</h3>
          <p className="text-slate-400 leading-relaxed">No accounts required. Your identity is deterministically generated on the fly, offering zero-friction entry to the matchmaking queue.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-3xl glass-panel bg-slate-900/40 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-6 border border-pink-500/30">
            <Shield className="w-7 h-7 text-pink-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Engine Agnostic</h3>
          <p className="text-slate-400 leading-relaxed">Built for the future of web gaming. Whether the logic is in Godot, Unity, or raw WebGL, the "dumb-relay" handles the payload natively.</p>
        </motion.div>
      </div>

      {/* Stats Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="w-full mt-32 p-12 rounded-[2rem] bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900 border border-indigo-500/20 shadow-2xl flex flex-col items-center"
      >
        <h2 className="text-3xl font-bold mb-12">The platform built for speed.</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl text-center">
          <div>
            <div className="text-4xl font-extrabold text-white mb-2">P2P</div>
            <div className="text-indigo-300 font-medium tracking-wide">ARCHITECTURE</div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-2">0</div>
            <div className="text-indigo-300 font-medium tracking-wide">SIGN-UPS</div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-2">&lt;15ms</div>
            <div className="text-indigo-300 font-medium tracking-wide">ROUTING DELAY</div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-2">WASM</div>
            <div className="text-indigo-300 font-medium tracking-wide">READY</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
