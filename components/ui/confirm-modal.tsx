"use client";

import { AlertTriangle, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false
}: ConfirmModalProps) {
  
  const variants = {
    danger: {
      icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
      color: "text-red-600",
      bg: "bg-red-50",
      button: "bg-red-600 hover:bg-red-700 shadow-red-600/20"
    },
    warning: {
      icon: <AlertTriangle className="h-12 w-12 text-amber-500" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      button: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
    },
    info: {
      icon: <AlertTriangle className="h-12 w-12 text-blue-500" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
    }
  }[variant];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <div className={cn("p-8 flex flex-col items-center text-center space-y-4", variants.bg)}>
          <div className="p-3 bg-white rounded-2xl shadow-sm animate-in zoom-in duration-300">
            {variants.icon}
          </div>
          
          <div className="space-y-2">
            <DialogTitle className={cn("text-xl font-black uppercase tracking-tight", variants.color)}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              {description}
            </DialogDescription>
          </div>
        </div>

        <div className="bg-white p-6 grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className={cn("h-12 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98]", variants.button)}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
