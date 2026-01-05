"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  const highlights = [
    { title: "Quick Online Reporting", desc: "Report snatching, theft, or lost items instantly from your phone or computer." },
    { title: "Faster Police Response", desc: "Your report is sent directly to the relevant police station for immediate attention." },
    { title: "Track Your Case", desc: "Stay informed about your report’s progress and police action status." },
  ];

  const steps = [
    { id: 1, title: "Identify Incident", desc: "Recognize snatching, theft, or any suspicious activity around you." },
    { id: 2, title: "Report Online", desc: "File your complaint securely and instantly through our online portal." },
    { id: 3, title: "Police Action", desc: "Authorities review your report and take prompt action." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 text-gray-800 flex flex-col">
      {/* ✅ Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Sindh Police Logo" className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-bold text-blue-800 tracking-wide">Sindh Police</h1>
            <p className="text-sm text-gray-500">Service • Integrity • Protection</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/authentication/login">
            <Button
              variant="outline"
              className="rounded-full border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white transition-all"
            >
              Login
            </Button>
          </Link>
          <Link href="/dashboard/normal-user">
            <Button className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-6 transition-all">
              Report Snatching
            </Button>
          </Link>
        </div>
      </header>

      {/* ✅ Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-10 py-20 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl space-y-6"
        >
          <h2 className="text-5xl font-extrabold text-blue-900 leading-tight">
            Stop Snatching.<br />Stay Safe. Report Instantly.
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Your timely report can prevent another incident. Join hands with Sindh Police to build a safer, stronger Karachi.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/normal-user">
              <Button className="rounded-full px-8 py-6 text-lg bg-blue-700 hover:bg-blue-800 text-white shadow-md hover:shadow-lg transition-all">
                File a Report
              </Button>
            </Link>
            <Link href="/authentication/login">
              <Button
                variant="outline"
                className="rounded-full px-8 py-6 text-lg border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white shadow-sm transition-all"
              >
                Officer Login
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.img
          src="/logo1.png"
          alt="Police Awareness"
          className="w-[480px] mt-10 md:mt-0 rounded-3xl shadow-lg border border-blue-100"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        />
      </section>

      {/* ✅ Highlights Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
          {highlights.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white/10 p-8 rounded-2xl border border-blue-500 text-center hover:bg-white/20 transition-all shadow-md"
            >
              <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
              <p className="text-blue-100 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ✅ Steps Section */}
      <section className="py-24 px-6 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-12">How It Works / یہ کیسے کام کرتا ہے</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all"
            >
              <div className="text-blue-700 text-2xl font-bold mb-3">Step {step.id}</div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ✅ Mission Section */}
      <section className="bg-blue-50 py-24">
        <div className="max-w-4xl mx-auto text-center px-6 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900">Our Mission / ہمارا مقصد</h2>
          <p className="text-gray-700 leading-relaxed text-lg">
            The Sindh Police is dedicated to maintaining peace, justice, and public safety. Through this digital platform,
            we ensure transparent, efficient, and citizen-friendly reporting to strengthen trust between police and the public.
          </p>
        </div>
      </section>

      {/* ✅ Footer */}
      <footer className="bg-blue-900 text-white py-8 text-center border-t border-blue-800">
        <p className="text-sm tracking-wide">
          © 2025 Sindh Police | All Rights Reserved <br />
          <span className="text-blue-200">Emergency Helpline:</span>{" "}
          <span className="font-bold text-white text-base">15</span>
        </p>
      </footer>
    </div>
  );
}
