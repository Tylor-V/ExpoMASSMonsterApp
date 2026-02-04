import { useAppContext } from '../firebase/AppContext';

export function useCurrentUserStatus() {
  const { appReady, user, userError, userLoading, refreshUserData } = useAppContext();
  return {
    user,
    loading: !appReady || userLoading,
    error: userError,
    refreshUserData,
  };
}
