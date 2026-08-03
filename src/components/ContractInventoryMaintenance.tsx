import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Eye, 
  UploadCloud, 
  Calendar, 
  FileSpreadsheet, 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  ChevronDown,
  Info,
  X,
  Search,
  Layers,
  FolderOpen,
  FolderLock,
  GitFork,
  ArrowDownWideNarrow,
  Sparkles,
  BookmarkCheck,
  Edit3,
  Clock,
  History
} from 'lucide-react';
import { Contract } from '../types';

interface ContractInventoryMaintenanceProps {
  contract: Contract;
  onBack?: () => void;
}

export interface ContractInventoryItem {
  id: string;
  code: string;       // 清单编号
  name: string;       // 项目名称
  unit: string;       // 单位
  price: number;      // 综合单价
  quantity: number;   // 清单数量
  amount: number;     // 报价合价 (数量 * 单价)
  remarks?: string;   // 备注
  isCategory?: boolean; // 是否是分类 (分类不需要录入单价、数量、金额)
  status?: 'confirmed' | 'pending'; // 清单确认状态：confirmed 已重新确认，pending 待确认
}

export interface ContractInventoryChangeLog {
  id: string;
  timestamp: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  type: 'create_item' | 'edit_item' | 'delete_item' | 'confirm_changes';
  operator: string;
  description: string;
  details?: {
    before?: Partial<ContractInventoryItem>;
    after?: Partial<ContractInventoryItem>;
  };
}

export interface ContractInventory {
  id: string;
  name: string;       // 清单名称
  year: string;       // 清单时间 (年份 or "不需选择时间")
  specialty: '不分专业' | '日常' | '专项'; // 清单专业
  uploadedFileName: string;
  fileSize: string;
  uploadedAt: string;
  itemCount: number;
  totalAmount: number;
  items: ContractInventoryItem[];
  changeLogs?: ContractInventoryChangeLog[]; // 历史修改记录
}

// Pre-defined Excel Mock Lists for user to "upload" with 1-click
const SAMPLE_EXCEL_FILES = [
  {
    fileName: '2025年杭州路段日常保洁维护大纲清单.xlsx',
    fileSize: '34.2 KB',
    specialty: '日常' as const,
    items: [
      { id: 'itm-1', code: 'A1-001', name: '人工清扫分隔带垃圾及沙尘', unit: 'km', price: 120.00, quantity: 450, amount: 54000 },
      { id: 'itm-2', code: 'A1-002', name: '波形护栏立柱日常洗刷清洁', unit: '柱', price: 4.50, quantity: 12000, amount: 54000 },
      { id: 'itm-3', code: 'A2-005', name: '边沟垃圾打捞及流泥深挖除淤', unit: 'm³', price: 75.00, quantity: 800, amount: 60000 },
      { id: 'itm-4', code: 'A3-010', name: '中央分带防眩板日常更换校准', unit: '块', price: 95.00, quantity: 400, amount: 38000 },
      { id: 'itm-5', code: 'A4-012', name: '日常病害应急保障抢修及坑洞填补', unit: 't', price: 1200.00, quantity: 80, amount: 96000 },
    ]
  },
  {
    fileName: '沪杭甬段路基斜边坡强力稳固重修工程清单.xlsx',
    fileSize: '41.8 KB',
    specialty: '专项' as const,
    items: [
      { id: 'itm-10', code: 'B2-011', name: '改性乳化沥青稀浆封层(微表处MS-3)', unit: '㎡', price: 32.00, quantity: 35000, amount: 1120000 },
      { id: 'itm-11', code: 'B3-005', name: '特种高强度路基防滑主动格栅防护网网面复盖', unit: '㎡', price: 185.00, quantity: 4000, amount: 740000 },
      { id: 'itm-12', code: 'B3-008', name: '路面大面积裂隙专用环氧胶泥充填', unit: 'kg', price: 65.00, quantity: 1500, amount: 97500 },
      { id: 'itm-13', code: 'B4-020', name: '旧沥青混凝土路面中重型精细冷铣刨(厚5cm)', unit: '㎡', price: 15.00, quantity: 20000, amount: 300000 },
    ]
  },
  {
    fileName: '全路段常规综合通用项目规划清单.xlsx',
    fileSize: '28.9 KB',
    specialty: '不分专业' as const,
    items: [
      { id: 'itm-20', code: 'C1-001', name: '路政设施损坏备用材料件采购及储备', unit: '套', price: 450.00, quantity: 200, amount: 90000 },
      { id: 'itm-21', code: 'C2-004', name: '交安标志牌及高反光路牌特殊更换', unit: '块', price: 680.00, quantity: 150, amount: 102000 },
      { id: 'itm-22', code: 'C3-008', name: '绿植花草定期防病虫害高压打药', unit: 'km', price: 350.00, quantity: 300, amount: 105000 },
    ]
  }
];

export default function ContractInventoryMaintenance({ contract, onBack }: ContractInventoryMaintenanceProps) {
  // 1. Core Inventories state
  const [inventories, setInventories] = useState<ContractInventory[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<ContractInventory | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Tab views and Tree controls
  const [activeViewTab, setActiveViewTab] = useState<'files' | 'merged'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedSpecialties, setExpandedSpecialties] = useState<Record<string, boolean>>({});

  // ITEM ADD / EDIT AND HISTORICAL TRACKING STATE
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContractInventoryItem | null>(null);
  const [itemFormCode, setItemFormCode] = useState('');
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormIsCategory, setItemFormIsCategory] = useState(false);
  const [itemFormUnit, setItemFormUnit] = useState('');
  const [itemFormPrice, setItemFormPrice] = useState('0');
  const [itemFormQuantity, setItemFormQuantity] = useState('0');
  const [itemFormRemarks, setItemFormRemarks] = useState('');

  const [detailTab, setDetailTab] = useState<'items' | 'logs'>('items');
  const [expandedItemHistoryId, setExpandedItemHistoryId] = useState<string | null>(null);

  // 2. Modal Open state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 3. Form state
  const [formName, setFormName] = useState('');
  const [formSpecialty, setFormSpecialty] = useState<'不分专业' | '日常' | '专项'>('不分专业');
  const [formYear, setFormYear] = useState('');
  const [chosenFile, setChosenFile] = useState<typeof SAMPLE_EXCEL_FILES[0] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load contract performance dates (defaulting if not exist)
  const startDateStr = contract.performanceStartDate || '2024-01-01';
  const endDateStr = contract.performanceEndDate || '2026-12-31';

  // Calculate year range helper
  const startYear = parseInt(startDateStr.split(/[-/]/)[0], 10) || 2024;
  const endYear = parseInt(endDateStr.split(/[-/]/)[0], 10) || 2026;
  const isCrossYear = startYear !== endYear;

  // Set default year on mount or contract change
  useEffect(() => {
    if (!isCrossYear) {
      setFormYear(String(startYear));
    } else {
      setFormYear(''); // requires select or default choice
    }
  }, [contract, isCrossYear, startYear]);

  // Read local storage on initial load
  useEffect(() => {
    const key = `CONTRACT_INVENTORIES_${contract.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setInventories(JSON.parse(saved));
    } else {
      // Seed with default initial data for illustration
      const seedData: ContractInventory[] = [
        {
          id: `seed-inv-1-${contract.id}`,
          name: `${contract.name} 第一期日常保养清单`,
          year: !isCrossYear ? String(startYear) : String(startYear + 1),
          specialty: '日常',
          uploadedFileName: '2025年杭州路段日常保洁维护大纲清单.xlsx',
          fileSize: '34.2 KB',
          uploadedAt: '2026-06-12 11:24',
          itemCount: 5,
          totalAmount: 302000,
          items: SAMPLE_EXCEL_FILES[0].items
        },
        {
          id: `seed-inv-2-${contract.id}`,
          name: `${contract.name} 重点应急抢修保障专项清单`,
          year: !isCrossYear ? String(startYear) : '不需选择时间',
          specialty: '专项',
          uploadedFileName: '沪杭甬段路基斜边坡强力稳固重修工程清单.xlsx',
          fileSize: '41.8 KB',
          uploadedAt: '2026-06-14 16:50',
          itemCount: 4,
          totalAmount: 2257500,
          items: SAMPLE_EXCEL_FILES[1].items
        }
      ];
      setInventories(seedData);
      localStorage.setItem(key, JSON.stringify(seedData));
    }
  }, [contract.id, isCrossYear, startYear, contract.name]);

  // Auto-expand all tree nodes when inventories are loaded
  useEffect(() => {
    const yearsState: Record<string, boolean> = {};
    const specsState: Record<string, boolean> = {};
    inventories.forEach(inv => {
      const yearStr = inv.year === '不需选择时间' ? '通用年度' : `${inv.year}年`;
      const specStr = inv.specialty || '不分专业';
      yearsState[yearStr] = true;
      specsState[`${yearStr}-${specStr}`] = true;
    });
    setExpandedYears(yearsState);
    setExpandedSpecialties(specsState);
  }, [inventories]);

  // Sync to local storage on change
  const saveInventoriesLocally = (updated: ContractInventory[]) => {
    setInventories(updated);
    localStorage.setItem(`CONTRACT_INVENTORIES_${contract.id}`, JSON.stringify(updated));
  };

  // Generate Year Selection List for Dropdowns
  const getYearOptions = () => {
    const list: string[] = [];
    for (let y = Math.min(startYear, endYear); y <= Math.max(startYear, endYear); y++) {
      list.push(String(y));
    }
    return list;
  };

  const handleOpenCreateModal = () => {
    setIsModalOpen(true);
    setFormName('');
    setFormSpecialty('不分专业');
    if (!isCrossYear) {
      setFormYear(String(startYear));
    } else {
      setFormYear('');
    }
    setChosenFile(null);
  };

  // Trigger quick seed simulation
  const handleQuickSelectFile = (fileIndex: number) => {
    const selected = SAMPLE_EXCEL_FILES[fileIndex];
    setChosenFile(selected);
    setFormSpecialty(selected.specialty);
    // Auto-fill template name if empty
    if (!formName) {
      const yearAffix = formYear && formYear !== '不需选择时间' ? `${formYear}年` : '';
      setFormName(`${contract.name}${yearAffix}${selected.specialty}清单`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Drop mock simulation: choose the first sample file randomly
    const randomIdx = Math.floor(Math.random() * SAMPLE_EXCEL_FILES.length);
    handleQuickSelectFile(randomIdx);
  };

  // Handle Inventory deletion
  const handleDeleteInventory = (invId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(invId);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    const invId = deleteConfirmId;
    const updated = inventories.filter(inv => inv.id !== invId);
    saveInventoriesLocally(updated);
    if (selectedInventory && selectedInventory.id === invId) {
      setIsDetailOpen(false);
      setSelectedInventory(null);
    }
    setDeleteConfirmId(null);
  };

  // Form Submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('请填写清单名称');
      return;
    }
    if (isCrossYear && !formYear) {
      alert('请选择清单关联时间');
      return;
    }
    if (!chosenFile) {
      alert('请进行清单Excel文件上传！');
      return;
    }

    const totalVal = chosenFile.items.reduce((sum, item) => sum + item.amount, 0);

    const newInventory: ContractInventory = {
      id: `inv-${Date.now()}`,
      name: formName.trim(),
      year: isCrossYear ? formYear : String(startYear),
      specialty: formSpecialty,
      uploadedFileName: chosenFile.fileName,
      fileSize: chosenFile.fileSize,
      uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      itemCount: chosenFile.items.length,
      totalAmount: totalVal,
      items: chosenFile.items.map((it, idx) => ({
        ...it,
        id: `itm-${Date.now()}-${idx}`,
        status: 'confirmed' as const
      })),
      changeLogs: []
    };

    const updated = [newInventory, ...inventories];
    saveInventoriesLocally(updated);
    setIsModalOpen(false);
    alert('合同清单创建且上传解析成功！');
  };

  // Open Add/Edit Item modal helper
  const handleOpenItemModal = (item: ContractInventoryItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setItemFormCode(item.code);
      setItemFormName(item.name);
      setItemFormIsCategory(!!item.isCategory);
      setItemFormUnit(item.unit || '');
      setItemFormPrice(String(item.price));
      setItemFormQuantity(String(item.quantity));
      setItemFormRemarks(item.remarks || '');
    } else {
      setEditingItem(null);
      const items = selectedInventory?.items || [];
      let nextCode = '';
      if (items.length > 0) {
        const lastCode = items[items.length - 1].code;
        const match = lastCode.match(/^(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10) + 1;
          const pad = match[2].length;
          nextCode = prefix + String(num).padStart(pad, '0');
        }
      }
      setItemFormCode(nextCode || '100-001');
      setItemFormName('');
      setItemFormIsCategory(false);
      setItemFormUnit('');
      setItemFormPrice('0');
      setItemFormQuantity('0');
      setItemFormRemarks('');
    }
    setIsItemModalOpen(true);
  };

  // Save/Update Item logic
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormCode.trim() || !itemFormName.trim()) {
      alert('请填写清单编号和项目名称！');
      return;
    }
    if (!selectedInventory) return;

    const isCat = itemFormIsCategory;
    const priceVal = isCat ? 0 : Number(itemFormPrice) || 0;
    const qtyVal = isCat ? 0 : Number(itemFormQuantity) || 0;
    const amountVal = priceVal * qtyVal;

    let updatedItems = [...(selectedInventory.items || [])];
    let logs = [...(selectedInventory.changeLogs || [])];
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const operator = "周末";

    if (editingItem) {
      const idx = updatedItems.findIndex(it => it.id === editingItem.id);
      if (idx !== -1) {
        const before = { ...updatedItems[idx] };
        const after: ContractInventoryItem = {
          ...before,
          code: itemFormCode.trim(),
          name: itemFormName.trim(),
          isCategory: isCat,
          unit: isCat ? '' : itemFormUnit.trim(),
          price: priceVal,
          quantity: qtyVal,
          amount: amountVal,
          remarks: itemFormRemarks.trim(),
          status: 'pending' // Modified/newly added is set to pending for confirmation
        };

        updatedItems[idx] = after;

        // Formulate detail log description
        const changes: string[] = [];
        if (before.code !== after.code) changes.push(`【编号】从"${before.code}"修改为"${after.code}"`);
        if (before.name !== after.name) changes.push(`【项目名称】从"${before.name}"修改为"${after.name}"`);
        if (before.isCategory !== after.isCategory) {
          changes.push(`【类型】从"${before.isCategory ? '分类' : '细目'}"修改为"${after.isCategory ? '分类' : '细目'}"`);
        }
        if (!after.isCategory) {
          if (before.unit !== after.unit) changes.push(`【单位】从"${before.unit || '空'}"修改为"${after.unit || '空'}"`);
          if (before.price !== after.price) changes.push(`【单价】从¥${before.price}修改为¥${after.price}`);
          if (before.quantity !== after.quantity) changes.push(`【数量】从${before.quantity}修改为${after.quantity}`);
        }

        const description = changes.length > 0 
          ? `修改清单项 [${before.code}] ${before.name}: ${changes.join(', ')}`
          : `修改清单项 [${before.code}] ${before.name} (基本信息保存)`;

        const newLog: ContractInventoryChangeLog = {
          id: `log-${Date.now()}`,
          timestamp,
          itemId: editingItem.id,
          itemCode: before.code,
          itemName: before.name,
          type: 'edit_item',
          operator,
          description,
          details: { before, after }
        };

        logs = [newLog, ...logs];
      }
    } else {
      const newItem: ContractInventoryItem = {
        id: `itm-${Date.now()}`,
        code: itemFormCode.trim(),
        name: itemFormName.trim(),
        isCategory: isCat,
        unit: isCat ? '' : itemFormUnit.trim(),
        price: priceVal,
        quantity: qtyVal,
        amount: amountVal,
        remarks: itemFormRemarks.trim(),
        status: 'pending' // Needs re-confirmation
      };

      updatedItems.push(newItem);

      const description = `新增清单子目 [${newItem.code}] ${newItem.name} (${newItem.isCategory ? '部段分类' : '清单细目: 单价¥' + newItem.price + ', 数量' + newItem.quantity})`;
      const newLog: ContractInventoryChangeLog = {
        id: `log-${Date.now()}`,
        timestamp,
        itemId: newItem.id,
        itemCode: newItem.code,
        itemName: newItem.name,
        type: 'create_item',
        operator,
        description,
        details: { after: newItem }
      };

      logs = [newLog, ...logs];
    }

    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.isCategory ? 0 : item.amount), 0);
    const itemCount = updatedItems.length;

    const updatedInventory: ContractInventory = {
      ...selectedInventory,
      totalAmount,
      itemCount,
      items: updatedItems,
      changeLogs: logs
    };

    setSelectedInventory(updatedInventory);
    setIsItemModalOpen(false);

    // Save to global list
    const updatedInvs = inventories.map(inv => inv.id === selectedInventory.id ? updatedInventory : inv);
    saveInventoriesLocally(updatedInvs);
  };

  // Confirm single item modification
  const handleConfirmSingleItem = (itemId: string) => {
    if (!selectedInventory) return;
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const operator = "周末";

    const updatedItems = selectedInventory.items.map(itm => {
      if (itm.id === itemId) {
        return { ...itm, status: 'confirmed' as const };
      }
      return itm;
    });

    const targetItem = selectedInventory.items.find(itm => itm.id === itemId);
    if (!targetItem) return;

    const newLog: ContractInventoryChangeLog = {
      id: `log-${Date.now()}`,
      timestamp,
      itemId,
      itemCode: targetItem.code,
      itemName: targetItem.name,
      type: 'confirm_changes',
      operator,
      description: `确认清单项 [${targetItem.code}] ${targetItem.name} 的修改，变动已重新确认归档`
    };

    const updatedInventory: ContractInventory = {
      ...selectedInventory,
      items: updatedItems,
      changeLogs: [newLog, ...(selectedInventory.changeLogs || [])]
    };

    setSelectedInventory(updatedInventory);
    const updatedInvs = inventories.map(inv => inv.id === selectedInventory.id ? updatedInventory : inv);
    saveInventoriesLocally(updatedInvs);
  };

  // Confirm entire inventory modifications
  const handleConfirmEntireInventory = () => {
    if (!selectedInventory) return;
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const operator = "周末";

    const updatedItems = selectedInventory.items.map(itm => ({
      ...itm,
      status: 'confirmed' as const
    }));

    const newLog: ContractInventoryChangeLog = {
      id: `log-${Date.now()}`,
      timestamp,
      type: 'confirm_changes',
      operator,
      description: `一键重新确认整个清单 [${selectedInventory.name}] 的所有新增或修改变动`
    };

    const updatedInventory: ContractInventory = {
      ...selectedInventory,
      items: updatedItems,
      changeLogs: [newLog, ...(selectedInventory.changeLogs || [])]
    };

    setSelectedInventory(updatedInventory);
    const updatedInvs = inventories.map(inv => inv.id === selectedInventory.id ? updatedInventory : inv);
    saveInventoriesLocally(updatedInvs);
    alert('整个清单已重新确认成功！');
  };

  // Delete item from inventory
  const handleDeleteItemFromInventory = (itemId: string) => {
    if (!selectedInventory) return;
    if (!window.confirm('您确定要从当前清单中删除该项目吗？此删除也将记录进修改历史。')) return;

    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const operator = "周末";
    const targetItem = selectedInventory.items.find(itm => itm.id === itemId);
    if (!targetItem) return;

    const updatedItems = selectedInventory.items.filter(itm => itm.id !== itemId);

    const newLog: ContractInventoryChangeLog = {
      id: `log-${Date.now()}`,
      timestamp,
      itemId,
      itemCode: targetItem.code,
      itemName: targetItem.name,
      type: 'delete_item',
      operator,
      description: `删除清单项 [${targetItem.code}] ${targetItem.name}`,
      details: { before: targetItem }
    };

    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.isCategory ? 0 : item.amount), 0);
    const itemCount = updatedItems.length;

    const updatedInventory: ContractInventory = {
      ...selectedInventory,
      totalAmount,
      itemCount,
      items: updatedItems,
      changeLogs: [newLog, ...(selectedInventory.changeLogs || [])]
    };

    setSelectedInventory(updatedInventory);
    const updatedInvs = inventories.map(inv => inv.id === selectedInventory.id ? updatedInventory : inv);
    saveInventoriesLocally(updatedInvs);
  };

  // Grouping structure for merged tree
  interface MergedYearGroup {
    year: string;       // normalized e.g., '2025年' or '通用年度'
    specialties: {
      specialty: string; // '日常' | '专项' | '不分专业'
      items: Array<{
        item: ContractInventoryItem;
        sourceInventoryName: string;
      }>;
    }[];
  }

  // Helper to compile tree and filter items by search query
  const getFilteredMergedTree = (): MergedYearGroup[] => {
    const yearMap = new Map<string, Map<string, Array<{ item: ContractInventoryItem; sourceInventoryName: string }>>>();

    inventories.forEach(inv => {
      const yearStr = inv.year === '不需选择时间' ? '通用年度' : `${inv.year}年`;
      const specStr = inv.specialty || '不分专业';

      inv.items.forEach(itm => {
        // filter by search query if exists
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesCode = itm.code.toLowerCase().includes(query);
          const matchesName = itm.name.toLowerCase().includes(query);
          if (!matchesCode && !matchesName) {
            return; // skip if doesn't match
          }
        }

        if (!yearMap.has(yearStr)) {
          yearMap.set(yearStr, new Map());
        }
        const specMap = yearMap.get(yearStr)!;
        if (!specMap.has(specStr)) {
          specMap.set(specStr, []);
        }
        specMap.get(specStr)!.push({
          item: itm,
          sourceInventoryName: inv.name
        });
      });
    });

    const sortedYears: MergedYearGroup[] = [];
    const yearKeys = Array.from(yearMap.keys()).sort((a, b) => {
      if (a === '通用年度') return 1;
      if (b === '通用年度') return -1;
      return a.localeCompare(b);
    });

    yearKeys.forEach(yk => {
      const specMap = yearMap.get(yk)!;
      const specialties: MergedYearGroup['specialties'] = [];
      const specKeys = Array.from(specMap.keys()).sort((a, b) => {
        const order: Record<string, number> = { '日常': 1, '专项': 2, '不分专业': 3 };
        const orderA = order[a] || 99;
        const orderB = order[b] || 99;
        return orderA - orderB;
      });

      specKeys.forEach(sk => {
        specialties.push({
          specialty: sk,
          items: specMap.get(sk)!
        });
      });

      sortedYears.push({
        year: yk,
        specialties
      });
    });

    return sortedYears;
  };

  const expandAllNodes = (tree: MergedYearGroup[]) => {
    const yearsState: Record<string, boolean> = {};
    const specsState: Record<string, boolean> = {};
    tree.forEach(y => {
      yearsState[y.year] = true;
      y.specialties.forEach(s => {
        specsState[`${y.year}-${s.specialty}`] = true;
      });
    });
    setExpandedYears(yearsState);
    setExpandedSpecialties(specsState);
  };

  const collapseAllNodes = () => {
    setExpandedYears({});
    setExpandedSpecialties({});
  };

  const toggleYear = (yr: string) => {
    setExpandedYears(prev => ({ ...prev, [yr]: !prev[yr] }));
  };

  const toggleSpecialty = (yr: string, spec: string) => {
    const key = `${yr}-${spec}`;
    setExpandedSpecialties(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderMergedInventoryView = () => {
    const tree = getFilteredMergedTree();
    
    // Calculate global stats across filtered tree
    let totalItems = 0;
    let totalAmountVal = 0;
    const yearsSet = new Set<string>();
    const specialtiesSet = new Set<string>();

    tree.forEach(y => {
      yearsSet.add(y.year);
      y.specialties.forEach(spec => {
        specialtiesSet.add(spec.specialty);
        totalItems += spec.items.length;
        spec.items.forEach(itm => {
          totalAmountVal += itm.item.amount;
        });
      });
    });

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Helper bar & search */}
        <div className="bg-white border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="搜索清单子目名目、清单编号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white pl-9 pr-3 py-2 text-xs rounded-lg font-semibold transition-all text-slate-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={14} className="cursor-pointer" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => expandAllNodes(tree)}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-lg text-xs font-bold border border-blue-150 transition-colors cursor-pointer"
            >
              一键全部展开
            </button>
            <button
              type="button"
              onClick={collapseAllNodes}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
            >
              一键全部收起
            </button>
          </div>
        </div>

        {/* Stats segment cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-3 rounded-xl shadow-3xs">
            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">合并估算总额 (元)</span>
            <span className="text-sm font-black text-rose-600 font-mono block mt-1">
              ¥{totalAmountVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-3 rounded-xl shadow-3xs">
            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">合并关联清单细目</span>
            <span className="text-sm font-black text-slate-800 font-mono block mt-1">
              {totalItems} <span className="text-[10px] text-slate-400 font-bold">项明细</span>
            </span>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-3 rounded-xl shadow-3xs">
            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">覆盖结算执行年份</span>
            <span className="text-sm font-black text-teal-600 font-mono block mt-1">
              {yearsSet.size} <span className="text-[10px] text-slate-400 font-bold">个年度</span>
            </span>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-3 rounded-xl shadow-3xs">
            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">涉及专业科目分类</span>
            <span className="text-sm font-black text-purple-600 font-mono block mt-1">
              {specialtiesSet.size} <span className="text-[10px] text-slate-450 font-bold">类专业</span>
            </span>
          </div>
        </div>

        {/* Dynamic tree table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 w-44 border-r border-slate-150">
                    <span className="flex items-center gap-1.5"><Layers size={13} className="text-blue-500 stroke-[2.5]" /> 年份</span>
                  </th>
                  <th className="p-3 w-36 border-r border-slate-150">
                    <span className="flex items-center gap-1.5"><GitFork size={13} className="text-emerald-500 stroke-[2.5]" /> 专业</span>
                  </th>
                  <th className="p-3 w-32 border-r border-slate-150">清单编号</th>
                  <th className="p-3 border-r border-slate-150 min-w-[240px]">清单子目(项目描述名目)</th>
                  <th className="p-3 text-center w-16 border-r border-slate-150">单位</th>
                  <th className="p-3 text-right w-24 border-r border-slate-150">综合单价</th>
                  <th className="p-3 text-right w-20 border-r border-slate-150">数量</th>
                  <th className="p-3 text-right w-28 border-r border-slate-150">报价合价</th>
                  <th className="p-3 w-48 text-slate-450 font-bold">归属原始清单</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {tree.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center text-slate-400 font-bold bg-slate-50/20">
                      <div className="max-w-md mx-auto space-y-2">
                        <BookmarkCheck size={36} className="mx-auto text-slate-300" />
                        <p className="text-xs text-slate-500">暂未匹配到任何合并清单数据</p>
                        <p className="text-[10px] text-slate-400 font-normal">请确保您已至少创建或导入了一份清单条目，或尝试更改当前的过滤关键字。</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tree.map((yrGroup) => {
                    const isYearExpanded = !!expandedYears[yrGroup.year];
                    
                    // Calculate aggregates under this year
                    let yrItemsCount = 0;
                    let yrAmount = 0;
                    yrGroup.specialties.forEach(sp => {
                      yrItemsCount += sp.items.length;
                      sp.items.forEach(it => { yrAmount += it.item.amount; });
                    });

                    return (
                      <React.Fragment key={yrGroup.year}>
                        {/* 1. Year Row (Level 1) */}
                        <tr className="bg-slate-50/80 hover:bg-slate-100/60 transition-colors font-bold group border-b border-slate-150/50">
                          {/* Col 1: Year text with expand toggler */}
                          <td className="p-3 border-r border-slate-150 font-black text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleYear(yrGroup.year)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer transition-all"
                              >
                                {isYearExpanded ? <ChevronDown size={14} className="stroke-[3]" /> : <ChevronRight size={14} className="stroke-[3]" />}
                              </button>
                              <span className="text-slate-850 text-sm tracking-tight">{yrGroup.year}</span>
                              <span className="inline-flex items-center gap-1 ml-2 text-[9px] bg-blue-50 border border-blue-150 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                                + | {yrGroup.specialties.length} 专业
                              </span>
                            </div>
                          </td>
                          {/* Empty spacer cols but structured */}
                          <td className="p-3 border-r border-slate-150"></td>
                          <td className="p-3 border-r border-slate-150"></td>
                          <td className="p-3 border-r border-slate-150 text-slate-500 font-bold text-xs">包含 {yrItemsCount} 个清单明细子目</td>
                          <td className="p-3 text-center border-r border-slate-150 text-slate-400">—</td>
                          <td className="p-3 text-right border-r border-slate-150 text-slate-400">—</td>
                          <td className="p-3 text-right border-r border-slate-150 text-slate-400">—</td>
                          <td className="p-3 text-right border-r border-slate-150 font-mono text-slate-900 font-extrabold text-sm">
                            ¥{yrAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-450 font-bold text-[10px]">年度内多清单执行合并</td>
                        </tr>

                        {/* Rendering specialties only if Year expanded */}
                        {isYearExpanded && yrGroup.specialties.map((spec) => {
                          const specKey = `${yrGroup.year}-${spec.specialty}`;
                          const isSpecExpanded = !!expandedSpecialties[specKey];
                          
                          let specAmount = 0;
                          spec.items.forEach(it => { specAmount += it.item.amount; });

                          return (
                            <React.Fragment key={spec.specialty}>
                              {/* 2. Specialty Row (Level 2) */}
                              <tr className="bg-white hover:bg-slate-50/60 transition-colors font-bold group border-b border-slate-100">
                                {/* Col 1: Vertical dotted outline guide line */}
                                <td className="p-0 border-r border-slate-155 align-stretch relative">
                                  <div className="absolute top-0 bottom-0 left-[23px] w-px border-l border-dashed border-slate-200"></div>
                                  <div className="w-full h-full min-h-[38px] flex items-center pl-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 z-10 -ml-1"></div>
                                  </div>
                                </td>
                                
                                {/* Col 2: Specialty dropdown toggler and badges */}
                                <td className="p-3 border-r border-slate-150 text-slate-705 font-bold bg-slate-50/15">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleSpecialty(yrGroup.year, spec.specialty)}
                                      className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer transition-all"
                                    >
                                      {isSpecExpanded ? <ChevronDown size={13} className="stroke-[2.5]" /> : <ChevronRight size={13} className="stroke-[2.5]" />}
                                    </button>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                      spec.specialty === '日常' ? 'bg-teal-50 border-teal-200 text-teal-650 font-extrabold' :
                                      spec.specialty === '专项' ? 'bg-purple-50 border-purple-200 text-purple-650 font-extrabold' :
                                      'bg-slate-50 border-slate-250 text-slate-600 font-extrabold'
                                    }`}>
                                      {spec.specialty}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 border border-slate-200 text-slate-505 font-bold px-1.5 py-0.5 rounded ml-1">
                                      + | {spec.items.length} 细目
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 text-center border-r border-slate-150 text-slate-400">—</td>
                                <td className="p-3 text-right border-r border-slate-150 text-slate-400">—</td>
                                <td className="p-3 text-right border-r border-slate-150 text-slate-400">—</td>
                                <td className="p-3 text-right border-r border-slate-150 font-mono text-slate-800 font-bold">
                                  ¥{specAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-slate-400 font-medium text-[10px]">专业类别小计</td>
                              </tr>

                              {/* 3. Items Rows (Level 3) only if both Expanded */}
                              {isSpecExpanded && spec.items.map((itmObj, idx) => {
                                const { item, sourceInventoryName } = itmObj;
                                const isLastItem = idx === spec.items.length - 1;

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group/item leading-relaxed">
                                    {/* Column 1: Parent-Year guide line */}
                                    <td className="p-0 border-r border-slate-150 align-stretch relative">
                                      <div className="absolute top-0 bottom-0 left-[23.5px] w-px border-l border-dashed border-slate-300"></div>
                                      <div className="w-full h-full min-h-[36px]"></div>
                                    </td>
                                    
                                    {/* Column 2: Specialty guide line (forming beautiful nested tree-branches) */}
                                    <td className="p-0 border-r border-slate-150 align-stretch relative">
                                      {/* Vertical main continuation lines */}
                                      <div className="absolute top-0 bottom-0 left-[23.5px] w-px border-l border-dashed border-slate-300"></div>
                                      
                                      {/* Sub-item specific guide line */}
                                      <div className={`absolute top-0 ${isLastItem ? 'h-[18px]' : 'bottom-0'} left-[44px] w-px border-l border-dashed border-slate-300`}></div>
                                      <div className="absolute top-[18px] left-[44px] w-4.5 h-px border-t border-dashed border-slate-300"></div>
                                      <div className="w-full h-full min-h-[36px]"></div>
                                    </td>

                                    {/* Column 3: Item Code */}
                                    <td className="p-2.5 font-mono font-bold text-slate-600 border-r border-slate-150 text-[11px] bg-slate-50/20 select-all">
                                      {item.code}
                                    </td>

                                    {/* Column 4: Item Name / Description */}
                                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-155">
                                      <div className="line-clamp-1 group-hover/item:text-blue-600 transition-all font-sans" title={item.name}>
                                        {item.name}
                                      </div>
                                    </td>

                                    {/* Column 5: Unit */}
                                    <td className="p-2.5 text-center font-bold text-slate-500 border-r border-slate-150">
                                      {item.unit || '—'}
                                    </td>

                                    {/* Column 6: Unit Price */}
                                    <td className="p-2.5 text-right font-mono text-slate-600 border-r border-slate-150">
                                      ¥{item.price.toFixed(2)}
                                    </td>

                                    {/* Column 7: Quantity */}
                                    <td className="p-2.5 text-right font-mono font-bold text-slate-700 border-r border-slate-150">
                                      {item.quantity.toLocaleString()}
                                    </td>

                                    {/* Column 8: Amount */}
                                    <td className="p-2.5 text-right font-mono font-black text-blue-600 border-r border-slate-150 bg-blue-50/5">
                                      ¥{item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                    </td>

                                    {/* Column 9: Source */}
                                    <td className="p-2.5 text-slate-400 font-medium truncate max-w-[160px] text-[10px] select-none" title={sourceInventoryName}>
                                      {sourceInventoryName}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {onBack && (
        <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-3xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-150 bg-white"
              title="返回合同清单列表"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-sm font-black text-slate-800">【合同清单维护】{contract.name}</h2>
              <p className="text-[10px] text-slate-450 mt-0.5">合同编号: {contract.code} | 金额: ¥{contract.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-650 px-2.5 py-1 rounded-full font-black">
            执行维护中
          </span>
        </div>
      )}

      {/* 2. CONTRACT PERFORMANCE CONDUIT */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-bold text-slate-450 uppercase tracking-widest">当前合同履约时间范围</div>
          <div className="flex items-center gap-2 mt-1">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm font-mono font-black text-slate-700">
              {startDateStr} ~ {endDateStr}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              isCrossYear 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-teal-50 text-teal-600 border-teal-200'
            }`}>
              {isCrossYear ? '跨年度合同 (需提供具体执行年份选择)' : '单年度内合同 (默认选定该年分项)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            系统将自动根据该履约时间确定创建合同清单时的【清单时间】选项范围。
          </p>
        </div>

        {!isDetailOpen && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            创建合同清单
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CASE A: IS IN DETAILED INVENTORY VIEW */}
      {/* ==================================================================== */}
      {isDetailOpen && selectedInventory ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <button
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedInventory(null);
                setDetailTab('items');
                setExpandedItemHistoryId(null);
              }}
              className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              返回清单列表
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleDeleteInventory(selectedInventory.id)}
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 bg-red-50/50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="删除当前合同清单"
              >
                <Trash2 size={13} />
                删除当前清单
              </button>
              <div className="text-xs font-bold text-slate-400">
                清单编码/ID: <span className="font-mono">{selectedInventory.id}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">清单名称</span>
              <span className="text-xs font-bold text-gray-700 block mt-0.5">{selectedInventory.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">履约清单执行年度</span>
              <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                {selectedInventory.year === '不需选择时间' ? '不需选择时间' : `${selectedInventory.year}年`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">清单专业</span>
              <span className={`w-fit mt-1 px-2 py-0.5 rounded text-[10px] font-black border ${
                selectedInventory.specialty === '日常' ? 'bg-teal-50 border-teal-200 text-teal-600' :
                selectedInventory.specialty === '专项' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {selectedInventory.specialty}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">含税总估算价 (数×价累加)</span>
              <span className="text-sm font-extrabold text-blue-600 font-mono block mt-0.5">
                ¥{selectedInventory.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Sub-Tab navigation for selected Inventory detail */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50 border border-slate-200/75 p-3 rounded-xl gap-3 shadow-3xs">
            <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setDetailTab('items')}
                className={`px-3 py-1 rounded text-xs font-extrabold transition-all cursor-pointer ${
                  detailTab === 'items'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📋 清单科目明细 ({selectedInventory.items.length}项)
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('logs')}
                className={`px-3 py-1 rounded text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  detailTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={12} />
                整个清单修改历史记录 ({selectedInventory.changeLogs?.length || 0}条)
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              {detailTab === 'items' && (
                <>
                  {selectedInventory.items.some(item => item.status === 'pending') && (
                    <button
                      type="button"
                      onClick={handleConfirmEntireInventory}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                      一键重新确认全部修改
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenItemModal(null)}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    新增清单项
                  </button>
                </>
              )}
            </div>
          </div>

          {detailTab === 'logs' ? (
            /* CASE A1: LOGS TIMELINE FOR ENTIRE INVENTORY */
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-3xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <Clock size={15} className="text-purple-600" />
                  整个清单修改历史记录追溯档案
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">
                  记录包括：科目添加、细目编辑修改、子目删除、状态重新确认
                </span>
              </div>

              {(!selectedInventory.changeLogs || selectedInventory.changeLogs.length === 0) ? (
                <div className="text-center py-16 text-gray-400 font-bold text-xs">
                  ⚠️ 当前合同清单尚无任何修改记录（初始导入后未曾变更过）。
                </div>
              ) : (
                <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6 py-2">
                  {selectedInventory.changeLogs.map((log) => (
                    <div key={log.id} className="relative group/log">
                      {/* Timeline circle */}
                      <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-white ring-4 ring-purple-100 group-hover/log:scale-110 transition-transform"></div>
                      
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200/50">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${
                              log.type === 'create_item' ? 'bg-emerald-500' :
                              log.type === 'edit_item' ? 'bg-blue-500' :
                              log.type === 'delete_item' ? 'bg-red-500' :
                              'bg-purple-500'
                            }`}>
                              {log.type === 'create_item' ? '➕ 新增清单' :
                               log.type === 'edit_item' ? '📝 编辑修改' :
                               log.type === 'delete_item' ? '❌ 删除清单' :
                               '✓ 重新确认'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              经办人: <strong className="text-slate-800 font-black">{log.operator}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            ⏱️ {log.timestamp}
                          </span>
                        </div>

                        <p className="font-extrabold text-slate-800 leading-relaxed text-xs">
                          {log.description}
                        </p>

                        {/* Side by side Before & After comparisons */}
                        {log.details && (log.details.before || log.details.after) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 mt-2">
                            {log.details.before && (
                              <div className="space-y-1 md:border-r md:border-slate-200 md:pr-4">
                                <span className="text-gray-400 font-bold block text-[9px] uppercase">修改前 (Before)</span>
                                <div>清单编号: {log.details.before.code}</div>
                                <div>科目名称: {log.details.before.name}</div>
                                {log.details.before.isCategory ? (
                                  <div className="text-indigo-600 font-bold mt-1">[类型: 部段分类，不计金额数量]</div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-slate-600">
                                    <div>单位: {log.details.before.unit || '—'}</div>
                                    <div>单价: ¥{log.details.before.price}</div>
                                    <div>数量: {log.details.before.quantity}</div>
                                    <div className="text-rose-500 font-black">合价: ¥{log.details.before.amount?.toLocaleString()}</div>
                                  </div>
                                )}
                              </div>
                            )}
                            {log.details.after && (
                              <div className="space-y-1 md:pl-2">
                                <span className="text-purple-600 font-bold block text-[9px] uppercase">修改后 (After)</span>
                                <div>清单编号: {log.details.after.code}</div>
                                <div>科目名称: {log.details.after.name}</div>
                                {log.details.after.isCategory ? (
                                  <div className="text-indigo-600 font-bold mt-1">[类型: 部段分类，不计金额数量]</div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-slate-600">
                                    <div>单位: {log.details.after.unit || '—'}</div>
                                    <div>单价: ¥{log.details.after.price}</div>
                                    <div>数量: {log.details.after.quantity}</div>
                                    <div className="text-blue-600 font-black">合价: ¥{log.details.after.amount?.toLocaleString()}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CASE A2: TYPICAL ITEMS TABLE VIEW */
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-3xs">
              <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-black text-gray-700 flex items-center gap-1">
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  清单文件：{selectedInventory.uploadedFileName} ({selectedInventory.fileSize})
                </span>
                <span className="text-[10px] text-gray-450 font-medium">导入解析日期：{selectedInventory.uploadedAt}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-gray-650 font-bold border-b border-gray-100 select-none">
                    <tr>
                      <th className="p-3 text-center w-12">序号</th>
                      <th className="p-3 w-32">清单项目编号</th>
                      <th className="p-3 min-w-[200px]">项目名称(分类及细目名目)</th>
                      <th className="p-3 text-center w-24">计量单位</th>
                      <th className="p-3 text-right w-28">综合单价 (元)</th>
                      <th className="p-3 text-right w-24">数量</th>
                      <th className="p-3 text-right w-32">报价合价 (元)</th>
                      <th className="p-3 text-center w-36">状态与操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInventory.items.map((item, index) => {
                      const isCategory = !!item.isCategory;
                      const isPending = item.status === 'pending';
                      const hasLogs = (selectedInventory.changeLogs || []).some(l => l.itemId === item.id);
                      const isHistoryExpanded = expandedItemHistoryId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className={`transition-all ${
                            isCategory 
                              ? 'bg-slate-50/70 font-bold border-l-4 border-l-indigo-500' 
                              : 'hover:bg-slate-50/30'
                          }`}>
                            <td className="p-3 text-center font-mono font-bold text-gray-400">{index + 1}</td>
                            <td className="p-3 font-mono font-semibold text-slate-700">{item.code}</td>
                            <td className="p-3 font-bold text-gray-700">
                              <div className="flex items-center gap-2">
                                <span className={isCategory ? "text-indigo-950 text-[13px]" : "text-slate-800"}>
                                  {item.name}
                                </span>
                                {isCategory && (
                                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded-sm">
                                    分部分类
                                  </span>
                                )}
                                {isPending && (
                                  <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-sm animate-pulse flex items-center">
                                    ⚠️ 待重新确认
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-medium text-slate-505">
                              {isCategory ? '—' : (item.unit || '—')}
                            </td>
                            <td className="p-3 text-right font-mono text-gray-600">
                              {isCategory ? '—' : `¥${item.price.toFixed(2)}`}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                              {isCategory ? '—' : item.quantity.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-blue-600">
                              {isCategory ? '—' : `¥${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmSingleItem(item.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-250 transition-colors"
                                    title="点击重新确认"
                                  >
                                    <Check size={12} className="stroke-[3]" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenItemModal(item)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                                  title="编辑信息"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItemFromInventory(item.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                                  title="彻底删除"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedItemHistoryId(isHistoryExpanded ? null : item.id)}
                                  className={`p-1 rounded border transition-colors ${
                                    hasLogs 
                                      ? 'text-purple-600 border-purple-200 hover:bg-purple-50' 
                                      : 'text-gray-300 border-gray-150 hover:bg-gray-50'
                                  }`}
                                  title="单项修改历史对照"
                                >
                                  <Clock size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Individual Item History Comparison */}
                          {isHistoryExpanded && (
                            <tr className="bg-purple-50/10">
                              <td colSpan={8} className="p-4 border-l-4 border-l-purple-400">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-black text-purple-900 flex items-center gap-1.5">
                                    <History size={13} className="text-purple-600 animate-spin-slow" />
                                    清单编号 [ {item.code} ] - {item.name} 的修改历史及修改前/后对照
                                  </div>
                                  {(() => {
                                    const logs = (selectedInventory.changeLogs || []).filter(l => l.itemId === item.id);
                                    if (logs.length === 0) {
                                      return (
                                        <div className="text-[10px] text-gray-400 font-bold italic py-2 pl-4">
                                          暂无该单项的修改历史记录（初始导入后未曾变更）。
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="space-y-2 pl-4 border-l border-purple-200 ml-1.5">
                                        {logs.map((log) => (
                                          <div key={log.id} className="text-[11px] bg-white p-3 rounded-lg border border-purple-100 shadow-3xs space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                              <span className="text-purple-700 font-black">📝 经办人: {log.operator}</span>
                                              <span>⏱️ {log.timestamp}</span>
                                            </div>
                                            <p className="font-extrabold text-slate-800 text-xs">
                                              {log.description}
                                            </p>
                                            {log.details && (log.details.before || log.details.after) && (
                                              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded border border-slate-150 font-mono text-[10px] text-slate-600 mt-1">
                                                {log.details.before && (
                                                  <div className="space-y-0.5 border-r border-slate-200/60 pr-2">
                                                    <span className="text-slate-400 font-bold block text-[8px] uppercase mb-1">修改前 (Before)</span>
                                                    <div>清单编号: {log.details.before.code}</div>
                                                    <div>项目名称: {log.details.before.name}</div>
                                                    {log.details.before.isCategory ? (
                                                      <div className="text-indigo-600 font-bold">[分类类型]</div>
                                                    ) : (
                                                      <>
                                                        <div>计量单位: {log.details.before.unit || '—'}</div>
                                                        <div>综合单价: ¥{log.details.before.price}</div>
                                                        <div>合同数量: {log.details.before.quantity}</div>
                                                        <div className="text-rose-500 font-black">估算合价: ¥{log.details.before.amount?.toLocaleString()}</div>
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                                {log.details.after && (
                                                  <div className="space-y-0.5 pl-2">
                                                    <span className="text-purple-600 font-bold block text-[8px] uppercase mb-1">修改后 (After)</span>
                                                    <div>清单编号: {log.details.after.code}</div>
                                                    <div>项目名称: {log.details.after.name}</div>
                                                    {log.details.after.isCategory ? (
                                                      <div className="text-indigo-600 font-bold">[分类类型]</div>
                                                    ) : (
                                                      <>
                                                        <div>计量单位: {log.details.after.unit || '—'}</div>
                                                        <div>综合单价: ¥{log.details.after.price}</div>
                                                        <div>合同数量: {log.details.after.quantity}</div>
                                                        <div className="text-blue-600 font-black">估算合价: ¥{log.details.after.amount?.toLocaleString()}</div>
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==================================================================== */
        /* CASE B: PRIMARY LISTING & MERGED SUMMARY TAB SWITCHER */
        /* ==================================================================== */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Workspace Tabs Navigation Option */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveViewTab('files')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  activeViewTab === 'files'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                📂 分项清单档案 ({inventories.length} 份)
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab('merged')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  activeViewTab === 'merged'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                📊 合同合并总清单 (级联预览)
              </button>
            </div>
            
            <div className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-lg">
              状态: 已整合并支持根据【年份】与【专业】二级分类级联
            </div>
          </div>

          {activeViewTab === 'files' ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  合同清单原始档案目录
                </h4>
                <span className="text-[10px] text-gray-400 font-medium">您可以为本合同分别上传多项不同年度或专业的工料清单</span>
              </div>

              {inventories.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl">
                  <FileSpreadsheet className="mx-auto text-gray-300 mb-2 stroke-[1.5]" size={36} />
                  <p className="text-xs font-bold text-gray-500">当前合同暂未维护任何清单项目</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-md mx-auto">
                    在施工日志和本日产值核算中需要依赖合同清单作为基准，请点击右上角按钮新建并在系统内解析上传清单。
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-4 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-150 border border-blue-200 text-blue-600 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                  >
                    点此快速创建
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventories.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedInventory(inv);
                        setIsDetailOpen(true);
                      }}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-3xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-650 px-2 py-0.5 rounded border border-blue-100 font-bold">
                            {inv.year === '不需选择时间' ? '不需选择时间' : `${inv.year} 年清单`}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inv.specialty === '日常' ? 'bg-teal-50 border-teal-100 text-teal-600' :
                            inv.specialty === '专项' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                            'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            {inv.specialty}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors" title={inv.name}>
                            {inv.name}
                          </h5>
                          <span className="text-[10px] text-gray-400 mt-1 block font-medium">
                            文件名: {inv.uploadedFileName}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold leading-none uppercase">总合价款 / 细木数</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xs font-black text-rose-600 font-mono">¥{inv.totalAmount.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-500 font-semibold">({inv.itemCount}项)</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteInventory(inv.id, e)}
                            className="p-1 px-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors text-[10px] font-bold"
                            title="删除此清单"
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            查看明细
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* RENDERS DYNAMIC NESTED CASCADE SUMMARY VIEW */
            renderMergedInventoryView()
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* CREATION MODAL DRAWER FOR CONTRACT INVENTORIES */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 bg-slate-50 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="text-blue-600" size={18} />
                创建合同清单
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form scroll view */}
            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Form Row: Contract info reminder */}
              <div className="p-3 bg-blue-50/50 border border-blue-105 rounded-xl space-y-1">
                <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wide">关联基础合同</span>
                <div className="font-bold text-slate-755 text-xs text-slate-700">{contract.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  履约时间: {startDateStr} 至 {endDateStr}
                </div>
              </div>

              {/* Form Row: Inventory Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">清单名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="请输入该份清单的核心名称，例如：2025年沥青路面维护清单"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 outline-none font-medium text-slate-700"
                />
              </div>

              {/* Form Row: Calendar Selection year & Specialty selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Inventory Calendar selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">清单限时/执行时间 <span className="text-rose-500">*</span></label>
                  
                  {!isCrossYear ? (
                    // IF NOT CROSS YEAR, lock as default!
                    <div className="bg-slate-100 border border-slate-200 text-slate-550 rounded-lg p-2.5 font-bold font-mono">
                      {startYear} 年 (履约不跨年，默认选定)
                    </div>
                  ) : (
                    // IF CROSS YEAR, provide years list + option "不需选择时间"
                    <select
                      value={formYear}
                      required
                      onChange={(e) => {
                        setFormYear(e.target.value);
                        // dynamically adjust title if empty
                        if (e.target.value) {
                          const yearText = e.target.value === '不需选择时间' ? '' : `${e.target.value}年`;
                          setFormName(`${contract.name}${yearText}${formSpecialty === '不分专业' ? '' : formSpecialty}清单`);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 outline-none font-semibold text-slate-755"
                    >
                      <option value="">-- 请选择清单年度 --</option>
                      {getYearOptions().map(y => (
                        <option key={y} value={y}>{y}年度</option>
                      ))}
                      <option value="不需选择时间">不需选择时间</option>
                    </select>
                  )}
                  <span className="text-[9px] text-gray-400 block">
                    * 依据履约起止年份限制自动调控。
                  </span>
                </div>

                {/* 2. Specialty Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">清单专业种类 <span className="text-rose-500">*</span></label>
                  <select
                    value={formSpecialty}
                    onChange={(e) => {
                      const sp = e.target.value as any;
                      setFormSpecialty(sp);
                      const yearText = formYear && formYear !== '不需选择时间' ? `${formYear}年` : '';
                      setFormName(`${contract.name}${yearText}${sp === '不分专业' ? '' : sp}清单`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 outline-none font-semibold text-slate-755"
                  >
                    <option value="不分专业">不分专业</option>
                    <option value="日常">日常 (日常保养/保洁/小修等)</option>
                    <option value="专项">专项 (中大修/保畅/安全提升等)</option>
                  </select>
                </div>
              </div>

              {/* Form Row: List Excel upload container */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">选择并上传清单 Excel 或模具 <span className="text-rose-500">*</span></label>
                
                {/* Drop Container or Simulator selector */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                    isDragging ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <UploadCloud size={24} className={isDragging ? 'text-blue-600 animate-bounce' : 'text-slate-400'} />
                  
                  {chosenFile ? (
                    <div className="space-y-1 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg w-full max-w-sm">
                      <span className="text-emerald-700 font-extrabold flex items-center justify-center gap-1">
                        <Check size={14} className="stroke-[3]" />
                        文件已成功装载
                      </span>
                      <p className="text-[11px] font-mono font-bold text-slate-700 truncate">{chosenFile.fileName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        文件大小: {chosenFile.fileSize} | 解析条目: {chosenFile.items.length} 个清单行
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-600">重拖拽 Excel 清单到此处 或 点击选择</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">支持 .xlsx / .xls 文件导入，请符合常规工程量格式</p>
                    </div>
                  )}

                  {/* QUICK DEMOPRESS SELECTION BUILT-IN TEMPLATE */}
                  <div className="pt-2 w-full">
                    <p className="text-[9px] text-slate-400 font-bold mb-1">【演示样表】点击即可一秒模拟导入真实业务数据包：</p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {SAMPLE_EXCEL_FILES.map((f, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickSelectFile(idx)}
                          className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                            chosenFile?.fileName === f.fileName 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-slate-650 hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          {f.specialty}清单.xlsx
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parsed spreadsheet preview box */}
              {chosenFile && (
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-450 border-b border-slate-200/60 pb-1.5 font-bold">
                    <span>清单预览 (含税估价值: ¥{chosenFile.items.reduce((s,i)=>s+i.amount,0).toLocaleString()})</span>
                    <span>共 {chosenFile.items.length} 条</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                    {chosenFile.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                        <div className="truncate pr-2">
                          <span className="font-mono font-bold text-slate-400 mr-2">{item.code}</span>
                          <span className="font-bold text-slate-755">{item.name}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 font-mono">
                          <span className="text-gray-400 text-[9px]">({item.unit})</span>
                          <span className="text-slate-500 font-semibold">{item.quantity}×{item.price} =</span>
                          <span className="text-blue-600 font-bold">¥{item.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning label */}
              <div className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 font-medium">
                <Info size={14} className="shrink-0 text-amber-500 mt-0.5" />
                <span>
                  注意：一个合同项目下可以创建维护无限多张清单表。新清单名目如果与已有清单编号重复，可在后续日志进度录入中通过执行时间予以智能隔离检索。
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-650 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  解析并创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ITEM ADD / EDIT DIALOG MODAL */}
      {/* ==================================================================== */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-150 bg-slate-50 rounded-t-2xl flex justify-between items-center select-none">
              <h3 className="font-black text-sm text-slate-850 flex items-center gap-1.5">
                <Plus className="text-blue-600" size={16} />
                {editingItem ? '编辑清单项' : '新增清单细目/分类'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-750 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Type Selection: Category vs Detailed Item */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-650">名目项类型 <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setItemFormIsCategory(true);
                      setItemFormUnit('');
                      setItemFormPrice('0');
                      setItemFormQuantity('0');
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                      itemFormIsCategory
                        ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-black text-xs text-indigo-950">分部分类</span>
                    <span className="text-[10px] text-slate-450 mt-1 leading-relaxed">仅做分部分项分类标题，不产生金额或数量，不需维护单位单价。</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemFormIsCategory(false)}
                    className={`p-3 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                      !itemFormIsCategory
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-black text-xs text-blue-950">清单细目</span>
                    <span className="text-[10px] text-slate-450 mt-1 leading-relaxed">具体实际施工内容，需要维护单位、综合单价、设计合量信息。</span>
                  </button>
                </div>
              </div>

              {/* Code Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-650">清单项目编号 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例如：100-1-a 或 B2-012"
                  value={itemFormCode}
                  onChange={(e) => setItemFormCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 outline-none font-semibold text-slate-700"
                />
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-650">项目名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder={itemFormIsCategory ? "例如：第一章 通用分部工程" : "例如：C30防冻防渗混凝土桥墩浇筑"}
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 outline-none font-semibold text-slate-700"
                />
              </div>

              {/* Detailed Item Specifics */}
              {!itemFormIsCategory && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">计量单位 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required={!itemFormIsCategory}
                        placeholder="例如：㎡, m³, t, 套"
                        value={itemFormUnit}
                        onChange={(e) => setItemFormUnit(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">综合单价 (元) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required={!itemFormIsCategory}
                        value={itemFormPrice}
                        onChange={(e) => setItemFormPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">设计施工数量 <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        required={!itemFormIsCategory}
                        value={itemFormQuantity}
                        onChange={(e) => setItemFormQuantity(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-mono font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-slate-400">估算报价合价</span>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono font-black text-rose-600 text-[11px] flex items-center">
                        ¥{((Number(itemFormPrice) || 0) * (Number(itemFormQuantity) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-650">备注说明</label>
                <textarea
                  placeholder="可录入关于本子目的具体施工要求"
                  value={itemFormRemarks}
                  onChange={(e) => setItemFormRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 outline-none font-medium text-slate-700 h-16 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-650 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CUSTOM SECURE INLINE DELETE CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-3xs p-4">
          <div className="bg-white rounded-xl border border-slate-150 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 size={20} />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">确认删除此清单吗？</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              您确定要彻底删除该份合同清单吗？删除后，此清单内的名目及参考综合单价将无法在日进度核算中正常引用！
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
              >
                确认彻底删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
