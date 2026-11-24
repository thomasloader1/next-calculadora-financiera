"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Calculator from '@/components/Calculator';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0] dark:bg-[#15110E] text-[#2C211B] dark:text-[#FDF6F0]">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Calculator />
      </main>
    </div>
  );
}
