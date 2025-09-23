import { act, renderHook } from '@testing-library/react-native';

import useAnyDMUnread from '../useAnyDMUnread';

jest.mock('../../firebase/firebase', () => {
  const authListeners: Set<(user: { uid: string } | null) => void> = new Set();
  let currentUser: { uid: string } | null = { uid: 'user1' };

  const threadUnsubs: jest.Mock[] = [];
  const lastReadListeners: Record<string, ((value: any) => void) | null> = {};
  const lastReadUnsubs: Record<string, jest.Mock[]> = {};
  const messageListeners: Record<string, ((value: any) => void) | null> = {};
  const messageUnsubs: Record<string, jest.Mock[]> = {};
  let threadsListener: ((value: any) => void) | null = null;

  const makeThreadUnsub = () => {
    const unsub = jest.fn(() => {
      threadsListener = null;
    });
    threadUnsubs.push(unsub);
    return unsub;
  };

  const makeLastReadUnsub = (key: string) => {
    const unsub = jest.fn(() => {
      delete lastReadListeners[key];
    });
    (lastReadUnsubs[key] = lastReadUnsubs[key] || []).push(unsub);
    return unsub;
  };

  const makeMessageUnsub = (tid: string) => {
    const unsub = jest.fn(() => {
      delete messageListeners[tid];
    });
    (messageUnsubs[tid] = messageUnsubs[tid] || []).push(unsub);
    return unsub;
  };

  return {
    __esModule: true,
    firestore: jest.fn(() => ({
      collection: (name: string) => {
        if (name === 'dms') {
          return {
            where: () => ({
              onSnapshot: (cb: any) => {
                threadsListener = cb;
                return makeThreadUnsub();
              },
            }),
            doc: (tid: string) => ({
              collection: (subName: string) => {
                if (subName === 'messages') {
                  return {
                    orderBy: () => ({
                      limit: () => ({
                        onSnapshot: (cb: any) => {
                          messageListeners[tid] = cb;
                          return makeMessageUnsub(tid);
                        },
                      }),
                    }),
                  };
                }
                return {};
              },
            }),
          };
        }

        if (name === 'users') {
          return {
            doc: (uid: string) => ({
              collection: (subName: string) => {
                if (subName === 'lastReadDMs') {
                  return {
                    doc: (tid: string) => ({
                      onSnapshot: (cb: any) => {
                        const key = `${uid}:${tid}`;
                        lastReadListeners[key] = cb;
                        return makeLastReadUnsub(key);
                      },
                    }),
                  };
                }
                return {};
              },
            }),
          };
        }

        return {};
      },
    })),
    auth: jest.fn(() => ({
      get currentUser() {
        return currentUser;
      },
      set currentUser(user: { uid: string } | null) {
        currentUser = user;
      },
      onAuthStateChanged: (cb: (user: { uid: string } | null) => void) => {
        authListeners.add(cb);
        return () => {
          authListeners.delete(cb);
        };
      },
    })),
    __setAuthUser: (user: { uid: string } | null) => {
      currentUser = user;
      authListeners.forEach(listener => listener(user));
    },
    __triggerThreadSnapshot: (tids: string[]) => {
      threadsListener?.({ docs: tids.map(id => ({ id })) });
    },
    __triggerLastReadSnapshot: (uid: string, tid: string, timestamp?: number) => {
      const key = `${uid}:${tid}`;
      lastReadListeners[key]?.({
        data: () => (timestamp != null ? { timestamp } : {}),
      });
    },
    __triggerMessageSnapshot: (tid: string, data?: { timestamp?: any; userId?: string }) => {
      messageListeners[tid]?.({
        docs: data ? [{ data: () => data }] : [],
      });
    },
    __getUnsubscribes: () => ({
      thread: threadUnsubs,
      lastReads: lastReadUnsubs,
      messages: messageUnsubs,
    }),
  };
});

const {
  __setAuthUser,
  __triggerThreadSnapshot,
  __triggerLastReadSnapshot,
  __triggerMessageSnapshot,
  __getUnsubscribes,
} = require('../../firebase/firebase');

describe('useAnyDMUnread', () => {
  it('resets unread state and re-subscribes when the active user changes', () => {
    const { result } = renderHook(() => useAnyDMUnread());

    expect(result.current).toBe(false);

    act(() => {
      __triggerThreadSnapshot(['thread1']);
    });

    act(() => {
      __triggerLastReadSnapshot('user1', 'thread1', 100);
    });

    act(() => {
      __triggerMessageSnapshot('thread1', { timestamp: 200, userId: 'friend' });
    });

    expect(result.current).toBe(true);

    act(() => {
      __setAuthUser(null);
    });

    expect(result.current).toBe(false);

    const { thread, lastReads, messages } = __getUnsubscribes();
    expect(thread[0]).toHaveBeenCalledTimes(1);
    expect(lastReads['user1:thread1'][0]).toHaveBeenCalledTimes(1);
    expect(messages['thread1'][0]).toHaveBeenCalledTimes(1);

    act(() => {
      __setAuthUser({ uid: 'user2' });
    });

    expect(result.current).toBe(false);

    act(() => {
      __triggerThreadSnapshot(['thread1']);
    });

    act(() => {
      __triggerLastReadSnapshot('user2', 'thread1', 90);
    });

    act(() => {
      __triggerMessageSnapshot('thread1', { timestamp: 95, userId: 'user2' });
    });

    expect(result.current).toBe(false);

    act(() => {
      __triggerMessageSnapshot('thread1', { timestamp: 150, userId: 'friend' });
    });

    expect(result.current).toBe(true);
  });
});
