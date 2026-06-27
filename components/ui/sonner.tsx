"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors={false}
      toastOptions={{
        classNames: {
          toast: "bg-card text-foreground border border-border",
        },
      }}
      {...props}
    />
  );
}
