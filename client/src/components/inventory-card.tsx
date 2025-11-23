import { InventoryItem, ItemStatus } from "@/lib/mock-data";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface InventoryCardProps {
  item: InventoryItem;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
}

export function InventoryCard({ item, onUpdateStatus }: InventoryCardProps) {
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

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-muted">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
            <Package className="w-4 h-4" />
            {item.category}
          </div>
          <Badge variant="outline" className={cn("transition-colors", statusColors[item.status])}>
            {statusLabels[item.status]}
          </Badge>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">{item.name}</h3>
        <p className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(item.lastUpdated))} ago
        </p>
      </CardContent>
      
      <CardFooter className="p-2 bg-muted/30 grid grid-cols-3 gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-8 w-full", item.status === 'in-stock' && "bg-primary/10 text-primary")}
          onClick={() => onUpdateStatus(item.id, 'in-stock')}
          data-testid={`btn-stock-${item.id}`}
        >
          <Check className="w-4 h-4 mr-1" />
          <span className="sr-only sm:not-sr-only text-xs">Stocked</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-8 w-full", item.status === 'low' && "bg-yellow-500/10 text-yellow-700")}
          onClick={() => onUpdateStatus(item.id, 'low')}
          data-testid={`btn-low-${item.id}`}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          <span className="sr-only sm:not-sr-only text-xs">Low</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-8 w-full", item.status === 'out-of-stock' && "bg-destructive/10 text-destructive")}
          onClick={() => onUpdateStatus(item.id, 'out-of-stock')}
          data-testid={`btn-out-${item.id}`}
        >
          <X className="w-4 h-4 mr-1" />
          <span className="sr-only sm:not-sr-only text-xs">Empty</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
