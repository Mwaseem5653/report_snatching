"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, History, Plus, Lock, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TokenManagement() {
    const [isVerified, setIsVerified] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [pool, setPool] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [addEyecon, setAddEyecon] = useState(0);
    const [addGeneral, setAddGeneral] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/system-tokens");
            const data = await res.json();
            if (res.ok) {
                setPool(data.pool);
                setLogs(data.logs);
            } else {
                toast.error(data.error || "Failed to fetch data");
            }
        } catch (err) {
            console.error("Fetch data error:", err);
        }
    }, []);

    useEffect(() => {
        if (isVerified) {
            fetchData();
        }
    }, [isVerified, fetchData]);

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/system-tokens", {
                method: "POST",
                body: JSON.stringify({ password, action: "verify_only" })
            });
            const data = await res.json();
            if (data.success) {
                setIsVerified(true);
            } else {
                toast.error(data.error || "Incorrect password");
            }
        } catch (err) {
            toast.error("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        
        try {
            // 1. Handle Firestore style {seconds, nanoseconds} or {_seconds, _nanoseconds}
            const s = timestamp.seconds ?? timestamp._seconds;
            if (typeof s === 'number') {
                return new Date(s * 1000).toLocaleString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                });
            }

            // 2. Handle JS Date or ISO String
            const d = new Date(timestamp);
            if (isNaN(d.getTime())) return "Invalid Date";
            
            return d.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        } catch (e) {
            return "N/A";
        }
    };

    const handleAddTokens = async () => {
        if (addEyecon <= 0 && addGeneral <= 0) {
            toast.error("Please enter an amount greater than 0");
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch("/api/admin/system-tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, eyeconAmount: addEyecon, generalAmount: addGeneral, action: "add" })
            });
            const data = await res.json();
            if (data.success) {
                setPool(data.pool);
                setAddEyecon(0);
                setAddGeneral(0);
                toast.success("Tokens successfully added to pool");
                await fetchData();
            } else {
                toast.error(data.error || "Failed to add tokens");
            }
        } catch (err) {
            toast.error("Transaction failed.");
        } finally {
            setLoading(false);
        }
    };

    if (!isVerified) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Card className="w-full max-w-md shadow-2xl border-indigo-100">
                    <CardHeader className="text-center bg-indigo-900 text-white rounded-t-xl">
                        <ShieldAlert className="mx-auto h-12 w-12 mb-2" />
                        <CardTitle>Security Verification</CardTitle>
                        <p className="text-xs text-indigo-200 mt-1">Please enter YOUR password to authorize pool access</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Your Personal Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-10 h-12 rounded-xl"
                                />
                            </div>
                        </div>
                        <Button 
                            onClick={handleVerify} 
                            disabled={loading}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Access Token Management"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Coins size={16} className="text-indigo-400" /> System Token Pool
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-8">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-black">{pool?.generalPool || 0}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">General Credits</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-indigo-400">{pool?.eyeconPool || 0}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Eyecon Tokens</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Plus size={18} className="text-emerald-500" /> Add Tokens to Pool
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">General Amount</label>
                            <Input 
                                type="number" 
                                value={addGeneral} 
                                onChange={(e) => setAddGeneral(parseInt(e.target.value) || 0)}
                                className="h-10 rounded-lg"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Eyecon Amount</label>
                            <Input 
                                type="number" 
                                value={addEyecon} 
                                onChange={(e) => setAddEyecon(parseInt(e.target.value) || 0)}
                                className="h-10 rounded-lg"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={handleAddTokens} 
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10"
                            >
                                {loading ? "Updating..." : "Update Pool"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <History size={18} className="text-blue-500" /> Issuance Logs
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-[10px] font-bold uppercase">Refresh</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Action</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Target User</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Admin</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="text-xs text-slate-500">
                                        {formatDate(log.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${log.action === 'issue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {log.action?.replace('_', ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-700">{log.toEmail}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800">{log.amount}</span>
                                            <span className="text-[9px] text-slate-400 uppercase font-black">{log.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">{log.adminEmail}</TableCell>
                                </TableRow>
                            ))}
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">No transactions recorded yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}