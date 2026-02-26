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

  // Сортируем учеников по росту для подсказки AI
  const sortedByHeight = [...studentsData].sort((a, b) => a.height - b.height);
  const heightList = sortedByHeight.map(s => `${s.name}(${s.height}см, зрение:${s.vision})`).join(', ');

  // Вычисляем сколько мест в каждом ряду
  const seatsPerRow = columnCount * 2;

  const prompt = `Ты — алгоритм рассадки учеников в классе.

КЛАСС: ${columnCount} колонки × ${rowCount} рядов = ${totalDesks} парт.
Каждая парта = 2 места (student1 слева, student2 справа).
Парты слева направо, сверху вниз: парты 0,1,2 = ряд 1 (у доски), 3,4,5 = ряд 2, и т.д.
Край класса: левая колонка (парты 0,3,6,...) и правая колонка (парты 2,5,8,...).
Центр: парты 1,4,7,...
В каждом ряду ${seatsPerRow} мест.

Всего учеников: ${studentsData.length}. Вот они по возрастанию роста:
${heightList}

РЕШИ ЗАДАЧУ ПОШАГОВО:

ШАГ 1. Раздели учеников на группы по росту и распредели по рядам.
- Самые низкие → ряд 1 (у доски), самые высокие → последний ряд.
- В каждом ряду ${seatsPerRow} мест. Заполняй ряды по порядку от низких к высоким.
- Исключение: ученики с плохим зрением ("Плохое") сдвигаются на 1-2 ряда ближе к доске, даже если они выше.

ШАГ 2. Внутри каждого ряда расставь учеников по партам.
- Если ученик высокий для своего ряда (выше среднего в этом ряду) — ставь его по КРАЯМ (левая/правая колонка), чтобы не загораживал.
- Конфликтующие ученики НЕ ДОЛЖНЫ сидеть за одной партой (строгое ограничение).
- Желаемых соседей старайся сажать за одну парту (мягкое ограничение).

ШАГ 3. Сформируй итоговый JSON.

Данные учеников:
${JSON.stringify(studentsData, null, 2)}

ВАЖНО: Сначала напиши своё решение по шагам (распределение по рядам, потом по партам), а в самом конце выдай JSON:
{
  "desks": [
    { "student1": "Имя" или null, "student2": "Имя" или null },
    ...
  ]
}

Ровно ${totalDesks} парт. Каждый ученик ровно один раз. Пустые места = null.`;

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;

  // AI думает вслух, JSON в конце ответа — извлекаем его
  const jsonMatch = content.match(/\{[\s\S]*"desks"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Не удалось извлечь JSON из ответа AI');
  }
  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.desks || !Array.isArray(parsed.desks)) {
    throw new Error('Некорректный ответ от OpenAI: отсутствует массив desks');
  }

  // Создаём карту имён → объектов Student
  const studentMap = new Map();
  students.forEach(s => studentMap.set(s.getFullName(), s));

  // Создаём массив парт из ответа
  const desks = parsed.desks.map(deskData => {
    const desk = new Desk();
    if (deskData.student1) {
      const s = studentMap.get(deskData.student1);
      if (s) desk.setStudent1(s);
    }
    if (deskData.student2) {
      const s = studentMap.get(deskData.student2);
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
