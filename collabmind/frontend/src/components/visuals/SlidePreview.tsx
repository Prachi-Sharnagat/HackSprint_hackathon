"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Presentation, FileText, Check, Copy } from "lucide-react";

export interface SlideData {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes?: string;
}

export interface DeckData {
  deckTitle: string;
  theme?: string;
  slides: SlideData[];
}

interface SlidePreviewProps {
  jsonString: string;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({ jsonString }) => {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  let deck: DeckData | null = null;
  try {
    deck = JSON.parse(jsonString);
  } catch (err) {
    return (
      <div className="p-4 bg-rose-950/30 border border-rose-800 rounded-lg text-rose-300 text-sm">
        Invalid presentation JSON data.
      </div>
    );
  }

  if (!deck || !deck.slides || deck.slides.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        No slide data found.
      </div>
    );
  }

  const slides = deck.slides;
  const currentSlide = slides[currentSlideIdx] || slides[0];

  const handleNext = () => {
    setCurrentSlideIdx((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setCurrentSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleCopyMarkdown = () => {
    const md = slides
      .map(
        (s) =>
          `# ${s.title}\n${s.subtitle ? `*${s.subtitle}*\n\n` : ""}${s.bullets
            .map((b) => `- ${b}`)
            .join("\n")}\n\n> Notes: ${s.speakerNotes || "None"}\n`
      )
      .join("\n---\n\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/70 rounded-xl border border-slate-800 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Presentation className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
            {deck.deckTitle || "Presentation"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded transition ${
              showNotes
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Copy as Markdown Slides"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="flex-1 p-6 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-xl aspect-[16/10] bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-700/60 rounded-2xl p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Slide Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Slide {currentSlideIdx + 1} of {slides.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                CollabMind Deck
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
              {currentSlide.title}
            </h2>
            {currentSlide.subtitle && (
              <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
                {currentSlide.subtitle}
              </p>
            )}
          </div>

          {/* Slide Bullets */}
          <div className="my-auto py-2">
            <ul className="space-y-2.5">
              {currentSlide.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start text-xs md:text-sm text-slate-200">
                  <span className="inline-block w-2 h-2 rounded-full bg-pink-500 mt-1.5 mr-2.5 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Slide Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>{deck.deckTitle}</span>
            <span>{currentSlideIdx + 1} / {slides.length}</span>
          </div>
        </div>

        {/* Presenter Notes Accordion */}
        {showNotes && currentSlide.speakerNotes && (
          <div className="w-full max-w-xl mt-4 p-3.5 bg-slate-900/90 border border-indigo-500/20 rounded-xl text-xs text-slate-300">
            <div className="font-semibold text-indigo-400 mb-1 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Speaker Notes:</span>
            </div>
            <p className="leading-relaxed text-slate-300">{currentSlide.speakerNotes}</p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/90 border-t border-slate-800">
        <button
          onClick={handlePrev}
          disabled={currentSlideIdx === 0}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Slide Indicator Dots */}
        <div className="flex items-center space-x-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlideIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlideIdx
                  ? "w-5 bg-pink-500"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentSlideIdx === slides.length - 1}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
