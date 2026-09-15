"use client";
import { startTransition,useActionState,useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel } from "@/components/ui/alert-dialog";
import type { FormState } from "@/lib/membership/types";

export function ConfirmedAction({action,label,title,description,fields}:{action:(state:FormState,form:FormData)=>Promise<FormState>;label:string;title:string;description:string;fields:Record<string,string>}) {
 const [open,setOpen]=useState(false);
 const [state,submit,pending]=useActionState(async(previous:FormState,form:FormData)=>{
   const next=await action(previous,form);if(next.success)setOpen(false);return next;
 },{});
 return <div><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger asChild><Button className="min-h-11 w-full rounded-pill">{label}</Button></AlertDialogTrigger>
   <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
     <form action={submit} onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);startTransition(()=>submit(form));}}>
       {Object.entries(fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
       {state.error&&<p role="alert" className="mb-4 text-sm text-destructive">{state.error}</p>}
       <AlertDialogFooter><AlertDialogCancel disabled={pending}>돌아가기</AlertDialogCancel><Button type="submit" disabled={pending} className="min-h-11">{pending?"처리 중…":"확인"}</Button></AlertDialogFooter>
     </form>
   </AlertDialogContent></AlertDialog>{state.success&&<p role="status" className="mt-3 text-sm text-gold">{state.success}</p>}</div>;
}
