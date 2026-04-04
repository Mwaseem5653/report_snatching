"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Copy, 
  RotateCcw, 
  Cpu, 
  Plus, 
  ArrowDownCircle,
  ClipboardCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RowData {
  lac: string;
  cell: string;
  output: string;
}

export default function LacCellConverterClient() {
  // Initialize with 10 empty rows
  const [rows, setRows] = useState<RowData[]>(
    Array.from({ length: 10 }, () => ({ lac: "", cell: "", output: "" }))
  );

  const convertValue = (val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return null;
    // Convert to hex, pad to 4 digits, and reverse characters (nibbles)
    let hex = num.toString(16).toUpperCase().padStart(4, '0');
    return hex.split('').reverse().join('');
  };

  const reverseConvertValue = (hex: string) => {
    if (!hex || hex.length !== 4) return "";
    // Reverse characters back and parse as hex
    const originalHex = hex.split('').reverse().join('');
    const num = parseInt(originalHex, 16);
    return isNaN(num) ? "" : num.toString();
  };

  const calculateOutput = (lac: string, cell: string) => {
    if (lac && cell) {
      const hexLac = convertValue(lac);
      const hexCell = convertValue(cell);
      if (hexLac && hexCell) {
        return `${hexLac}${hexCell}`;
      }
    }
    return "";
  };

  const reverseCalculate = (output: string) => {
    const clean = output.trim().replace(/^0x/i, "");
    if (clean.length === 8) {
      const hexLac = clean.substring(0, 4);
      const hexCell = clean.substring(4, 8);
      return {
        lac: reverseConvertValue(hexLac),
        cell: reverseConvertValue(hexCell)
      };
    }
    return null;
  };

  const updateRow = (index: number, field: keyof RowData, value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    if (field === 'output') {
      const reversed = reverseCalculate(value);
      if (reversed) {
        newRows[index].lac = reversed.lac;
        newRows[index].cell = reversed.cell;
      }
    } else {
      newRows[index].output = calculateOutput(
        field === 'lac' ? value : newRows[index].lac,
        field === 'cell' ? value : newRows[index].cell
      );
    }
    setRows(newRows);
  };

  const handleAddRows = (count: number = 10) => {
    setRows([...rows, ...Array.from({ length: count }, () => ({ lac: "", cell: "", output: "" }))]);
    toast.info(`Added ${count} more rows`);
  };

  const handlePaste = (e: React.ClipboardEvent, startIndex: number, field: 'lac' | 'cell' | 'output') => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    const pastedRows = clipboardData.split(/\r?\n/).filter(line => line.trim() !== "");
    const newRows = [...rows];
    
    pastedRows.forEach((rowText, i) => {
      const targetIndex = startIndex + i;
      if (targetIndex >= newRows.length) {
        newRows.push({ lac: "", cell: "", output: "" });
      }

      const columns = rowText.split(/\t/);
      
      if (field === 'output') {
          newRows[targetIndex].output = columns[0].trim();
          const reversed = reverseCalculate(newRows[targetIndex].output);
          if (reversed) {
              newRows[targetIndex].lac = reversed.lac;
              newRows[targetIndex].cell = reversed.cell;
          }
      } else if (columns.length >= 2) {
        newRows[targetIndex].lac = columns[0].trim();
        newRows[targetIndex].cell = columns[1].trim();
        newRows[targetIndex].output = calculateOutput(newRows[targetIndex].lac, newRows[targetIndex].cell);
      } else {
        newRows[targetIndex][field] = columns[0].trim();
        newRows[targetIndex].output = calculateOutput(newRows[targetIndex].lac, newRows[targetIndex].cell);
      }
    });

    setRows(newRows);
    toast.success(`Successfully processed ${pastedRows.length} records`);
  };

  const handleFillDownLac = (index: number) => {
    const valueToFill = rows[index].lac;
    if (!valueToFill) {
      toast.error("Enter a LAC ID to fill down");
      return;
    }
    const newRows = [...rows];
    for (let i = index + 1; i < newRows.length; i++) {
      newRows[i].lac = valueToFill;
      newRows[i].output = calculateOutput(valueToFill, newRows[i].cell);
    }
    setRows(newRows);
    toast.success("LAC ID applied to all rows below");
  };

  const handleCopyAll = () => {
    const allResults = rows.filter(r => r.output).map(r => r.output).join("\n");
    if (allResults) {
      navigator.clipboard.writeText(allResults);
      toast.success("All outputs copied to clipboard");
    } else {
      toast.error("No results to copy");
    }
  };

  const handleReset = () => {
    setRows(Array.from({ length: 10 }, () => ({ lac: "", cell: "" , output: "" })));
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 overflow-hidden max-w-5xl mx-auto">
      <div className="shrink-0 flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                <Cpu size={24} />
            </div>
            <div>
                <h1 className="text-md md:text-lg font-black text-slate-800 tracking-tight uppercase leading-none">Tactical ID Converter</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Excel-Style Batch Processor</p>
            </div>
        </div>
        <div className="flex items-center justify-center gap-2 w-full md:w-auto flex-wrap">
            <Button variant="outline" onClick={handleReset} className="flex-1 md:flex-none rounded-xl font-bold text-slate-500 border-slate-200 h-9 text-[10px] md:text-xs">
                <RotateCcw size={14} className="mr-2" /> Reset
            </Button>
            <Button onClick={handleCopyAll} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg h-9 px-4 md:px-6 text-[10px] md:text-xs transition-all active:scale-95 whitespace-nowrap">
                <ClipboardCheck size={14} className="mr-2" /> Copy All Output
            </Button>
        </div>
      </div>

      <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col min-h-0">
        <CardHeader className="bg-slate-50 border-b p-3 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tactical Data Grid</span>
          </div>
          <Button onClick={() => handleAddRows(10)} size="sm" variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg h-7 font-black text-[9px] uppercase">
            <Plus size={12} className="mr-1" /> Add 10 Rows
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                <tr className="h-8">
                  <th className="px-4 py-0 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 w-12 bg-slate-50">#</th>
                  <th className="px-4 py-0 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 bg-slate-50">LAC ID (Dec)</th>
                  <th className="px-4 py-0 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 bg-slate-50">Cell ID (Dec)</th>
                  <th className="px-4 py-0 text-left text-[9px] font-black text-indigo-600 uppercase bg-indigo-50/50">Tactical Output (Hex)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 group transition-colors h-9">
                    <td className="px-4 py-0 text-center font-mono text-[9px] text-slate-300 border-r border-slate-100">{idx + 1}</td>
                    <td className="px-4 py-0 border-r border-slate-100 relative">
                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                value={row.lac}
                                onChange={(e) => updateRow(idx, 'lac', e.target.value)}
                                onPaste={(e) => handlePaste(e, idx, 'lac')}
                                placeholder="LAC"
                                className="w-full h-7 bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 outline-none tabular-nums"
                            />
                            <button 
                                onClick={() => handleFillDownLac(idx)}
                                title="Fill down this LAC"
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 transition-all absolute right-2"
                            >
                                <ArrowDownCircle size={14} />
                            </button>
                        </div>
                    </td>
                    <td className="px-4 py-0 border-r border-slate-100">
                        <input 
                            type="text"
                            value={row.cell}
                            onChange={(e) => updateRow(idx, 'cell', e.target.value)}
                            onPaste={(e) => handlePaste(e, idx, 'cell')}
                            placeholder="Cell ID"
                            className="w-full h-7 bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 outline-none tabular-nums"
                        />
                    </td>
                    <td className="px-4 py-0 bg-indigo-50/20">
                        <div className="flex items-center justify-between">
                            <input 
                                type="text"
                                value={row.output}
                                onChange={(e) => updateRow(idx, 'output', e.target.value)}
                                onPaste={(e) => handlePaste(e, idx, 'output')}
                                placeholder="00000000"
                                className={cn(
                                    "w-full h-7 bg-transparent border-none focus:ring-0 text-[11px] font-black tracking-widest tabular-nums outline-none",
                                    row.output ? "text-indigo-600" : "text-slate-300"
                                )}
                            />
                            {row.output && (
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(row.output);
                                        toast.success("Row output copied");
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-600 transition-all"
                                >
                                    <Copy size={12} />
                                </button>
                            )}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="shrink-0 text-center text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
        Pro-Tip: You can copy multiple rows from Excel and paste them here directly. 
        Use the Arrow button to drag LAC ID to all rows below.
      </p>
    </div>
  );
}
