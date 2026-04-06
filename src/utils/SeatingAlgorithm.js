import { Desk } from '../models/Desk';

/**
 * Рассадка студентов по партам с помощью OpenRouter API
 *
 * @param {Array} students - Массив всех студентов для рассадки
 * @param {Array} currentDesks - Текущий массив парт (используется для определения количества)
 * @returns {Promise<Array>} Массив парт с размещенными студентами
 */
export const arrangeStudents = async (students, currentDesks) => {
  const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('API ключ OpenRouter не настроен. Добавьте REACT_APP_OPENROUTER_API_KEY в файл .env');
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

2. Пары 1, 2, 3 — это первый ряд из 3 парт. Пара 1 — ЛЕВЫЙ край, пара 2 — ЦЕНТР, пара 3 — ПРАВЫЙ край.
   Среди людей с ПЛОХИМ зрением отсортируй по росту (от высокого к низкому). Двух самых высоких РАЗНЕСИ по краям первого ряда:
   - Самый высокий с плохим зрением → pairs[0][0] (пара 1, позиция A — левый край).
   - Второй по росту с плохим зрением → pairs[2][1] (пара 3, позиция B — правый край).
   Эти два человека НЕ ДОЛЖНЫ быть в одной паре. Остальные с плохим зрением заполняют свободные места в парах 1-3.
   ВАЖНО: в пары 1-3 попадают ТОЛЬКО люди с плохим зрением. Пара 2 — центр, туда ставь самых НИЗКИХ из людей с плохим зрением.

3. Остальные люди сортируются по росту: низкие — ближе к началу, высокие — ближе к концу.

4. КОНФЛИКТЫ — СТРОГОЕ ОГРАНИЧЕНИЕ: Если у человека в поле "conflicts" указаны имена, он НЕ МОЖЕТ сидеть в одной паре с этими людьми. Перед формированием каждой пары проверь конфликты обоих людей. Это правило нельзя нарушать ни при каких обстоятельствах.

5. ЖЕЛАЕМЫЕ СОСЕДИ — ВАЖНОЕ ОГРАНИЧЕНИЕ: Если у человека в поле "preferredNeighbors" указаны имена, он ДОЛЖЕН быть в одной паре с этим человеком. Сначала сформируй пары из людей с preferredNeighbors, потом распредели остальных.

ДАННЫЕ:
${JSON.stringify(studentsData, null, 2)}

Верни ТОЛЬКО JSON (без пояснений). Используй null (не строку "null"):
{
  "pairs": [
    ["Имя A", "Имя B"],
    ["Имя A", null],
    [null, null]
  ]
}

Ровно ${totalDesks} пар. Каждый человек ровно один раз. Если мест больше чем людей — заполни null (не строку "null", а именно null).

КРИТИЧЕСКИ ВАЖНО: Каждая пара должна быть полностью заполнена (оба места заняты) прежде чем начинать следующую. Неполная пара (с одним null) допускается ТОЛЬКО ОДНА и только ПОСЛЕДНЯЯ среди заполненных пар. После неё идут только полностью пустые пары [null, null]. Запрещено оставлять null в паре, если есть ещё незанятые люди.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Ошибка OpenRouter API: ${response.status} ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
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
    const nameA = pair[0] && pair[0] !== 'null' && pair[0].trim() !== '' ? pair[0] : null;
    const nameB = pair[1] && pair[1] !== 'null' && pair[1].trim() !== '' ? pair[1] : null;

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
