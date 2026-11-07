"use client";

import { useState, useEffect, use } from "react";
import { Plus, Trash2, Users, Coins, ArrowLeft, Loader2, Landmark, Edit2, TrendingUp, TrendingDown, Search, FolderOpen, Calendar, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AssetGroupDetail(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [goldPrices, setGoldPrices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ASSETS" | "MEMBERS">("ASSETS");
  const [expandedGoldGroups, setExpandedGoldGroups] = useState<Record<string, boolean>>({});

  // Forms state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("VIEW");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"SAVINGS" | "GOLD">("SAVINGS");

  const [assetForm, setAssetForm] = useState({
    name: "", value: "", bankName: "", interestRate: "", monthlyInterestRate: "", startDate: "", maturityDate: "",
    goldType: "SJC", quantity: "", buyPrice: "", buyDate: "", referenceRate: "6"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupRes, goldRes] = await Promise.all([
        fetch(`/api/assets/groups/${params.id}`),
        fetch(`/api/assets/gold-price`)
      ]);
      const groupData = await groupRes.json();
      const goldData = await goldRes.json();

      if (groupData.success) {
        setGroup(groupData.group);
        setIsOwner(groupData.isOwner);
      }
      if (goldData.success) {
        setGoldPrices(goldData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [params.id]);

  useEffect(() => {
    if (!newMemberEmail || newMemberEmail.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(newMemberEmail)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [newMemberEmail]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/assets/groups/${params.id}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddMember(false);
        setNewMemberEmail("");
        fetchData();
      } else { alert(data.error); }
    } catch (e) { console.error(e); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Xóa thành viên này?")) return;
    try {
      await fetch(`/api/assets/groups/${params.id}/members/${memberId}`, { method: "DELETE" });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const resetAssetForm = () => {
    setShowAddAsset(false);
    setEditingAssetId(null);
    setAssetForm({
      name: "", value: "", bankName: "", interestRate: "", monthlyInterestRate: "", startDate: "", maturityDate: "",
      goldType: "SJC", quantity: "", buyPrice: "", buyDate: "", referenceRate: "6"
    });
  };

  const getGoldShopName = (rawName: string) => {
    if (!rawName) return "";
    return rawName.replace(/^\d+(?:[.,]\d+)?\s*chỉ\s*vàng\s*/i, "").trim() || rawName.trim();
  };

  const getGoldTypeLabel = (goldType: string) => {
    if (goldType === "SJ9999") return "Vàng Nhẫn Tư Nhân";
    if (goldType === "SJC") return "Vàng Miếng SJC";
    return goldType;
  };

  const formatMillions = (amount: number) => {
    const millions = amount / 1000000;
    return Number.isInteger(millions)
      ? millions.toLocaleString("vi-VN")
      : millions.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  };

  const handleEditAsset = (asset: any) => {
    setAssetType(asset.type);
    setEditingAssetId(asset.id);
    const d = asset.details;
    const formatDate = (ds: string) => { try { return new Date(ds).toISOString().split('T')[0]; } catch { return ""; } };

    setAssetForm({
      name: asset.type === "GOLD" ? getGoldShopName(asset.name || "") : (asset.name || ""),
      value: asset.type === "SAVINGS" ? asset.value?.toString() : d?.quantity?.toString() || "",
      bankName: d?.bankName || "",
      interestRate: d?.interestRate?.toString() || "",
      monthlyInterestRate: d?.monthlyInterestRate?.toString() || "",
      startDate: d?.startDate ? formatDate(d.startDate) : "",
      maturityDate: d?.maturityDate ? formatDate(d.maturityDate) : "",
      goldType: d?.goldType || "SJC",
      quantity: d?.quantity?.toString() || "",
      buyPrice: d?.buyPrice?.toString() || "",
      buyDate: d?.buyDate ? formatDate(d.buyDate) : "",
      referenceRate: d?.referenceRate?.toString() || "6"
    });
    setShowAddAsset(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const details = assetType === "SAVINGS"
        ? { 
            bankName: assetForm.bankName, 
            interestRate: parseFloat(assetForm.interestRate), 
            monthlyInterestRate: assetForm.monthlyInterestRate ? parseFloat(assetForm.monthlyInterestRate) : null,
            startDate: assetForm.startDate,
            maturityDate: assetForm.maturityDate 
          }
        : { goldType: assetForm.goldType, quantity: parseFloat(assetForm.quantity), buyPrice: parseFloat(assetForm.buyPrice), buyDate: assetForm.buyDate, referenceRate: parseFloat(assetForm.referenceRate) };

      const payload = {
        type: assetType,
        name: assetType === "GOLD" ? getGoldShopName(assetForm.name) : assetForm.name,
        value: assetType === "SAVINGS" ? parseFloat(assetForm.value) : parseFloat(assetForm.quantity),
        description: "",
        details
      };

      const url = editingAssetId ? `/api/assets/groups/${params.id}/assets/${editingAssetId}` : `/api/assets/groups/${params.id}/assets`;
      const res = await fetch(url, {
        method: editingAssetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        resetAssetForm();
        fetchData();
      } else { alert(data.error); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Xóa tài sản này?")) return;
    try {
      await fetch(`/api/assets/groups/${params.id}/assets/${assetId}`, { method: "DELETE" });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const calculateGoldProfit = (asset: any) => {
    if (!goldPrices) return null;
    const details = asset.details;

    // Giá cửa hàng mua vào 
    const currentBuyPricePerLg = goldPrices[details.goldType]?.buy || goldPrices.SJC.buy;
    // Giá cửa hàng bán ra 
    const currentSellPricePerLg = goldPrices[details.goldType]?.sell || goldPrices.SJC.sell;

    const currentValueByBuy = details.quantity * (currentBuyPricePerLg / 10);
    const currentValueBySell = details.quantity * (currentSellPricePerLg / 10);

    // Biến động so với giá bán (như user yêu cầu)
    const actualProfit = currentValueBySell - details.buyPrice;

    const buyDate = new Date(details.buyDate);
    const today = new Date();
    const yearsDiff = ((today.getTime() - buyDate.getTime()) / (1000 * 3600 * 24)) / 365.25;

    const bankProfit = details.buyPrice * (details.referenceRate / 100) * yearsDiff;

    // So sánh vs gửi ngân hàng thì so bằng giá mua (như user yêu cầu)
    const profitByBuy = currentValueByBuy - details.buyPrice;
    const difference = profitByBuy - bankProfit;

    return { currentValue: currentValueBySell, actualProfit, bankProfit, difference };
  };

  const calculateSavingsProfit = (asset: any) => {
    const details = asset.details;
    const value = asset.value || 0;
    
    if (!details.startDate) return null;
    
    const startDate = new Date(details.startDate);
    const today = new Date();
    
    if (today < startDate) return { currentAccrued: 0, monthlyReceived: 0, totalCurrentValue: value };
    
    const daysDiff = (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    const monthsDiff = Math.floor(daysDiff / (365.25 / 12));
    
    const endTermRate = details.interestRate || 0;
    const currentAccrued = value * (endTermRate / 100) * (daysDiff / 365.25);
    
    const monthlyRate = details.monthlyInterestRate || 0;
    const monthlyReceived = value * (monthlyRate / 100 / 12) * monthsDiff;
    
    const totalCurrentValue = value + currentAccrued + monthlyReceived;
    
    return { currentAccrued, monthlyReceived, totalCurrentValue };
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={36} />
    </div>
  );

  if (!group) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">Không tìm thấy nhóm tài sản này.</div>
    </div>
  );

  // Tính tổng tài sản hiện tại (Vàng + Tiết kiệm) và danh sách hiển thị đã gộp Vàng (cùng tên + loại) và Sổ tiết kiệm (cùng ngân hàng)
  let totalCurrentAssetsValue = 0;
  let totalInvestedValue = 0;

  type DisplayItem =
    | { kind: "SAVINGS_GROUP"; key: string; bankName: string; items: any[] }
    | { kind: "GOLD_GROUP"; key: string; shopName: string; goldType: string; items: any[] };

  const displayItems: DisplayItem[] = [];
  const goldGroupMap = new Map<string, { kind: "GOLD_GROUP"; key: string; shopName: string; goldType: string; items: any[] }>();
  const savingsGroupMap = new Map<string, { kind: "SAVINGS_GROUP"; key: string; bankName: string; items: any[] }>();

  for (const a of group.assets || []) {
    if (a.type === "GOLD") {
      const p = calculateGoldProfit(a);
      const buyPrice = Number(a.details?.buyPrice) || 0;
      totalInvestedValue += buyPrice;
      totalCurrentAssetsValue += p ? p.currentValue : buyPrice;

      const shopName = getGoldShopName(a.name || "");
      const goldType = a.details?.goldType || "SJC";
      const key = `gold__${shopName.toLowerCase()}__${goldType}`;

      let existingGroup = goldGroupMap.get(key);
      if (!existingGroup) {
        existingGroup = { kind: "GOLD_GROUP", key, shopName, goldType, items: [] };
        goldGroupMap.set(key, existingGroup);
        displayItems.push(existingGroup);
      }
      existingGroup.items.push(a);
    } else {
      const sp = calculateSavingsProfit(a);
      const principal = Number(a.value) || 0;
      totalInvestedValue += principal;
      totalCurrentAssetsValue += sp ? sp.totalCurrentValue : principal;

      const bankName = (a.details?.bankName || "Khác").trim();
      const key = `savings__${bankName.toLowerCase()}`;

      let existingSavingsGroup = savingsGroupMap.get(key);
      if (!existingSavingsGroup) {
        existingSavingsGroup = { kind: "SAVINGS_GROUP", key, bankName, items: [] };
        savingsGroupMap.set(key, existingSavingsGroup);
        displayItems.push(existingSavingsGroup);
      }
      existingSavingsGroup.items.push(a);
    }
  }

  const totalProfitDiff = totalCurrentAssetsValue - totalInvestedValue;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/assets')} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft size={22} />
              </button>
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                    <FolderOpen size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{group.name}</h1>
                    {group.description && <p className="text-sm text-slate-500 mt-0.5">{group.description}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Tổng tài sản hiện tại */}
            <div className="bg-gradient-to-r from-indigo-50 to-emerald-50/70 border border-indigo-100 rounded-2xl px-4 py-3 flex flex-col sm:items-end">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600/80">Tổng tài sản hiện tại</div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {Math.round(totalCurrentAssetsValue).toLocaleString()} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-0.5 font-medium">
                <span className="text-slate-500">Vốn gốc: {Math.round(totalInvestedValue).toLocaleString()}đ</span>
                <span className={totalProfitDiff >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                  ({totalProfitDiff >= 0 ? "+" : ""}{Math.round(totalProfitDiff).toLocaleString()}đ)
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mt-6">
            <button
              onClick={() => setActiveTab("ASSETS")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === "ASSETS" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Tài sản ({group.assets.length})
            </button>
            <button
              onClick={() => setActiveTab("MEMBERS")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === "MEMBERS" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Thành viên ({group.members.length + 1})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* ASSETS TAB */}
        {activeTab === "ASSETS" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {goldPrices && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-2xl p-5 border border-amber-200/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex items-center mb-4 sm:mb-0">
                  <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-xl mr-3">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-amber-900 font-bold text-sm uppercase tracking-wider">Giá Vàng SJC (Tự động cập nhật)</h3>
                    <p className="text-amber-700/80 text-xs mt-0.5 font-medium">Cập nhật: {new Date(goldPrices.updatedAt).toLocaleTimeString('vi-VN')}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:space-x-6 w-full sm:w-auto mt-4 sm:mt-0 gap-4 sm:gap-0">
                  <div className="flex flex-col border-l-2 border-amber-200/60 pl-3 sm:pl-4">
                    <div className="text-amber-900 font-bold text-[11px] uppercase tracking-wider mb-2">Vàng Miếng SJC</div>
                    <div className="flex space-x-5">
                      <div>
                        <div className="text-amber-700/80 font-medium text-[10px] uppercase mb-0.5">Mua vào</div>
                        <div className="font-bold text-amber-900 text-sm font-mono">{(goldPrices.SJC.buy / 1000000).toLocaleString('vi-VN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                      <div>
                        <div className="text-amber-700/80 font-medium text-[10px] uppercase mb-0.5">Bán ra</div>
                        <div className="font-bold text-amber-900 text-sm font-mono">{(goldPrices.SJC.sell / 1000000).toLocaleString('vi-VN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col border-l-2 border-amber-200/60 pl-3 sm:pl-4">
                    <div className="text-amber-900 font-bold text-[11px] uppercase tracking-wider mb-2">Vàng Nhẫn Tư Nhân</div>
                    <div className="flex space-x-5">
                      <div>
                        <div className="text-amber-700/80 font-medium text-[10px] uppercase mb-0.5">Mua vào</div>
                        <div className="font-bold text-amber-900 text-sm font-mono">{(goldPrices.SJ9999.buy / 1000000).toLocaleString('vi-VN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                      <div>
                        <div className="text-amber-700/80 font-medium text-[10px] uppercase mb-0.5">Bán ra</div>
                        <div className="font-bold text-amber-900 text-sm font-mono">{(goldPrices.SJ9999.sell / 1000000).toLocaleString('vi-VN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Danh sách Tài sản</h2>
              <button
                onClick={() => setShowAddAsset(!showAddAsset)}
                className="flex items-center px-4 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full transition-all shadow-sm"
              >
                <Plus size={16} className="mr-1.5" /> Thêm tài sản
              </button>
            </div>

            {showAddAsset && (
              <div className="bg-white p-6 rounded-2xl shadow-lg ring-1 ring-slate-200/50 animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-bold text-slate-800 mb-5">{editingAssetId ? "Cập nhật Tài sản" : "Thêm mới Tài sản"}</h3>
                <form onSubmit={handleAddAsset} className="space-y-5">
                  <div className="flex space-x-6 pb-2">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="radio" checked={assetType === "SAVINGS"} onChange={() => setAssetType("SAVINGS")} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">Sổ Tiết Kiệm</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="radio" checked={assetType === "GOLD"} onChange={() => setAssetType("GOLD")} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">Vàng & Trang sức</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        {assetType === "GOLD" ? "Tên tiệm vàng" : "Tên tài sản"}
                      </label>
                      <input
                        type="text"
                        placeholder={assetType === "GOLD" ? "VD: Ngọc Diệp" : "VD: Sổ Tích Lũy BIDV"}
                        value={assetForm.name}
                        onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                        required
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    {assetType === "SAVINGS" && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngân hàng</label>
                          <input type="text" placeholder="Nhập tên NH" value={assetForm.bankName} onChange={e => setAssetForm({ ...assetForm, bankName: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Số tiền gốc (VNĐ)</label>
                          <input type="number" placeholder="0" value={assetForm.value} onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Lãi cuối kỳ (%/năm)</label>
                          <input type="number" step="0.1" placeholder="7.4" value={assetForm.interestRate} onChange={e => setAssetForm({ ...assetForm, interestRate: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Lãi hàng tháng (%/năm) <span className="normal-case font-normal">(Tùy chọn)</span></label>
                          <input type="number" step="0.1" placeholder="1.8" value={assetForm.monthlyInterestRate} onChange={e => setAssetForm({ ...assetForm, monthlyInterestRate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày gửi</label>
                          <input type="date" value={assetForm.startDate} onChange={e => setAssetForm({ ...assetForm, startDate: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày đáo hạn</label>
                          <input type="date" value={assetForm.maturityDate} onChange={e => setAssetForm({ ...assetForm, maturityDate: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                      </>
                    )}

                    {assetType === "GOLD" && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Loại Vàng</label>
                          <select value={assetForm.goldType} onChange={e => setAssetForm({ ...assetForm, goldType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                            <option value="SJC">Vàng miếng SJC</option>
                            <option value="SJ9999">Vàng nhẫn tư nhân</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Số lượng (chỉ)</label>
                          <input type="number" step="0.1" placeholder="10" value={assetForm.quantity} onChange={e => setAssetForm({ ...assetForm, quantity: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tổng Vốn Bỏ Ra (VNĐ)</label>
                          <input type="number" placeholder="80000000" value={assetForm.buyPrice} onChange={e => setAssetForm({ ...assetForm, buyPrice: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Ngày mua</label>
                          <input type="date" value={assetForm.buyDate} onChange={e => setAssetForm({ ...assetForm, buyDate: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Lãi Suất NH Tham Chiếu (%/năm)</label>
                          <input type="number" step="0.1" placeholder="5.5" value={assetForm.referenceRate} onChange={e => setAssetForm({ ...assetForm, referenceRate: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono" />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={resetAssetForm} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Hủy Bỏ</button>
                    <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
                      {editingAssetId ? "Cập Nhật Tài Sản" : "Lưu Tài Sản"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5">
              {displayItems.length === 0 && (
                <div className="bg-white py-16 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl shadow-sm">
                  <Wallet size={48} className="text-slate-200 mb-4" />
                  <h3 className="text-slate-500 font-semibold text-lg">Chưa có tài sản nào</h3>
                  <p className="text-slate-400 text-sm mt-1">Hãy thêm tài sản mới để bắt đầu quản lý.</p>
                </div>
              )}
              {displayItems.map((entry) => {
                if (entry.kind === "GOLD_GROUP") {
                  const { key, shopName, goldType, items } = entry;
                  const isMultiple = items.length > 1;
                  const isExpanded = !!expandedGoldGroups[key];

                  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.details?.quantity) || 0), 0);
                  const totalBuyPrice = items.reduce((sum, item) => sum + (Number(item.details?.buyPrice) || 0), 0);

                  let aggProfit: { currentValue: number; actualProfit: number; bankProfit: number; difference: number } | null = null;
                  if (goldPrices) {
                    aggProfit = items.reduce(
                      (acc, item) => {
                        const p = calculateGoldProfit(item);
                        if (p) {
                          acc.currentValue += p.currentValue;
                          acc.actualProfit += p.actualProfit;
                          acc.bankProfit += p.bankProfit;
                          acc.difference += p.difference;
                        }
                        return acc;
                      },
                      { currentValue: 0, actualProfit: 0, bankProfit: 0, difference: 0 }
                    );
                  }

                  const displayTitle = `${totalQuantity} chỉ vàng ${shopName}`;
                  const singleItem = items[0];

                  return (
                    <div key={key} className="bg-white rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-200/60 transition-all overflow-hidden">
                      <div
                        onClick={() => {
                          if (isMultiple) {
                            setExpandedGoldGroups(prev => ({ ...prev, [key]: !prev[key] }));
                          }
                        }}
                        className={`p-5 flex flex-col md:flex-row md:items-center relative group ${isMultiple ? "cursor-pointer select-none" : ""}`}
                      >
                        {!isMultiple && singleItem && (
                          <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleEditAsset(singleItem); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm rounded-full border border-slate-200 transition-all" title="Sửa">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(singleItem.id); }} className="p-2 text-slate-400 hover:text-rose-600 bg-white shadow-sm rounded-full border border-slate-200 transition-all" title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3.5 rounded-xl flex-shrink-0 bg-amber-100/50 text-amber-600 ring-1 ring-amber-200">
                            <Coins size={24} />
                          </div>
                          <div className="pt-1">
                            <div className="flex items-center gap-2 flex-wrap pr-12">
                              <h3 className="text-slate-900 font-bold text-lg leading-tight">{displayTitle}</h3>
                              {isMultiple && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  {items.length} tài sản
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center mt-2 gap-3">
                              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                                {totalQuantity} chỉ {getGoldTypeLabel(goldType)}
                              </span>
                              {!isMultiple && singleItem?.details?.buyDate && (
                                <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                  <Calendar size={12} className="mr-1" /> Mua: {new Date(singleItem.details.buyDate).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                              <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                <Wallet size={12} className="mr-1" /> Vốn: {totalBuyPrice.toLocaleString()}đ
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 md:mt-0 md:ml-6 md:text-right flex flex-col items-start md:items-end justify-center min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                          {aggProfit ? (
                            <>
                              <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Định giá hiện tại</div>
                              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono mb-2">
                                {Math.round(aggProfit.currentValue).toLocaleString()} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
                              </div>

                              <div className="flex flex-col space-y-1.5 w-full">
                                <div className={`flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg font-medium ${aggProfit.actualProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                  <span className="mr-4">Biến động:</span>
                                  <span className="flex items-center">
                                    {aggProfit.actualProfit > 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                    {aggProfit.actualProfit > 0 ? "+" : ""}{Math.round(aggProfit.actualProfit).toLocaleString()} đ
                                  </span>
                                </div>

                                <div className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg font-medium ${aggProfit.difference >= 0 ? "bg-indigo-50 text-indigo-700" : "bg-orange-50 text-orange-700"}`}>
                                  <span className="mr-4">So vs gửi NH:</span>
                                  <span>{aggProfit.difference > 0 ? "+" : ""}{Math.round(aggProfit.difference).toLocaleString()} đ</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Tổng vốn</div>
                              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                                {totalBuyPrice.toLocaleString()} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Khung đổ xuống hiển thị chi tiết từng tài sản vàng khi có gộp */}
                      {isMultiple && isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Chi tiết từng đợt mua ({items.length})
                          </div>
                          {items.map((item: any) => {
                            const itemProfit = calculateGoldProfit(item);
                            const itemShopName = getGoldShopName(item.name || "");
                            const itemTitle = `${item.details.quantity} chỉ vàng ${itemShopName}`;

                            return (
                              <div
                                key={item.id}
                                className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 relative group/item"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-slate-800 font-bold text-base">{itemTitle}</h4>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleEditAsset(item)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-full border border-slate-200 transition-all"
                                        title="Sửa"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAsset(item.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-full border border-slate-200 transition-all"
                                        title="Xóa"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center mt-2 gap-3">
                                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {item.details.quantity} chỉ {getGoldTypeLabel(item.details.goldType)}
                                    </span>
                                    <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                      <Calendar size={12} className="mr-1" /> Mua: {new Date(item.details.buyDate).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                      <Wallet size={12} className="mr-1" /> Vốn: {Number(item.details.buyPrice).toLocaleString()}đ
                                    </span>
                                  </div>
                                </div>

                                {itemProfit && (
                                  <div className="md:text-right flex flex-col items-start md:items-end min-w-[190px] border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                                    <div className="text-[11px] text-slate-400 font-medium uppercase">Định giá</div>
                                    <div className="text-lg font-bold text-slate-900 font-mono mb-1">
                                      {Math.round(itemProfit.currentValue).toLocaleString()} <span className="text-xs text-slate-500">VNĐ</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <span className={`px-2 py-0.5 rounded font-medium ${itemProfit.actualProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                        Biến động: {itemProfit.actualProfit > 0 ? "+" : ""}{Math.round(itemProfit.actualProfit).toLocaleString()}đ
                                      </span>
                                      <span className={`px-2 py-0.5 rounded font-medium ${itemProfit.difference >= 0 ? "bg-indigo-50 text-indigo-700" : "bg-orange-50 text-orange-700"}`}>
                                        So vs NH: {itemProfit.difference > 0 ? "+" : ""}{Math.round(itemProfit.difference).toLocaleString()}đ
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // SAVINGS_GROUP asset
                const { key, bankName, items } = entry;
                const isMultiple = items.length > 1;
                const isExpanded = !!expandedGoldGroups[key];
                const singleItem = items[0];

                const totalPrincipal = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
                const aggSavings = items.reduce(
                  (acc, item) => {
                    const sp = calculateSavingsProfit(item);
                    const val = Number(item.value) || 0;
                    if (sp) {
                      acc.totalCurrentValue += sp.totalCurrentValue;
                      acc.currentAccrued += sp.currentAccrued;
                      acc.monthlyReceived += sp.monthlyReceived;
                    } else {
                      acc.totalCurrentValue += val;
                    }
                    if (Number(item.details?.monthlyInterestRate) > 0) {
                      acc.hasMonthlyRate = true;
                    }
                    return acc;
                  },
                  { totalCurrentValue: 0, currentAccrued: 0, monthlyReceived: 0, hasMonthlyRate: false }
                );

                const savingsDisplayTitle = `Đang gửi ${formatMillions(totalPrincipal)} triệu`;

                return (
                  <div key={key} className="bg-white rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-200/60 transition-all overflow-hidden">
                    <div
                      onClick={() => {
                        setExpandedGoldGroups(prev => ({ ...prev, [key]: !prev[key] }));
                      }}
                      className="p-5 flex flex-col md:flex-row md:items-center relative group cursor-pointer select-none"
                    >
                      {!isMultiple && singleItem && (
                        <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleEditAsset(singleItem); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm rounded-full border border-slate-200 transition-all" title="Sửa">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(singleItem.id); }} className="p-2 text-slate-400 hover:text-rose-600 bg-white shadow-sm rounded-full border border-slate-200 transition-all" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3.5 rounded-xl flex-shrink-0 bg-emerald-100/50 text-emerald-600 ring-1 ring-emerald-200">
                          <Landmark size={24} />
                        </div>
                        <div className="pt-1">
                          <div className="flex items-center gap-2 flex-wrap pr-12">
                            <h3 className="text-slate-900 font-bold text-lg leading-tight">{savingsDisplayTitle}</h3>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {items.length} sổ
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center mt-2 gap-3">
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                              {bankName}
                            </span>
                            {!isMultiple && singleItem?.details?.interestRate && (
                              <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                <TrendingUp size={12} className="mr-1" /> Lãi: {singleItem.details.interestRate}% CK{singleItem.details.monthlyInterestRate ? ` + ${singleItem.details.monthlyInterestRate}% HT` : ''}
                              </span>
                            )}
                            {!isMultiple && singleItem?.details?.maturityDate && (
                              <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                <Calendar size={12} className="mr-1" /> Đáo hạn: {new Date(singleItem.details.maturityDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                            <span className="inline-flex items-center text-xs font-medium text-slate-500">
                              <Wallet size={12} className="mr-1" /> Gốc: {totalPrincipal.toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 md:mt-0 md:ml-6 md:text-right flex flex-col items-start md:items-end justify-center min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Định giá hiện tại</div>
                        <div className="text-2xl font-black text-emerald-600 tracking-tight font-mono mb-2">
                          {Math.round(aggSavings.totalCurrentValue).toLocaleString()} <span className="text-sm font-semibold text-emerald-600/70">VNĐ</span>
                        </div>
                        <div className="flex flex-col space-y-1.5 w-full">
                          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-700">
                            <span className="mr-4">Lãi dồn tích (CK):</span>
                            <span>+{Math.round(aggSavings.currentAccrued).toLocaleString()} đ</span>
                          </div>
                          {aggSavings.hasMonthlyRate && (
                            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg font-medium bg-indigo-50 text-indigo-700">
                              <span className="mr-4">Lãi đã nhận (HT):</span>
                              <span>+{Math.round(aggSavings.monthlyReceived).toLocaleString()} đ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Khung đổ xuống hiển thị chi tiết từng sổ tiết kiệm */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Chi tiết từng sổ tiết kiệm ({items.length})
                        </div>
                        {items.map((item: any) => {
                          const itemSavingsProfit = calculateSavingsProfit(item);
                          return (
                            <div
                              key={item.id}
                              className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 relative group/item"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-slate-800 font-bold text-base">{item.name}</h4>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleEditAsset(item)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-full border border-slate-200 transition-all"
                                      title="Sửa"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAsset(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-full border border-slate-200 transition-all"
                                      title="Xóa"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center mt-2 gap-3">
                                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {item.details?.bankName}
                                  </span>
                                  <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                    <Wallet size={12} className="mr-1" /> Gốc: {Number(item.value || 0).toLocaleString()}đ
                                  </span>
                                  <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                    <TrendingUp size={12} className="mr-1" /> Lãi: {item.details?.interestRate}% CK{item.details?.monthlyInterestRate ? ` + ${item.details.monthlyInterestRate}% HT` : ''}
                                  </span>
                                  {item.details?.startDate && (
                                    <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                      <Calendar size={12} className="mr-1" /> Gửi: {new Date(item.details.startDate).toLocaleDateString('vi-VN')}
                                    </span>
                                  )}
                                  {item.details?.maturityDate && (
                                    <span className="inline-flex items-center text-xs font-medium text-slate-500">
                                      <Calendar size={12} className="mr-1" /> Đáo hạn: {new Date(item.details.maturityDate).toLocaleDateString('vi-VN')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {itemSavingsProfit && (
                                <div className="md:text-right flex flex-col items-start md:items-end min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                                  <div className="text-[11px] text-slate-400 font-medium uppercase">Định giá</div>
                                  <div className="text-lg font-bold text-emerald-600 font-mono mb-1">
                                    {Math.round(itemSavingsProfit.totalCurrentValue).toLocaleString()} <span className="text-xs text-emerald-600/70">VNĐ</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700">
                                      Lãi CK: +{Math.round(itemSavingsProfit.currentAccrued).toLocaleString()}đ
                                    </span>
                                    {item.details?.monthlyInterestRate > 0 && (
                                      <span className="px-2 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700">
                                        Lãi HT: +{Math.round(itemSavingsProfit.monthlyReceived).toLocaleString()}đ
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "MEMBERS" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Thành viên tham gia</h2>
              {isOwner && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center px-4 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full transition-all shadow-sm"
                >
                  <Plus size={16} className="mr-1.5" /> Thêm người
                </button>
              )}
            </div>

            {showAddMember && (
              <form onSubmit={handleAddMember} className="bg-white p-6 rounded-2xl shadow-lg ring-1 ring-slate-200/50 flex flex-col sm:flex-row gap-4 items-start animate-in zoom-in-95">
                <div className="flex-1 w-full relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tìm theo Email</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Nhập email cần tìm..."
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setNewMemberEmail(user.email);
                            setSearchResults([]);
                          }}
                          className="px-4 py-3 border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors"
                        >
                          <div className="text-sm font-bold text-slate-800">{user.name || "Không có tên"}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Phân quyền</label>
                  <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                    <option value="VIEW">Chỉ xem (VIEW)</option>
                    <option value="EDIT">Xem & Sửa (EDIT)</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto pt-6">
                  <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all h-[44px]">THÊM</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 divide-y divide-slate-100 overflow-hidden">
              <div className="p-5 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg ring-2 ring-white shadow-sm">
                    {group.owner.name?.charAt(0) || group.owner.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold flex items-center">
                      {group.owner.name || 'Không có tên'}
                      <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wide border border-indigo-200">Owner</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{group.owner.email}</div>
                  </div>
                </div>
              </div>

              {group.members.map((m: any) => (
                <div key={m.id} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg ring-2 ring-white shadow-sm">
                      {m.user.name?.charAt(0) || m.user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-slate-900 font-bold flex items-center">
                        {m.user.name || 'Không có tên'}
                        <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase tracking-wide border border-slate-200">{m.role}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{m.user.email}</div>
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => handleRemoveMember(m.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Xóa thành viên">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
