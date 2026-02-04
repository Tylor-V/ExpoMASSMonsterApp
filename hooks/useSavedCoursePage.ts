import { useEffect, useState } from 'react';
import { useCurrentUserStatus } from './useCurrentUserStatus';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function useSavedCoursePage(
  courseId: string,
  pageCount: number,
  restart = false,
) {
  const { user, loading, error, refreshUserData } = useCurrentUserStatus();
  const [ready, setReady] = useState(false);
  const [startPage, setStartPage] = useState(0);

  useEffect(() => {
    if (restart) {
      setStartPage(0);
      setReady(true);
      return;
    }
    if (loading) return;
    if (!user) {
      setStartPage(0);
      setReady(true);
      return;
    }
    const progress = clamp01(user.coursesProgress?.[courseId] || 0);
    const idx = Math.max(
      0,
      Math.min(pageCount - 1, Math.round(progress * pageCount) - 1),
    );
    setStartPage(idx);
    setReady(true);
  }, [user, courseId, pageCount, restart, loading]);

  return {
    startPage,
    ready,
    loading,
    error,
    hasUser: !!user,
    retry: refreshUserData,
  };
}
