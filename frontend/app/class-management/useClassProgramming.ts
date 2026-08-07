import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];
type AddOrEditProgrammingDto = components['schemas']['AddOrEditProgrammingDto'];
type AddOrEditProgrammingResponse = components['schemas']['AddOrEditProgrammingResponseDto'];

interface UseClassProgrammingParams {
  token: string | null;
  currentGymId: string | null;
  classId: string | undefined;
}

interface UseClassProgrammingResult {
  /** Draft content bound to the editor. Held verbatim — never split or joined. */
  content: string;
  setContent: (next: string) => void;
  loggable: boolean;
  setLoggable: (next: boolean) => void;
  /** Content as last persisted; null when the class has no programming yet. */
  savedContent: string | null;
  lastUpdatedAt: string | null;
  isLoading: boolean;
  loadError: string | null;
  reload: () => void;
  isSaving: boolean;
  saveError: string | null;
  didSave: boolean;
  /** True when the draft differs from what is persisted. */
  isDirty: boolean;
  save: () => Promise<void>;
}

/**
 * Loads and persists a class's programming. Programming is a single `content`
 * string plus a `loggable` flag (see DECISIONS.md → "Programming Content Shape"),
 * so the draft is round-tripped verbatim with no marker parsing.
 */
export function useClassProgramming({
  token,
  currentGymId,
  classId,
}: UseClassProgrammingParams): UseClassProgrammingResult {
  const [content, setContentState] = useState('');
  const [loggable, setLoggableState] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [savedLoggable, setSavedLoggable] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [didSave, setDidSave] = useState(false);

  const load = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetClassProgrammingResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/programming`
      );
      setSavedContent(data.content);
      setSavedLoggable(data.loggable);
      setLastUpdatedAt(data.lastUpdatedAt);
      setContentState(data.content ?? '');
      setLoggableState(data.loggable);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load programming';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentGymId, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const setContent = useCallback((next: string) => {
    setContentState(next);
    setDidSave(false);
    setSaveError(null);
  }, []);

  const setLoggable = useCallback((next: boolean) => {
    setLoggableState(next);
    setDidSave(false);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setSaveError('Programming cannot be empty.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setDidSave(false);
    try {
      const client = createApiClient({ token });
      const body: AddOrEditProgrammingDto = { classId, content: trimmed, loggable };
      const result = await client.post<AddOrEditProgrammingResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/programming`,
        body as unknown as Record<string, unknown>
      );
      setContentState(result.content);
      setSavedContent(result.content);
      setSavedLoggable(loggable);
      setLastUpdatedAt(result.lastModifiedAt);
      setDidSave(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save programming';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [token, currentGymId, classId, content, loggable]);

  const isDirty = content !== (savedContent ?? '') || loggable !== savedLoggable;

  return {
    content,
    setContent,
    loggable,
    setLoggable,
    savedContent,
    lastUpdatedAt,
    isLoading,
    loadError,
    reload: load,
    isSaving,
    saveError,
    didSave,
    isDirty,
    save,
  };
}
