import { InventoryItem, ItemStatus } from "@/lib/mock-data";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, X, Package, Calendar, DollarSign, StickyNote, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddItemDialog } from "./add-item-dialog";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InventoryCardProps {
  item: InventoryItem;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<InventoryItem>) => void;
}

export function InventoryCard({ item, onUpdateStatus, onDelete, onEdit }: InventoryCardProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const statusColors = {
    'in-stock': "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
    'low': "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20",
    'out-of-stock': "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
  };

  const statusLabels = {
    'in-stock': "In Stock",
    'low': "Running Low",
    'out-of-stock': "Out of Stock",
  };

  const frequencyColors = {
    'daily': "bg-blue-50 text-blue-700 border-blue-200",
    'weekly': "bg-purple-50 text-purple-700 border-purple-200",
    'monthly': "bg-orange-50 text-orange-700 border-orange-200",
    'occasional': "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md border-muted group relative">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 backdrop-blur-sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit Trigger via wrapper */}
              <AddItemDialog 
                existingItem={item} 
                onEditItem={onEdit}
                trigger={
                  <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </div>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteAlert(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("capitalize font-normal", frequencyColors[item.frequency])}>
                {item.frequency}
              </Badge>
              {item.category && (
                <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {item.category}
                </span>
              )}
            </div>
            <Badge variant="outline" className={cn("transition-colors whitespace-nowrap ml-2", statusColors[item.status])}>
              {statusLabels[item.status]}
            </Badge>
          </div>
          
          <div className="mb-3">
            <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{item.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Updated {formatDistanceToNow(new Date(item.lastUpdated))} ago</span>
              {item.price && (
                <span className="flex items-center text-foreground font-medium">
                  <DollarSign className="w-3 h-3 mr-0.5" />
                  {item.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {(item.note || item.needBy) && (
            <div className="bg-muted/30 rounded-md p-2 space-y-1.5 text-xs">
              {item.needBy && (
                <div className="flex items-center text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Need by {format(new Date(item.needBy), 'MMM d, yyyy')}
                </div>
              )}
              {item.note && (
                <div className="flex items-start text-muted-foreground italic">
                  <StickyNote className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0" />
                  {item.note}
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-2 bg-muted/30 grid grid-cols-3 gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 w-full hover:bg-primary/20 hover:text-primary", item.status === 'in-stock' && "bg-primary/10 text-primary")}
            onClick={() => onUpdateStatus(item.id, 'in-stock')}
            data-testid={`btn-stock-${item.id}`}
          >
            <Check className="w-4 h-4 mr-1" />
            <span className="sr-only sm:not-sr-only text-xs">Stocked</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 w-full hover:bg-yellow-500/20 hover:text-yellow-700", item.status === 'low' && "bg-yellow-500/10 text-yellow-700")}
            onClick={() => onUpdateStatus(item.id, 'low')}
            data-testid={`btn-low-${item.id}`}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            <span className="sr-only sm:not-sr-only text-xs">Low</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 w-full hover:bg-destructive/20 hover:text-destructive", item.status === 'out-of-stock' && "bg-destructive/10 text-destructive")}
            onClick={() => onUpdateStatus(item.id, 'out-of-stock')}
            data-testid={`btn-out-${item.id}`}
          >
            <X className="w-4 h-4 mr-1" />
            <span className="sr-only sm:not-sr-only text-xs">Empty</span>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{item.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(item.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
