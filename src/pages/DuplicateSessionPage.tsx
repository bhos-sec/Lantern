import React, { useState } from "react";
import { motion } from "motion/react";
import { MonitorX, ArrowRightCircle, Zap } from "lucide-react";

interface Props {
  /** Callback to claim this tab as the active session ("Use This Tab"). */
  onTakeOver: () => void;
}

/**
 * Shown when the server detects that another tab / window on the same device
 * is already connected to Lantern.  The user can either wait (the other tab
 * stays active) or click "Use This Tab" to evict the old session.
 *
 * This screen is only rendered when running with `npm run user`
 * (NODE_ENV=production).  In development (`npm run dev`) the server skips the
 * duplicate-session check entirely, so this page is never shown.
 */
export function DuplicateSessionPage({ onTakeOver }: Props) {
  const [taking, setTaking] = useState(false);

  const handleTakeOver = () => {
    setTaking(true);
    onTakeOver();
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="inline-flex p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <MonitorX className="text-amber-400" size={40} />
          </div>
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <Zap size={16} className="text-emerald-500" />
          <span className="text-sm font-semibold tracking-widest uppercase text-zinc-400">
            Lantern
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Already open in another tab
          </h1>
          <p className="text-zinc-400 leading-relaxed">
            Lantern only allows one active session per device. Another tab or
            window is currently connected.
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            What would you like to do?
          </p>

          {/* Option A – take over */}
          <button
            onClick={handleTakeOver}
            disabled={taking}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 hover:border-emerald-500/40 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <ArrowRightCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {taking ? "Taking over…" : "Use This Tab"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Disconnect the other tab and continue here
              </p>
            </div>
          </button>

          {/* Option B – stay blocked */}
          <div className="flex items-start gap-3 px-2 pt-1">
            <div className="w-2 h-2 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              Or switch to your existing Lantern tab. Only one session is
              allowed per device to keep the experience stable.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-600">
          This restriction is enforced in production to prevent multi-tab
          conflicts.
        </p>
      </motion.div>
    </div>
  );
}
