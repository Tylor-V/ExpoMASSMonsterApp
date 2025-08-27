import { useEffect, useState } from 'react';
import { useCurrentUserDoc } from './useCurrentUserDoc';

export default function useSavedCoursePage(courseId: string, pageCount: number) {
  const user = useCurrentUserDoc();
  const [ready, setReady] = useState(false);
  const [startPage, setStartPage] = useState(0);

  useEffect(() => {
    if (!user) return;
    const progress = user.coursesProgress?.[courseId] || 0;
    const idx = Math.max(0, Math.min(pageCount - 1, Math.round(progress * pageCount) - 1));
    setStartPage(idx);
    setReady(true);
  }, [user, courseId, pageCount]);

  return { startPage, ready };
}