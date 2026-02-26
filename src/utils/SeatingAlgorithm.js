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

2. Среди людей с плохим зрением, если кто-то высокого роста — поставь его в самые первые пары (пары 1 и 3), на позицию "A" в паре 1 или позицию "B" в паре 3. Это нужно, чтобы высокие с плохим зрением оказались по краям, а не в центре.

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

  // Маппим пары на парты: пара → парта
  const desks = parsed.pairs.map(pair => {
    const desk = new Desk();
    if (pair[0]) {
      const s = studentMap.get(pair[0]);
      if (s) desk.setStudent1(s);
    }
    if (pair[1]) {
      const s = studentMap.get(pair[1]);
      if (s) desk.setStudent2(s);
    }
    return desk;
  });

  // Если парт меньше чем нужно, дополняем пустыми
  while (desks.length < totalDesks) {
    desks.push(new Desk());
  }

  return desks;
};
