import React from 'react';
import { Smile, CheckCircle2, Zap, Clock } from 'lucide-react';

export const StatsSection = () => {
  const stats = [
    {
      value: '5,000+',
      label: 'Happy Customers',
      icon: Smile,
      iconBg: 'bg-blue-100 text-blue-600'
    },
    {
      value: '99%',
      label: 'Success Rate',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600'
    },
    {
      value: '200+',
      label: 'Daily Avg TopUp',
      icon: Zap,
      iconBg: 'bg-red-100 text-red-600'
    },
    {
      value: '2s',
      label: 'Delivery (Seconds)',
      icon: Clock,
      iconBg: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <section className="py-12 bg-slate-50 border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col items-center text-center space-y-3 hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
