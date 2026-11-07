"use client";

import { useState, useEffect } from "react";
import { Terminal, Plus, FolderHeart, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AssetGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets/groups");
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    try {
      const res = await fetch("/api/assets/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreating(false);
        setNewGroupName("");
        setNewGroupDesc("");
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-jet-black p-4 sm:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-neon-green">
            <Terminal size={24} />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">QUẢN LÝ TÀI SẢN</h1>
          </div>
          <div className="flex space-x-3">
             <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded transition-colors"
              >
                TRỞ VỀ
              </button>
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center px-4 py-2 text-xs font-bold bg-neon-green/10 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green rounded transition-colors"
            >
              <Plus size={14} className="mr-1" />
              TẠO NHÓM
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="p-4 border border-neon-green/30 bg-terminal-bg rounded-lg mb-6 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-white font-bold mb-3">Tạo Nhóm Tài Sản Mới</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input 
                type="text" 
                placeholder="Tên nhóm (VD: Tài sản gia đình)" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/20 rounded p-2 text-white focus:border-neon-green outline-none"
              />
              <input 
                type="text" 
                placeholder="Mô tả ngắn gọn..." 
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded p-2 text-white focus:border-neon-green outline-none"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">HỦY</button>
                <button type="submit" className="px-3 py-1.5 text-xs bg-neon-green text-black font-bold rounded">XÁC NHẬN TẠO</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-neon-green" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded">
                Bạn chưa có nhóm tài sản nào. Hãy tạo mới để bắt đầu.
              </div>
            ) : (
              groups.map((g) => (
                <div 
                  key={g.id}
                  onClick={() => router.push(`/dashboard/assets/${g.id}`)}
                  className="p-5 border border-white/10 rounded-xl bg-white/5 hover:border-neon-green/50 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FolderHeart className="text-neon-cyan group-hover:text-neon-green transition-colors" size={20} />
                      <h3 className="text-white font-bold text-lg">{g.name}</h3>
                    </div>
                    {g.description && <p className="text-sm text-gray-400 mb-4 line-clamp-2">{g.description}</p>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <div className="flex items-center">
                      <Users size={12} className="mr-1" />
                      <span>{(g.members?.length || 0) + 1} thành viên</span>
                    </div>
                    <div>
                      {g._count?.assets || 0} tài sản
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
