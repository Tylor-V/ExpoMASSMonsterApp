import { GUIDELINES_VERSION, TERMS_VERSION } from '../constants/acceptance';

export const hasAcceptedLatest = (user: any | null) => {
  if (!user) return false;
  return (
    !!user.acceptedAt &&
    user.acceptedTermsVersion === TERMS_VERSION &&
    user.acceptedGuidelinesVersion === GUIDELINES_VERSION
  );
};
