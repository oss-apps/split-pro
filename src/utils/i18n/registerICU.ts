import i18next from 'i18next';
import ICU from 'i18next-icu';

let isRegistered = false;

export const registerICU = (): void => {
  if (isRegistered) {
    return;
  }

  i18next.use(new ICU());
  isRegistered = true;
};
