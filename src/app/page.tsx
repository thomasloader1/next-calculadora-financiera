"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Calculator from '@/components/Calculator';
import { LocalModeBanner } from '@/components/LocalModeBanner';
import { InstallPromptBanner } from '@/components/InstallPromptBanner';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <LocalModeBanner />
      <InstallPromptBanner />
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Calculator />
      </main>
    </div>
  );
}
