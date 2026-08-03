import React, { useState, useEffect } from 'react';
import { Save, Send, Plus, Trash2, Search, X, ArrowLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_MAIN_LINES, MOCK_TEAMS } from '@/data';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Project, Contract } from '@/types';

const TABS = [
  { id: 'basic', label: '基本信息' },
  { id: 'project', label: '项目信息' },
  { id: 'section', label: '路段信息' },
  { id: 'team', label: '班组信息' },
  { id: 'contract', label: '合同信息' },
  { id: 'approval', label: '审批附件' },
  { id: 'history', label: '流程记录' },
  { id: 'version', label: '历史版本' },
];

export default function ProjectSetup({ onSave, projects, contracts }: { onSave: (p: Project) => void, projects: Project[], contracts: Contract[] }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');
  const mode = searchParams.get('mode'); // 'view' or undefined (edit/create)
  const isView = mode === 'view';

  const [activeTab, setActiveTab] = useState('basic');
  const [showMainLineModal, setShowMainLineModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showNatureModal, setShowNatureModal] = useState(false);

  const [formData, setFormData] = useState<Project>({
    id: id || Math.random().toString(36).substr(2, 9),
    name: '',
    code: '',
    abbr: '',
    type: '日常养护',
    status: '草稿',
    dept: '项目部一',
    org: '沪杭甬养护**项目部',
    startDate: '',
    endDate: '',
    creator: '周末',
    createDate: new Date().toISOString().split('T')[0],
    contractSigned: false,
    summary: '',
    mainLines: [],
    teams: [],
    manager: '',
    clientUnit: '',
    clientManager: '',
    workArea: '',
    nature: '',
  });

  useEffect(() => {
    if (id) {
      const project = projects.find(p => p.id === id);
      if (project) {
        setFormData(project);
      }
    }
  }, [id, projects]);

  const handleSave = (status: Project['status'] = '草稿') => {
    if (!formData.name) {
      alert('请输入项目名称');
      return;
    }
    onSave({ ...formData, status });
    alert('保存成功');
    navigate('/project/list');
  };

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 编制人:</label>
          <input type="text" value={formData.creator} disabled className="flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 实施项目部:</label>
          <select 
            value={formData.dept}
            onChange={e => setFormData({ ...formData, dept: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none disabled:bg-gray-50"
          >
            <option>项目部一</option>
            <option>项目部二</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 项目执行经理:</label>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="请选择" 
              value={formData.manager}
              readOnly
              disabled={isView}
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50 cursor-pointer" 
              onClick={() => !isView && setShowManagerModal(true)}
            />
            {!isView && (
              <button 
                onClick={() => setShowManagerModal(true)}
                className="bg-gray-100 border border-gray-300 px-3 rounded hover:bg-gray-200"
              >
                <Search size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right">甲方执行单位:</label>
          <input 
            type="text" 
            placeholder="请输入" 
            value={formData.clientUnit}
            onChange={e => setFormData({ ...formData, clientUnit: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50" 
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 编制日期:</label>
          <input type="date" value={formData.createDate} disabled className="flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right">实施工区:</label>
          <select 
            value={formData.workArea}
            onChange={e => setFormData({ ...formData, workArea: e.target.value })}
            disabled={isView} 
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none disabled:bg-gray-50"
          >
            <option value="">请选择</option>
            <option value="工区一">工区一</option>
            <option value="工区二">工区二</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right">甲方执行负责人:</label>
          <input 
            type="text" 
            placeholder="请输入" 
            value={formData.clientManager}
            onChange={e => setFormData({ ...formData, clientManager: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50" 
          />
        </div>
      </div>
    </div>
  );

  const renderProjectInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 项目编号:</label>
          <input 
            type="text" 
            placeholder="根据编号生成规则自动生成" 
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50" 
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 项目简称:</label>
          <input 
            type="text" 
            placeholder="请输入" 
            value={formData.abbr}
            onChange={e => setFormData({ ...formData, abbr: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50" 
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 中标资质:</label>
          <select disabled={isView} className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50">
            <option>请选择</option>
            <option>公路养护甲级</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 管养区域:</label>
          <select disabled={isView} className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50">
            <option>省内</option>
            <option>省外</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 项目名称:</label>
          <input 
            type="text" 
            placeholder="请输入" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            disabled={isView}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50" 
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 承接方式:</label>
          <select disabled={isView} className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50">
            <option>常规中标</option>
            <option>直营</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 工程性质:</label>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="请选择" 
              value={formData.nature}
              readOnly
              disabled={isView} 
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50 cursor-pointer" 
              onClick={() => !isView && setShowNatureModal(true)}
            />
            {!isView && (
              <button 
                onClick={() => setShowNatureModal(true)}
                className="bg-gray-100 border border-gray-300 px-3 rounded hover:bg-gray-200"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-32 text-right"><span className="text-red-500">*</span> 计划开工-完工日期:</label>
          <div className="flex-1 flex items-center gap-2">
            <input 
              type="date" 
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              disabled={isView}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50" 
            />
            <span>-</span>
            <input 
              type="date" 
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              disabled={isView}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50" 
            />
          </div>
        </div>
      </div>
      <div className="col-span-2 flex items-start gap-2">
        <label className="text-sm text-gray-600 w-32 text-right shrink-0">项目概况:</label>
        <textarea 
          placeholder="请输入文本" 
          value={formData.summary}
          onChange={e => setFormData({ ...formData, summary: e.target.value })}
          disabled={isView}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm h-24 resize-none disabled:bg-gray-50"
        ></textarea>
      </div>
    </div>
  );

  const renderSectionInfo = () => (
    <div className="p-4 space-y-4">
      {!isView && (
        <div className="flex justify-end">
          <button 
            onClick={() => setShowMainLineModal(true)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> 新增
          </button>
        </div>
      )}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-2 border-b">序号</th>
              <th className="px-4 py-2 border-b">路段编号</th>
              <th className="px-4 py-2 border-b">路段简称</th>
              <th className="px-4 py-2 border-b">方向</th>
              <th className="px-4 py-2 border-b">起点桩号</th>
              <th className="px-4 py-2 border-b">终点桩号</th>
              <th className="px-4 py-2 border-b">里程长度 (km)</th>
              {!isView && <th className="px-4 py-2 border-b">操作</th>}
            </tr>
          </thead>
          <tbody>
            {formData.mainLines.length === 0 ? (
              <tr>
                <td colSpan={isView ? 7 : 8} className="px-4 py-8 text-center text-gray-400">暂无数据</td>
              </tr>
            ) : (
              formData.mainLines.map((id, index) => {
                const line = MOCK_MAIN_LINES.find(l => l.id === id);
                return (
                  <tr key={id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{index + 1}</td>
                    <td className="px-4 py-2 border-b">{line?.code}</td>
                    <td className="px-4 py-2 border-b">{line?.abbr}</td>
                    <td className="px-4 py-2 border-b">{line?.direction}</td>
                    <td className="px-4 py-2 border-b">{line?.startStake}</td>
                    <td className="px-4 py-2 border-b">{line?.endStake}</td>
                    <td className="px-4 py-2 border-b">{line?.length}</td>
                    {!isView && (
                      <td className="px-4 py-2 border-b">
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, mainLines: prev.mainLines.filter(i => i !== id) }))}
                          className="text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeamInfo = () => (
    <div className="p-4 space-y-4">
      {!isView && (
        <div className="flex justify-end">
          <button 
            onClick={() => setShowTeamModal(true)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={16} /> 新增
          </button>
        </div>
      )}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-2 border-b">序号</th>
              <th className="px-4 py-2 border-b">班组名称</th>
              <th className="px-4 py-2 border-b">班组负责人</th>
              <th className="px-4 py-2 border-b">带班技术员</th>
              <th className="px-4 py-2 border-b">属性</th>
              {!isView && <th className="px-4 py-2 border-b">操作</th>}
            </tr>
          </thead>
          <tbody>
            {formData.teams.length === 0 ? (
              <tr>
                <td colSpan={isView ? 5 : 6} className="px-4 py-8 text-center text-gray-400">暂无数据</td>
              </tr>
            ) : (
              formData.teams.map((id, index) => {
                const team = MOCK_TEAMS.find(t => t.id === id);
                return (
                  <tr key={id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{index + 1}</td>
                    <td className="px-4 py-2 border-b">{team?.name}</td>
                    <td className="px-4 py-2 border-b">{team?.leader}</td>
                    <td className="px-4 py-2 border-b">xxx</td>
                    <td className="px-4 py-2 border-b">{team?.type}</td>
                    {!isView && (
                      <td className="px-4 py-2 border-b">
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, teams: prev.teams.filter(i => i !== id) }))}
                          className="text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContractInfo = () => {
    const selectedContract = contracts.find(c => c.id === formData.contractId);

    return (
      <div className="p-4 space-y-4">
        {!isView && (
          <div className="flex justify-end">
            <button 
              onClick={() => setShowContractModal(true)}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
            >
              <Plus size={16} /> 选择合同
            </button>
          </div>
        )}
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-2 border-b">序号</th>
                <th className="px-4 py-2 border-b">合同名称</th>
                <th className="px-4 py-2 border-b">合同编号</th>
                <th className="px-4 py-2 border-b">合同金额/元</th>
                <th className="px-4 py-2 border-b">甲方</th>
                <th className="px-4 py-2 border-b">乙方</th>
                <th className="px-4 py-2 border-b">合同类型</th>
                {!isView && <th className="px-4 py-2 border-b">操作</th>}
              </tr>
            </thead>
            <tbody>
              {selectedContract ? (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">1</td>
                  <td className="px-4 py-2 border-b">{selectedContract.name}</td>
                  <td className="px-4 py-2 border-b">{selectedContract.code}</td>
                  <td className="px-4 py-2 border-b font-mono text-xs">{selectedContract.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 border-b">{selectedContract.partyA}</td>
                  <td className="px-4 py-2 border-b">{selectedContract.partyB}</td>
                  <td className="px-4 py-2 border-b">{selectedContract.type}</td>
                  {!isView && (
                    <td className="px-4 py-2 border-b">
                      <button 
                        onClick={() => setFormData({ ...formData, contractId: undefined, contractSigned: false })}
                        className="text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </td>
                  )}
                </tr>
              ) : (
                <tr>
                  <td colSpan={isView ? 7 : 8} className="px-4 py-8 text-center text-gray-400">暂无关联合同，请点击右上方按钮选择已确认的合同</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderApprovalInfo = () => (
    <div className="p-4 space-y-4">
      {!isView && (
        <div className="flex justify-end">
          <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
            <Plus size={16} /> 上传附件
          </button>
        </div>
      )}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-2 border-b">序号</th>
              <th className="px-4 py-2 border-b">附件名称</th>
              <th className="px-4 py-2 border-b">上传人</th>
              <th className="px-4 py-2 border-b">上传时间</th>
              <th className="px-4 py-2 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2 border-b">1</td>
              <td className="px-4 py-2 border-b text-blue-600 cursor-pointer hover:underline">项目立项申请书.pdf</td>
              <td className="px-4 py-2 border-b">周末</td>
              <td className="px-4 py-2 border-b">2024-03-20 10:00</td>
              <td className="px-4 py-2 border-b">
                <button className="text-blue-600 hover:underline mr-2">下载</button>
                {!isView && <button className="text-red-500 hover:underline">删除</button>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHistoryRecords = () => (
    <div className="p-4 space-y-4">
      <div className="relative pl-8 before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200">
        {[
          { title: '发起审批', user: '周末', time: '2024-03-20 10:00', status: '已完成' },
          { title: '部门审核', user: '张三', time: '2024-03-21 14:00', status: '已完成' },
          { title: '领导审批', user: '李四', time: '2024-03-22 09:00', status: '审批中' },
        ].map((record, index) => (
          <div key={index} className="mb-8 relative">
            <div className={cn(
              "absolute -left-[26px] top-1 w-4 h-4 rounded-full border-2 border-white z-10",
              record.status === '已完成' ? "bg-green-500" : "bg-blue-500"
            )}></div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">{record.title}</span>
                <span className="text-xs text-gray-500">{record.time}</span>
              </div>
              <div className="text-sm text-gray-600">操作人: {record.user}</div>
              <div className="text-sm text-gray-600">状态: {record.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVersionHistory = () => (
    <div className="p-4 space-y-4">
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-2 border-b">版本号</th>
              <th className="px-4 py-2 border-b">修改内容</th>
              <th className="px-4 py-2 border-b">修改人</th>
              <th className="px-4 py-2 border-b">修改时间</th>
              <th className="px-4 py-2 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2 border-b">V1.1</td>
              <td className="px-4 py-2 border-b">更新班组信息</td>
              <td className="px-4 py-2 border-b">周末</td>
              <td className="px-4 py-2 border-b">2024-03-21 16:00</td>
              <td className="px-4 py-2 border-b">
                <button className="text-blue-600 hover:underline">查看差异</button>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 border-b">V1.0</td>
              <td className="px-4 py-2 border-b">初始版本</td>
              <td className="px-4 py-2 border-b">周末</td>
              <td className="px-4 py-2 border-b">2024-03-20 10:00</td>
              <td className="px-4 py-2 border-b">
                <button className="text-blue-600 hover:underline">查看差异</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/project/list')}
            className="text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-lg">
            {isView ? '查看项目' : id ? '编辑项目' : '项目立项'}
          </h2>
        </div>
        {!isView && (
          <div className="flex gap-2">
            <button 
              onClick={() => handleSave('立项审批')}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
            >
              <Send size={14} /> 发起审批
            </button>
            <button 
              onClick={() => handleSave('草稿')}
              className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-600"
            >
              <Save size={14} /> 暂存
            </button>
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm transition-colors relative",
              activeTab === tab.id ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'project' && renderProjectInfo()}
        {activeTab === 'section' && renderSectionInfo()}
        {activeTab === 'team' && renderTeamInfo()}
        {activeTab === 'contract' && renderContractInfo()}
        {activeTab === 'approval' && renderApprovalInfo()}
        {activeTab === 'history' && renderHistoryRecords()}
        {activeTab === 'version' && renderVersionHistory()}
      </div>

      {/* Main Line Modal */}
      {showMainLineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">关联路段</h3>
              <button onClick={() => setShowMainLineModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto grid grid-cols-2 gap-4">
              <div className="border rounded">
                <div className="bg-gray-50 p-2 font-medium text-sm border-b">待选</div>
                <div className="p-2 space-y-1">
                  {MOCK_MAIN_LINES.filter(l => !formData.mainLines.includes(l.id)).map(line => (
                    <div key={line.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm">
                      <span>{line.code} - {line.abbr}</span>
                      <button 
                        onClick={() => setFormData({ ...formData, mainLines: [...formData.mainLines, line.id] })}
                        className="text-blue-600 hover:underline"
                      >
                        选择
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded">
                <div className="bg-gray-50 p-2 font-medium text-sm border-b">已选</div>
                <div className="p-2 space-y-1">
                  {formData.mainLines.map(id => {
                    const line = MOCK_MAIN_LINES.find(l => l.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm">
                        <span>{line?.code} - {line?.abbr}</span>
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, mainLines: prev.mainLines.filter(i => i !== id) }))}
                          className="text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowMainLineModal(false)} className="px-4 py-1.5 border rounded text-sm">取消</button>
              <button onClick={() => setShowMainLineModal(false)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">关联班组</h3>
              <button onClick={() => setShowTeamModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {MOCK_TEAMS.map(team => (
                  <label key={team.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.teams.includes(team.id)}
                      onChange={(e) => {
                        if (e.target.checked) setFormData({ ...formData, teams: [...formData.teams, team.id] });
                        else setFormData({ ...formData, teams: formData.teams.filter(id => id !== team.id) });
                      }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-gray-500">负责人: {team.leader} | 类型: {team.type}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowTeamModal(false)} className="px-4 py-1.5 border rounded text-sm">取消</button>
              <button onClick={() => setShowTeamModal(false)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">选择项目经理</h3>
              <button onClick={() => setShowManagerModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-2">
              {['张三', '李四', '王五', '赵六'].map(name => (
                <button
                  key={name}
                  onClick={() => {
                    setFormData({ ...formData, manager: name });
                    setShowManagerModal(false);
                  }}
                  className="w-full text-left p-2 hover:bg-blue-50 rounded transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nature Modal */}
      {showNatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">选择工程性质</h3>
              <button onClick={() => setShowNatureModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-2">
              {['专项工程', '日常养护', '应急抢修', '其他'].map(nature => (
                <button
                  key={nature}
                  onClick={() => {
                    setFormData({ ...formData, nature: nature });
                    setShowNatureModal(false);
                  }}
                  className="w-full text-left p-2 hover:bg-blue-50 rounded transition-colors"
                >
                  {nature}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Contract Selection Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[1000px] max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> 选择合同 (仅限状态：已确认)
              </h3>
              <button onClick={() => setShowContractModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 border-b">合同名称</th>
                      <th className="px-4 py-2 border-b">合同编号</th>
                      <th className="px-4 py-2 border-b">合同金额</th>
                      <th className="px-4 py-2 border-b">甲方/乙方</th>
                      <th className="px-4 py-2 border-b">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.filter(c => c.status === '已确认').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无已确认的合同</td>
                      </tr>
                    ) : (
                      contracts.filter(c => c.status === '已确认').map(contract => (
                        <tr key={contract.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border-b font-medium">{contract.name}</td>
                          <td className="px-4 py-2 border-b text-gray-500">{contract.code}</td>
                          <td className="px-4 py-2 border-b font-mono text-gray-600">
                            {contract.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 border-b text-xs text-gray-500">
                            <div>甲: {contract.partyA}</div>
                            <div>乙: {contract.partyB}</div>
                          </td>
                          <td className="px-4 py-2 border-b">
                            <button 
                              onClick={() => {
                                setFormData({ ...formData, contractId: contract.id, contractSigned: true });
                                setShowContractModal(false);
                              }}
                              className={cn(
                                "px-3 py-1 rounded text-xs",
                                formData.contractId === contract.id 
                                  ? "bg-green-100 text-green-700 font-bold" 
                                  : "text-blue-600 hover:bg-blue-50 border border-blue-200"
                              )}
                            >
                              {formData.contractId === contract.id ? '当前选择' : '选择'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button 
                onClick={() => setShowContractModal(false)}
                className="bg-gray-100 px-6 py-2 rounded text-sm hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
