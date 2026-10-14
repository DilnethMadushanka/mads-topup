import React from 'react';
import { BLOG_POSTS } from '../data/games';
import { BookOpen, Calendar, ArrowRight, ArrowUpRight, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Reading time from the summary length, so each card shows a small hint.
const readMinutes = (post) => Math.max(3, Math.round(String(post.summary || '').split(/\s+/).length / 6));

export const BlogSection = () => {
  const { openBlogPage } = useApp();

  return (
    <section id="blog-section" className="blg-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="blg-head">
          <div className="blg-head-text">
            <span className="blg-eyebrow">
              <BookOpen className="w-3.5 h-3.5" />
              Latest gaming articles
            </span>
            <h2 className="blg-title">News &amp; <span>Guides</span></h2>
            <p className="blg-sub">Top-up guides, Garena Shell tips and esports news.</p>
          </div>
          <button type="button" onClick={openBlogPage} className="blg-all">
            <span>View all</span>
            <span className="blg-all-ico"><ArrowRight /></span>
          </button>
        </div>

        <div className="blg-grid">
          {BLOG_POSTS.map((post, i) => (
            <article
              key={post.id}
              onClick={openBlogPage}
              className={`blg-card ${i % 2 ? 'is-teal' : ''}`}
            >
              <div className="blg-media">
                <img src={post.image} alt={post.title} loading="lazy" />
                <span className="blg-tag">{post.tag}</span>
              </div>

              <div className="blg-body">
                <div className="blg-meta">
                  <span><Calendar /> {post.date}</span>
                  <span className="blg-dot" />
                  <span><Clock /> {readMinutes(post)} min read</span>
                </div>
                <h3 className="blg-card-title">{post.title}</h3>
                <p className="blg-summary">{post.summary}</p>

                <div className="blg-foot">
                  <span className="blg-author">
                    <span className="blg-avatar">{String(post.author || 'M').charAt(0)}</span>
                    {post.author}
                  </span>
                  <button
                    type="button"
                    aria-label={`Read ${post.title}`}
                    onClick={(e) => { e.stopPropagation(); openBlogPage(); }}
                    className="blg-go"
                  >
                    <ArrowUpRight />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
};
