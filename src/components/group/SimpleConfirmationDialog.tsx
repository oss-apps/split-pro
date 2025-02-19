import { useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "~/components/ui/alert-dialog";
import { Construction } from "lucide-react";
import { Button } from "~/components/ui/button";

export const SimpleConfirmationDialog: React.FC<{
  title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    className?: string;
}> = ({ title, description, onConfirm, onCancel, className }) => {
    const [isOpen, setIsOpen] = useState(false);

    return <AlertDialog
    open={isOpen}
    onOpenChange={(status) =>
      status !== isOpen ? setIsOpen(status) : null
    }
  >
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        className="justify-start p-0 text-left text-primary hover:opacity-90"
        onClick={() => setIsOpen(true)}
      >
        <Construction className="mr-2 h-5 w-5" /> Recalculate balances
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-w-xs rounded-lg">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {canLeave ? 'Are you absolutely sure?' : ''}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {canLeave
            ? 'This action cannot be reversed'
            : "Can't leave the group until your outstanding balance is settled"}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        {canLeave ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onGroupLeave}
            disabled={leaveGroupMutation.isLoading}
            loading={leaveGroupMutation.isLoading}
          >
            Leave
          </Button>
        ) : null}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>