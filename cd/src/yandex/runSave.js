// Чекпоинт ТЕКУЩЕГО забега (не мета) — что именно сохранять решает GameScene,
// этот файл только настраивает ключ/версию/хранилище. Логика (независима от
// площадки) — ../platform/runSave.js (спека:
// docs/superpowers/specs/2026-08-22-run-save-design.md).
import { createRunSave } from '../platform/runSave.js';
import { Platform, GAME_ID } from '../platform/index.js';

export const RunSave = createRunSave({ key: GAME_ID + '_run', version: 1, storage: Platform.local });
