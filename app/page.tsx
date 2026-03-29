"use client";

import { motion } from "framer-motion";
import { Shield, Eye, CheckCircle, Mail, Calendar, HardDrive, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Smart Briefings",
    description:
      "Get a unified summary of your email, calendar, and files every morning. Ask follow-up questions naturally.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Full Transparency",
    description:
      "See every action the agent takes on your behalf. A live activity log shows exactly what was accessed and when.",
  },
  {
    icon: <CheckCircle className="h-5 w-5" />,
    title: "Your Approval Required",
    description:
      "Sending an email? Creating a meeting? The agent asks first. You approve or deny, every time.",
  },
];

const services = [
  { icon: <Mail className="h-5 w-5" />, label: "Gmail" },
  { icon: <Calendar className="h-5 w-5" />, label: "Calendar" },
  { icon: <HardDrive className="h-5 w-5" />, label: "Drive" },
  { icon: <Users className="h-5 w-5" />, label: "Contacts" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Gradient mesh glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(20,184,166,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.06) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      {/* Secondary glow */}
      <div
        className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl relative z-10"
      >
        <h1 className="font-heading text-5xl md:text-7xl font-bold leading-none mb-6" style={{ letterSpacing: "-0.03em" }}>
          your AI assistant,
          <br />
          <span className="text-primary">your rules</span>
        </h1>
        <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-lg mx-auto mb-8 font-normal">
          briefcase connects to your email, calendar, and files. It reads,
          summarizes, and takes action -- with full transparency and your
          approval.
        </p>
        <a href="/auth/login?returnTo=/chat">
          <Button className="bg-cyan-600 hover:bg-cyan-500 hover:shadow-[0_0_24px_rgba(6,182,212,0.3)] text-white rounded-lg px-8 py-3 text-sm font-medium transition-all">
            Get Started
          </Button>
        </a>
        {/* Powered by badge */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            Powered by Auth0 Token Vault
          </span>
        </div>
      </motion.div>

      {/* Service icons row */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-8 mt-12 relative z-10"
      >
        {services.map((service, i) => (
          <motion.div
            key={service.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-all duration-300">
              {service.icon}
            </div>
            <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.15em] text-zinc-600 group-hover:text-zinc-400 transition-colors">
              {service.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mt-16 relative z-10">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.3 + i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="glass-card rounded-xl p-5 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.08)] hover:scale-[1.02] transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary mb-3">
              {feature.icon}
            </div>
            <h3 className="font-heading text-sm font-semibold text-foreground mb-1.5">
              {feature.title}
            </h3>
            <p className="text-[12px] text-gray-400 leading-relaxed font-normal">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="relative z-10 mt-20 mb-8 flex flex-col items-center gap-2"
      >
        <div className="divider-gradient w-48 mb-3" />
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-zinc-600">
          Built for Auth0 Hackathon 2026
        </p>
        <a
          href="https://github.com/RohanSudo/briefcase"
          target="_blank"
          rel="noopener noreferrer"
          className="font-[var(--font-mono)] text-[10px] text-zinc-500 hover:text-primary transition-colors"
        >
          github.com/RohanSudo/briefcase
        </a>
      </motion.footer>
    </div>
  );
}
