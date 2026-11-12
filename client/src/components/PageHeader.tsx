import { getRange } from '../lib/dates';
import { effectiveShift, parseKey, pendingChanges, useSchedule } from '../store/schedule';
import { Icon } from './icons';
import { Badge, Button } from './ui/Button';
import s from './PageHeader.module.css';

export function PageHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const view = useSchedule((st) => st.view);
  const anchor = useSchedule((st) => st.anchor);
  const saving = useSchedule((st) => st.saving);
  const saveError = useSchedule((st) => st.saveError);
  const publishing = useSchedule((st) => st.publishing);
  const save = useSchedule((st) => st.save);
  const publish = useSchedule((st) => st.publish);

  const changes = pendingChanges({ server, drafts });
  const dirty = changes.upserts.length + changes.deletes.length;

  // неопубликованные смены в показанном периоде
  const { from, to } = getRange(view, anchor);
  let unpublished = 0;
  let total = 0;
  for (const key of new Set([...Object.keys(server), ...Object.keys(drafts)])) {
    const { date } = parseKey(key);
    if (date < from || date > to || !effectiveShift({ server, drafts }, key)) continue;
    total++;
    if (key in drafts || !server[key]?.publishedAt) unpublished++;
  }

  let saveStatus = 'Все изменения сохранены';
  let saveTone = s.ok;
  if (saving) {
    saveStatus = 'Сохранение...';
    saveTone = '';
  } else if (saveError) {
    saveStatus = 'Не сохранено';
    saveTone = s.error;
  } else if (dirty) {
    saveStatus = 'Есть несохранённые изменения';
    saveTone = '';
  }

  let publishStatus = '';
  if (total) publishStatus = unpublished ? `не опубликовано смен: ${unpublished}` : 'график опубликован';

  return (
    <header className={s.header}>
      <div className={s.crumbs}>
        <button type="button" className={`${s.round} ${s.burger}`} onClick={onOpenMenu} aria-label="Открыть меню">
          <span className={s.burgerIcon} />
        </button>
        <a href="#" className={s.back} onClick={(e) => e.preventDefault()}>
          <span className={s.round}>
            <Icon name="navPrev" />
          </span>
          <span>Графики смен</span>
        </a>
      </div>
      <div className={s.titleRow}>
        <div className={s.titleBox}>
          <h1 className={s.title}>График</h1>
          <p className={s.status} role="status" aria-live="polite">
            <span className={saveTone}>{saveStatus}</span>
            {saveError && !saving && (
              <button type="button" className={s.retry} onClick={() => void save()}>
                Повторить
              </button>
            )}
            {publishStatus && (
              <>
                <span aria-hidden="true">·</span>
                <span className={unpublished ? s.warn : s.ok}>{publishStatus}</span>
              </>
            )}
          </p>
        </div>
        <div className={s.actions}>
          <Button
            variant="secondary"
            onClick={() => void publish()}
            disabled={publishing}
            title={unpublished ? `Опубликовать смены периода: ${unpublished}` : 'Все смены периода опубликованы'}
          >
            {publishing ? 'Публикация...' : 'Опубликовать'}
            {unpublished > 0 && !publishing && <Badge>{unpublished}</Badge>}
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            title={dirty ? `Несохранённых изменений: ${dirty} (Ctrl+S)` : 'Изменения сохраняются автоматически'}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </header>
  );
}
