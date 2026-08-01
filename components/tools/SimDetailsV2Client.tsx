"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function SimDetailsV2Client() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
           <ShieldCheck size={32} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Sim Details V2</h1>
           <p className="text-slate-500">Advanced SIM information lookup.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">This module is currently under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
