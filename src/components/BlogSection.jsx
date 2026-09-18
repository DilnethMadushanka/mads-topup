import React from 'react';
import { BLOG_POSTS } from '../data/games';
import { BookOpen, Calendar, User, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BlogSection = () => {
  const { openBlogPage } = useApp();

  return (
    <section id="blog-section" className="py-24 bg-[#F8FAFF] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="section-header text-center space-y-3">
          <span className="section-badge">
            <BookOpen className="w-3.5 h-3.5" />
            <span>LATEST GAMING ARTICLES</span>
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight uppercase">
            News & <span className="text-[#cc040a]">Guides</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto leading-relaxed">
            Stay updated with the latest gaming top-up guides, Garena Shell tips, and esports news
          </p>
        </div>

        {/* 2 Blog Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {BLOG_POSTS.map((post) => (
            <div 
              key={post.id}
              onClick={openBlogPage}
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
              <div className="p-8 sm:p-9 space-y-4 flex-1 flex flex-col justify-between relative z-10">
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

                  <h3 className="text-xl font-extrabold text-slate-900 font-heading leading-snug tracking-tight group-hover:text-[#cc040a] transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={(e) => { e.stopPropagation(); openBlogPage(); }}
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

        {/* View All CTA */}
        <div className="text-center mt-10">
          <button
            onClick={openBlogPage}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#cc040a] hover:bg-[#990207] text-white font-black text-sm rounded-full transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 cursor-pointer group"
          >
            <BookOpen className="w-4 h-4" />
            <span>View All Articles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
};
