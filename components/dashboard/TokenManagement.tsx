"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, History, Plus, Lock, ShieldAlert, Loader2, Search, Mail, Filter, Save, Clock, User, RefreshCcw, LayoutGrid, Database, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn, getApiUrl } from "@/lib/utils";

export default function TokenManagement() {
    const [isVerified, setIsVerified] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [updatingUid, setUpdatingUid] = useState<string | null>(null);
    const [pool, setPool] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchRole, setSearchRole] = useState("all");
    const [editStates, setEditStates] = useState<Record<string, any>>({});

    // Pool Reset State
    const [resetGeneral, setResetGeneral] = useState(0);
    const [resetEyecon, setResetEyecon] = useState(0);

    const fetchPoolData = useCallback(async () => {
        try {
            const res = await fetch(getApiUrl("/api/admin/system-tokens"));
            const data = await res.json();
            if (res.ok) { setPool(data.pool); setLogs(data.logs); }
        } catch (err) {}
    }, []);

    const fetchUsers = useCallback(async () => {
        if (!searchQuery && searchRole === "all") {
            toast.info("Enter search query");
            return;
        }
        if (searchQuery.toLowerCase() === "token") return; // Skip user fetch if searching for token pool

        setSearching(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("query", searchQuery);
            if (searchRole !== "all") params.append("role", searchRole);
            const userRes = await fetch(getApiUrl(`/api/get-users?${params.toString()}`));
            const userData = await userRes.json();
            if (userData.users) setUsers(userData.users);
        } catch (err) { toast.error("Fetch failed"); }
        finally { setSearching(false); }
    }, [searchQuery, searchRole]);

    useEffect(() => { if (isVerified) fetchPoolData(); }, [isVerified, fetchPoolData]);

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl("/api/admin/system-tokens"), {
                method: "POST",
                body: JSON.stringify({ password, action: "verify_only" })
            });
            const data = await res.json();
            if (data.success) setIsVerified(true);
            else toast.error("Incorrect password");
        } catch (err) { toast.error("Verification failed"); }
        finally { setLoading(false); }
    };

    const updateEditState = (uid: string, key: string, value: any) => {
        setEditStates(prev => {
            const current = prev[uid] || { gAmount: 0, eAmount: 0, gExp: 30, eExp: 30 };
            let val = value;
            // Enforce User Limits
            if (key === 'gAmount' && val > 10000) val = 10000;
            if (key === 'eAmount' && val > 1000) val = 1000;
            return { ...prev, [uid]: { ...current, [key]: val } };
        });
    };

    const handleIssueTokens = async (user: any) => {
        const state = editStates[user.uid] || { gAmount: 0, eAmount: 0, gExp: 30, eExp: 30 };
        if (state.gAmount <= 0 && state.eAmount <= 0) return;
        setUpdatingUid(user.uid);
        try {
            const res = await fetch(getApiUrl("/api/admin/system-tokens"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    password, action: "issue_to_user", targetUid: user.uid,
                    generalAmount: state.gAmount, eyeconAmount: state.eAmount,
                    generalExpiryDays: parseInt(state.gExp) || 30, eyeconExpiryDays: parseInt(state.eExp) || 30
                })
            });
            if ((await res.json()).success) {
                toast.success(`User Updated. Prev Tokens Wiped.`);
                setEditStates(prev => { const n = {...prev}; delete n[user.uid]; return n; });
                fetchPoolData(); fetchUsers();
            }
        } catch (err) {}
        finally { setUpdatingUid(null); }
    };

    const handleResetPool = async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl("/api/admin/system-tokens"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, eyeconAmount: resetEyecon, generalAmount: resetGeneral, action: "add" })
            });
            if ((await res.json()).success) {
                toast.success("Global Pool Reset Successful");
                setResetGeneral(0); setResetEyecon(0);
                fetchPoolData();
            }
        } catch (err) { toast.error("Reset failed"); }
        finally { setLoading(false); }
    };

    const getRemainingDays = (expiry: any) => {
        if (!expiry) return "N/A";
        let expDate = expiry.seconds ? new Date(expiry.seconds * 1000) : (expiry._seconds ? new Date(expiry._seconds * 1000) : new Date(expiry));
        const diff = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `${diff}` : "0";
    };

    const isTokenSearch = searchQuery.toLowerCase() === "token";

    if (!isVerified) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <Card className="w-full max-w-md shadow-2xl border-indigo-100 rounded-3xl overflow-hidden">
                    <CardHeader className="text-center bg-indigo-900 text-white p-8">
                        <ShieldAlert className="mx-auto h-12 w-12 mb-4 text-indigo-300" />
                        <CardTitle className="text-xl font-black uppercase">Security Check</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl text-center" />
                        <Button onClick={handleVerify} disabled={loading} className="w-full h-12 bg-indigo-600 rounded-xl font-black uppercase">
                            {loading ? <Loader2 className="animate-spin" /> : "Access Token Pool"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Compact Header */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 bg-slate-900 text-white px-4 py-2 rounded-xl">
                    <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-indigo-400">Gen Pool</span><span className="text-sm font-black leading-none">{pool?.generalPool || 0}</span></div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-indigo-400">Eye Pool</span><span className="text-sm font-black leading-none">{pool?.eyeconPool || 0}</span></div>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                    <Search size={16} className="text-slate-400" />
                    <Input placeholder="Type 'Token' to manage pool, or Name/Email for users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUsers()} className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-xs font-bold h-8 p-0" />
                </div>
                <select value={searchRole} onChange={(e) => setSearchRole(e.target.value)} className="h-9 text-[10px] font-black uppercase bg-white border border-slate-200 rounded-lg px-2 outline-none">
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super</option><option value="admin">Admin</option><option value="officer">Officer</option><option value="advanced_tool">Adv</option>
                </select>
                <Button onClick={fetchUsers} disabled={searching} className="bg-indigo-600 h-9 rounded-lg px-4 font-black uppercase text-[10px] tracking-widest">
                    {searching ? <Loader2 className="animate-spin" /> : "Search"}
                </Button>
            </div>

            {/* 🚀 TOKEN POOL MANAGEMENT (Visible only when 'token' searched) */}
            {isTokenSearch && (
                <Card className="border-amber-200 shadow-xl rounded-xl overflow-hidden bg-amber-50/20 border-2 animate-in zoom-in-95">
                    <CardHeader className="bg-amber-100/50 py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-amber-700">
                            <Database size={16} /> Global System Pool Reset (Overwrite Mode)
                        </CardTitle>
                        <span className="text-[8px] font-bold text-amber-600 uppercase flex items-center gap-1"><AlertCircle size={10}/> Warning: This will overwrite previous pool balance</span>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Set General Pool (Max 1M)</label>
                            <Input type="number" value={resetGeneral} onChange={(e) => {
                                let v = parseInt(e.target.value) || 0;
                                setResetGeneral(v > 1000000 ? 1000000 : v);
                            }} className="h-11 rounded-xl border-amber-200 bg-white font-black text-amber-900" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Set Eyecon Pool (Max 10K)</label>
                            <Input type="number" value={resetEyecon} onChange={(e) => {
                                let v = parseInt(e.target.value) || 0;
                                setResetEyecon(v > 10000 ? 10000 : v);
                            }} className="h-11 rounded-xl border-amber-200 bg-white font-black text-amber-900" />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleResetPool} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-600/20">
                                {loading ? "Updating Pool..." : "Reset Global Pool Now"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Management Table */}
            {!isTokenSearch && (
                <Card className="border-slate-200 shadow-lg rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar relative">
                            {searching && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="h-10">
                                        <TableHead className="text-[9px] font-black uppercase px-4 w-[250px]">Officer Details</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase px-2 text-center border-x border-slate-100 w-[200px]">Current Status (Bal / Days)</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase px-4 text-center">Token Management (Amount / Validity)</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase px-4 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {users.length > 0 ? users.map((u) => {
                                        const edit = editStates[u.uid] || { gAmount: 0, eAmount: 0, gExp: 30, eExp: 30 };
                                        const isUpdating = updatingUid === u.uid;
                                        return (
                                            <TableRow key={u.uid} className="h-14 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="px-4 py-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black shrink-0 uppercase border border-slate-200">{u.name?.charAt(0)}</div>
                                                        <div className="leading-tight overflow-hidden">
                                                            <p className="text-[10px] font-black text-slate-800 uppercase truncate">{u.name}</p>
                                                            <p className="text-[8px] text-slate-400 font-bold truncate lowercase">{u.email}</p>
                                                            <span className="text-[7px] font-black px-1 bg-slate-100 rounded text-slate-500 uppercase mt-0.5 inline-block">{u.role?.replace('_', ' ')}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-1 border-x border-slate-50">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[9px] font-black">
                                                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 min-w-[50px] text-center">GEN: {u.tokens || 0}</span>
                                                            <span className="text-slate-400">DAYS: {getRemainingDays(u.tokensExpiry)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[9px] font-black">
                                                            <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 min-w-[50px] text-center">EYE: {u.eyeconTokens || 0}</span>
                                                            <span className="text-slate-400">DAYS: {getRemainingDays(u.eyeconTokensExpiry)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-1">
                                                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-4 gap-y-1.5 items-center max-w-[600px] mx-auto text-[8px] font-black text-slate-500 uppercase">
                                                        <span className="text-right">Add Gen Token:</span>
                                                        <Input type="number" placeholder="Max 10K" className="h-7 w-28 text-[10px] font-black border-emerald-100 bg-emerald-50/30 p-1 text-center" value={edit.gAmount || ""} onChange={(e) => updateEditState(u.uid, 'gAmount', parseInt(e.target.value) || 0)} />
                                                        <span className="text-right">Validity In Days:</span>
                                                        <Input type="number" className="h-7 w-24 text-[10px] font-black border-slate-200 bg-white p-1 text-center" value={edit.gExp} onChange={(e) => updateEditState(u.uid, 'gExp', e.target.value)} />
                                                        
                                                        <span className="text-right text-indigo-600">Add Eyecon Token:</span>
                                                        <Input type="number" placeholder="Max 1K" className="h-7 w-28 text-[10px] font-black border-indigo-100 bg-indigo-50/30 p-1 text-center" value={edit.eAmount || ""} onChange={(e) => updateEditState(u.uid, 'eAmount', parseInt(e.target.value) || 0)} />
                                                        <span className="text-right">Validity In Days:</span>
                                                        <Input type="number" className="h-7 w-24 text-[10px] font-black border-slate-200 bg-white p-1 text-center" value={edit.eExp} onChange={(e) => updateEditState(u.uid, 'eExp', e.target.value)} />
                                                </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-1 text-right">
                                                    <Button onClick={() => handleIssueTokens(u)} disabled={isUpdating || (edit.gAmount <= 0 && edit.eAmount <= 0)} className="h-8 w-24 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-md">
                                                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : "Save Changes"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : !searching && (
                                        <TableRow><TableCell colSpan={4} className="px-6 py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Search users to manage tokens</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Transaction Trail */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2"><LayoutGrid size={12} /> Transaction Trail</div>
                <div className="max-h-24 overflow-y-auto custom-scrollbar">
                    {logs.slice(0, 10).map(log => (
                        <div key={log.id} className="flex items-center justify-between px-4 py-1.5 border-b border-slate-50 text-[9px] font-bold text-slate-500">
                            <span className="min-w-[100px] truncate uppercase">{log.toEmail?.split('@')[0]}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[8px]", log.type === 'eyecon' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}>+{log.amount} {log.type} ({log.action?.replace('_', ' ')})</span>
                            <span className="text-slate-300">Auth: {log.adminEmail?.split('@')[0]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
