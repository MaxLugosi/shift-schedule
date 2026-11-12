import { rangeLabel, todayISO, type ViewMode } from '../../lib/dates';
import { useSchedule } from '../../store/schedule';
import { DateNav, SearchInput, Tabs } from '../ui/controls';
import s from './Toolbar.module.css';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'week', label: 'Неделя' },
];

export function Toolbar() {
  const view = useSchedule((st) => st.view);
  const anchor = useSchedule((st) => st.anchor);
  const search = useSchedule((st) => st.search);
  const setView = useSchedule((st) => st.setView);
  const setSearch = useSchedule((st) => st.setSearch);
  const navigate = useSchedule((st) => st.navigate);
  const goTo = useSchedule((st) => st.goTo);

  return (
    <div className={s.toolbar}>
      <div className={s.search}>
        <SearchInput value={search} onChange={setSearch} />
      </div>
      <DateNav
        label={rangeLabel(view, anchor)}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => goTo(todayISO())}
      />
      <Tabs label="Период" value={view} options={VIEW_OPTIONS} onChange={setView} />
    </div>
  );
}
