"use client";

import * as React from "react";
import { Mail, Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EMAIL = "gabriele.barriosd@gmail.com";

/** Crédito del desarrollador en el footer: abre un diálogo con el contacto. */
export function CreatedBy() {
  return (
    <Dialog>
      <DialogTrigger className="font-medium text-primary underline-offset-4 hover:underline">
        Created by Ing. Gabriel Barrios
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Ing. Gabriel Barrios
          </DialogTitle>
          <DialogDescription>Contact me</DialogDescription>
        </DialogHeader>

        <a
          href={`mailto:${EMAIL}`}
          className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3 text-sm transition-colors hover:border-primary/50"
        >
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          <span className="break-all">{EMAIL}</span>
        </a>
      </DialogContent>
    </Dialog>
  );
}
