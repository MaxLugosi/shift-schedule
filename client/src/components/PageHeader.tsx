import { pendingChanges, useSchedule } from '../store/schedule';
import { Icon } from './icons';
import { Badge, Button } from './ui/Button';
import s from './PageHeader.module.css';

export function PageHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const saving = useSchedule((st) => st.saving);
  const publishing = useSchedule((st) => st.publishing);
  const save = useSchedule((st) => st.save);
  const publish = useSchedule((st) => st.publish);

  const changes = pendingChanges({ server, drafts });
  const dirty = changes.upserts.length + changes.deletes.length;

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
        <h1 className={s.title}>График</h1>
        <div className={s.actions}>
          <Button variant="secondary" onClick={() => void publish()} disabled={publishing || saving}>
            {publishing ? 'Публикация...' : 'Опубликовать'}
          </Button>
          <Button
            variant="primary"
            onClick={() => (dirty ? void save() : useSchedule.getState().showToast('Нет несохранённых изменений'))}
            disabled={saving}
            title={dirty ? `Несохранённых изменений: ${dirty} (Ctrl+S)` : 'Нет несохранённых изменений'}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
            {dirty > 0 && !saving && <Badge dark>{dirty}</Badge>}
          </Button>
        </div>
      </div>
    </header>
  );
}
