import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Eye, 
  FileSpreadsheet, 
  ArrowLeft, 
  Check, 
  Download, 
  UploadCloud, 
  Calendar, 
  Layers, 
  X, 
  Info, 
  ChevronRight, 
  Briefcase, 
  FileText, 
  Link as LinkIcon,
  PlusCircle, 
  ListPlus,
  Compass,
  AlertCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Project, Contract } from '../types';
import { MOCK_MAIN_LINES } from '../data';

interface ProjectInventoryListProps {
  projects: Project[];
  contracts: Contract[];
}

export interface ProjectInventoryItem {
  id: string;
  code: string;       // 清单编号
  name: string;       // 项目名称
  unit: string;       // 单位
  price: number;      // 单价 / 综合单价
  quantity: number;   // 计划/分配数量
  amount: number;     // 报价合价 (数量 * 单价)
  source: '合同内清单' | '合同外清单' | '临时清单';
  remarks?: string;
}

export interface ProjectInventory {
  id: string;
  projectId: string;
  name: string;
  year: string;       // 清单时间
  specialty: string;  // 清单专业
  sectionId: string;  // 路段ID
  type: '临时清单' | '合同清单关联';
  uploadedFileName?: string;
  fileSize?: string;
  uploadedAt: string;
  items: ProjectInventoryItem[];
  totalAmount: number;
}

// Pre-defined Excel Mock Lists for Route A (Temporary Lists) to "upload" with 1-click
const TEMP_SAMPLE_EXCEL_FILES = [
  {
    fileName: '沪杭甬临安段日常养护临时应急清单.xlsx',
    fileSize: '29.4 KB',
    specialty: '日常',
    items: [
      { id: 't-1', code: 'T-1001', name: '紧急边坡落石清理及废弃土转运', unit: 't', price: 110.00, quantity: 250, amount: 27500, source: '临时清单' as const },
      { id: 't-2', code: 'T-1002', name: '高烈度公路抢修临时标志牌布设施挂', unit: '面', price: 140.00, quantity: 30, amount: 4200, source: '临时清单' as const },
      { id: 't-3', code: 'T-1035', name: '中修级应急防撞缓冲车日常租赁班次', unit: '台班', price: 1800.00, quantity: 12, amount: 21600, source: '临时清单' as const },
      { id: 't-4', code: 'T-1104', name: '沥青路面裂缝现场热熔冷灌缝物料', unit: 'kg', price: 45.00, quantity: 800, amount: 36000, source: '临时清单' as const },
    ]
  },
  {
    fileName: '杭徽段桥梁底托防落石加强防震改造工程清单.xlsx',
    fileSize: '35.8 KB',
    specialty: '专项',
    items: [
      { id: 't-10', code: 'T-2041', name: '高阻尼减震合金弹性支座更换', unit: '套', price: 4200.00, quantity: 20, amount: 84000, source: '临时清单' as const },
      { id: 't-11', code: 'T-2045', name: '碳纤维复合补强板粘帖施工', unit: '㎡', price: 380.00, quantity: 300, amount: 114000, source: '临时清单' as const },
      { id: 't-12', code: 'T-2048', name: '底托立柱外表喷砂特殊防锈镀锌漆', unit: '㎡', price: 85.00, quantity: 1200, amount: 102000, source: '临时清单' as const },
    ]
  }
];

export default function ProjectInventoryList({ projects, contracts }: ProjectInventoryListProps) {
  // Navigation states
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedProjectInventory, setSelectedProjectInventory] = useState<ProjectInventory | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Search states for project list
  const [searchName, setSearchName] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchContract, setSearchContract] = useState('');

  // Primary list of project inventories under the active project
  const [projectInventories, setProjectInventories] = useState<ProjectInventory[]>([]);

  // Creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formSpecialty, setFormSpecialty] = useState<string>('不区分专业');
  const [formSection, setFormSection] = useState<string>('不区分路段');
  const [isSectionSegregating, setIsSectionSegregating] = useState<boolean>(false);

  // Route A temporary upload file helper
  const [chosenTempFile, setChosenTempFile] = useState<typeof TEMP_SAMPLE_EXCEL_FILES[0] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Route B associated contract helper
  const [contractInventories, setContractInventories] = useState<any[]>([]);
  const [chosenContractInvId, setChosenContractInvId] = useState<string>('');

  // Items under development inside the Drawer (Left: Contract reference, Right: Selected targets)
  const [drawerContractItems, setDrawerContractItems] = useState<any[]>([]); // reference
  const [drawerSelectedItems, setDrawerSelectedItems] = useState<ProjectInventoryItem[]>([]); // active selections
  const [drawerSearchText, setDrawerSearchText] = useState('');

  // Manual new item form helper inside the Right Drawer (to create '合同外清单')
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualUnit, setManualUnit] = useState('m');
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [manualQuantity, setManualQuantity] = useState<number>(0);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Conversion logic states
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertTempInventoryId, setConvertTempInventoryId] = useState<string>('');
  const [selectedConversionTempItemId, setSelectedConversionTempItemId] = useState<string>('');
  const [selectedTargetContractInvId, setSelectedTargetContractInvId] = useState<string>('');
  const [selectedTargetOfficialItemId, setSelectedTargetOfficialItemId] = useState<string>('');
  
  // mappings for temp items: record: tempItemId -> { targetOfficialItemId: string, excessOption: 'discard' | 'force' | 'split', splitTargetOfficialItemId: string }
  const [conversionMappings, setConversionMappings] = useState<Record<string, {
    targetOfficialItemId: string;
    excessOption: 'discard' | 'force' | 'split';
    splitTargetOfficialItemId: string;
  }>>({});

  // Compile flat list of official target contract inventory items in system
  const getAvailableOfficialItems = () => {
    const list: Array<{ id: string; code: string; name: string; unit: string; price: number; quantity: number }> = [];
    contractInventories.forEach((ci: any) => {
      if (ci.items) {
        ci.items.forEach((itm: any) => {
          list.push({
            id: itm.id,
            code: itm.code,
            name: itm.name,
            unit: itm.unit,
            price: itm.price,
            quantity: itm.quantity
          });
        });
      }
    });
    return list;
  };

  // Find all logged quantities for items of a temporary inventory in active project
  const getTempInventoryLoggedStats = (tempInvId: string) => {
    if (!activeProject || !tempInvId) return [];
    
    const tempInv = projectInventories.find(pi => pi.id === tempInvId);
    if (!tempInv) return [];

    // Load logs
    const mLogsRaw = localStorage.getItem('MAINTENANCE_LOGS_DATA');
    const cLogsRaw = localStorage.getItem('CONSTRUCTION_LOGS');
    const mLogs = mLogsRaw ? JSON.parse(mLogsRaw) : [];
    const cLogs = cLogsRaw ? JSON.parse(cLogsRaw) : [];

    // Filter logs for this project
    const projMLogs = mLogs.filter((log: any) => log.projectId === activeProject.id);
    const projCLogs = cLogs.filter((log: any) => log.projectId === activeProject.id);

    return tempInv.items.map(itm => {
      let completedQty = 0;
      
      projMLogs.forEach((log: any) => {
        if (log.contents) {
          log.contents.forEach((c: any) => {
            if (c.itemId === itm.id) {
              completedQty += Number(c.completedQty) || 0;
            }
          });
        }
      });

      projCLogs.forEach((log: any) => {
        if (log.contents) {
          log.contents.forEach((c: any) => {
            if (c.itemId === itm.id) {
              completedQty += Number(c.completedQty) || 0;
            }
          });
        }
      });

      return {
        item: itm,
        completedQty,
        uncompletedQty: Math.max(0, itm.quantity - completedQty)
      };
    });
  };

  // Find already logged quantity of an official item ID under this active project
  const getOfficialItemLoggedQty = (officialItemId: string) => {
    if (!activeProject || !officialItemId) return 0;
    
    // Load logs
    const mLogsRaw = localStorage.getItem('MAINTENANCE_LOGS_DATA');
    const cLogsRaw = localStorage.getItem('CONSTRUCTION_LOGS');
    const mLogs = mLogsRaw ? JSON.parse(mLogsRaw) : [];
    const cLogs = cLogsRaw ? JSON.parse(cLogsRaw) : [];

    let completedQty = 0;
    
    mLogs.filter((log: any) => log.projectId === activeProject.id).forEach((log: any) => {
      if (log.contents) {
        log.contents.forEach((c: any) => {
          if (c.itemId === officialItemId) {
            completedQty += Number(c.completedQty) || 0;
          }
        });
      }
    });

    cLogs.filter((log: any) => log.projectId === activeProject.id).forEach((log: any) => {
      if (log.contents) {
        log.contents.forEach((c: any) => {
          if (c.itemId === officialItemId) {
            completedQty += Number(c.completedQty) || 0;
          }
        });
      }
    });

    return completedQty;
  };

  // Initialize mapping suggestions automatically based on name/code resemblance
  const initializeConversionMappings = (tempInvId: string) => {
    if (!tempInvId) return;
    const tempInv = projectInventories.find(pi => pi.id === tempInvId);
    if (!tempInv) return;

    const officialItems = getAvailableOfficialItems();
    const mappings: typeof conversionMappings = {};

    tempInv.items.forEach(tItm => {
      const foundMatch = officialItems.find(oItm => 
        oItm.code.toLowerCase() === tItm.code.toLowerCase() || 
        oItm.name.toLowerCase().includes(tItm.name.toLowerCase()) || 
        tItm.name.toLowerCase().includes(oItm.name.toLowerCase())
      );

      mappings[tItm.id] = {
        targetOfficialItemId: foundMatch ? foundMatch.id : '',
        excessOption: 'discard',
        splitTargetOfficialItemId: ''
      };
    });

    setConversionMappings(mappings);

    // Auto-select the first temporary item with completed progress for the dual panel layout
    const stats = getTempInventoryLoggedStats(tempInvId);
    const firstActive = stats.find(s => s.completedQty > 0);
    const activeId = firstActive ? firstActive.item.id : (tempInv.items[0]?.id || '');

    setSelectedConversionTempItemId(activeId);

    if (activeId) {
      const itemMapping = mappings[activeId];
      if (itemMapping && itemMapping.targetOfficialItemId) {
        const foundCInv = contractInventories.find(ci => ci.items?.some((itm: any) => itm.id === itemMapping.targetOfficialItemId));
        if (foundCInv) {
          setSelectedTargetContractInvId(foundCInv.id);
          setSelectedTargetOfficialItemId(itemMapping.targetOfficialItemId);
        } else if (contractInventories.length > 0) {
          setSelectedTargetContractInvId(contractInventories[0].id);
          setSelectedTargetOfficialItemId('');
        }
      } else if (contractInventories.length > 0) {
        setSelectedTargetContractInvId(contractInventories[0].id);
        setSelectedTargetOfficialItemId('');
      } else {
        setSelectedTargetContractInvId('');
        setSelectedTargetOfficialItemId('');
      }
    } else {
      setSelectedTargetContractInvId('');
      setSelectedTargetOfficialItemId('');
    }
  };

  // Handle selection of a temporary item on the left column in the wizard
  const handleSelectTempItem = (tempItemId: string) => {
    setSelectedConversionTempItemId(tempItemId);
    const mapping = conversionMappings[tempItemId];
    if (mapping && mapping.targetOfficialItemId) {
      const targetId = mapping.targetOfficialItemId;
      const foundCInv = contractInventories.find(ci => ci.items?.some((itm: any) => itm.id === targetId));
      if (foundCInv) {
        setSelectedTargetContractInvId(foundCInv.id);
        setSelectedTargetOfficialItemId(targetId);
        return;
      }
    }
    setSelectedTargetOfficialItemId('');
  };

  // Convert a single temporary item specifically to official target, rewrite logs and subtract progress
  const handleExecuteSingleItemConversion = (tempItemId: string) => {
    if (!activeProject || !convertTempInventoryId) {
      alert('请先选择要转换的临时清单文件');
      return;
    }

    const tempInv = projectInventories.find(pi => pi.id === convertTempInventoryId);
    if (!tempInv) {
      alert('未找到指定的临时清单数据');
      return;
    }

    const stats = getTempInventoryLoggedStats(convertTempInventoryId);
    const stat = stats.find(s => s.item.id === tempItemId);
    if (!stat || stat.completedQty <= 0) {
      alert('该子目没有大于0的历史完成量，无需转入');
      return;
    }

    const mapping = conversionMappings[tempItemId];
    if (!mapping || !mapping.targetOfficialItemId) {
      alert(`请选择该临时清单项对应的目标正式合同项！`);
      return;
    }

    if (mapping.excessOption === 'split') {
      if (!mapping.splitTargetOfficialItemId) {
        alert(`由于您选择了 “拆分转入” 方案，请选择第二目标正式清单项！`);
        return;
      }
      if (mapping.targetOfficialItemId === mapping.splitTargetOfficialItemId) {
        alert(`第一目标与第二目标合同清单子目不能相同，请重新选择！`);
        return;
      }
    }

    try {
      // 1. Rewrite matching logs in localStorage
      const mLogsRaw = localStorage.getItem('MAINTENANCE_LOGS_DATA');
      const cLogsRaw = localStorage.getItem('CONSTRUCTION_LOGS');
      let mLogs = mLogsRaw ? JSON.parse(mLogsRaw) : [];
      let cLogs = cLogsRaw ? JSON.parse(cLogsRaw) : [];

      const availableOfficial = getAvailableOfficialItems();
      const mainTarget = availableOfficial.find(o => o.id === mapping.targetOfficialItemId);

      if (!mainTarget) {
        alert('未找到目标正式清单名目，请刷新重试');
        return;
      }

      // Helper function to process contents array of a log
      const processLogContents = (contents: any[]) => {
        if (!contents || !Array.isArray(contents)) return contents;

        const newContents: any[] = [];

        contents.forEach((contentItem: any) => {
          if (contentItem.itemId !== tempItemId) {
            newContents.push(contentItem);
            return;
          }

          const tempQty = stat.completedQty;
          const existingLogged = getOfficialItemLoggedQty(mainTarget.id);
          const mainAvailable = Math.max(0, mainTarget.quantity - existingLogged);

          if (tempQty <= mainAvailable || mapping.excessOption === 'force') {
            newContents.push({
              ...contentItem,
              itemId: mainTarget.id,
              itemName: mainTarget.name,
              unit: mainTarget.unit,
              unitPrice: mainTarget.price,
              outputValue: contentItem.completedQty * mainTarget.price
            });
          } else if (mapping.excessOption === 'discard') {
            const scaleRatio = mainAvailable / tempQty;
            const scaledQty = contentItem.completedQty * scaleRatio;
            newContents.push({
              ...contentItem,
              itemId: mainTarget.id,
              itemName: mainTarget.name,
              unit: mainTarget.unit,
              completedQty: scaledQty,
              unitPrice: mainTarget.price,
              outputValue: scaledQty * mainTarget.price,
              remarks: (contentItem.remarks || '') + ` (原临时超合同量已按容量限额比例折损缩减)`
            });
          } else if (mapping.excessOption === 'split') {
            const splitTarget = availableOfficial.find(o => o.id === mapping.splitTargetOfficialItemId)!;
            const ratioMain = mainAvailable / tempQty;
            const ratioSplit = Math.max(0, tempQty - mainAvailable) / tempQty;

            if (ratioMain > 0) {
              const qtyA = contentItem.completedQty * ratioMain;
              newContents.push({
                ...contentItem,
                itemId: mainTarget.id,
                itemName: mainTarget.name,
                unit: mainTarget.unit,
                completedQty: qtyA,
                unitPrice: mainTarget.price,
                outputValue: qtyA * mainTarget.price,
                remarks: (contentItem.remarks || '') + ` (临时转正: 容量上限分配部分)`
              });
            }

            if (ratioSplit > 0) {
              const qtyB = contentItem.completedQty * ratioSplit;
              newContents.push({
                ...contentItem,
                itemId: splitTarget.id,
                itemName: splitTarget.name,
                unit: splitTarget.unit,
                completedQty: qtyB,
                unitPrice: splitTarget.price,
                outputValue: qtyB * splitTarget.price,
                remarks: (contentItem.remarks || '') + ` (临时转正: 超限额拆分至此二级清单)`
              });
            }
          }
        });

        return newContents;
      };

      // Rewrite logs and save
      const updatedMLogs = mLogs.map((log: any) => {
        if (log.projectId === activeProject.id) {
          return {
            ...log,
            contents: processLogContents(log.contents)
          };
        }
        return log;
      });

      const updatedCLogs = cLogs.map((log: any) => {
        if (log.projectId === activeProject.id) {
          return {
            ...log,
            contents: processLogContents(log.contents)
          };
        }
        return log;
      });

      localStorage.setItem('MAINTENANCE_LOGS_DATA', JSON.stringify(updatedMLogs));
      localStorage.setItem('CONSTRUCTION_LOGS', JSON.stringify(updatedCLogs));

      // 2. Update the Project Inventories (decrement quantity)
      let updatedProjectInventories = [...projectInventories];
      const targetTempInvIdx = updatedProjectInventories.findIndex(pi => pi.id === convertTempInventoryId);
      if (targetTempInvIdx !== -1) {
        const invCopy = { ...updatedProjectInventories[targetTempInvIdx] };
        invCopy.items = invCopy.items.map(tItm => {
          if (tItm.id === tempItemId) {
            const mappedQty = stat.completedQty;
            const rem = Math.max(0, tItm.quantity - mappedQty);
            return {
              ...tItm,
              quantity: rem,
              amount: rem * tItm.price,
              remarks: `已将历史施工已完成量 [${mappedQty}] ${tItm.unit} 结转至正式理科名目！剩余量为 [${rem}] ${tItm.unit}`
            };
          }
          return tItm;
        });

        invCopy.totalAmount = invCopy.items.reduce((s, i) => s + i.amount, 0);
        if (!invCopy.name.includes('[已清理部分转正]')) {
          invCopy.name = '[已清理部分转正] ' + invCopy.name;
        }
        updatedProjectInventories[targetTempInvIdx] = invCopy;
      }

      // Merge and update Official Contract Inventory
      const convertedOfficialDeltas: Record<string, {
        code: string;
        name: string;
        unit: string;
        price: number;
        qtyToAdd: number;
      }> = {};

      const tempQty = stat.completedQty;
      const existingLogged = getOfficialItemLoggedQty(mainTarget.id);
      const mainAvailable = Math.max(0, mainTarget.quantity - existingLogged);

      let finalMainQty = tempQty;
      if (tempQty > mainAvailable) {
        if (mapping.excessOption === 'discard') {
          finalMainQty = mainAvailable;
        } else if (mapping.excessOption === 'force') {
          finalMainQty = tempQty;
        } else if (mapping.excessOption === 'split') {
          finalMainQty = mainAvailable;
          const splitTarget = availableOfficial.find(o => o.id === mapping.splitTargetOfficialItemId)!;
          const splitQty = tempQty - mainAvailable;
          if (splitQty > 0) {
            convertedOfficialDeltas[splitTarget.id] = {
              code: splitTarget.code,
              name: splitTarget.name,
              unit: splitTarget.unit,
              price: splitTarget.price,
              qtyToAdd: splitQty
            };
          }
        }
      }

      if (finalMainQty > 0) {
        convertedOfficialDeltas[mainTarget.id] = {
          code: mainTarget.code,
          name: mainTarget.name,
          unit: mainTarget.unit,
          price: mainTarget.price,
          qtyToAdd: finalMainQty
        };
      }

      let officialInvIdx = updatedProjectInventories.findIndex(pi => pi.projectId === activeProject.id && pi.type === '合同清单关联');
      if (officialInvIdx === -1) {
        const newOfficialInv: ProjectInventory = {
          id: `p-inv-converted-${Date.now()}`,
          projectId: activeProject.id,
          name: `【转入正式】对标合同定额量项目清单`,
          year: tempInv.year,
          specialty: tempInv.specialty,
          sectionId: tempInv.sectionId,
          type: '合同清单关联',
          uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          items: [],
          totalAmount: 0
        };
        updatedProjectInventories.unshift(newOfficialInv);
        officialInvIdx = 0;
      }

      const officialInv = { ...updatedProjectInventories[officialInvIdx] };
      officialInv.items = [...officialInv.items];

      Object.entries(convertedOfficialDeltas).forEach(([officialId, data]) => {
        const existingIdx = officialInv.items.findIndex(it => it.code === data.code);
        if (existingIdx !== -1) {
          const itemCopy = { ...officialInv.items[existingIdx] };
          itemCopy.quantity = (itemCopy.quantity || 0) + data.qtyToAdd;
          itemCopy.amount = itemCopy.quantity * itemCopy.price;
          itemCopy.remarks = (itemCopy.remarks || '') + ` (追加已结转的临时历史工程量: +${data.qtyToAdd} ${data.unit})`;
          officialInv.items[existingIdx] = itemCopy;
        } else {
          officialInv.items.push({
            id: officialId,
            code: data.code,
            name: data.name,
            unit: data.unit,
            price: data.price,
            quantity: data.qtyToAdd,
            amount: data.qtyToAdd * data.price,
            source: '合同内清单',
            remarks: `由临时清单 [${tempInv.name}] 转入的历史施工成果定额量`
          });
        }
      });

      officialInv.totalAmount = officialInv.items.reduce((s, i) => s + i.amount, 0);
      updatedProjectInventories[officialInvIdx] = officialInv;

      saveProjectInventoriesLocally(updatedProjectInventories);

      // Keep detail view in sync
      const freshTempInv = updatedProjectInventories.find(pi => pi.id === convertTempInventoryId);
      if (freshTempInv) {
        setSelectedProjectInventory(freshTempInv);
      }

      // Auto select the next item
      const nextStats = getTempInventoryLoggedStats(convertTempInventoryId);
      const activeNextStats = nextStats.filter(s => s.completedQty > 0 && s.item.id !== tempItemId);
      if (activeNextStats.length > 0) {
        setSelectedConversionTempItemId(activeNextStats[0].item.id);
      } else {
        setSelectedConversionTempItemId('');
      }

      // Also reset current selection target
      setSelectedTargetOfficialItemId('');

      alert(`🎉 临时子目 [${stat.item.name}] 对应历史施工量已成功转入正式合同体系中！`);
      reloadProjectInventories(activeProject);
    } catch (err) {
      console.error(err);
      alert('转入期间遇到系统错误，操作失败，请重试');
    }
  };

  // Perform full conversion logic across logs and inventories!
  const handleExecuteConversion = () => {
    if (!activeProject || !convertTempInventoryId) {
      alert('请先选择要转换的临时清单文件');
      return;
    }

    const tempInv = projectInventories.find(pi => pi.id === convertTempInventoryId);
    if (!tempInv) {
      alert('未找到指定的临时清单数据');
      return;
    }

    const tempItemsStats = getTempInventoryLoggedStats(convertTempInventoryId);
    const completedTempItems = tempItemsStats.filter(stat => stat.completedQty > 0);

    if (completedTempItems.length === 0) {
      alert('扫描完成：此临时清单关联的施工记录中，尚无任何实际已完成的工程量，无需进行转换。');
      return;
    }

    // Validation checks
    for (const stat of completedTempItems) {
      const mapping = conversionMappings[stat.item.id];
      if (!mapping || !mapping.targetOfficialItemId) {
        alert(`请为临时清单项 [${stat.item.code}] ${stat.item.name} 选择对应的正式合同清单项！`);
        return;
      }

      if (mapping.excessOption === 'split') {
        if (!mapping.splitTargetOfficialItemId) {
          alert(`由于您为 [${stat.item.code}] 选择了解决溢出的 “拆分转入” 方案，请选择第二目标正式清单项！`);
          return;
        }
        if (mapping.targetOfficialItemId === mapping.splitTargetOfficialItemId) {
          alert(`[${stat.item.code}] 的第一目标与第二目标清单子目不能相同，请重新选择！`);
          return;
        }
      }
    }

    // Double check confirmation
    const confirmMessage = `确认将临时清单 [${tempInv.name}] 下共 ${completedTempItems.length} 项已施工完成的统计数据进行转正吗？\n此操作将遍历重构所有关联的施工日报和维护记录，后续按正式合同比对照单计量。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // 1. Rewrite matching logs in localStorage
      const mLogsRaw = localStorage.getItem('MAINTENANCE_LOGS_DATA');
      const cLogsRaw = localStorage.getItem('CONSTRUCTION_LOGS');
      let mLogs = mLogsRaw ? JSON.parse(mLogsRaw) : [];
      let cLogs = cLogsRaw ? JSON.parse(cLogsRaw) : [];

      const availableOfficial = getAvailableOfficialItems();

      // Helper function to process contents array of a log
      const processLogContents = (contents: any[]) => {
        if (!contents || !Array.isArray(contents)) return contents;

        const newContents: any[] = [];

        contents.forEach((contentItem: any) => {
          const stat = completedTempItems.find(s => s.item.id === contentItem.itemId);
          if (!stat) {
            newContents.push(contentItem);
            return;
          }

          const mapping = conversionMappings[stat.item.id];
          const mainTarget = availableOfficial.find(o => o.id === mapping.targetOfficialItemId)!;
          const tempQty = stat.completedQty;

          // Main available capacity
          const existingLogged = getOfficialItemLoggedQty(mainTarget.id);
          const mainAvailable = Math.max(0, mainTarget.quantity - existingLogged);

          if (tempQty <= mainAvailable || mapping.excessOption === 'force') {
            newContents.push({
              ...contentItem,
              itemId: mainTarget.id,
              itemName: mainTarget.name,
              unit: mainTarget.unit,
              unitPrice: mainTarget.price,
              outputValue: contentItem.completedQty * mainTarget.price
            });
          } else if (mapping.excessOption === 'discard') {
            const scaleRatio = mainAvailable / tempQty;
            const scaledQty = contentItem.completedQty * scaleRatio;
            newContents.push({
              ...contentItem,
              itemId: mainTarget.id,
              itemName: mainTarget.name,
              unit: mainTarget.unit,
              completedQty: scaledQty,
              unitPrice: mainTarget.price,
              outputValue: scaledQty * mainTarget.price,
              remarks: (contentItem.remarks || '') + ` (原临时超合同量已按容量限额比例折损缩减)`
            });
          } else if (mapping.excessOption === 'split') {
            const splitTarget = availableOfficial.find(o => o.id === mapping.splitTargetOfficialItemId)!;
            const ratioMain = mainAvailable / tempQty;
            const ratioSplit = Math.max(0, tempQty - mainAvailable) / tempQty;

            if (ratioMain > 0) {
              const qtyA = contentItem.completedQty * ratioMain;
              newContents.push({
                ...contentItem,
                itemId: mainTarget.id,
                itemName: mainTarget.name,
                unit: mainTarget.unit,
                completedQty: qtyA,
                unitPrice: mainTarget.price,
                outputValue: qtyA * mainTarget.price,
                remarks: (contentItem.remarks || '') + ` (临时转正: 容量上限分配部分)`
              });
            }

            if (ratioSplit > 0) {
              const qtyB = contentItem.completedQty * ratioSplit;
              newContents.push({
                ...contentItem,
                itemId: splitTarget.id,
                itemName: splitTarget.name,
                unit: splitTarget.unit,
                completedQty: qtyB,
                unitPrice: splitTarget.price,
                outputValue: qtyB * splitTarget.price,
                remarks: (contentItem.remarks || '') + ` (临时转正: 超限额拆分至此二级清单)`
              });
            }
          }
        });

        return newContents;
      };

      // Apply to both maintenance and construction log records
      const updatedMLogs = mLogs.map((log: any) => {
        if (log.projectId === activeProject.id) {
          return {
            ...log,
            contents: processLogContents(log.contents)
          };
        }
        return log;
      });

      const updatedCLogs = cLogs.map((log: any) => {
        if (log.projectId === activeProject.id) {
          return {
            ...log,
            contents: processLogContents(log.contents)
          };
        }
        return log;
      });

      localStorage.setItem('MAINTENANCE_LOGS_DATA', JSON.stringify(updatedMLogs));
      localStorage.setItem('CONSTRUCTION_LOGS', JSON.stringify(updatedCLogs));

      // 2. Update the Project Inventories
      let updatedProjectInventories = [...projectInventories];

      const targetTempInvIdx = updatedProjectInventories.findIndex(pi => pi.id === convertTempInventoryId);
      if (targetTempInvIdx !== -1) {
        const invCopy = { ...updatedProjectInventories[targetTempInvIdx] };
        
        invCopy.items = invCopy.items.map(tItm => {
          const stat = completedTempItems.find(s => s.item.id === tItm.id);
          if (stat) {
            const mappedQty = stat.completedQty;
            const rem = Math.max(0, tItm.quantity - mappedQty);
            return {
              ...tItm,
              quantity: rem,
              amount: rem * tItm.price,
              remarks: `已于合同签订上线后，将历史施工已完成量 [${mappedQty}] ${tItm.unit} 完整转换至正式清单定额条目! 剩余待施量为 [${rem}] ${tItm.unit}`
            };
          }
          return tItm;
        });

        invCopy.totalAmount = invCopy.items.reduce((s, i) => s + i.amount, 0);
        if (!invCopy.name.includes('[已清理部分转正]')) {
          invCopy.name = '[已清理部分转正] ' + invCopy.name;
        }

        updatedProjectInventories[targetTempInvIdx] = invCopy;
      }

      // Merge converted official items into project's official inventory
      const convertedOfficialDeltas: Record<string, {
        code: string;
        name: string;
        unit: string;
        price: number;
        qtyToAdd: number;
      }> = {};

      completedTempItems.forEach(stat => {
        const mapping = conversionMappings[stat.item.id];
        const mainTarget = availableOfficial.find(o => o.id === mapping.targetOfficialItemId)!;
        const tempQty = stat.completedQty;

        const existingLogged = getOfficialItemLoggedQty(mainTarget.id);
        const mainAvailable = Math.max(0, mainTarget.quantity - existingLogged);

        let finalMainQty = tempQty;
        if (tempQty > mainAvailable) {
          if (mapping.excessOption === 'discard') {
            finalMainQty = mainAvailable;
          } else if (mapping.excessOption === 'force') {
            finalMainQty = tempQty;
          } else if (mapping.excessOption === 'split') {
            finalMainQty = mainAvailable;
            
            const splitTarget = availableOfficial.find(o => o.id === mapping.splitTargetOfficialItemId)!;
            const splitQty = tempQty - mainAvailable;
            if (splitQty > 0) {
              if (!convertedOfficialDeltas[splitTarget.id]) {
                convertedOfficialDeltas[splitTarget.id] = {
                  code: splitTarget.code,
                  name: splitTarget.name,
                  unit: splitTarget.unit,
                  price: splitTarget.price,
                  qtyToAdd: 0
                };
              }
              convertedOfficialDeltas[splitTarget.id].qtyToAdd += splitQty;
            }
          }
        }

        if (finalMainQty > 0) {
          if (!convertedOfficialDeltas[mainTarget.id]) {
            convertedOfficialDeltas[mainTarget.id] = {
              code: mainTarget.code,
              name: mainTarget.name,
              unit: mainTarget.unit,
              price: mainTarget.price,
              qtyToAdd: 0
            };
          }
          convertedOfficialDeltas[mainTarget.id].qtyToAdd += finalMainQty;
        }
      });

      let officialInvIdx = updatedProjectInventories.findIndex(pi => pi.projectId === activeProject.id && pi.type === '合同清单关联');
      
      if (officialInvIdx === -1) {
        const newOfficialInv: ProjectInventory = {
          id: `p-inv-converted-${Date.now()}`,
          projectId: activeProject.id,
          name: `【转入正式】对标合同定额量项目清单`,
          year: tempInv.year,
          specialty: tempInv.specialty,
          sectionId: tempInv.sectionId,
          type: '合同清单关联',
          uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          items: [],
          totalAmount: 0
        };
        updatedProjectInventories.unshift(newOfficialInv);
        officialInvIdx = 0;
      }

      const officialInv = { ...updatedProjectInventories[officialInvIdx] };
      officialInv.items = [...officialInv.items];

      Object.entries(convertedOfficialDeltas).forEach(([officialId, data]) => {
        const existingIdx = officialInv.items.findIndex(it => it.code === data.code);
        if (existingIdx !== -1) {
          const itemCopy = { ...officialInv.items[existingIdx] };
          itemCopy.quantity = (itemCopy.quantity || 0) + data.qtyToAdd;
          itemCopy.amount = itemCopy.quantity * itemCopy.price;
          itemCopy.remarks = (itemCopy.remarks || '') + ` (追加已结转的临时历史工程量: +${data.qtyToAdd} ${data.unit})`;
          officialInv.items[existingIdx] = itemCopy;
        } else {
          officialInv.items.push({
            id: officialId,
            code: data.code,
            name: data.name,
            unit: data.unit,
            price: data.price,
            quantity: data.qtyToAdd,
            amount: data.qtyToAdd * data.price,
            source: '合同内清单',
            remarks: `由临时清单 [${tempInv.name}] 转正结转入库的历史施工成果工程量`
          });
        }
      });

      officialInv.totalAmount = officialInv.items.reduce((s, i) => s + i.amount, 0);
      updatedProjectInventories[officialInvIdx] = officialInv;

      saveProjectInventoriesLocally(updatedProjectInventories);
      setIsConvertModalOpen(false);

      // Refresh the expanded spreadsheet detail state with newly updated items if it is currently open
      if (selectedProjectInventory && selectedProjectInventory.id === convertTempInventoryId) {
        const freshTempInv = updatedProjectInventories.find(pi => pi.id === convertTempInventoryId);
        if (freshTempInv) {
          setSelectedProjectInventory(freshTempInv);
        }
      }

      alert('🎉 临时清单历史工程量成功转为正式清单定额！历史施工日报及计量明细已平移匹配完成。');

      reloadProjectInventories(activeProject);
    } catch (err) {
      console.error(err);
      alert('在执行结转期间遇到预期外的系统错误，更新失败，请重试');
    }
  };

  // Refresh project inventories in database/localStorage for active project
  const reloadProjectInventories = (proj: Project) => {
    // Seed some construction logs containing temporary items if not existing
    const cLogsRaw = localStorage.getItem('CONSTRUCTION_LOGS');
    let cLogs = cLogsRaw ? JSON.parse(cLogsRaw) : [];
    const hasTempLogs = cLogs.some((l: any) => l.projectId === proj.id && l.contents?.some((c: any) => c.itemId.startsWith('t-')));
    if (!hasTempLogs) {
      const mockCLogsForTemp = [
        {
          id: `seed-temp-clog-1-${proj.id}`,
          logCode: `SG-TEMP-001`,
          logDate: '2026-06-12',
          projectId: proj.id,
          projectName: proj.name,
          roadSection: 'K15+200 - K18+600 应急作业段',
          responsible: '张二河',
          teamName: '抢修第一分队',
          weather: '晴',
          temperature: '25℃ ~ 31℃',
          windStatus: '东南风微风',
          submitter: '张二河',
          status: '已提交',
          safetyStatus: '良好',
          qualityStatus: '合格',
          safetyRemark: '布置了移动防撞波形板，作业人员防护齐全。',
          qualityRemark: '清理干净彻底，废弃土运至指定消纳场。',
          otherRemark: '突发落石紧急响应抢通。',
          createdAt: '2026-06-12 11:30',
          contents: [
            { itemId: 't-1', itemName: '紧急边坡落石清理及废弃土转运', unit: 't', unitPrice: 110.00, completedQty: 120, outputValue: 13200 },
            { itemId: 't-2', itemName: '高烈度公路抢修临时标志牌布设施挂', unit: '面', unitPrice: 140.00, completedQty: 15, outputValue: 2100 }
          ]
        },
        {
          id: `seed-temp-clog-2-${proj.id}`,
          logCode: `SG-TEMP-002`,
          logDate: '2026-06-14',
          projectId: proj.id,
          projectName: proj.name,
          roadSection: 'K20+100 避险区',
          responsible: '张二河',
          teamName: '抢修第二分队',
          weather: '阴',
          temperature: '22℃ ~ 28℃',
          windStatus: '无风',
          submitter: '张二河',
          status: '已提交',
          safetyStatus: '良好',
          qualityStatus: '合格',
          safetyRemark: '防撞缓冲车处于后方防撞定位点。',
          qualityRemark: '灌缝饱满美观。',
          otherRemark: '夜间班次。',
          createdAt: '2026-06-14 20:45',
          contents: [
            { itemId: 't-3', itemName: '中修级应急防撞缓冲车日常租赁班次', unit: '台班', unitPrice: 1800.00, completedQty: 4, outputValue: 7200 },
            { itemId: 't-4', itemName: '沥青路面裂缝现场热熔冷灌缝物料', unit: 'kg', unitPrice: 45.00, completedQty: 250, outputValue: 11250 }
          ]
        },
        {
          id: `seed-temp-clog-3-${proj.id}`,
          logCode: `SG-TEMP-003`,
          logDate: '2026-06-15',
          projectId: proj.id,
          projectName: proj.name,
          roadSection: 'K11+100 桥梁段',
          responsible: '张二河',
          teamName: '抢修专项班组',
          weather: '晴',
          temperature: '24℃ ~ 30℃',
          windStatus: '北风微风',
          submitter: '张二河',
          status: '已提交',
          safetyStatus: '良好',
          qualityStatus: '合格',
          safetyRemark: '高空作业绳索及防坠网均检查合格。',
          qualityRemark: '减震弹性支座更换到位，受力均匀。',
          otherRemark: '专项桥梁加固抢修。',
          createdAt: '2026-06-15 15:40',
          contents: [
            { itemId: 't-10', itemName: '高阻尼减震合金弹性支座更换', unit: '套', unitPrice: 4200.00, completedQty: 6, outputValue: 25200 },
            { itemId: 't-11', itemName: '碳纤维复合补强板粘帖施工', unit: '㎡', unitPrice: 380.00, completedQty: 45, outputValue: 17100 },
            { itemId: 't-12', itemName: '底托立柱外表喷砂特殊防锈镀锌漆', unit: '㎡', unitPrice: 85.00, completedQty: 180, outputValue: 15300 }
          ]
        }
      ];
      localStorage.setItem('CONSTRUCTION_LOGS', JSON.stringify([...cLogs, ...mockCLogsForTemp]));
    }

    const key = `PROJECT_INVENTORIES_${proj.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setProjectInventories(JSON.parse(saved));
    } else {
      // Seed with some representation data for rich visual experience!
      const contractObj = contracts.find(c => c.id === proj.contractId);
      const isLinked = !!contractObj;

      let seedInvs: ProjectInventory[] = [];
      if (isLinked) {
        // Mocking some allocated inventories from associated contract catalogs
        seedInvs = [
          {
            id: `p-inv-seed-1-${proj.id}`,
            projectId: proj.id,
            name: `${proj.name} 2025年度日常保养路段清单`,
            year: '2025',
            specialty: '日常',
            sectionId: proj.mainLines[0] || '不区分路段',
            type: '合同清单关联',
            uploadedAt: '2026-06-14 10:45',
            totalAmount: 184500,
            items: [
              { id: 'pitem-1', code: 'A1-001', name: '人工清扫分隔带垃圾及沙尘', unit: 'km', price: 120.00, quantity: 150, amount: 18000, source: '合同内清单' },
              { id: 'pitem-2', code: 'A1-002', name: '波形护栏立柱日常洗刷清洁', unit: '柱', price: 4.50, quantity: 5000, amount: 22500, source: '合同内清单' },
              { id: 'pitem-3', code: 'A2-005', name: '边沟垃圾打捞及流泥深挖除淤', unit: 'm³', price: 75.00, quantity: 400, amount: 30000, source: '合同内清单' },
              { id: 'pitem-4', code: 'A3-010', name: '中央分带防眩板日常更换校准', unit: '块', price: 95.00, quantity: 200, amount: 19000, source: '合同内清单' },
              { id: 'pitem-5', code: 'A4-012', name: '日常病害应急保障抢修及坑洞填补', unit: 't', price: 1200.00, quantity: 40, amount: 48000, source: '合同内清单' },
              { id: 'pitem-6', code: 'OUT-99', name: '日常保洁路段增设防攀安全加密网上墙贴膜', unit: '㎡', price: 150.00, quantity: 310, amount: 47000, source: '合同外清单' }
            ]
          }
        ];
      } else {
        // Unassociated seed
        seedInvs = [
          {
            id: `p-inv-seed-temp-${proj.id}`,
            projectId: proj.id,
            name: `${proj.name} 临时突发抢修导入清单`,
            year: '不区分时间',
            specialty: '专项',
            sectionId: '不区分路段',
            type: '临时清单',
            uploadedFileName: '沪杭甬临安段日常养护临时应急清单.xlsx',
            fileSize: '29.4 KB',
            uploadedAt: '2026-06-15 14:12',
            totalAmount: 89500,
            items: TEMP_SAMPLE_EXCEL_FILES[0].items.map(it => ({ ...it, source: '临时清单' as const }))
          }
        ];
      }
      setProjectInventories(seedInvs);
      localStorage.setItem(key, JSON.stringify(seedInvs));
    }
  };

  const saveProjectInventoriesLocally = (updated: ProjectInventory[]) => {
    if (!activeProject) return;
    setProjectInventories(updated);
    localStorage.setItem(`PROJECT_INVENTORIES_${activeProject.id}`, JSON.stringify(updated));
  };

  // Trigger loading inventories of the active project on enter
  useEffect(() => {
    if (activeProject) {
      reloadProjectInventories(activeProject);
      setIsDetailOpen(false);
      setSelectedProjectInventory(null);
    }
  }, [activeProject]);

  // Load contract inventories if active project has contract
  useEffect(() => {
    if (activeProject && activeProject.contractId) {
      const contractId = activeProject.contractId;
      const ckey = `CONTRACT_INVENTORIES_${contractId}`;
      const savedContractInvs = localStorage.getItem(ckey);
      
      let parsedCInvs = [];
      if (savedContractInvs) {
        parsedCInvs = JSON.parse(savedContractInvs);
      } else {
        // If there is no uploaded contract inventory, seed a default for demo support!
        const seedData = [
          {
            id: `seed-inv-1-${contractId}`,
            name: `合同【${contractId}】第一期系统推荐日常清单`,
            year: '2025',
            specialty: '日常',
            uploadedFileName: '2025年杭州路段日常保洁维护大纲清单.xlsx',
            fileSize: '34.2 KB',
            uploadedAt: '2026-06-10 11:24',
            itemCount: 5,
            totalAmount: 362000,
            items: [
              { id: 'itm-1', code: 'A1-001', name: '人工清扫分隔带垃圾及沙尘', unit: 'km', price: 120.00, quantity: 450, amount: 54000 },
              { id: 'itm-2', code: 'A1-002', name: '波形护栏立柱日常洗刷清洁', unit: '柱', price: 4.50, quantity: 12000, amount: 54000 },
              { id: 'itm-3', code: 'A2-005', name: '边沟垃圾打捞及流泥深挖除淤', unit: 'm³', price: 75.00, quantity: 800, amount: 60000 },
              { id: 'itm-4', code: 'A3-010', name: '中央分带防眩板日常更换校准', unit: '块', price: 95.00, quantity: 400, amount: 38000 },
              { id: 'itm-5', code: 'A4-012', name: '日常病害应急保障抢修及坑洞填补', unit: 't', price: 1200.00, quantity: 80, amount: 96000 },
            ]
          },
          {
            id: `seed-inv-2-${contractId}`,
            name: `合同【${contractId}】重特大边坡稳固重修工程专项清单`,
            year: '不需选择时间',
            specialty: '专项',
            uploadedFileName: '沪杭甬段路基斜边坡强力稳固重修工程清单.xlsx',
            fileSize: '41.8 KB',
            uploadedAt: '2026-06-11 16:50',
            itemCount: 4,
            totalAmount: 2257500,
            items: [
              { id: 'itm-10', code: 'B2-011', name: '改性乳化沥青稀浆封层(微表处MS-3)', unit: '㎡', price: 32.00, quantity: 35000, amount: 1120000 },
              { id: 'itm-11', code: 'B3-005', name: '特种高强度路基防滑主动格栅防护网网面复盖', unit: '㎡', price: 185.00, quantity: 4000, amount: 740000 },
              { id: 'itm-12', code: 'B3-008', name: '路面大面积裂隙专用环氧胶泥充填', unit: 'kg', price: 65.00, quantity: 1500, amount: 97500 },
              { id: 'itm-13', code: 'B4-020', name: '旧沥青混凝土路面中重型精细冷铣刨(厚5cm)', unit: '㎡', price: 15.00, quantity: 20000, amount: 300000 },
            ]
          }
        ];
        parsedCInvs = seedData;
        localStorage.setItem(ckey, JSON.stringify(seedData));
      }
      setContractInventories(parsedCInvs);
    } else {
      setContractInventories([]);
    }
  }, [activeProject, contracts]);

  // Handle choosing contract inventory in form
  useEffect(() => {
    if (chosenContractInvId && contractInventories.length > 0) {
      const selectedCI = contractInventories.find(ci => ci.id === chosenContractInvId);
      if (selectedCI) {
        setFormYear(selectedCI.year);
        setFormSpecialty(selectedCI.specialty);
        // Prep drawer items references as cloned objects
        setDrawerContractItems(selectedCI.items || []);
        // Reset drawer selections
        setDrawerSelectedItems([]);
        
        if (!formName) {
          const roadAffix = formSection !== '不区分路段' ? `-${getSectionName(formSection)}` : '';
          setFormName(`${activeProject?.name}-${selectedCI.name}${roadAffix}`);
        }
      }
    }
  }, [chosenContractInvId, contractInventories]);

  // Project year options calculator
  const getProjectYearOptions = () => {
    if (!activeProject) return [];
    const startY = parseInt(activeProject.startDate.split(/[-/]/)[0], 10) || 2022;
    const endY = parseInt(activeProject.endDate.split(/[-/]/)[0], 10) || 2026;
    const list: string[] = [];
    for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
      list.push(String(y));
    }
    return list;
  };

  const getSectionName = (secId: string) => {
    if (secId === '不区分路段') return '不区分路段';
    const mainline = MOCK_MAIN_LINES.find(l => l.id === secId);
    return mainline ? `${mainline.name} (${mainline.direction})` : secId;
  };

  // Table filters
  const filteredProjects = projects.filter(p => {
    const matchedName = !searchName || p.name.toLowerCase().includes(searchName.toLowerCase());
    const matchedDept = !searchDept || p.dept === searchDept;
    
    let matchedContract = true;
    if (searchContract) {
      const c = contracts.find(ct => ct.id === p.contractId);
      if (searchContract === 'yes') {
        matchedContract = !!p.contractId;
      } else if (searchContract === 'no') {
        matchedContract = !p.contractId;
      } else {
        matchedContract = !c || c.name.toLowerCase().includes(searchContract.toLowerCase());
      }
    }
    return matchedName && matchedDept && matchedContract;
  });

  const handleOpenCreateModal = () => {
    if (!activeProject) return;
    setIsCreateModalOpen(true);
    setFormName('');
    setFormSection('不区分路段');
    setIsSectionSegregating(false);
    
    const isLinked = !!activeProject.contractId;
    if (isLinked) {
      if (contractInventories.length > 0) {
        setChosenContractInvId(contractInventories[0].id);
      } else {
        setChosenContractInvId('');
      }
      setFormSpecialty('');
      setFormYear('');
    } else {
      setChosenContractInvId('');
      setFormSpecialty('日常');
      const startY = activeProject.startDate.split(/[-/]/)[0] || '2025';
      setFormYear(String(startY));
    }
    setChosenTempFile(null);
  };

  // Simulate drop excel file for Route A
  const handleQuickSelectTempFile = (fileIndex: number) => {
    const selected = TEMP_SAMPLE_EXCEL_FILES[fileIndex];
    setChosenTempFile(selected);
    setFormSpecialty(selected.specialty);
    if (!formName) {
      setFormName(`${activeProject?.name}-临时应急${selected.specialty}清单`);
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
    const randomIdx = Math.floor(Math.random() * TEMP_SAMPLE_EXCEL_FILES.length);
    handleQuickSelectTempFile(randomIdx);
  };

  // Submit Route A (Temporary inventory)
  const handleSubmitTempModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('请填写清单名称');
      return;
    }
    if (!chosenTempFile) {
      alert('请进行Excel清单上传导入！');
      return;
    }

    const itemsSum = chosenTempFile.items.reduce((s, i) => s + i.amount, 0);

    const newInv: ProjectInventory = {
      id: `p-inv-${Date.now()}`,
      projectId: activeProject!.id,
      name: formName.trim(),
      year: formYear,
      specialty: formSpecialty,
      sectionId: formSection,
      type: '临时清单',
      uploadedFileName: chosenTempFile.fileName,
      fileSize: chosenTempFile.fileSize,
      uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      items: chosenTempFile.items.map((it, idx) => ({
        ...it,
        id: `p-itm-${Date.now()}-${idx}`,
        source: '临时清单'
      })),
      totalAmount: itemsSum
    };

    const updated = [newInv, ...projectInventories];
    saveProjectInventoriesLocally(updated);
    setIsCreateModalOpen(false);
    alert('临时项目清单解析上传成功！');
  };

  // Launch Drawer Interaction for Route B
  const handleOpenDrawerInteraction = () => {
    if (!chosenContractInvId) {
      alert('请先选择对应的分类来源合同清单！');
      return;
    }
    setIsDrawerOpen(true);
    setShowManualItemForm(false);
  };

  // Pull item from left to right inside Drawer
  const handlePullItemToSelected = (contItem: any) => {
    // Check if already in drawerSelectedItems
    const exists = drawerSelectedItems.some(it => it.code === contItem.code);
    if (exists) {
      alert('该编码对应的名目已经在项目清单中，无法重复拉入');
      return;
    }

    const newItem: ProjectInventoryItem = {
      id: `dr-itm-${Date.now()}-${Math.random()}`,
      code: contItem.code,
      name: contItem.name,
      unit: contItem.unit,
      price: contItem.price,
      quantity: contItem.quantity || 100, // default placeholder or prompt user
      amount: contItem.price * (contItem.quantity || 100),
      source: '合同内清单',
      remarks: '来自合同清单引用'
    };

    setDrawerSelectedItems([...drawerSelectedItems, newItem]);
  };

  // Pull all items from left to right at once
  const handlePullAllItemsToSelected = () => {
    const newlyAdded: ProjectInventoryItem[] = [];
    drawerContractItems.forEach(contItem => {
      const exists = drawerSelectedItems.some(it => it.code === contItem.code);
      if (!exists) {
        newlyAdded.push({
          id: `dr-itm-${Date.now()}-${Math.random()}`,
          code: contItem.code,
          name: contItem.name,
          unit: contItem.unit,
          price: contItem.price,
          quantity: contItem.quantity || 100,
          amount: contItem.price * (contItem.quantity || 100),
          source: '合同内清单',
          remarks: '全量拉入合同目录'
        });
      }
    });

    if (newlyAdded.length === 0) {
      alert('所有合同项目已经拉入完毕');
    } else {
      setDrawerSelectedItems([...drawerSelectedItems, ...newlyAdded]);
    }
  };

  // Remove a selection from Drawer Right side
  const handleRemoveDrawerSelectItem = (id: string) => {
    setDrawerSelectedItems(drawerSelectedItems.filter(it => it.id !== id));
  };

  // Handle drawer quantity change
  const handleDrawerQtyChange = (id: string, qtyVal: string) => {
    const numeric = parseFloat(qtyVal) || 0;
    setDrawerSelectedItems(
      drawerSelectedItems.map(it => {
        if (it.id === id) {
          return {
            ...it,
            quantity: numeric,
            amount: it.price * numeric
          };
        }
        return it;
      })
    );
  };

  // Add manual out-of-contract item inside drawer
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || !manualName.trim()) {
      alert('请填写完整的编码与项目名称');
      return;
    }

    // Code exists constraint checks
    const exists = drawerSelectedItems.some(it => it.code === manualCode.trim());
    if (exists) {
      alert(`编号为 [${manualCode.trim()}] 的清单项已列入，不得冲突`);
      return;
    }

    const priceNum = Number(manualPrice) || 0;
    const qtyNum = Number(manualQuantity) || 0;

    const newItem: ProjectInventoryItem = {
      id: `dr-manual-${Date.now()}`,
      code: manualCode.trim(),
      name: manualName.trim(),
      unit: manualUnit,
      price: priceNum,
      quantity: qtyNum,
      amount: priceNum * qtyNum,
      source: '合同外清单',
      remarks: '手动创设的合同外项目'
    };

    setDrawerSelectedItems([...drawerSelectedItems, newItem]);
    
    // reset form fields
    setManualCode('');
    setManualName('');
    setManualPrice(0);
    setManualQuantity(0);
    setShowManualItemForm(false);
  };

  // Save selection inside Drawer as Project Inventory
  const handleSaveDrawerProjectInventory = () => {
    if (!formName.trim()) {
      alert('请指定项目清单名称');
      return;
    }
    if (drawerSelectedItems.length === 0) {
      alert('您尚未选择拉入或录入任何项目名目！请添加清单条目后再行确认。');
      return;
    }

    const drawerTotal = drawerSelectedItems.reduce((s, i) => s + i.amount, 0);

    const newInv: ProjectInventory = {
      id: `p-inv-${Date.now()}`,
      projectId: activeProject!.id,
      name: formName.trim(),
      year: formYear,
      specialty: formSpecialty,
      sectionId: formSection,
      type: '合同清单关联',
      uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      items: drawerSelectedItems,
      totalAmount: drawerTotal
    };

    const updated = [newInv, ...projectInventories];
    saveProjectInventoriesLocally(updated);

    setIsDrawerOpen(false);
    setIsCreateModalOpen(false);
    alert('极简拉取、配置并关联成功！');
  };

  // Delete inventory
  const handleDeleteInventory = (invId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(invId);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    const invId = deleteConfirmId;
    const updated = projectInventories.filter(pi => pi.id !== invId);
    saveProjectInventoriesLocally(updated);
    if (selectedProjectInventory && selectedProjectInventory.id === invId) {
      setIsDetailOpen(false);
      setSelectedProjectInventory(null);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* ==================================================================== */}
      {/* SUB-VIEW A: BACK TO LIST OF PROJECTS */}
      {/* ==================================================================== */}
      {!activeProject ? (
        <div className="space-y-5">
          {/* Top Info Ribbon */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-blue-500/30 text-blue-300 border border-blue-400/40 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">企业级工程</span>
                <span className="text-[10px] text-indigo-200">2026 最新清单对准引擎</span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-1">项目清单管理模块</h2>
              <p className="text-xs text-indigo-150 max-w-2xl mt-0.5">
                在项目列表中点击“维护项目清单”可基于关联合同关联或创建项目专属物料、定额计量，并标记区分合同内与合同外清单项。
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 text-xs text-indigo-200 bg-white/10 p-3 rounded-xl border border-white/10">
              <Compass className="text-yellow-400 stroke-[2] animate-spin-slow" size={20} />
              <div>
                <span className="font-extrabold block text-white">合同-项目 1对多架构</span>
                <span className="text-[10px]">关联比对、路段分类隔离录入一站式管理</span>
              </div>
            </div>
          </div>

          {/* Search Table Filters */}
          <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">搜索项目名称 / 拼音:</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  placeholder="请输入关键词检索..." 
                  className="w-full bg-white border border-gray-300 focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 rounded px-2.5 py-1.5 pl-9 text-xs outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">实施项目部筛选:</label>
              <select
                value={searchDept}
                onChange={e => setSearchDept(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 rounded px-2.5 py-1.5 text-xs outline-none font-medium text-slate-700 transition-all"
              >
                <option value="">全部部门</option>
                <option value="项目部一">项目部一</option>
                <option value="项目部二">项目部二</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">合同关联状态:</label>
              <select
                value={searchContract}
                onChange={e => setSearchContract(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 rounded px-2.5 py-1.5 text-xs outline-none font-medium text-slate-700 transition-all"
              >
                <option value="">全部关联状态</option>
                <option value="yes">已关联合同 (Route B)</option>
                <option value="no">未关联合同 (仅临时清单 - Route A)</option>
              </select>
            </div>
          </div>

          {/* Project List Grid/Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-3 w-16 text-center">序号</th>
                    <th className="px-3.5 py-3 font-mono">项目编号</th>
                    <th className="px-4 py-3 min-w-[200px]">项目全称</th>
                    <th className="px-3.5 py-3">实施项目部</th>
                    <th className="px-3.5 py-3">合同关联</th>
                    <th className="px-3.5 py-3 font-mono">工期履约时间</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                        未检索到任何符合搜索条件的项目数据。
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p, idx) => {
                      const linkedContractObj = contracts.find(c => c.id === p.contractId);
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-3.5 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-700">{p.code}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{p.name}</div>
                            {p.abbr && <span className="text-[11px] text-slate-400">简称: {p.abbr}</span>}
                          </td>
                          <td className="px-3.5 py-3 text-slate-600">{p.dept || '—'}</td>
                          <td className="px-3.5 py-3">
                            {linkedContractObj ? (
                              <div className="space-y-0.5">
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded inline-block">
                                  已配置合同 (Route B)
                                </span>
                                <div className="text-[11px] text-slate-600 font-medium max-w-xs truncate flex items-center gap-0.5">
                                  <LinkIcon size={12} className="text-emerald-500 shrink-0" />
                                  {linkedContractObj.name}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded inline-block">
                                  未关联合同 (Route A)
                                </span>
                                <div className="text-[11px] text-slate-400 font-medium">
                                  仅允许新增配置【临时清单】
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-slate-600">
                            {p.startDate} ~ {p.endDate}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setActiveProject(p)}
                              className="px-3 py-1.5 bg-[#165DFF] hover:bg-[#0E4AD2] text-white rounded text-xs font-bold flex items-center gap-1 mx-auto shadow-3xs transition-all cursor-pointer"
                            >
                              <FileSpreadsheet size={13} />
                              维护项目清单
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* SUB-VIEW B: DETAILED INVENTORY MANAGEMENT PANEL FOR SELECTED PROJECT */
        /* ==================================================================== */
        <div className="space-y-5">
          {/* Breadcrumb row */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-150">
            <button
              onClick={() => setActiveProject(null)}
              className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              返回项目列表
            </button>
            <div className="text-xs font-bold text-slate-400">
              当前选择项目: <span className="text-slate-800 font-extrabold">{activeProject.name}</span>
            </div>
          </div>

          {/* Project Details Banner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">项目执行部 / 工期</span>
              <span className="text-xs font-extrabold text-gray-700 block mt-0.5">
                {activeProject.dept} | {activeProject.startDate} ~ {activeProject.endDate}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">已绑定履约合同</span>
              <span className="text-xs font-bold text-gray-700 block mt-0.5">
                {activeProject.contractId ? (
                  <span className="text-teal-600 flex items-center gap-0.5">
                    <Check size={12} className="stroke-[3]" />
                    {contracts.find(c => c.id === activeProject.contractId)?.name || activeProject.contractId}
                  </span>
                ) : '尚未关联合同'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold">项目主线/路段数</span>
              <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">
                {activeProject.mainLines.length > 0 
                  ? activeProject.mainLines.map(id => getSectionName(id)).join(', ') 
                  : '未设置高速主线路段'}
              </span>
            </div>
            <div className="flex justify-end items-center gap-2">
              {projectInventories.some(pi => pi.type === '临时清单') && (
                <button
                  type="button"
                  onClick={() => {
                    const firstTemp = projectInventories.find(pi => pi.type === '临时清单');
                    if (firstTemp) {
                      setConvertTempInventoryId(firstTemp.id);
                      initializeConversionMappings(firstTemp.id);
                    }
                    setIsConvertModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={14} className="stroke-[3]" />
                  临时清单转正式
                </button>
              )}
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" />
                新增项目清单
              </button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* OPTIONAL EXPANDED SINGLE INVENTORY SPREADSHEET DETAIL BOX */}
          {/* ==================================================================== */}
          {isDetailOpen && selectedProjectInventory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedProjectInventory(null);
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  返回此项目的清单目录
                </button>
                <div className="flex items-center gap-3">
                  {projectInventories.some(pi => pi.type === '临时清单') && (
                    <button
                      type="button"
                      onClick={() => {
                        const tempId = selectedProjectInventory.type === '临时清单'
                          ? selectedProjectInventory.id
                          : (projectInventories.find(pi => pi.type === '临时清单')?.id || '');
                        setConvertTempInventoryId(tempId);
                        initializeConversionMappings(tempId);
                        setIsConvertModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw size={13} className="stroke-[3]" />
                      本临时清单转正式
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteInventory(selectedProjectInventory.id)}
                    className="text-xs font-bold text-red-650 hover:text-red-850 hover:bg-red-50 bg-red-50/50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="删除当前项目清单"
                  >
                    <Trash2 size={13} />
                    删除当前清单
                  </button>
                  <div className="text-xs font-bold text-slate-400">
                    标识符/ID: <span className="font-mono">{selectedProjectInventory.id}</span>
                  </div>
                </div>
              </div>

              {/* Stats bento layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">清单名称</span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedProjectInventory.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">路段/限时/专业</span>
                  <span className="text-xs font-bold text-purple-600 block mt-0.5">
                    {getSectionName(selectedProjectInventory.sectionId)} | {selectedProjectInventory.year}年 | {selectedProjectInventory.specialty}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">估算价累加</span>
                  <span className="text-sm font-extrabold text-blue-600 block mt-0.5 font-mono">
                    ¥{selectedProjectInventory.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">清单属性</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      selectedProjectInventory.type === '临时清单' 
                        ? 'bg-amber-50 text-amber-600 border-amber-200' 
                        : 'bg-teal-50 text-teal-600 border-teal-200'
                    }`}>
                      {selectedProjectInventory.type}
                    </span>
                    <span className="text-[10px] text-gray-400">({selectedProjectInventory.items.length} 个条目)</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-gray-250 rounded-xl overflow-hidden shadow-3xs">
                <div className="p-3.5 bg-slate-50/50 border-b border-gray-150 flex items-center justify-between">
                  {selectedProjectInventory.uploadedFileName ? (
                    <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                      <FileSpreadsheet size={15} />
                      初始临时Excel：{selectedProjectInventory.uploadedFileName} ({selectedProjectInventory.fileSize})
                    </span>
                  ) : (
                    <span className="text-xs font-black text-teal-700 flex items-center gap-1">
                      <Layers size={15} />
                      关联配额调控项目清单 - 基于合同内名目精配
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold">编撰同步时间：{selectedProjectInventory.uploadedAt}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-gray-650 font-bold border-b border-gray-150">
                      <tr>
                        <th className="p-3 text-center w-12">序号</th>
                        <th className="p-3">清单项目编号</th>
                        <th className="p-3">项目名称(名目)</th>
                        <th className="p-3 text-center">计量单位</th>
                        <th className="p-3 text-right">综合单价 (元)</th>
                        <th className="p-3 text-right">数量</th>
                        <th className="p-3 text-right">报价合价 (元)</th>
                        <th className="p-3 text-center pr-4">清单来源区分</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProjectInventory.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 text-center font-mono font-bold text-gray-400">{index + 1}</td>
                          <td className="p-3 font-mono font-semibold text-slate-700">{item.code}</td>
                          <td className="p-3 font-bold text-gray-700">{item.name}</td>
                          <td className="p-3 text-center font-medium text-slate-500">{item.unit || '—'}</td>
                          <td className="p-3 text-right font-mono text-gray-600">
                            {item.price.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700 font-semibold">{item.quantity.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-blue-600">
                            ¥{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center pr-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              item.source === '合同内清单' ? 'bg-teal-50 border-teal-200 text-teal-600' :
                              item.source === '合同外清单' ? 'bg-amber-50 border-amber-200 text-amber-600 font-bold' :
                              'bg-indigo-50 border-indigo-200 text-indigo-600'
                            }`}>
                              {item.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ==================== EMBEDDED CONVERSION INTERACTION AND LOG TRANSFER PANEL ==================== */}
              {selectedProjectInventory.type === '临时清单' && (
                <div className="bg-slate-50 border border-slate-200 shadow-xs rounded-xl p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg text-white">
                        <RefreshCw className="animate-spin-slow stroke-[2.5]" size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-1">
                          ⚡ 临时清单历史施工量转入正式开发通道
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                          在此直接选择已完成的临时清单名目，配对目标正式合同条目，实现100%安全平移转换。
                        </p>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5 max-w-md">
                      <Info className="text-amber-600 shrink-0 mt-0.5" size={13} />
                      <span className="text-[10px] text-amber-800 font-bold leading-relaxed">
                        仅支持转换已由登记施工日报填报了“历史完成量”的临时清单条目，零进度项无需且不在下方列出。
                      </span>
                    </div>
                  </div>

                  {/* Dual Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
                    {/* Left Column: Completed Temporary List (Weight 5/12) */}
                    <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                          <Layers size={13} className="text-amber-500 shrink-0" />
                          1. 临时计量已完成项（待转入）
                        </span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                          {getTempInventoryLoggedStats(selectedProjectInventory.id).filter(s => s.completedQty > 0).length} 项施工中
                        </span>
                      </div>

                      <div className="p-3 flex-1 overflow-y-auto max-h-[380px] space-y-2">
                        {(() => {
                          const stats = getTempInventoryLoggedStats(selectedProjectInventory.id);
                          const activeStats = stats.filter(s => s.completedQty > 0);

                          if (activeStats.length === 0) {
                            return (
                              <div className="text-center py-12 px-4 text-xs font-bold text-gray-400">
                                ⚠️ 未扫描到此临时清单中存在大于0的历史施工量，无需或无法转换。
                              </div>
                            );
                          }

                          return activeStats.map((stat) => {
                            const hasMapping = !!conversionMappings[stat.item.id]?.targetOfficialItemId;
                            const isSelected = selectedConversionTempItemId === stat.item.id;

                            return (
                              <div
                                key={stat.item.id}
                                onClick={() => handleSelectTempItem(stat.item.id)}
                                className={`p-3 rounded-lg border transition-all cursor-pointer text-left relative ${
                                  isSelected 
                                    ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-300' 
                                    : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                  <span className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[9px] font-extrabold leading-none">
                                    {stat.item.code}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                    hasMapping 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                      : 'bg-rose-50 text-rose-500 border border-rose-250'
                                  }`}>
                                    {hasMapping ? '已关联正式' : '待绑定正式'}
                                  </span>
                                </div>

                                <div className="text-xs font-black text-slate-800 line-clamp-1 mb-1">
                                  {stat.item.name}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 border-dashed">
                                  <span className="font-medium">
                                    历史已施工: <strong className="text-amber-600 font-mono font-black">{stat.completedQty}</strong> {stat.item.unit}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold font-mono">
                                    单价: ¥{stat.item.price}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Right Column: Mapping workspace and formal contract target (Weight 7/12) */}
                    <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center shrink-0">
                        <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1.5">
                          <RefreshCw size={13} className="text-indigo-600 shrink-0 animate-spin-slow" />
                          2. 关联转入至正式合同定额 (对应正式清单)
                        </span>
                      </div>

                      <div className="p-4 flex-1 space-y-4 text-xs">
                        {(() => {
                          const stats = getTempInventoryLoggedStats(selectedProjectInventory.id);
                          const activeStats = stats.filter(s => s.completedQty > 0);
                          const selectedStat = stats.find(s => s.item.id === selectedConversionTempItemId);
                          const officialList = getAvailableOfficialItems();

                          if (!selectedConversionTempItemId || !selectedStat) {
                            return (
                              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400 font-bold space-y-2">
                                <Info size={28} className="text-slate-300" />
                                <p>请在左侧点击一个待转入的历史施工计量项</p>
                                <p className="text-[10px] text-gray-400 font-medium">从而激活并配对右侧的正式清单项</p>
                              </div>
                            );
                          }

                          const mapping = conversionMappings[selectedStat.item.id] || {
                            targetOfficialItemId: '',
                            excessOption: 'discard',
                            splitTargetOfficialItemId: ''
                          };

                          // Calculate available capacity for the selected main target item
                          let contractTotal = 0;
                          let alreadyLogged = 0;
                          let availableCapacity = 0;
                          let isExcess = false;

                          if (mapping.targetOfficialItemId) {
                            const oItem = officialList.find(o => o.id === mapping.targetOfficialItemId);
                            if (oItem) {
                              contractTotal = oItem.quantity;
                              alreadyLogged = getOfficialItemLoggedQty(oItem.id);
                              availableCapacity = Math.max(0, contractTotal - alreadyLogged);
                              isExcess = selectedStat.completedQty > availableCapacity;
                            }
                          }

                          return (
                            <div className="space-y-4">
                              {/* Selected Temp Item Info Panel */}
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5">
                                <span className="text-[9px] text-gray-405 font-bold uppercase block leading-none">正在关联的临时子目</span>
                                <div className="font-extrabold text-slate-800 text-sm">
                                  {selectedStat.item.name}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[10px] bg-white border border-slate-100 p-2 rounded font-mono font-bold mt-1 shadow-3xs text-slate-650">
                                  <div>
                                    <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">编号</span>
                                    <span>{selectedStat.item.code}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">历史完成工程量</span>
                                    <span className="text-amber-600 font-black">{selectedStat.completedQty} {selectedStat.item.unit}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">原估单价与定额额度</span>
                                    <span>¥{selectedStat.item.price} | {selectedStat.item.quantity} {selectedStat.item.unit}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Dropdown Selector for Contract Inventory */}
                              <div className="space-y-1.5 shadow-2xs bg-slate-50 border border-slate-200 p-3 rounded-lg">
                                <label className="block text-slate-700 font-black text-xs">
                                  🔗 1. 选择目标正式合同清单 (先选择合同清单)*
                                </label>
                                <select
                                  value={selectedTargetContractInvId}
                                  onChange={(e) => {
                                    const cInvId = e.target.value;
                                    setSelectedTargetContractInvId(cInvId);
                                    setSelectedTargetOfficialItemId('');
                                    setConversionMappings({
                                      ...conversionMappings,
                                      [selectedStat.item.id]: {
                                        ...mapping,
                                        targetOfficialItemId: ''
                                      }
                                    });
                                  }}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 text-xs outline-none font-bold text-slate-700 cursor-pointer"
                                >
                                  <option value="">-- 请选择关联的目标合同清单 --</option>
                                  {contractInventories.map(cInv => (
                                    <option key={cInv.id} value={cInv.id}>
                                      {cInv.name} ({cInv.year}年 | {cInv.specialty} | {cInv.items?.length || 0}项)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Selected Contract's Items List */}
                              {selectedTargetContractInvId ? (
                                <div className="space-y-1.5 flex flex-col">
                                  <label className="block text-slate-700 font-black text-xs">
                                    📋 2. 选择目标正式清单子目 (左边选中，右边也选中)*
                                  </label>
                                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 flex-1 flex flex-col max-h-[220px]">
                                    <div className="p-1.5 px-3 bg-slate-100 border-b border-slate-200 flex justify-between text-[10px] text-gray-500 font-bold shrink-0">
                                      <span>清单项编码及名称</span>
                                      <span>合同价 | 限制额度</span>
                                    </div>
                                    <div className="p-2 overflow-y-auto space-y-1.5 max-h-[175px]">
                                      {(() => {
                                        const selectedCInv = contractInventories.find(c => c.id === selectedTargetContractInvId);
                                        const items = selectedCInv?.items || [];
                                        if (items.length === 0) {
                                          return (
                                            <div className="text-center py-6 text-gray-400 font-bold">
                                              此合同清单内暂无子目项
                                            </div>
                                          );
                                        }
                                        return items.map((oItem: any) => {
                                          const isSelected = selectedTargetOfficialItemId === oItem.id || mapping.targetOfficialItemId === oItem.id;
                                          return (
                                            <div
                                              key={oItem.id}
                                              onClick={() => {
                                                setSelectedTargetOfficialItemId(oItem.id);
                                                setConversionMappings({
                                                  ...conversionMappings,
                                                  [selectedStat.item.id]: {
                                                    ...mapping,
                                                    targetOfficialItemId: oItem.id
                                                  }
                                                });
                                              }}
                                              className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex justify-between items-center ${
                                                isSelected
                                                  ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                                                  : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                                              }`}
                                            >
                                              <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                  <span className="font-mono bg-amber-100 text-amber-800 text-[9px] font-black px-1 rounded">
                                                    {oItem.code}
                                                  </span>
                                                  {isSelected && (
                                                    <span className="bg-emerald-500 text-white text-[8px] font-black px-1 rounded-sm flex items-center leading-none py-0.5 animate-pulse">
                                                      ✓ 已选中
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="font-extrabold text-slate-800 text-xs truncate">
                                                  {oItem.name}
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0 min-w-[80px] font-mono leading-tight">
                                                <div className="text-[11px] text-slate-800 font-black">¥{oItem.price}</div>
                                                <div className="text-[9px] text-slate-400 font-bold">上限 {oItem.quantity} {oItem.unit}</div>
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 text-center text-slate-400 border border-slate-200 rounded-lg bg-slate-50/50">
                                  请先在上方选择合同清单，以加载合同子目列表进行“右边选中”配对。
                                </div>
                              )}

                              {/* Mapping Target Status Check Card */}
                              {mapping.targetOfficialItemId ? (
                                <div className="border border-slate-150 rounded-lg p-3.5 space-y-3 bg-slate-50/30">
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-gray-400 font-bold flex justify-between">
                                      <span>正式合同量余量和容量诊断</span>
                                      <span className={isExcess ? 'text-red-500 font-black' : 'text-emerald-600 font-black'}>
                                        {isExcess ? '🚨 超额限警告' : '✨ 安全余量内'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-white p-2.5 rounded border border-slate-150 font-mono text-[11px] font-bold">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">合同限额分配：</span>
                                        <span>{contractTotal} {selectedStat.item.unit}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">已施工使用：</span>
                                        <span className="text-slate-705">{alreadyLogged} {selectedStat.item.unit}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">当前项目剩余可用定额：</span>
                                        <span className="text-blue-600 font-black">{availableCapacity} {selectedStat.item.unit}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">待并入临时量：</span>
                                        <span className="text-amber-600 font-black">{selectedStat.completedQty} {selectedStat.item.unit}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {!isExcess ? (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2 text-emerald-700 text-[11px] font-black bg-emerald-50/70 p-2 rounded-lg border border-emerald-250">
                                        <Check size={14} className="stroke-[3] text-emerald-600 shrink-0" />
                                        <span>容量满足：转入通道畅通，本条目可以直接 100% 安全转换至正式项。</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleExecuteSingleItemConversion(selectedStat.item.id)}
                                        className="w-full py-2.5 bg-gradient-to-r from-emerald-505 to-teal-605 hover:from-emerald-655 hover:to-teal-755 text-white font-extrabold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                                      >
                                        <Check size={13} className="stroke-[3]" />
                                        点击转入并转换清单
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
                                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={14} />
                                        <div className="text-[10px] text-red-800 leading-normal font-bold">
                                          <span className="font-extrabold text-red-900 block mb-0.5">并入量超过合同上限：</span>
                                          合并后的历史完成量比合同清单所剩容量超出了 <strong className="font-mono text-red-655 text-xs">{(selectedStat.completedQty - availableCapacity).toFixed(2)}</strong> {selectedStat.item.unit}。
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <span className="block text-[10px] text-slate-500 font-black">请选择合并超额调控决策方案：</span>
                                        <div className="grid grid-cols-3 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setConversionMappings({
                                              ...conversionMappings,
                                              [selectedStat.item.id]: { ...mapping, excessOption: 'discard' }
                                            })}
                                            className={`p-2 rounded border text-left flex flex-col justify-between cursor-pointer transition-all ${
                                              mapping.excessOption === 'discard'
                                                ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-300'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span className="font-black text-[10px] text-amber-900">缩减并入</span>
                                            <span className="text-[8px] text-slate-450 mt-1">最大充填至容量额度 ({availableCapacity} {selectedStat.item.unit})，余量丢弃扣除。</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => setConversionMappings({
                                              ...conversionMappings,
                                              [selectedStat.item.id]: { ...mapping, excessOption: 'force' }
                                            })}
                                            className={`p-2 rounded border text-left flex flex-col justify-between cursor-pointer transition-all ${
                                              mapping.excessOption === 'force'
                                                ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span className="font-black text-[10px] text-red-900">强制灌注</span>
                                            <span className="text-[8px] text-slate-450 mt-1">强制允许其超额，以临时实际计量价位无损并入合同 (生成超额报警记述)。</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => setConversionMappings({
                                              ...conversionMappings,
                                              [selectedStat.item.id]: { ...mapping, excessOption: 'split' }
                                            })}
                                            className={`p-2 rounded border text-left flex flex-col justify-between cursor-pointer transition-all ${
                                              mapping.excessOption === 'split'
                                                ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-200'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span className="font-black text-[10px] text-indigo-950">拆分转入</span>
                                            <span className="text-[8px] text-slate-450 mt-1">合同限额量充填，超限的溢出段自动分流拆配至另一个备用二级清单。</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Secondary Target Selector when Split option is selected */}
                                      {mapping.excessOption === 'split' && (
                                        <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded border border-indigo-150 animate-fade-in text-[10px]">
                                          <label className="block text-indigo-950 font-black">⛓️ 请选择溢出分担的第二目标正式清单项：</label>
                                          <select
                                            value={mapping.splitTargetOfficialItemId}
                                            onChange={(e) => setConversionMappings({
                                              ...conversionMappings,
                                              [selectedStat.item.id]: { ...mapping, splitTargetOfficialItemId: e.target.value }
                                            })}
                                            className="w-full bg-white border border-indigo-200 rounded p-1.5 font-bold text-slate-700 outline-none"
                                          >
                                            <option value="">-- 请选择第二清单分算子目 --</option>
                                            {officialList
                                              .filter(o => o.id !== mapping.targetOfficialItemId)
                                              .map(o => (
                                                <option key={o.id} value={o.id}>
                                                  [{o.code}] {o.name} (单价:¥{o.price} | 当前剩余:{Math.max(0, o.quantity - getOfficialItemLoggedQty(o.id))} {o.unit})
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleExecuteSingleItemConversion(selectedStat.item.id)}
                                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400 mt-2"
                                      >
                                        <Check size={13} className="stroke-[3]" />
                                        点击转入并转换清单
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-6 text-center text-slate-400 font-bold bg-slate-50 border border-slate-150 rounded-lg flex flex-col items-center justify-center gap-1">
                                  <span className="text-xl">🔗</span>
                                  <span>请在上面选择关联的正式项目 (右边选中)</span>
                                  <span className="text-[10px] text-slate-400 font-medium">从而激活额度、进行安全系数诊断及转入操作</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ==================================================================== */
            /* NO INVENTORY DETAIL ACTIVATED: CATALOGUE OF PROJECT INVENTORIES */
            /* ==================================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
                  项目清单细分文件列表 ({projectInventories.length} 份)
                </h4>
                <p className="text-[10px] text-gray-400 font-medium">配置后日志录入可自动索引路段对应的各定额清单项目</p>
              </div>

              {projectInventories.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl">
                  <FileSpreadsheet className="mx-auto text-gray-300 mb-2 stroke-[1.5]" size={36} />
                  <p className="text-xs font-bold text-gray-500">此项目目前没有可用的项目清单</p>
                  <p className="text-[10px] text-gray-450 mt-1 max-w-sm mx-auto">
                    请点击上方“新增项目清单”根据与合同的包含、补充、路段划分进行配置或直接导入。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectInventories.map((pi) => (
                    <div
                      key={pi.id}
                      onClick={() => {
                        setSelectedProjectInventory(pi);
                        setIsDetailOpen(true);
                      }}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-3xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                            {pi.year} 关联时间
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            pi.type === '临时清单' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-teal-50 border-teal-100 text-teal-600'
                          }`}>
                            {pi.type}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors" title={pi.name}>
                            {pi.name}
                          </h5>
                          <span className="text-[10px] text-gray-400 mt-1 block font-medium">
                            路段专属：{getSectionName(pi.sectionId)} | 专业：{pi.specialty}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold leading-none uppercase">清单总合价估价</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xs font-black text-rose-600 font-mono">¥{pi.totalAmount.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-500 font-bold">({pi.items.length}项)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {pi.type === '临时清单' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertTempInventoryId(pi.id);
                                initializeConversionMappings(pi.id);
                                setIsConvertModalOpen(true);
                              }}
                              className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-[10px] rounded flex items-center gap-1 shadow-2xs cursor-pointer mr-1"
                              title="将此临时清单中已施工已完成工程量转为正式定额"
                            >
                              <RefreshCw size={10} className="stroke-[3]" />
                              转正式
                            </button>
                          ) : (
                            projectInventories.some(x => x.type === '临时清单') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const tempId = projectInventories.find(x => x.type === '临时清单')?.id || '';
                                  setConvertTempInventoryId(tempId);
                                  initializeConversionMappings(tempId);
                                  setIsConvertModalOpen(true);
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-[10px] rounded flex items-center gap-1 shadow-2xs cursor-pointer mr-1"
                                title="从项目的临时清单中引入计量已完成项转为正式清单定额"
                              >
                                <RefreshCw size={10} className="stroke-[3]" />
                                转正式
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteInventory(pi.id, e)}
                            className="p-1 px-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors text-[10px] font-bold"
                            title="删除"
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
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* CREATION SELECTION GATEWAY MODAL (ROUTE A or ROUTE B SETUP FORM) */}
      {/* ==================================================================== */}
      {isCreateModalOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-3xs p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-150 bg-slate-50 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="text-blue-600" size={18} />
                创建项目清单 - ({activeProject.contractId ? '已关联合同' : '未关联合同'})
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* If Project HAS Contract (Route B Forms) */}
            {activeProject.contractId ? (
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* Info block */}
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-blue-650 font-bold block uppercase tracking-wide">已关联合同背景</span>
                  <div className="font-extrabold text-slate-700">
                    {contracts.find(c => c.id === activeProject.contractId)?.name || activeProject.contractId}
                  </div>
                  <div className="text-[10px] text-gray-450 font-medium">
                    项目可在创建时按【区分路段】的形式，拉取合同已有清单库中的条款名目。并在必要时录入【合同外清单】
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-650">清单配置名称 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="请输入该份清单的核心名称"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 outline-none font-bold text-slate-700 font-sans"
                  />
                </div>

                {/* Road Section segmentation toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-650">是否按路段区分创建 <span className="text-rose-500">*</span></label>
                    <select
                      value={isSectionSegregating ? 'yes' : 'no'}
                      onChange={(e) => {
                        const val = e.target.value === 'yes';
                        setIsSectionSegregating(val);
                        if (!val) {
                          setFormSection('不区分路段');
                        } else if (activeProject.mainLines.length > 0) {
                          setFormSection(activeProject.mainLines[0]);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-650"
                    >
                      <option value="no">不区分路段 (全路段汇总)</option>
                      <option value="yes">区分路段量 (按单一高速主线隔离)</option>
                    </select>
                  </div>

                  {/* Section select */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-650">选择目标路段</label>
                    <select
                      value={formSection}
                      disabled={!isSectionSegregating}
                      onChange={(e) => setFormSection(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-650 disabled:bg-slate-100 disabled:text-gray-400"
                    >
                      <option value="不区分路段">不区分路段</option>
                      {activeProject.mainLines.map(lineId => (
                        <option key={lineId} value={lineId}>{getSectionName(lineId)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Select Base Contract inventory */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-650">关联分类来源的合同清单项目 <span className="text-rose-500">*</span></label>
                  {contractInventories.length === 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-650 font-bold text-[11px]">
                      提示：该关联收入合同尚未录入任何合同清单。在没有合同清单作为模板来源时，您依然可以通过点击下方按钮，全部采用手动填报“合同外清单”项目进行初始化，或者前往【合同台账-维护合同清单】维护后关联。
                    </div>
                  ) : (
                    <select
                      value={chosenContractInvId}
                      required
                      onChange={e => setChosenContractInvId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-extrabold text-slate-700"
                    >
                      <option value="">-- 请选择关联哪份合同清单模具 --</option>
                      {contractInventories.map(ci => (
                        <option key={ci.id} value={ci.id}>
                          {ci.name} [年度:{ci.year} | 专业:{ci.specialty}] ({ci.items.length}条名目)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Year and Specialty representation */}
                {chosenContractInvId && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-105 p-3 rounded-lg font-bold">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold leading-none">同步履约年份(清单时间)</span>
                      <span className="text-slate-700 block mt-1.5 font-mono">{formYear} 年</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold leading-none">同步清单专业类型</span>
                      <span className="text-slate-755 block mt-1.5 text-purple-600">{formSpecialty}</span>
                    </div>
                  </div>
                )}

                {/* Gateway to Drawer */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDrawerInteraction}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ListPlus size={14} />
                    配置清单条目 & 拉入交互
                  </button>
                </div>
              </div>
            ) : (
              /* If Project has NO contract (Route A Forms - Mock Upload Excel) */
              <form onSubmit={handleSubmitTempModal} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-amber-650 font-bold block uppercase tracking-wide flex items-center gap-0.5">
                    <AlertCircle size={12} />
                    未关联合同的独立项目模式
                  </span>
                  <div className="text-[10px] text-slate-500 font-medium">
                    项目当前处于未绑定和无合规关联状态。您只能创设独立的『临时清单』，并在下方直接导入 Excel 电子标书作为数据项基准。
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-650">临时项目清单名称 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="请输入临时清单名称，例如：桥梁抢修紧急施工项目清单"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 outline-none font-bold text-slate-700"
                  />
                </div>

                {/* Selectors year, specialty, section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-650">清单时间 (年份)</label>
                    <select
                      value={formYear}
                      onChange={e => setFormYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-65"
                    >
                      <option value="不区分时间">不区分时间</option>
                      {getProjectYearOptions().map(y => (
                        <option key={y} value={y}>{y}年度</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-650">专业方向</label>
                    <select
                      value={formSpecialty}
                      onChange={e => setFormSpecialty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 border-gray-300 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-65"
                    >
                      <option value="日常">日常 (小修/保修)</option>
                      <option value="专项">专项 (中大修)</option>
                      <option value="不区分专业">不区分专业</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-650">适用路段范围</label>
                    <select
                      value={formSection}
                      onChange={e => setFormSection(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg p-2 outline-none font-semibold text-slate-65"
                    >
                      <option value="不区分路段">不区分路段</option>
                      {activeProject.mainLines.map(lineId => (
                        <option key={lineId} value={lineId}>{getSectionName(lineId)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-650">选择并上传临时清单 Excel <span className="text-rose-500">*</span></label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                      isDragging ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                  >
                    <UploadCloud size={24} className={isDragging ? 'text-amber-500 animate-bounce' : 'text-slate-400'} />
                    {chosenTempFile ? (
                      <div className="space-y-1 bg-emerald-50 border border-emerald-100 p-2 text-center rounded-lg w-full max-w-sm">
                        <span className="text-emerald-700 font-extrabold flex items-center justify-center gap-1 text-[11px]">
                          <Check size={14} className="stroke-[3]" />
                          临时Excel清单装载完毕
                        </span>
                        <p className="text-[10px] font-mono font-bold text-slate-700 truncate">{chosenTempFile.fileName}</p>
                        <p className="text-[9px] text-slate-400">
                          文件量比: {chosenTempFile.fileSize} | 解析条数: {chosenTempFile.items.length}项
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-600">选择或重拖拽临时 Excel 到此处</p>
                        <p className="text-[10px] text-slate-450">我们将模拟提取其中的清单条款并打标为『临时清单』</p>
                      </div>
                    )}

                    {/* Pre-seeds buttons */}
                    <div className="pt-2 w-full">
                      <p className="text-[9px] text-slate-400 font-bold mb-1">【演示表单】快捷点选一秒导入真实的工程行：</p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {TEMP_SAMPLE_EXCEL_FILES.map((f, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleQuickSelectTempFile(idx)}
                            className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                              chosenTempFile?.fileName === f.fileName 
                                ? 'bg-amber-600 text-white border-amber-600' 
                                : 'bg-white text-slate-650 hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            {f.specialty}临时标书.xlsx
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-655 to-amber-600 hover:from-amber-700 text-white font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    解析并导入临时清单
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FULL-SCREEN SLIDING DRAWER INTERACTIVE PANEL FOR ROUTE B CONTRACT SELECT */}
      {/* ==================================================================== */}
      {isDrawerOpen && activeProject && (
        <div className="fixed inset-0 z-55 bg-slate-900/40 backdrop-blur-3xs flex justify-end">
          <div className="bg-white w-full max-w-6xl h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-200 text-xs">
            
            {/* Drawer Header */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md shrink-0">
              <div>
                <div className="text-[10px] text-slate-350 font-bold tracking-widest uppercase">已匹配至合同清单模具库</div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 mt-0.5">
                  <ListPlus className="text-blue-400" size={18} />
                  配置及选定项目清单条款
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 bg-slate-700/60 text-slate-200 hover:text-white rounded-lg hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selection info summary bar */}
            <div className="bg-slate-50 border-b border-gray-150 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-gray-700">
                  清单信息: <span className="text-blue-600 font-extrabold">{formName}</span>
                </p>
                <p className="text-[10px] text-gray-450">
                  适用主线路段：{getSectionName(formSection)} | 履约时间：{formYear}年 | 专业：{formSpecialty}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right font-semibold">
                  <span className="text-gray-400 block text-[9px] uppercase leading-none">右侧已精配款数/合价值</span>
                  <span className="text-xs font-black text-rose-600 font-mono">
                    {drawerSelectedItems.length}项 | ¥{drawerSelectedItems.reduce((s,i)=>s+i.amount,0).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveDrawerProjectInventory}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-lg shadow-sm transition"
                >
                  确认并保存此清单
                </button>
              </div>
            </div>

            {/* Core Drawer Grid Section */}
            <div className="flex-1 overflow-hidden flex divide-x divide-slate-200">
              
              {/* ========================================== */}
              {/* LEFT SIDE: CONTRACT SOURCE SPREADSHEET ITEMS */}
              {/* ========================================== */}
              <div className="w-1/2 flex flex-col h-full bg-slate-50/40">
                <div className="p-3 bg-white border-b border-gray-150 flex items-center justify-between gap-2 shrink-0">
                  <span className="font-extrabold text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                    左侧：来自合同内清单库
                  </span>
                  
                  <button
                    type="button"
                    onClick={handlePullAllItemsToSelected}
                    className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded bg-blue-50 transition"
                  >
                    全部拉入右侧 ⇒
                  </button>
                </div>

                {/* Filter and items view */}
                <div className="p-2 border-b border-slate-100 bg-white grid grid-cols-1 gap-2 shrink-0">
                  <input
                    type="text"
                    value={drawerSearchText}
                    onChange={e => setDrawerSearchText(e.target.value)}
                    placeholder="在合同清单中检索项目名称/编号..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded px-2.5 py-1.5 outline-none font-semibold text-slate-700"
                  />
                </div>

                {/* Spreadsheet item listings */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {drawerContractItems
                    .filter(item => {
                      const txt = drawerSearchText.trim().toLowerCase();
                      return !txt || item.name.toLowerCase().includes(txt) || item.code.toLowerCase().includes(txt);
                    })
                    .map((item, index) => {
                      const isAlreadyPulled = drawerSelectedItems.some(it => it.code === item.code);
                      return (
                        <div
                          key={item.id || index}
                          className={`p-3 bg-white border rounded-xl shadow-3xs flex items-center justify-between transition-colors ${
                            isAlreadyPulled ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="space-y-1 truncate pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-400 text-[10px]">#{index+1}</span>
                              <span className="font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {item.code}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">({item.unit})</span>
                            </div>
                            <h5 className="font-extrabold text-slate-755 truncate text-slate-700" title={item.name}>
                              {item.name}
                            </h5>
                            <div className="text-[10px] text-gray-450 font-bold">
                              合同指导单价: <span className="font-mono text-gray-700 font-black">¥{item.price.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAlreadyPulled ? (
                              <span className="text-[10px] text-emerald-600 font-black flex items-center gap-0.5 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                <Check size={12} className="stroke-[3]" />
                                已拉入
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePullItemToSelected(item)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[10px] transition cursor-pointer"
                              >
                                分配并拉入
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ========================================== */}
              {/* RIGHT SIDE: SELECTED TARGETS + MANUAL FORM */}
              {/* ========================================== */}
              <div className="w-1/2 flex flex-col h-full bg-white">
                <div className="p-3 border-b border-gray-150 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <span className="font-extrabold text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                    右侧：所选定的项目清单条目 ({drawerSelectedItems.length}项)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setShowManualItemForm(true);
                      setManualCode(`OUT-${Date.now().toString().slice(-4)}`);
                    }}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-black text-[10px] transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={12} className="stroke-[3]" />
                    手动录入合同外清单条目
                  </button>
                </div>

                {/* Form to insert out-of-contract items (合同外清单) */}
                {showManualItemForm && (
                  <form onSubmit={handleAddManualItem} className="p-3 bg-amber-50/40 border-b border-amber-100 text-gray-700 space-y-2 shrink-0">
                    <div className="flex items-center justify-between text-[11px] font-black text-amber-800">
                      <span>补充合同外项目清单项 (自行创设名目)</span>
                      <button 
                        type="button" 
                        onClick={() => setShowManualItemForm(false)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 block">清单编码</label>
                        <input
                          type="text"
                          required
                          value={manualCode}
                          onChange={e => setManualCode(e.target.value)}
                          placeholder="例如: OUT-01"
                          className="w-full bg-white border border-gray-300 rounded p-1 font-mono font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-bold text-gray-500 block">项目名目名称</label>
                        <input
                          type="text"
                          required
                          value={manualName}
                          onChange={e => setManualName(e.target.value)}
                          placeholder="请输入工程名目"
                          className="w-full bg-white border border-gray-300 rounded p-1 outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 block">计量单位</label>
                        <input
                          type="text"
                          required
                          value={manualUnit}
                          onChange={e => setManualUnit(e.target.value)}
                          placeholder="套/㎡/t"
                          className="w-full bg-white border border-gray-300 rounded p-1 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 block">综合单价 (元)</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={manualPrice || ''}
                          onChange={e => setManualPrice(Number(e.target.value))}
                          placeholder="单价"
                          className="w-full bg-white border border-gray-300 rounded p-1 outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 block">项目分配数量 (估)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={manualQuantity || ''}
                          onChange={e => setManualQuantity(Number(e.target.value))}
                          placeholder="预测工程量"
                          className="w-full bg-white border border-gray-300 rounded p-1 outline-none font-mono"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <button
                          type="submit"
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-1 rounded transition text-[10px]"
                        >
                          确认添加条款
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Listing pulled items on Right Panel */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {drawerSelectedItems.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <ListPlus className="mx-auto text-gray-300 mb-2" size={32} />
                      <p className="font-bold">当前暂无已选项目条款</p>
                      <p className="text-[10px] text-gray-400 mt-1">请从左侧点选“分配并拉入”或在右上方点击手动录外项目项</p>
                    </div>
                  ) : (
                    drawerSelectedItems.map((it, idx) => (
                      <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-3xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono font-bold text-slate-400 text-[10px]">#{idx+1}</span>
                            <span className="font-mono font-black text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                              {it.code}
                            </span>
                            <span className="font-bold text-slate-800 truncate" title={it.name}>{it.name}</span>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase shrink-0 ${
                            it.source === '合同内清单' 
                              ? 'bg-teal-50 border-teal-150 text-teal-600' 
                              : 'bg-amber-50 border-amber-150 text-amber-600'
                          }`}>
                            {it.source}
                          </span>
                        </div>

                        {/* Calculations config inputs row */}
                        <div className="grid grid-cols-3 gap-3 bg-white p-2 rounded-lg border border-slate-100 text-[10px]">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-bold">综合单价 / 计量单位</span>
                            <span className="font-mono font-extrabold text-gray-700 block mt-0.5">
                              ¥{it.price.toFixed(2)} / {it.unit}
                            </span>
                          </div>
                          <div>
                            <label className="text-[9px] text-blue-600 font-extrabold block">配置工程量/数量 *</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity || ''}
                              onChange={e => handleDrawerQtyChange(it.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-0.5 px-1 font-mono font-extrabold text-blue-600 focus:bg-white focus:border-blue-500 outline-none text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-gray-400 block font-bold">报价合价款</span>
                              <span className="font-mono font-black text-rose-600 block mt-0.5">
                                ¥{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDrawerSelectItem(it.id)}
                              className="text-slate-350 hover:text-red-500 p-1 hover:bg-slate-100 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
              <h4 className="font-extrabold text-sm text-slate-800 font-sans">确认删除此项目清单吗？</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              您确定要彻底删除该份项目清单吗？此操作不可逆。删除选定的清单后将无法在施工填报中录入。
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

      {/* ==================================================================== */}
      {/* TEMPORARY TO OFFICIAL INVENTORY CONVERSION SPREADSHEET WIZARD */}
      {/* ==================================================================== */}
      {isConvertModalOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-3xs p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 bg-slate-50 rounded-t-2xl flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 rounded text-amber-655">
                  <RefreshCw className="animate-spin-slow stroke-[2.5]" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800 tracking-tight">
                    临时施工计量转为正式合同定额清单
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                    已施工且在施工日报等记录中填报的临时清单项，将在验证额度后全量平移更新至正式预算条目。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Context bar / select source */}
              <div className="bg-slate-50 border border-slate-250 p-3 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold">选择源临时清理清单</label>
                  <select
                    value={convertTempInventoryId}
                    onChange={(e) => {
                      setConvertTempInventoryId(e.target.value);
                      initializeConversionMappings(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 text-xs outline-none font-extrabold text-slate-700"
                  >
                    <option value="">-- 请选择要转换的临时项目清单 --</option>
                    {projectInventories
                      .filter(pi => pi.type === '临时清单')
                      .map(pi => (
                        <option key={pi.id} value={pi.id}>
                          {pi.name} [{pi.year}年 | {pi.specialty} | {getSectionName(pi.sectionId)}] ({pi.items.length} 个子目)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bg-amber-50/60 border border-amber-205 rounded-xl p-2.5 flex items-start gap-2">
                  <Info className="text-amber-600 shrink-0 mt-0.5" size={14} />
                  <div className="text-[10px] text-amber-800 font-medium leading-relaxed">
                    <span className="font-black block text-amber-900 leading-none mb-1">转入必备条件/规则：</span>
                    仅转换已经由登记施工日报填报了“已完成量”的临时清单条目，对于零进度/未施工量，转入时不需要转换也不进行日志重塑。
                  </div>
                </div>
              </div>

              {/* Items Mapping Section */}
              {convertTempInventoryId ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
                  {/* Left Column: Completed Temporary List (Weight 5/12) */}
                  <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                        <Layers size={13} className="text-amber-500" />
                        1. 临时计量已完成项（待转入）
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-200">
                        {getTempInventoryLoggedStats(convertTempInventoryId).filter(s => s.completedQty > 0).length} 项施工中
                      </span>
                    </div>

                    <div className="p-3 flex-1 overflow-y-auto max-h-[380px] space-y-2">
                      {(() => {
                        const stats = getTempInventoryLoggedStats(convertTempInventoryId);
                        const activeStats = stats.filter(s => s.completedQty > 0);

                        if (activeStats.length === 0) {
                          return (
                            <div className="text-center py-10 px-4 text-xs font-bold text-gray-400">
                              ⚠️ 未扫描到此临时清单中存在大于0的历史施工量，无需或无法转换。
                            </div>
                          );
                        }

                        return activeStats.map((stat) => {
                          const hasMapping = !!conversionMappings[stat.item.id]?.targetOfficialItemId;
                          const isSelected = selectedConversionTempItemId === stat.item.id;

                          return (
                            <div
                              key={stat.item.id}
                              onClick={() => handleSelectTempItem(stat.item.id)}
                              className={`p-3 rounded-lg border transition-all cursor-pointer text-left relative ${
                                isSelected 
                                  ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-300' 
                                  : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                <span className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[9px] font-extrabold leading-none">
                                  {stat.item.code}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                  hasMapping 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : 'bg-rose-50 text-rose-500 border border-rose-250'
                                }`}>
                                  {hasMapping ? '已关联正式' : '待绑定正式'}
                                </span>
                              </div>

                              <div className="text-xs font-black text-slate-800 line-clamp-1 mb-1">
                                {stat.item.name}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 border-dashed">
                                <span className="font-medium">
                                  历史已施工: <strong className="text-amber-600 font-mono font-black">{stat.completedQty}</strong> {stat.item.unit}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold font-mono">
                                  单价: ¥{stat.item.price}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Mapping workspace and formal contract target (Weight 7/12) */}
                  <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center shrink-0">
                      <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-indigo-600 shrink-0 animate-spin-slow" />
                        2. 关联转入至正式合同定额 (对应正式清单)
                      </span>
                    </div>

                    <div className="p-4 flex-1 space-y-4 text-xs">
                      {(() => {
                        const stats = getTempInventoryLoggedStats(convertTempInventoryId);
                        const activeStats = stats.filter(s => s.completedQty > 0);
                        const selectedStat = stats.find(s => s.item.id === selectedConversionTempItemId);
                        const officialList = getAvailableOfficialItems();

                        if (!selectedConversionTempItemId || !selectedStat) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400 font-bold space-y-2">
                              <Info size={28} className="text-slate-300" />
                              <p>请点击左侧的临时计量子目</p>
                              <p className="text-[10px] text-gray-400 font-medium">从而激活并配对右侧的正式清单项</p>
                            </div>
                          );
                        }

                        const mapping = conversionMappings[selectedStat.item.id] || {
                          targetOfficialItemId: '',
                          excessOption: 'discard',
                          splitTargetOfficialItemId: ''
                        };

                        // Calculate available capacity for the selected main target item
                        let contractTotal = 0;
                        let alreadyLogged = 0;
                        let availableCapacity = 0;
                        let isExcess = false;

                        if (mapping.targetOfficialItemId) {
                          const oItem = officialList.find(o => o.id === mapping.targetOfficialItemId);
                          if (oItem) {
                            contractTotal = oItem.quantity;
                            alreadyLogged = getOfficialItemLoggedQty(oItem.id);
                            availableCapacity = Math.max(0, contractTotal - alreadyLogged);
                            isExcess = selectedStat.completedQty > availableCapacity;
                          }
                        }

                        return (
                          <div className="space-y-4">
                            {/* Selected Temp Item Info Panel */}
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5">
                              <span className="text-[9px] text-gray-400 font-bold uppercase block leading-none">正在关联的临时子目</span>
                              <div className="font-extrabold text-slate-800 text-sm">
                                {selectedStat.item.name}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] bg-white border border-slate-100 p-2 rounded font-mono font-bold mt-1 shadow-3xs text-slate-650">
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">编号</span>
                                  <span>{selectedStat.item.code}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">历史完成工程量</span>
                                  <span className="text-amber-600 font-black">{selectedStat.completedQty} {selectedStat.item.unit}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold leading-none mb-0.5">临时单价/合价款</span>
                                  <span>¥{selectedStat.item.price} (约 ¥{(selectedStat.completedQty * selectedStat.item.price).toLocaleString()})</span>
                                </div>
                              </div>
                            </div>

                            {/* Dropdown Selector for Contract Inventory */}
                            <div className="space-y-1.5 shadow-2xs bg-slate-50 border border-slate-200 p-3 rounded-lg">
                              <label className="block text-slate-705 font-black text-xs">
                                🔗 1. 选择目标正式合同清单 (先选择合同清单)*
                              </label>
                              <select
                                value={selectedTargetContractInvId}
                                onChange={(e) => {
                                  const cInvId = e.target.value;
                                  setSelectedTargetContractInvId(cInvId);
                                  setSelectedTargetOfficialItemId('');
                                  setConversionMappings({
                                    ...conversionMappings,
                                    [selectedStat.item.id]: {
                                      ...mapping,
                                      targetOfficialItemId: ''
                                    }
                                  });
                                }}
                                className="w-full bg-white border border-slate-250 focus:border-blue-500 rounded-lg p-2 text-xs outline-none font-bold text-slate-700 cursor-pointer"
                              >
                                <option value="">-- 请选择关联的目标合同清单 --</option>
                                {contractInventories.map(cInv => (
                                  <option key={cInv.id} value={cInv.id}>
                                    {cInv.name} ({cInv.year}年 | {cInv.specialty} | {cInv.items?.length || 0}项)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Selected Contract's Items List */}
                            {selectedTargetContractInvId ? (
                              <div className="space-y-1.5 flex flex-col">
                                <label className="block text-slate-750 font-black text-xs">
                                  📋 2. 选择目标正式清单子目 (左边选中，右边也选中)*
                                </label>
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 flex-1 flex flex-col max-h-[220px]">
                                  <div className="p-1.5 px-3 bg-slate-100 border-b border-slate-200 flex justify-between text-[10px] text-gray-500 font-bold shrink-0">
                                    <span>清单项编码及名称</span>
                                    <span>合同价 | 限制额度</span>
                                  </div>
                                  <div className="p-2 overflow-y-auto space-y-1.5 max-h-[175px]">
                                    {(() => {
                                      const selectedCInv = contractInventories.find(c => c.id === selectedTargetContractInvId);
                                      const items = selectedCInv?.items || [];
                                      if (items.length === 0) {
                                        return (
                                          <div className="text-center py-6 text-gray-400 font-bold">
                                            此合同清单内暂无子目项
                                          </div>
                                        );
                                      }
                                      return items.map((oItem: any) => {
                                        const isSelected = selectedTargetOfficialItemId === oItem.id || mapping.targetOfficialItemId === oItem.id;
                                        return (
                                          <div
                                            key={oItem.id}
                                            onClick={() => {
                                              setSelectedTargetOfficialItemId(oItem.id);
                                              setConversionMappings({
                                                ...conversionMappings,
                                                [selectedStat.item.id]: {
                                                  ...mapping,
                                                  targetOfficialItemId: oItem.id
                                                }
                                              });
                                            }}
                                            className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex justify-between items-center ${
                                              isSelected
                                                ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                                                : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                                            }`}
                                          >
                                            <div className="flex-1 min-w-0 pr-2">
                                              <div className="flex items-center gap-1.5 mb-1">
                                                <span className="font-mono bg-amber-100 text-amber-800 text-[9px] font-black px-1 rounded">
                                                  {oItem.code}
                                                </span>
                                                {isSelected && (
                                                  <span className="bg-emerald-500 text-white text-[8px] font-black px-1 rounded-sm flex items-center leading-none py-0.5 animate-pulse">
                                                    ✓ 已选中
                                                  </span>
                                                )}
                                              </div>
                                              <div className="font-extrabold text-slate-800 text-xs truncate">
                                                {oItem.name}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0 min-w-[80px] font-mono leading-tight">
                                              <div className="text-[11px] text-slate-800 font-black">¥{oItem.price}</div>
                                              <div className="text-[9px] text-slate-400 font-bold">上限 {oItem.quantity} {oItem.unit}</div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-center text-slate-400 border border-slate-200 rounded-lg bg-slate-50/50">
                                请先在上方选择合同清单，以加载合同子目列表进行“右边选中”配对。
                              </div>
                            )}

                            {/* Mapping Target Status Check Card */}
                            {mapping.targetOfficialItemId ? (
                              <div className="border border-slate-150 rounded-lg p-3.5 space-y-3 bg-slate-50/30">
                                <div className="space-y-1">
                                  <div className="text-[10px] text-gray-400 font-bold flex justify-between">
                                    <span>正式合同量余量和容量诊断</span>
                                    <span className="font-mono text-slate-600 font-black">限额总量: {contractTotal}</span>
                                  </div>
                                  
                                  {/* Progress bar to visualize capacity */}
                                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                      style={{ width: `${Math.min(100, (alreadyLogged / contractTotal) * 100)}%` }} 
                                      className="bg-blue-500 h-full"
                                      title={`已用量: ${alreadyLogged}`}
                                    />
                                    <div 
                                      style={{ width: `${Math.min(100, (selectedStat.completedQty / contractTotal) * 100)}%` }} 
                                      className={`${isExcess ? 'bg-rose-500' : 'bg-emerald-500'} h-full`}
                                      title={`待转入量: ${selectedStat.completedQty}`}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 pt-1 leading-none">
                                    <span>已占用: {alreadyLogged}</span>
                                    <span>本次待转: {selectedStat.completedQty}</span>
                                    <span className="text-emerald-600">空闲容量: {availableCapacity}</span>
                                  </div>
                                </div>

                                {!isExcess ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-emerald-700 text-[11px] font-black bg-emerald-50/70 p-2 rounded-lg border border-emerald-250">
                                      <Check size={14} className="stroke-[3] text-emerald-600 shrink-0" />
                                      <span>容量满足：转入通道畅通，本条目可以直接 100% 安全转换至正式项。</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteSingleItemConversion(selectedStat.item.id)}
                                      className="w-full py-2.5 bg-gradient-to-r from-emerald-505 to-teal-605 hover:from-emerald-655 hover:to-teal-755 text-white font-extrabold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                                    >
                                      <Check size={13} className="stroke-[3]" />
                                      点击转入并转换清单
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3 border-t border-dashed border-slate-200 pt-3">
                                    <div className="text-rose-700 text-[11px] font-black bg-rose-50 p-2 rounded border border-rose-205 flex items-start gap-1.5">
                                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                                      <div>
                                        <span>超限值警告！对应 formal 项尚余容量 {availableCapacity}，多余施工量 {selectedStat.completedQty - availableCapacity} 已溢出定额限制！</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <label className="text-[11px] text-slate-700 font-extrabold block">溢出工程量分配及处理策略 *</label>
                                      <select
                                        value={mapping.excessOption}
                                        onChange={(e) => {
                                          setConversionMappings({
                                            ...conversionMappings,
                                            [selectedStat.item.id]: {
                                              ...mapping,
                                              excessOption: e.target.value as any
                                            }
                                          });
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-bold text-slate-700"
                                      >
                                        <option value="discard">放弃多出部分量 - 仅转换符合限额的 {availableCapacity} (多余 {selectedStat.completedQty - availableCapacity} 削平丢弃)</option>
                                        <option value="force">强行超量录入 - 忽略限额校验，保留原样全部 {selectedStat.completedQty} 强转</option>
                                        <option value="split">分摊拆分转入 - 选择备用正式项目吸收剩余的 {selectedStat.completedQty - availableCapacity}</option>
                                      </select>
                                    </div>

                                    {/* Split Target Selection block */}
                                    {mapping.excessOption === 'split' && (
                                      <div className="bg-purple-50/40 border border-purple-200 rounded-lg p-2.5 space-y-2 mt-2">
                                        <label className="text-[10px] text-purple-700 font-extrabold block">选择分摊的第二目标正式项：</label>
                                        <select
                                          value={mapping.splitTargetOfficialItemId || ''}
                                          onChange={(e) => {
                                            setConversionMappings({
                                              ...conversionMappings,
                                              [selectedStat.item.id]: {
                                                ...mapping,
                                                splitTargetOfficialItemId: e.target.value
                                              }
                                            });
                                          }}
                                          className="w-full bg-white border border-purple-250 focus:border-purple-600 rounded-md p-1.5 text-xs outline-none font-bold text-slate-705"
                                        >
                                          <option value="">-- 请选择第二拆分项 --</option>
                                          {officialList
                                            .filter(o => o.id !== mapping.targetOfficialItemId)
                                            .map(o => {
                                              const splitLogged = getOfficialItemLoggedQty(o.id);
                                              const splitCap = Math.max(0, o.quantity - splitLogged);
                                              return (
                                                <option key={o.id} value={o.id}>
                                                  [{o.code}] {o.name} (容量: {splitCap} | 单位:{o.unit})
                                                </option>
                                              );
                                            })}
                                        </select>

                                        {/* Verify if secondary target is satisfied */}
                                        {(() => {
                                          if (mapping.splitTargetOfficialItemId) {
                                            const sItem = officialList.find(o => o.id === mapping.splitTargetOfficialItemId);
                                            if (sItem) {
                                              const splitLogged = getOfficialItemLoggedQty(sItem.id);
                                              const splitCap = Math.max(0, sItem.quantity - splitLogged);
                                              const remainderQty = selectedStat.completedQty - availableCapacity;
                                              const ok = splitCap >= remainderQty;

                                              return ok ? (
                                                <div className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-250 p-1 px-2 rounded font-extrabold">
                                                  ✅ 拆分验证：备用容量足够容纳剩余施工量！
                                                </div>
                                              ) : (
                                                <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-250 p-1 px-2 rounded font-extrabold">
                                                  ⚠️ 拆分验证：第二选项目前容量仍然稍微不足，执行时部分强转
                                                </div>
                                              );
                                            }
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleExecuteSingleItemConversion(selectedStat.item.id)}
                                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400 mt-2"
                                    >
                                      <Check size={13} className="stroke-[3]" />
                                      点击转入并转换清单
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-6 text-center text-slate-400 font-bold bg-slate-50 border border-slate-150 rounded-lg flex flex-col items-center justify-center gap-1">
                                <span className="text-xl">🔗</span>
                                <span>请在上面选择关联的正式项目 (右边选中)</span>
                                <span className="text-[10px] text-slate-400 font-medium">从而激活额度、进行安全系数诊断及转入操作</span>
                              </div>
                            )}

                            {/* Nav controls between items queue */}
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-gray-400 font-bold">
                              <span>已确认关联数: {
                                activeStats.filter(s => !!conversionMappings[s.item.id]?.targetOfficialItemId).length
                              } / {activeStats.length}</span>
                              <div className="flex gap-2">
                                {(() => {
                                  const curIdx = activeStats.findIndex(s => s.item.id === selectedStat.item.id);
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        disabled={curIdx <= 0}
                                        onClick={() => setSelectedConversionTempItemId(activeStats[curIdx - 1].item.id)}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-40 font-bold cursor-pointer text-slate-600 disabled:cursor-not-allowed"
                                      >
                                        上一个
                                      </button>
                                      <button
                                        type="button"
                                        disabled={curIdx === -1 || curIdx >= activeStats.length - 1}
                                        onClick={() => setSelectedConversionTempItemId(activeStats[curIdx + 1].item.id)}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-40 font-bold cursor-pointer text-slate-600 disabled:cursor-not-allowed"
                                      >
                                        下一个
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 font-bold bg-slate-50 border border-slate-201 rounded-xl">
                  请先指定上方的“临时清单文件”后开始比对。
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 rounded-b-2xl flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                <AlertCircle size={12} className="text-blue-500" />
                <span>转正执行后将直接写入 LocalStorage 本地存储并自动重塑相关日志。</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConversion}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-650 hover:to-orange-750 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className="stroke-[3]" />
                  确认并执行转正结转
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
