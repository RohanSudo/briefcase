"use client";

import { motion } from "framer-motion";
import { Shield, Eye, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Smart Briefings",
    description:
      "Get a unified summary of your email, calendar, and Slack every morning. Ask follow-up questions naturally.",
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

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl relative z-10"
      >
        <h1 className="font-heading text-5xl md:text-7xl font-semibold leading-none mb-6" style={{ letterSpacing: "-0.03em" }}>
          your AI assistant,
          <br />
          <span className="text-primary">your rules</span>
        </h1>
        <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-lg mx-auto mb-8 font-normal">
          briefcase connects to your email, calendar, and Slack. It reads,
          summarizes, and takes action -- with full transparency and your
          approval.
        </p>
        <Link href="/chat">
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-8 py-3 text-sm font-medium transition-all">
            Get Started
          </Button>
        </Link>
      </motion.div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mt-20 relative z-10">
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
            className="glass-card rounded-xl p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
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
    </div>
  );
}
