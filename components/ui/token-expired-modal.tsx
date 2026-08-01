"use client";

import { Coins, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TokenExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  requiredTokens?: number;
  toolName?: string;
}

export default function TokenExpiredModal({
  isOpen,
  onClose,
  currentBalance = 0,
  requiredTokens = 5,
  toolName = "this tool",
}: TokenExpiredModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-6 overflow-hidden border border-slate-200 rounded-3xl shadow-xl bg-white">
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          
          <div className="space-y-1">
            <DialogTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Insufficient Tokens
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-medium">
              You don't have enough credits to use <span className="font-bold text-slate-800">{toolName}</span>.
            </DialogDescription>
          </div>

          <div className="w-full flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance</span>
              <span className="text-xl font-black text-red-500">{currentBalance}</span>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-4"></div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Required</span>
              <span className="text-xl font-black text-slate-800">{requiredTokens}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-100 w-full">
            <Coins className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Contact your administrator to request a token top-up for advanced operations.
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-10 rounded-xl font-black text-white bg-slate-900 hover:bg-slate-800 uppercase tracking-widest text-[10px] transition-all"
          >
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
