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

  const prompt = `Ты — алгоритм рассадки учеников в классе. Класс имеет ${columnCount} колонки и ${rowCount} рядов парт (всего ${totalDesks} парт). Каждая парта вмещает 2 ученика (student1 и student2). Парты нумеруются слева направо, сверху вниз: парты 0, 1, 2 — первый ряд (ближайший к доске), парты 3, 4, 5 — второй ряд и т.д.

Правила рассадки (в порядке приоритета):
1. Ученики с плохим зрением ("Плохое") ДОЛЖНЫ сидеть в первых рядах (ближе к доске, меньший номер парты)
2. Высокие ученики должны сидеть в задних рядах или по краям (парты в колонках 0 и 2), чтобы не загораживать другим
3. Конфликтующие ученики НЕ ДОЛЖНЫ сидеть за одной партой (это строгое ограничение)
4. Желательные соседи по возможности должны сидеть за одной партой (мягкое ограничение)
5. Если ученик имеет плохое зрение И высокий рост, посади его в первый ряд по краям (парты 0 или 2)

Данные учеников:
${JSON.stringify(studentsData, null, 2)}

Верни ТОЛЬКО JSON объект в формате:
{
  "desks": [
    { "student1": "Имя ученика" или null, "student2": "Имя ученика" или null },
    ...
  ]
}

Массив desks должен содержать ровно ${totalDesks} парт. Каждый ученик должен быть размещён ровно один раз. Если мест больше чем учеников, оставшиеся места заполни null.`;

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

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
