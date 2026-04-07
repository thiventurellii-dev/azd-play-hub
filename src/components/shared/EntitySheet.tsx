import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EntitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Width class, defaults to sm:max-w-lg */
  widthClass?: string;
}

/**
 * Unified Sheet wrapper for all entity edit forms.
 * Provides consistent layout: right-side slide, scrollable content, standard header.
 */
export const EntitySheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClass = "sm:max-w-lg",
}: EntitySheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className={`${widthClass} p-0 flex flex-col`}>
      <SheetHeader className="px-6 pt-6 pb-2">
        <SheetTitle>{title}</SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-4 pr-2">{children}</div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);
