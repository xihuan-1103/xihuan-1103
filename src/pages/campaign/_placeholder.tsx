/**
 * 百日攻坚模块 - 页面占位组件（各菜单功能待后续需求描述后实现）
 */

import React from 'react';

export default function CampaignPlaceholder({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
          攻
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>
        <p className="text-sm text-slate-500">{desc || '功能建设中，具体内容待配置'}</p>
      </div>
    </div>
  );
}
