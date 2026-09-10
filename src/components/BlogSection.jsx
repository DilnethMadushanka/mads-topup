import React from 'react';
import { BLOG_POSTS } from '../data/games';
import { BookOpen, Calendar, User, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BlogSection = () => {
  const { showToast } = useApp();

  return (
    <section id="blog-section" className="py-24 bg-[#F8FAFF] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-black text-[#cc040a] tracking-widest uppercase font-mono bg-[#cc040a]/10 px-4 py-1.5 rounded-full border border-[#cc040a]/20 inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>LATEST GAMING ARTICLES</span>
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight uppercase">
            News & <span className="text-[#cc040a]">Guides</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Stay updated with the latest gaming top-up guides, Garena Shell tips, and esports news
          </p>
        </div>

        {/* 2 Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {BLOG_POSTS.map((post) => (
            <div 
              key={post.id}
              className="mads-card flex flex-col justify-between group cursor-pointer"
            >
              {/* Image Container */}
              <div className="relative h-60 overflow-hidden bg-slate-950">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>

                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#3B2896] text-white text-[10px] font-black uppercase tracking-wider shadow">
                    {post.tag}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#cc040a]" />
                      {post.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#cc040a]" />
                      {post.author}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 font-heading leading-snug group-hover:text-[#cc040a] transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => showToast(`Reading article: ${post.title}`)}
                    className="text-xs font-bold text-[#cc040a] group-hover:text-[#990207] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Animated Bottom Cyan Glow Line */}
              <div className="mads-card-glow-bar"></div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
