import React, { useState } from 'react';
import { Search, RotateCcw, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { MOCK_MAIN_LINES } from '@/data';
import { cn } from '@/lib/utils';

export default function MainLineSettings() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    abbr: '',
    startStake: '',
    endStake: '',
    direction: '上行',
    length: '',
    remark: '',
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 shrink-0">路线编号:</label>
            <input type="text" placeholder="请输入" className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 shrink-0">路线简称:</label>
            <input type="text" placeholder="请输入" className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
            <Search size={14} /> 搜索
          </button>
          <button className="border border-gray-300 px-4 py-1 rounded text-sm flex items-center gap-1 hover:bg-gray-50">
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> 新增
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">序号</th>
                <th className="px-4 py-3">路线编号</th>
                <th className="px-4 py-3">路线全称</th>
                <th className="px-4 py-3">路线简称</th>
                <th className="px-4 py-3">起点桩号</th>
                <th className="px-4 py-3">终点桩号</th>
                <th className="px-4 py-3">方向</th>
                <th className="px-4 py-3">里程长度 (km)</th>
                <th className="px-4 py-3">备注</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_MAIN_LINES.map((line, index) => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">{line.code}</td>
                  <td className="px-4 py-3">{line.name}</td>
                  <td className="px-4 py-3">{line.abbr}</td>
                  <td className="px-4 py-3">{line.startStake}</td>
                  <td className="px-4 py-3">{line.endStake}</td>
                  <td className="px-4 py-3">{line.direction}</td>
                  <td className="px-4 py-3">{line.length}</td>
                  <td className="px-4 py-3 text-gray-400">{line.remark || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-blue-600">
                      <button className="hover:underline flex items-center gap-0.5"><Eye size={14} /> 查看</button>
                      <button className="hover:underline flex items-center gap-0.5"><Edit size={14} /> 编辑</button>
                      <button className="text-red-500 hover:underline flex items-center gap-0.5"><Trash2 size={14} /> 删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold">高速主线新增</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 路线编号</label>
                  <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                    <option>请选择</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 路线全称</label>
                  <input type="text" placeholder="请输入" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 路线简称</label>
                  <input type="text" placeholder="请输入" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 起点桩号</label>
                  <input type="text" placeholder="格式如: K001+100" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 终点桩号</label>
                  <input type="text" placeholder="格式如: K001+100" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 方向</label>
                  <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                    <option>上行</option>
                    <option>下行</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 里程长度 (km)</label>
                  <input type="number" placeholder="保留 2 位小数" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">备注</label>
                <textarea placeholder="最多 100 字" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm h-20 resize-none"></textarea>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-6 py-1.5 border rounded text-sm hover:bg-gray-100">取消</button>
              <button onClick={() => setShowModal(false)} className="px-6 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
