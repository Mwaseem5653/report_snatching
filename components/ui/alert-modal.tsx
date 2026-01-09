"use client";

import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type?: AlertType;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  type = "info"
}: AlertModalProps) {
  
  const config = {
    success: {
      icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
    },
    error: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      button: "bg-red-600 hover:bg-red-700 shadow-red-600/20"
    },
    warning: {
      icon: <AlertCircle className="h-12 w-12 text-amber-500" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      button: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
    },
    info: {
      icon: <Info className="h-12 w-12 text-blue-500" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
    }
  }[type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <div className={cn("p-8 flex flex-col items-center text-center space-y-4", config.bg)}>
          <div className="p-3 bg-white rounded-2xl shadow-sm animate-in zoom-in duration-300">
            {config.icon}
          </div>
          
          <div className="space-y-2">
            <DialogTitle className={cn("text-xl font-black uppercase tracking-tight", config.color)}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              {description}
            </DialogDescription>
          </div>
        </div>

        <div className="bg-white p-6 flex flex-col gap-3">
          <Button 
            onClick={onClose}
            className={cn("w-full h-12 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98]", config.button)}
          >
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}