"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Car, Smartphone, Search, Loader2, Download, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function InfoToolsClient() {
  const [phoneInput, setPhoneInput] = useState("");
  const [simResults, setSimResults] = useState<any[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);

  const [regNo, setRegNo] = useState("");
  const [category, setCategory] = useState("4W");
  const [vehicleResult, setVehicleResult] = useState<any>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);

  const handleSimSearch = async () => {
    if (!phoneInput) return;
    setLoadingSim(true);
    setSimResults([]);
    try {
      const res = await fetch("/api/tools/sim-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneInput }),
      });
      const data = await res.json();
      if (Array.isArray(data)) setSimResults(data);
      else if (data.error) toast.error(data.error);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setLoadingSim(false);
    }
  };

  const handleVehicleSearch = async () => {
    if (!regNo) return;
    setLoadingVehicle(true);
    setVehicleResult(null);
    try {
      const res = await fetch("/api/tools/vehicle-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_no: regNo, category }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setVehicleResult(data);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setLoadingVehicle(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
           <Search size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Information Extractor</h1>
           <p className="text-slate-500">Manual lookup for SIM ownership and Vehicle registration details.</p>
        </div>
      </div>

      <Tabs defaultValue="sim" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="sim" className="rounded-lg font-bold"><Smartphone size={16} className="mr-2"/> SIM Info</TabsTrigger>
          <TabsTrigger value="vehicle" className="rounded-lg font-bold"><Car size={16} className="mr-2"/> Vehicle Info</TabsTrigger>
        </TabsList>

        <TabsContent value="sim" className="mt-6 space-y-6">
          <Card className="shadow-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                <Smartphone size={20} /> SIM Owner Details
              </CardTitle>
              <CardDescription>Enter a phone number or CNIC to fetch registration data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input 
                  placeholder="e.g. 03001234567 or CNIC..." 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimSearch()}
                  className="h-12 text-lg font-medium border-slate-200 focus:ring-blue-500"
                />
                <Button onClick={handleSimSearch} disabled={loadingSim} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-bold">
                  {loadingSim ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                </Button>
              </div>

              {simResults.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 shadow-lg">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">Name</TableHead>
                        <TableHead className="font-bold">Number</TableHead>
                        <TableHead className="font-bold">CNIC</TableHead>
                        <TableHead className="font-bold">Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simResults.map((r, i) => (
                        <TableRow key={i} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell className="font-bold text-slate-800">{r.name}</TableCell>
                          <TableCell className="font-mono text-blue-600">{r.number}</TableCell>
                          <TableCell className="font-medium">{r.cnic}</TableCell>
                          <TableCell className="text-slate-500 text-xs max-w-xs">{r.address}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="mt-6 space-y-6">
          <Card className="shadow-sm border-purple-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                <Car size={20} /> Vehicle Details (Sindh)
              </CardTitle>
              <CardDescription>Lookup vehicle registration, engine, and owner info.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input 
                    placeholder="Enter Registration Number (e.g. ABC-123)..." 
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="h-12 border-slate-200"
                  />
                </div>
                <div className="flex gap-3">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-3 font-medium flex-1 outline-none focus:ring-2 ring-purple-500"
                  >
                    <option value="4W">4 Wheeler</option>
                    <option value="2W">2 Wheeler</option>
                  </select>
                  <Button onClick={handleVehicleSearch} disabled={loadingVehicle} className="h-12 px-6 bg-purple-600 hover:bg-purple-700 font-bold">
                    {loadingVehicle ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  </Button>
                </div>
              </div>

              {vehicleResult && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                  {Object.entries(vehicleResult).map(([key, value]) => (
                    <div key={key} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm font-bold text-slate-700">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
