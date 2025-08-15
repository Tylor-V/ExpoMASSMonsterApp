import { useAppContext } from '../firebase/AppContext';

export function useCurrentUserDoc() {
  const { user } = useAppContext();
  return user;
}