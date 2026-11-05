import { useTranslation } from 'next-i18next';

import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

export const InvitationOption = ({
  enabled,
  checked,
  onCheckedChange,
  disabled,
}: {
  enabled: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      {enabled ? (
        <Label className="flex items-center gap-2">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(true === value)}
            disabled={disabled}
          />
          {t('ui.invitation.send_email')}
        </Label>
      ) : null}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t(
          enabled
            ? checked
              ? 'ui.invitation.email_help'
              : 'ui.invitation.no_email_help'
            : 'ui.invitation.disabled_help',
        )}
      </p>
    </div>
  );
};
