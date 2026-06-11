import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const TASK_CACHE_TTL_MS = 5 * 60 * 1000;

type TaskCache = {
  tasks: any[];
  cachedAt: number;
};

const cacheKey = (scope: string) => `tasks:${scope}`;

export const readTaskCache = async (scope: string) => {
  const value = await AsyncStorage.getItem(cacheKey(scope));
  if (!value) return null;

  try {
    const cache = JSON.parse(value) as TaskCache;
    return {
      ...cache,
      isFresh: Date.now() - cache.cachedAt < TASK_CACHE_TTL_MS,
    };
  } catch {
    await AsyncStorage.removeItem(cacheKey(scope));
    return null;
  }
};

export const writeTaskCache = async (scope: string, tasks: any[]) => {
  await AsyncStorage.setItem(cacheKey(scope), JSON.stringify({
    tasks,
    cachedAt: Date.now(),
  } satisfies TaskCache));
};

export const mergeTask = (tasks: any[], changedTask: any) => {
  const index = tasks.findIndex(task => task.id === changedTask.id);
  if (index === -1) return [changedTask, ...tasks];

  const next = [...tasks];
  next[index] = { ...next[index], ...changedTask };
  return next;
};

export const subscribeToTaskChanges = (
  scope: string,
  companyId: string,
  includeTask: (task: any) => boolean,
  onTasksChanged: (tasks: any[]) => void,
) => {
  const channel = supabase
    .channel(`task-cache-${scope}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `company_id=eq.${companyId}` },
      async payload => {
        const cache = await readTaskCache(scope);
        let tasks = cache?.tasks || [];

        if (payload.eventType === 'DELETE') {
          tasks = tasks.filter(task => task.id !== (payload.old as any).id);
        } else {
          const changedTask = payload.new as any;
          tasks = includeTask(changedTask)
            ? mergeTask(tasks, changedTask)
            : tasks.filter(task => task.id !== changedTask.id);
        }

        await writeTaskCache(scope, tasks);
        onTasksChanged(tasks);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
