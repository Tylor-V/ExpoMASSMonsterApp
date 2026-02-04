import { useAppContext } from '../firebase/AppContext';

export function useCurrentUserStatus() {
  const { appReady, user, userError, refreshUserData } = useAppContext();
  return {
    user,
    loading: !appReady,
    error: userError,
    refreshUserData,
  };
}
