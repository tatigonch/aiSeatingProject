import OpenAI from 'openai';
import { Desk } from '../models/Desk';

/**
 * Рассадка студентов по партам с помощью OpenAI API
 *
 * @param {Array} students - Массив всех студентов для рассадки
 * @param {Array} currentDesks - Текущий массив парт (используется для определения количества)
 * @returns {Promise<Array>} Массив парт с размещенными студентами
 */
export const arrangeStudents = async (students, currentDesks) => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('API ключ OpenAI не настроен. Добавьте REACT_APP_OPENAI_API_KEY в файл .env');
  }

  const columnCount = 3;
  const rowCount = Math.ceil(currentDesks.length / columnCount);
  const totalDesks = rowCount * columnCount;

  // Формируем данные учеников для промта
  const studentsData = students.map(s => ({
    name: s.getFullName(),
    vision: s.getVision(),
    height: s.getHeight(),
    conflicts: Array.from(s.getConflicts()).map(c => c.getFullName()),
    preferredNeighbors: Array.from(s.getPreferredNeighbors()).map(p => p.getFullName()),
  }));

  const prompt = `У тебя есть список людей. Тебе нужно составить упорядоченный список пар.

Пара — это двойка (человек A, человек B) или (человек A, null) если кого-то не хватает.
Всего нужно ровно ${totalDesks} пар. Пары идут по порядку: пара 1 — самая приоритетная (первая), пара ${totalDesks} — последняя.

ПРАВИЛА СОРТИРОВКИ (по приоритету):

1. ВСЕ люди с плохим зрением ("Плохое") ОБЯЗАНЫ быть в первых парах (как можно ближе к началу списка). Это самое важное правило.

2. Среди людей с ПЛОХИМ зрением, найди самых ВЫСОКИХ (выше остальных с плохим зрением). Размести их так:
   - Первый самый высокий с плохим зрением → пара 1, позиция A.
   - Второй самый высокий с плохим зрением → пара 3, позиция B.
   Остальные люди с плохим зрением заполняют оставшиеся места в парах 1-3.
   ВАЖНО: в пары 1-3 попадают ТОЛЬКО люди с плохим зрением (не с хорошим!).

3. Остальные люди сортируются по росту: низкие — ближе к началу, высокие — ближе к концу.

4. Люди из одной пары НЕ ДОЛЖНЫ конфликтовать друг с другом (строгое ограничение).

5. Желаемые соседи по возможности должны быть в одной паре (мягкое ограничение).

ДАННЫЕ:
${JSON.stringify(studentsData, null, 2)}

Верни ТОЛЬКО JSON (без пояснений):
{
  "pairs": [
    ["Имя A", "Имя B"],
    ["Имя A", null],
    ...
  ]
}

Ровно ${totalDesks} пар. Каждый человек ровно один раз. Если мест больше чем людей — заполни null.`;

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (!parsed.pairs || !Array.isArray(parsed.pairs)) {
    throw new Error('Некорректный ответ от AI: отсутствует массив pairs');
  }

  // Создаём карту имён → объектов Student
  const studentMap = new Map();
  students.forEach(s => studentMap.set(s.getFullName(), s));

  // Маппим пары на парты с валидацией
  const usedStudents = new Set();
  const desks = parsed.pairs.map(pair => {
    const desk = new Desk();
    const nameA = pair[0] && pair[0] !== 'null' ? pair[0] : null;
    const nameB = pair[1] && pair[1] !== 'null' ? pair[1] : null;

    if (nameA && !usedStudents.has(nameA)) {
      const s = studentMap.get(nameA);
      if (s) { desk.setStudent1(s); usedStudents.add(nameA); }
    }
    if (nameB && !usedStudents.has(nameB)) {
      const s = studentMap.get(nameB);
      if (s) { desk.setStudent2(s); usedStudents.add(nameB); }
    }
    return desk;
  });

  // Находим пропущенных учеников и добавляем на свободные места
  const missing = students.filter(s => !usedStudents.has(s.getFullName()));
  if (missing.length > 0) {
    for (const student of missing) {
      const emptyDesk = desks.find(d => !d.getStudent1() || !d.getStudent2());
      if (emptyDesk) {
        if (!emptyDesk.getStudent1()) emptyDesk.setStudent1(student);
        else if (!emptyDesk.getStudent2()) emptyDesk.setStudent2(student);
      }
    }
  }

  // Если парт меньше чем нужно, дополняем пустыми
  while (desks.length < totalDesks) {
    desks.push(new Desk());
  }

  return desks;
};
