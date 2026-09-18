import React, { useState } from 'react';
import { BLOG_POSTS } from '../data/games';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, BookOpen, Calendar, User, ArrowRight,
  Search, Tag, Home, ChevronRight, Flame, Clock, Eye
} from 'lucide-react';

const ALL_TAGS = ['All', ...Array.from(new Set(BLOG_POSTS.map(p => p.tag)))];

const EXTENDED_POSTS = BLOG_POSTS.map((p, i) => ({
  ...p,
  readTime: i % 2 === 0 ? '4 min read' : '6 min read',
  views: i % 2 === 0 ? '2.4K' : '1.8K',
  content: `${p.summary}\n\nSri Lanka's top-up market has seen tremendous growth in 2026, with thousands of gamers relying on platforms like MADS TOPUP for instant, automated delivery of game currencies at the best local prices.\n\nWhether you're topping up Free Fire Diamonds, PUBG UC, or Mobile Legends, MADS TOPUP ensures zero-delay delivery powered by the Moongold API — the gold standard in regional game top-up infrastructure.\n\nOur platform supports eZ Cash, Binance Pay, and direct bank transfers, making it accessible to every gamer across Sri Lanka, Indonesia, Malaysia, and beyond.`
}));

export const BlogPage = () => {
  const { closeBlogPage } = useApp();
  const [activeTag, setActiveTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);

  const filtered = EXTENDED_POSTS.filter(p => {
    const matchTag = activeTag === 'All' || p.tag === activeTag;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
    return matchTag && matchSearch;
  });

  const goHome = () => {
    closeBlogPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
            <button onClick={goHome} className="flex items-center gap-1 hover:text-[#cc040a] transition-colors cursor-pointer">
              <Home className="w-3.5 h-3.5" /> Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button onClick={() => setSelectedPost(null)} className="hover:text-[#cc040a] transition-colors cursor-pointer">Blog</button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[#cc040a] truncate max-w-[200px]">{selectedPost.title}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button onClick={() => setSelectedPost(null)} className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#cc040a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </button>

          <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 bg-slate-950 mb-8 shadow-xl">
            <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-block px-3 py-1 rounded-full bg-[#cc040a] text-white text-[10px] font-black uppercase tracking-wider mb-3">{selectedPost.tag}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading leading-tight">{selectedPost.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium mb-8 pb-6 border-b border-slate-200">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#cc040a]" />{selectedPost.date}</span>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#cc040a]" />{selectedPost.author}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#cc040a]" />{selectedPost.readTime}</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-[#cc040a]" />{selectedPost.views} views</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-5 text-sm leading-relaxed text-slate-700">
            {selectedPost.content.split('\n\n').map((para, i) => (
              <p key={i} className="font-medium">{para}</p>
            ))}
            <div className="mt-8 p-6 bg-gradient-to-r from-[#cc040a] to-[#dc2626] rounded-2xl text-white text-center space-y-3">
              <Flame className="w-8 h-8 mx-auto" />
              <h3 className="text-lg font-black font-heading">Ready to Top Up?</h3>
              <p className="text-sm text-red-100 font-medium">Instant delivery. Lowest prices in Sri Lanka.</p>
              <button onClick={goHome} className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#cc040a] font-black text-xs rounded-full hover:bg-red-50 transition-colors shadow-md cursor-pointer">
                <Flame className="w-4 h-4" /> Go to Store
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-20 font-sans text-slate-900 animate-in fade-in duration-300">

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-950/50 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex items-center gap-2 text-xs text-red-200 font-bold mb-6">
            <button onClick={goHome} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Home</button>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-white">Blog & News</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-red-200">MADS TOPUP BLOG</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-white mb-3">
            Game News &amp; <span className="text-red-200">Guides</span>
          </h1>
          <p className="text-red-100 text-sm sm:text-base font-medium max-w-xl">
            Top-up guides, redeem codes, esports news and the latest updates from MADS TOPUP Sri Lanka.
          </p>
          <div className="mt-8 relative max-w-lg">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Back + Filter row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <button onClick={goHome} className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#cc040a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer self-start">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTag === tag
                    ? 'bg-[#cc040a] text-white border-[#cc040a] shadow-md shadow-red-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#cc040a] hover:text-[#cc040a]'
                }`}
              >
                {tag === 'All' ? <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> All</span> : tag}
              </button>
            ))}
          </div>
        </div>

        {/* Post Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 font-semibold">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No articles found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filtered.map((post) => (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col"
              >
                <div className="relative h-56 overflow-hidden bg-slate-950">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-[#cc040a] text-white text-[10px] font-black uppercase tracking-wider shadow-md">{post.tag}</span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />{post.readTime}
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 space-y-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#cc040a]" />{post.date}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#cc040a]" />{post.author}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-slate-400" />{post.views}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading leading-snug tracking-tight group-hover:text-[#cc040a] transition-colors">{post.title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium flex-1">{post.summary}</p>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-[#cc040a] group-hover:text-[#990207] flex items-center gap-2 transition-colors">
                      Read Article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{post.tag}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-[#cc040a] to-[#dc2626] rounded-3xl p-8 sm:p-12 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto">
              <Flame className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black font-heading">Ready to Top Up?</h3>
            <p className="text-red-100 text-sm font-medium max-w-md mx-auto">Instant delivery. Lowest LKR prices. Powered by Moongold 24/7 API.</p>
            <button onClick={goHome} className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#cc040a] font-black text-sm rounded-full hover:bg-red-50 transition-colors shadow-lg cursor-pointer mt-2">
              <Flame className="w-4 h-4" /> Go to Store <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
