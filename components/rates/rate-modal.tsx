"use client";
import type {FormEvent,ReactNode} from "react";
import {Save,X} from "lucide-react";
import {buttonClass} from "./constants";
export default function RateModal({title,pending,onClose,onSubmit,children}:{title:string;pending:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;children:ReactNode}){
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget&&!pending)onClose()}}><form role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
  <header className="flex shrink-0 items-center justify-between border-b px-4 py-4 sm:px-6"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button type="button" aria-label="Cerrar" disabled={pending} onClick={onClose}><X size={20}/></button></header>
  <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t bg-slate-50 px-4 py-4 sm:px-6"><button type="button" disabled={pending} onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={pending} className={buttonClass}><Save size={16}/>{pending?"Guardando...":"Guardar"}</button></footer>
 </form></div>;
}
