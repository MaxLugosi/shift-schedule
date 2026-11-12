import type { TemplateColor } from './schema.js';

export const SEED_EMPLOYEES: { fullName: string; position: string; avatarUrl: string }[] = [
  { fullName: 'Кузнецова Алина', position: 'агент', avatarUrl: '/avatars/1.jpg' },
  { fullName: 'Волков Тимур', position: 'агент', avatarUrl: '/avatars/2.jpg' },
  { fullName: 'Морозова Виктория', position: 'агент', avatarUrl: '/avatars/3.jpg' },
  { fullName: 'Соколов Артём', position: 'агент', avatarUrl: '/avatars/4.jpg' },
  { fullName: 'Лебедева Полина', position: 'агент', avatarUrl: '/avatars/5.jpg' },
  { fullName: 'Новиков Кирилл', position: 'агент', avatarUrl: '/avatars/6.jpg' },
  { fullName: 'Ерохина Дарья', position: 'агент', avatarUrl: '/avatars/7.jpg' },
  { fullName: 'Гаврилов Егор', position: 'агент', avatarUrl: '/avatars/8.jpg' },
];

export const SEED_TEMPLATES: {
  name: string;
  startTime: string;
  endTime: string;
  color: TemplateColor;
  hotkey: number;
}[] = [
  { name: 'Утро', startTime: '07:00', endTime: '15:00', color: 'cornflower', hotkey: 1 },
  { name: 'День', startTime: '10:00', endTime: '18:00', color: 'lavender', hotkey: 2 },
  { name: 'Вечер', startTime: '15:00', endTime: '23:00', color: 'mint', hotkey: 3 },
];
