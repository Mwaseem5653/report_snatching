"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Car, Smartphone, Search, Loader2, Download, AlertCircle, Copy, RotateCcw, ShieldCheck, Mail, MapPin, Phone, Globe, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn, getApiUrl } from "@/lib/utils";
import AlertModal from "@/components/ui/alert-modal";

export default function InfoToolsClient() {
  const [phoneInput, setPhoneInput] = useState("");
  const [simResults, setSimResults] = useState<any[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);

  const [cnicInput, setCnicInput] = useState("");
  const [cnicType, setCnicType] = useState("4W");
  const [cnicResults, setCnicResults] = useState<any[]>([]);
  const [loadingCnic, setLoadingCnic] = useState(false);

  const [regNo, setRegNo] = useState("");
  const [category, setCategory] = useState("4W");
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [vehicleRemaining, setVehicleRemaining] = useState(0);

  const [alert, setAlert] = useState({ isOpen: false, title: "", description: "", type: "info" as any });

  const handleSimSearch = async () => {
    const targets = phoneInput
      .split(/[\n, ]/)
      .map(n => n.trim())
      .filter(n => n.length >= 5);

    if (targets.length === 0) {
      toast.error("Please enter at least one phone number");
      return;
    }

    if (targets.length > 50) {
      toast.error("Maximum 50 lookups allowed at once.");
      return;
    }

    try {
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < targets.length) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient Credits",
                    description: `You need ${targets.length} credits for this bulk lookup. Balance: ${sData.tokens || 0}`,
                    type: "warning"
                });
                return;
            }
        }
    } catch (e) {}

    setLoadingSim(true);
    setSimResults([]);
    try {
      const res = await fetch(getApiUrl("/api/tools/sim-info"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_numbers: targets }),
      });
      const data = await res.json();

      if (res.status === 403) {
        setAlert({
            isOpen: true,
            title: "Insufficient Credits",
            description: data.error || "You do not have enough credits.",
            type: "warning"
        });
        return;
      }

      if (Array.isArray(data)) {
          setSimResults(data);
          window.dispatchEvent(new Event("refresh-session"));
          toast.success(`Search complete. Found ${data.length} records.`);
      }
      else if (data.error) toast.error(data.error);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setLoadingSim(false);
    }
  };

  const handleCnicSearch = async () => {
    const targets = cnicInput
      .split(/[\n, ]/)
      .map(n => n.trim())
      .filter(n => n.length >= 5);

    if (targets.length === 0) {
      toast.error("Please enter at least one valid CNIC");
      return;
    }

    try {
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < targets.length) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient Credits",
                    description: `You need ${targets.length} credits for this CNIC lookup. Balance: ${sData.tokens || 0}`,
                    type: "warning"
                });
                return;
            }
        }
    } catch (e) {}

    setLoadingCnic(true);
    setCnicResults([]);
    try {
      const res = await fetch(getApiUrl("/api/tools/cnic-info"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnics: targets, type: cnicType }),
      });
      const data = await res.json();

      if (res.status === 403) {
        setAlert({
            isOpen: true,
            title: "Insufficient Credits",
            description: data.error || "You do not have enough credits.",
            type: "warning"
        });
        return;
      }

      if (Array.isArray(data)) {
          setCnicResults(data);
          window.dispatchEvent(new Event("refresh-session"));
          toast.success(`Search complete. Found ${data.length} records.`);
      }
      else if (data.error) toast.error(data.error);
    } catch (e) {
      toast.error("CNIC search failed");
    } finally {
      setLoadingCnic(false);
    }
  };

  const handleVehicleSearch = async () => {
    const targets = regNo
      .split(/[\n, ]/)
      .map(n => n.trim())
      .filter(n => n.length >= 3);

    if (targets.length === 0) {
      toast.error("Please enter at least one registration number");
      return;
    }

    try {
        const sRes = await fetch(getApiUrl("/api/auth/create-session"));
        const sData = await sRes.json();
        if (sData.authenticated && sData.role !== "super_admin") {
            if ((sData.tokens || 0) < targets.length) {
                setAlert({
                    isOpen: true,
                    title: "Insufficient Credits",
                    description: `You need ${targets.length} credits for this bulk vehicle lookup. Balance: ${sData.tokens || 0}`,
                    type: "warning"
                });
                return;
            }
        }
    } catch (e) {}

    setLoadingVehicle(true);
    setVehicleRemaining(targets.length);
    setVehicleResults([]);
    
    const results: any[] = [];
    
    try {
      for (let i = 0; i < targets.length; i++) {
        const currentTarget = targets[i];
        setVehicleRemaining(targets.length - i);

        const res = await fetch(getApiUrl("/api/tools/vehicle-info"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reg_nos: [currentTarget], category }),
        });
        
        const data = await res.json();

        if (res.status === 403) {
          toast.error("Insufficient Credits. Process stopped.");
          break;
        }

        if (Array.isArray(data)) {
            results.push(...data);
        } else if (data && !data.error) {
            results.push(data);
        }
        
        setVehicleResults([...results]);
        
        if (i < targets.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
      }
      
      window.dispatchEvent(new Event("refresh-session"));
      toast.success(`Completed! Found ${results.length} vehicle records.`);
    } catch (e) {
      toast.error("An error occurred during bulk search");
    } finally {
      setLoadingVehicle(false);
      setVehicleRemaining(0);
    }
  };

  const handleDownloadVehicleExcel = async () => {
    if (vehicleResults.length === 0) return;
    try {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Vehicle Details");
        worksheet.columns = [
            { header: "Registration #", key: "registrationNumber", width: 20 },
            { header: "Owner Name", key: "ownerName", width: 25 },
            { header: "Owner CNIC", key: "ownerCNIC", width: 20 },
            { header: "Address", key: "ownerAddress", width: 40 },
            { header: "Engine #", key: "engineNumber", width: 20 },
            { header: "Chassis #", key: "chassisNumber", width: 20 },
            { header: "Model", key: "model", width: 15 },
            { header: "Vehicle Type", key: "vehicleType", width: 20 },
            { header: "Reg Date", key: "registrationDate", width: 20 },
            { header: "Book #", key: "bookNo", width: 20 }
        ];
        vehicleResults.forEach(item => worksheet.addRow(item));
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Vehicle_Details_${Date.now()}.xlsx`;
        a.click();
        toast.success("Excel downloaded successfully");
    } catch (err) {
        toast.error("Failed to generate Excel");
    }
  };

  const handleCopyTable = (results: any[]) => {
    if (results.length === 0) return;
    const header = "Name\tNumber/Reg\tCNIC\tAddress\n";
    const rows = results.map(r => `${r.name || r.ownerName}\t${r.number || r.registrationNumber}\t${r.cnic || r.ownerCNIC}\t${r.address || r.ownerAddress}`).join("\n");
    navigator.clipboard.writeText(header + rows);
    toast.success("Table data copied to clipboard");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <AlertModal 
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        description={alert.description}
        type={alert.type}
      />
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
           <Search size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Information Extractor</h1>
           <p className="text-slate-500">Manual lookup for SIM, CNIC and Vehicle registration details.</p>
        </div>
      </div>

      <Tabs defaultValue="sim" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="sim" className="rounded-lg font-bold"><Smartphone size={16} className="mr-2"/> SIM</TabsTrigger>
          <TabsTrigger value="cnic" className="rounded-lg font-bold"><CreditCard size={16} className="mr-2"/> CNIC</TabsTrigger>
          <TabsTrigger value="vehicle" className="rounded-lg font-bold"><Car size={16} className="mr-2"/> Vehicle</TabsTrigger>
        </TabsList>

        <TabsContent value="sim" className="mt-6 space-y-6">
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Smartphone size={20} /> SIM Owner Details
                </CardTitle>
                <CardDescription>Enter multiple numbers (one per line) to fetch data.</CardDescription>
              </div>
              <div className="flex gap-2">
                 {simResults.length > 0 && (
                   <Button variant="outline" size="sm" onClick={() => handleCopyTable(simResults)} className="text-emerald-600 border-emerald-100 hover:bg-emerald-50 h-8 font-bold">
                     <Copy size={14} className="mr-2" /> Copy All
                   </Button>
                 )}
                 <Button variant="ghost" size="sm" onClick={() => { setPhoneInput(""); setSimResults([]); }} className="text-slate-400 h-8">
                   <RotateCcw size={14} />
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Phone Numbers</Label>
                <Textarea 
                  placeholder="03001234567&#10;03129876543" 
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="min-h-[120px] text-base font-medium border-slate-200 focus:ring-blue-500 custom-scrollbar"
                />
              </div>
              <Button onClick={handleSimSearch} disabled={loadingSim} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200">
                {loadingSim ? (
                  <><Loader2 className="animate-spin mr-2" /> Processing...</>
                ) : (
                  <><Search size={20} className="mr-2" /> Start SIM Search</>
                )}
              </Button>

              {simResults.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 shadow-xl bg-white">
                  <div className="max-h-[500px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold">#</TableHead>
                          <TableHead className="font-bold">Name</TableHead>
                          <TableHead className="font-bold">Number</TableHead>
                          <TableHead className="font-bold">CNIC</TableHead>
                          <TableHead className="font-bold">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simResults.map((r, i) => (
                          <TableRow key={i} className="hover:bg-blue-50/30 transition-colors">
                            <TableCell className="text-[10px] text-slate-300 font-mono">{i + 1}</TableCell>
                            <TableCell className="font-bold text-slate-800">{r.name}</TableCell>
                            <TableCell className="font-mono text-blue-600">{r.number}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{r.cnic}</TableCell>
                            <TableCell className="text-slate-500 text-[10px] leading-relaxed max-w-xs">{r.address}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cnic" className="mt-6 space-y-6">
          <Card className="shadow-sm border-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                  <CreditCard size={20} /> CNIC Information
                </CardTitle>
                <CardDescription>Enter CNIC numbers (one per line) to fetch associated data.</CardDescription>
              </div>
              <div className="flex gap-2">
                 {cnicResults.length > 0 && (
                   <Button variant="outline" size="sm" onClick={() => handleCopyTable(cnicResults)} className="text-emerald-600 border-emerald-100 hover:bg-emerald-50 h-8 font-bold">
                     <Copy size={14} className="mr-2" /> Copy All
                   </Button>
                 )}
                 <Button variant="ghost" size="sm" onClick={() => { setCnicInput(""); setCnicResults([]); }} className="text-slate-400 h-8">
                   <RotateCcw size={14} />
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">CNIC Numbers</Label>
                    <Textarea 
                      placeholder="4230131194537&#10;4210112345671" 
                      value={cnicInput}
                      onChange={(e) => setCnicInput(e.target.value)}
                      className="min-h-[120px] text-base font-medium border-slate-200 focus:ring-emerald-500 custom-scrollbar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                    <select 
                      value={cnicType} 
                      onChange={(e) => setCnicType(e.target.value)}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:ring-2 ring-emerald-500 mt-1"
                    >
                      <option value="4W">4 Wheeler</option>
                      <option value="2W">2 Wheeler</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleCnicSearch} disabled={loadingCnic} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200">
                  {loadingCnic ? (
                    <><Loader2 className="animate-spin mr-2" /> Processing...</>
                  ) : (
                    <><Search size={20} className="mr-2" /> Start CNIC Search</>
                  )}
                </Button>
              </div>

              {cnicResults.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 shadow-xl bg-white">
                  <div className="max-h-[500px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold">#</TableHead>
                          <TableHead className="font-bold">Reg #</TableHead>
                          <TableHead className="font-bold">Owner Name</TableHead>
                          <TableHead className="font-bold">Father Name</TableHead>
                          <TableHead className="font-bold">CNIC</TableHead>
                          <TableHead className="font-bold">Chassis/Engine</TableHead>
                          <TableHead className="font-bold">Model/Type</TableHead>
                          <TableHead className="font-bold">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cnicResults.map((r, i) => (
                          <TableRow key={i} className="hover:bg-emerald-50/30 transition-colors text-[11px]">
                            <TableCell className="text-[10px] text-slate-300 font-mono">{i + 1}</TableCell>
                            <TableCell className="font-black text-emerald-700">{r.registrationNumber}</TableCell>
                            <TableCell className="font-bold text-slate-800">{r.ownerName}</TableCell>
                            <TableCell className="text-slate-500">{r.fatherName}</TableCell>
                            <TableCell className="font-mono text-emerald-600 font-medium">{r.cnic}</TableCell>
                            <TableCell className="text-[10px] leading-tight">
                                <div className="font-bold">C: {r.chassisNumber}</div>
                                <div className="text-slate-400">E: {r.engineNumber}</div>
                            </TableCell>
                            <TableCell className="text-slate-500">
                                {r.model} / {r.vehicleType}
                            </TableCell>
                            <TableCell className="text-slate-500 leading-relaxed max-w-[150px] truncate">{r.address}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="mt-6 space-y-6">
          <Card className="shadow-sm border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                  <Car size={20} /> Vehicle Details (Sindh)
                </CardTitle>
                <CardDescription>Enter registration numbers (one per line) for bulk lookup.</CardDescription>
              </div>
              <div className="flex gap-2">
                 {vehicleResults.length > 0 && (
                   <Button variant="outline" size="sm" onClick={handleDownloadVehicleExcel} className="text-emerald-600 border-emerald-100 hover:bg-emerald-50 h-8 font-bold">
                     <Download size={14} className="mr-2" /> Download Excel
                   </Button>
                 )}
                 <Button variant="ghost" size="sm" onClick={() => { setRegNo(""); setVehicleResults([]); }} className="text-slate-400 h-8">
                   <RotateCcw size={14} />
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Registration Numbers</Label>
                    <Textarea 
                      placeholder="ABC-123&#10;KAJ-9275" 
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="min-h-[100px] text-base font-medium border-slate-200 focus:ring-purple-500 custom-scrollbar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:ring-2 ring-purple-500 mt-1"
                    >
                      <option value="4W">4 Wheeler</option>
                      <option value="2W">2 Wheeler</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleVehicleSearch} disabled={loadingVehicle} className="w-full h-12 bg-purple-600 hover:bg-purple-700 font-bold shadow-lg shadow-purple-200">
                  {loadingVehicle ? (
                    <><Loader2 className="animate-spin mr-2" /> Remaining: {vehicleRemaining} Vehicles...</>
                  ) : (
                    <><Search size={20} className="mr-2" /> Start Bulk Vehicle Search</>
                  )}
                </Button>
              </div>

              {vehicleResults.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 shadow-xl bg-white">
                  <div className="max-h-[500px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold">Reg #</TableHead>
                          <TableHead className="font-bold">Owner Name</TableHead>
                          <TableHead className="font-bold">CNIC</TableHead>
                          <TableHead className="font-bold">Chassis/Engine</TableHead>
                          <TableHead className="font-bold">Model/Type</TableHead>
                          <TableHead className="font-bold">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicleResults.map((v, i) => (
                          <TableRow key={i} className="hover:bg-purple-50/30 transition-colors text-[11px]">
                            <TableCell className="font-black text-purple-700">{v.registrationNumber}</TableCell>
                            <TableCell className="font-bold text-slate-800">{v.ownerName}</TableCell>
                            <TableCell className="font-medium">{v.ownerCNIC}</TableCell>
                            <TableCell className="text-[10px] leading-tight">
                                <div className="font-bold">C: {v.chassisNumber}</div>
                                <div className="text-slate-400">E: {v.engineNumber}</div>
                            </TableCell>
                            <TableCell className="text-slate-500">
                                {v.model} / {v.vehicleType}
                            </TableCell>
                            <TableCell className="text-slate-500 leading-relaxed max-w-[150px] truncate">
                                {v.ownerAddress}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
